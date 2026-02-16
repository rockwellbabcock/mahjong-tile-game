import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { type ServerToClientEvents, type ClientToServerEvents } from "@shared/schema";
import {
  createRoom,
  joinRoom,
  getRoom,
  getRoomByPlayerId,
  removePlayer,
  startGame,
  drawTile,
  discardTile,
  sortPlayerHand,
  getClientView,
  checkWinForPlayer,
  resetGame,
} from "./game-engine";
import { log } from "./index";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const playerRooms = new Map<string, string>();

function broadcastState(io: Server<ClientToServerEvents, ServerToClientEvents>, roomCode: string) {
  const room = getRoom(roomCode);
  if (!room) return;

  for (const player of room.state.players) {
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
        removePlayer(existingRoom.state.roomCode, socket.id);
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
        removePlayer(existingRoom.state.roomCode, socket.id);
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

    socket.on("disconnect", () => {
      const roomCode = playerRooms.get(socket.id);
      if (roomCode) {
        const room = getRoom(roomCode);
        if (room) {
          const player = room.state.players.find(p => p.id === socket.id);
          const playerName = player?.name || "Unknown";
          const playerSeat = player?.seat || "East";

          removePlayer(roomCode, socket.id);

          io.to(roomCode).emit("room:player-left", {
            playerName,
            seat: playerSeat,
            playerCount: room.state.players.filter(p => p.connected !== false).length,
          });

          broadcastState(io, roomCode);
        }
        playerRooms.delete(socket.id);
      }
      log(`Player disconnected: ${socket.id}`, "socket");
    });
  });

  return io;
}
