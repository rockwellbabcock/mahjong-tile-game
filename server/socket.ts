import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { type ServerToClientEvents, type ClientToServerEvents, type TimeoutAction } from "@shared/schema";
import {
  createRoom,
  joinRoom,
  getRoom,
  getRoomByPlayerId,
  markPlayerDisconnected,
  reconnectPlayer,
  createDisconnectTimer,
  startGame,
  drawTile,
  discardTile,
  sortPlayerHand,
  getClientView,
  checkWinForPlayer,
  resetGame,
  endGame,
} from "./game-engine";
import { log } from "./index";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const playerRooms = new Map<string, string>();

function broadcastState(io: Server<ClientToServerEvents, ServerToClientEvents>, roomCode: string) {
  const room = getRoom(roomCode);
  if (!room) return;

  for (const player of room.state.players) {
    if (!player.connected) continue;
    const view = getClientView(room, player.id);
    if (view) {
      io.to(player.id).emit("game:state", view);
    }
  }
}

export function setupSocket(httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io",
  });

  io.on("connection", (socket: TypedSocket) => {
    log(`Player connected: ${socket.id}`, "socket");

    socket.on("room:create", ({ playerName }) => {
      const existingRoom = getRoomByPlayerId(socket.id);
      if (existingRoom) {
        markPlayerDisconnected(existingRoom.state.roomCode, socket.id);
        socket.leave(existingRoom.state.roomCode);
      }

      const room = createRoom(socket.id, playerName);
      const roomCode = room.state.roomCode;
      socket.join(roomCode);
      playerRooms.set(socket.id, roomCode);

      log(`Room ${roomCode} created by ${playerName}`, "socket");
      socket.emit("room:created", { roomCode, seat: "East" });

      broadcastState(io, roomCode);
    });

    socket.on("room:join", ({ roomCode, playerName }) => {
      const code = roomCode.toUpperCase();
      const existingRoom = getRoomByPlayerId(socket.id);
      if (existingRoom && existingRoom.state.roomCode !== code) {
        markPlayerDisconnected(existingRoom.state.roomCode, socket.id);
        socket.leave(existingRoom.state.roomCode);
      }

      const room = joinRoom(code, socket.id, playerName);
      if (!room) {
        socket.emit("error", { message: "Could not join room. It may be full, already started, or doesn't exist." });
        return;
      }

      socket.join(code);
      playerRooms.set(socket.id, code);

      const player = room.state.players.find(p => p.id === socket.id);
      if (!player) return;

      log(`${playerName} joined room ${code} as ${player.seat}`, "socket");

      socket.emit("room:joined", { roomCode: code, seat: player.seat, playerName });

      io.to(code).emit("room:player-joined", {
        playerName,
        seat: player.seat,
        playerCount: room.state.players.length,
      });

      if (room.state.players.length === 4 && !room.state.started) {
        const started = startGame(code);
        if (started) {
          log(`Game started in room ${code}`, "socket");
          io.to(code).emit("game:started");
        }
      }

      broadcastState(io, code);
    });

    socket.on("room:rejoin", ({ roomCode, playerName, rejoinToken }) => {
      const code = roomCode.toUpperCase();

      const player = reconnectPlayer(code, playerName, rejoinToken, socket.id);
      if (!player) {
        socket.emit("error", { message: "Could not rejoin. The game may have ended or the session expired." });
        return;
      }

      socket.join(code);
      playerRooms.set(socket.id, code);

      log(`${playerName} reconnected to room ${code} as ${player.seat}`, "socket");

      socket.emit("room:joined", { roomCode: code, seat: player.seat, playerName });

      io.to(code).emit("player:reconnected", {
        playerName,
        seat: player.seat,
      });

      io.to(code).emit("game:started");
      broadcastState(io, code);
    });

    socket.on("game:draw", () => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) {
        socket.emit("error", { message: "Not in a room" });
        return;
      }

      const result = drawTile(roomCode, socket.id);
      if (!result.success) {
        socket.emit("error", { message: result.error || "Cannot draw" });
        return;
      }

      const winResult = checkWinForPlayer(roomCode, socket.id);
      if (winResult.won) {
        const room = getRoom(roomCode);
        const player = room?.state.players.find(p => p.id === socket.id);
        if (room && player) {
          io.to(roomCode).emit("game:win", {
            winnerId: socket.id,
            winnerName: player.name,
            winnerSeat: player.seat,
            patternName: winResult.patternName || "Unknown",
            description: winResult.description || "",
          });
        }
      }

      broadcastState(io, roomCode);
    });

    socket.on("game:discard", ({ tileId }) => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) {
        socket.emit("error", { message: "Not in a room" });
        return;
      }

      const result = discardTile(roomCode, socket.id, tileId);
      if (!result.success) {
        socket.emit("error", { message: result.error || "Cannot discard" });
        return;
      }

      broadcastState(io, roomCode);
    });

    socket.on("game:sort", () => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;

      sortPlayerHand(roomCode, socket.id);
      broadcastState(io, roomCode);
    });

    socket.on("game:reset", () => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;

      const success = resetGame(roomCode);
      if (success) {
        log(`Game reset in room ${roomCode}`, "socket");
        io.to(roomCode).emit("game:started");
        broadcastState(io, roomCode);
      }
    });

    socket.on("game:timeout-action", ({ action }) => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;

      const room = getRoom(roomCode);
      if (!room) return;

      if (action === "end") {
        log(`Game ended in room ${roomCode} by player vote`, "socket");
        io.to(roomCode).emit("game:ended", { reason: "A player chose to end the game after a disconnect timeout." });
        endGame(roomCode);
      } else if (action === "wait") {
        log(`Players chose to keep waiting in room ${roomCode}`, "socket");
      }
    });

    socket.on("disconnect", () => {
      const roomCode = playerRooms.get(socket.id);
      if (roomCode) {
        const room = getRoom(roomCode);
        if (room) {
          const disconnectedPlayer = markPlayerDisconnected(roomCode, socket.id);

          if (disconnectedPlayer && room.state.started) {
            const { rejoinToken, timeoutAt } = createDisconnectTimer(roomCode, disconnectedPlayer, () => {
              const currentRoom = getRoom(roomCode);
              if (!currentRoom) return;

              const player = currentRoom.state.players.find(p => p.name === disconnectedPlayer.name);
              if (player && !player.connected) {
                io.to(roomCode).emit("player:timeout", {
                  playerName: disconnectedPlayer.name,
                  seat: disconnectedPlayer.seat,
                  timeoutAt,
                });

                broadcastState(io, roomCode);
              }
            });

            io.to(roomCode).emit("player:disconnected", {
              playerName: disconnectedPlayer.name,
              seat: disconnectedPlayer.seat,
              timeoutAt,
            });

            log(`Player ${disconnectedPlayer.name} disconnected from room ${roomCode}, rejoinToken=${rejoinToken}, waiting 60s`, "socket");
          } else if (!disconnectedPlayer) {
            io.to(roomCode).emit("room:player-left", {
              playerName: "Unknown",
              seat: "East",
              playerCount: room.state.players.length,
            });
          }

          broadcastState(io, roomCode);
        }
        playerRooms.delete(socket.id);
      }
      log(`Player disconnected: ${socket.id}`, "socket");
    });
  });

  return io;
}
