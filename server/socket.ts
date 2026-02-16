import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { type ServerToClientEvents, type ClientToServerEvents, type TimeoutAction, type PlayerSeat } from "@shared/schema";
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
  addBotsToRoom,
  fillBotsAndStart,
  isCurrentTurnBot,
  executeBotDraw,
  executeBotDiscard,
  checkBotWin,
  scheduleBotTurn,
  isReadyToStart,
  isCurrentTurnControlledByHuman,
  transferTile,
  executeBotTransfers,
  testSiameseWin,
  charlestonSelectTile,
  charlestonReady,
  charlestonSkip,
  charlestonVote,
  executeCharlestonPass,
  charlestonBotAutoSelect,
  charlestonBotVote,
  claimDiscard,
  passOnDiscard,
  isCallingComplete,
  resolveCallingPhase,
  botCallingDecision,
} from "./game-engine";
import { log } from "./index";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const playerRooms = new Map<string, string>();

function broadcastState(io: Server<ClientToServerEvents, ServerToClientEvents>, roomCode: string) {
  const room = getRoom(roomCode);
  if (!room) return;

  for (const player of room.state.players) {
    if (!player.connected || player.isBot) continue;
    const view = getClientView(room, player.id);
    if (view) {
      io.to(player.id).emit("game:state", view);
    }
  }
}

function handleCallingResolution(io: Server<ClientToServerEvents, ServerToClientEvents>, roomCode: string) {
  if (!isCallingComplete(roomCode)) return;

  const result = resolveCallingPhase(roomCode);
  if (!result.resolved) return;

  if (result.winnerClaim) {
    const room = getRoom(roomCode);
    if (room && result.winnerClaim.claimType === "mahjong") {
      const winCheck = checkWinForPlayer(roomCode, result.winnerClaim.playerId);
      if (winCheck.won) {
        const claimPlayer = room.state.players.find(p => p.seat === result.winnerClaim!.seat);
        io.to(roomCode).emit("game:win", {
          winnerId: result.winnerClaim.playerId,
          winnerName: claimPlayer?.name || "Unknown",
          winnerSeat: result.winnerClaim.seat,
          patternName: winCheck.patternName || "Mahjong",
          description: winCheck.description || "",
        });
      }
    }
  }

  broadcastState(io, roomCode);
  handleBotTurns(io, roomCode);
}

function handleBotTurns(io: Server<ClientToServerEvents, ServerToClientEvents>, roomCode: string) {
  const room = getRoom(roomCode);
  if (!room || !room.state.started || room.state.phase === "won") return;

  if (room.state.phase === "calling") return;

  if (!isCurrentTurnBot(roomCode)) return;

  scheduleBotTurn(roomCode, () => {
    const currentRoom = getRoom(roomCode);
    if (!currentRoom || currentRoom.state.phase === "won") return;

    if (currentRoom.state.phase === "draw") {
      const drawResult = executeBotDraw(roomCode);
      if (!drawResult.success) return;

      const winCheck = checkBotWin(roomCode);
      if (winCheck.won && winCheck.botName && winCheck.botSeat) {
        io.to(roomCode).emit("game:win", {
          winnerId: "bot",
          winnerName: winCheck.botName,
          winnerSeat: winCheck.botSeat,
          patternName: winCheck.patternName || "Unknown",
          description: winCheck.description || "",
        });
        broadcastState(io, roomCode);
        return;
      }

      broadcastState(io, roomCode);

      scheduleBotTurn(roomCode, () => {
        const discardRoom = getRoom(roomCode);
        if (!discardRoom || discardRoom.state.phase === "won") return;

        if (discardRoom.state.phase === "discard") {
          executeBotTransfers(roomCode);

          const discardResult = executeBotDiscard(roomCode);
          if (discardResult.success) {
            if (discardRoom.state.phase === "calling") {
              botCallingDecision(roomCode);
              broadcastState(io, roomCode);
              handleCallingResolution(io, roomCode);
            } else {
              broadcastState(io, roomCode);
              handleBotTurns(io, roomCode);
            }
          }
        }
      });
    }
  });
}

export function setupSocket(httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io",
  });

  io.on("connection", (socket: TypedSocket) => {
    log(`Player connected: ${socket.id}`, "socket");

    socket.on("room:create", ({ playerName, config }) => {
      const existingRoom = getRoomByPlayerId(socket.id);
      if (existingRoom) {
        markPlayerDisconnected(existingRoom.state.roomCode, socket.id);
        socket.leave(existingRoom.state.roomCode);
      }

      const room = createRoom(socket.id, playerName, config);
      const roomCode = room.state.roomCode;
      socket.join(roomCode);
      playerRooms.set(socket.id, roomCode);

      log(`Room ${roomCode} created by ${playerName} (mode: ${room.state.config.gameMode}, bots: ${room.state.config.fillWithBots})`, "socket");
      socket.emit("room:created", { roomCode, seat: "East" });

      if (room.state.config.fillWithBots) {
        const filled = fillBotsAndStart(roomCode);
        if (filled) {
          const started = startGame(roomCode);
          if (started) {
            log(`Game auto-started with bots in room ${roomCode} (mode: ${room.state.config.gameMode})`, "socket");
            io.to(roomCode).emit("game:started");
            charlestonBotAutoSelect(roomCode);
            broadcastState(io, roomCode);
            return;
          }
        }
      }

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

      log(`${player.name} joined room ${code} as ${player.seat}`, "socket");

      socket.emit("room:joined", { roomCode: code, seat: player.seat, playerName: player.name });

      io.to(code).emit("room:player-joined", {
        playerName: player.name,
        seat: player.seat,
        playerCount: room.state.players.filter(p => !p.isBot).length,
      });

      const shouldStart = isReadyToStart(code);
      if (shouldStart) {
        if (room.state.config.fillWithBots) {
          fillBotsAndStart(code);
        }

        if (room.state.players.length === 4) {
          const started = startGame(code);
          if (started) {
            log(`Game started in room ${code}`, "socket");
            io.to(code).emit("game:started");
            charlestonBotAutoSelect(code);
            broadcastState(io, code);
            return;
          }
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
      handleBotTurns(io, code);
    });

    socket.on("game:draw", (data) => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) {
        socket.emit("error", { message: "Not in a room" });
        return;
      }

      const forSeat = data?.seat;
      const result = drawTile(roomCode, socket.id, forSeat);
      if (!result.success) {
        socket.emit("error", { message: result.error || "Cannot draw" });
        return;
      }

      const seat = forSeat || getRoom(roomCode)?.state.players.find(p => p.id === socket.id)?.seat;
      const winResult = checkWinForPlayer(roomCode, socket.id, forSeat);
      if (winResult.won) {
        const room = getRoom(roomCode);
        const player = room?.state.players.find(p => p.seat === seat);
        if (room && player) {
          io.to(roomCode).emit("game:win", {
            winnerId: player.id,
            winnerName: player.name,
            winnerSeat: player.seat,
            patternName: winResult.patternName || "Unknown",
            description: winResult.description || "",
          });
        }
      }

      broadcastState(io, roomCode);
    });

    socket.on("game:discard", ({ tileId, seat: forSeat }) => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) {
        socket.emit("error", { message: "Not in a room" });
        return;
      }

      const result = discardTile(roomCode, socket.id, tileId, forSeat);
      if (!result.success) {
        socket.emit("error", { message: result.error || "Cannot discard" });
        return;
      }

      const room = getRoom(roomCode);
      if (room && room.state.phase === "calling") {
        botCallingDecision(roomCode);
        broadcastState(io, roomCode);
        handleCallingResolution(io, roomCode);
      } else {
        broadcastState(io, roomCode);
        handleBotTurns(io, roomCode);
      }
    });

    socket.on("game:sort", (data) => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;

      sortPlayerHand(roomCode, socket.id, data?.seat);
      broadcastState(io, roomCode);
    });

    socket.on("game:transfer", ({ tileId, fromSeat, toSeat }) => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) {
        socket.emit("error", { message: "Not in a room" });
        return;
      }

      const result = transferTile(roomCode, socket.id, tileId, fromSeat, toSeat);
      if (!result.success) {
        socket.emit("error", { message: result.error || "Cannot transfer tile" });
        return;
      }

      broadcastState(io, roomCode);
    });

    socket.on("game:test-siamese-win", () => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;

      const success = testSiameseWin(roomCode, socket.id);
      if (success) {
        log(`Test Siamese win triggered in room ${roomCode}`, "socket");
        broadcastState(io, roomCode);
      }
    });

    socket.on("game:claim", ({ claimType, tileIds }) => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) {
        socket.emit("error", { message: "Not in a room" });
        return;
      }

      const result = claimDiscard(roomCode, socket.id, claimType, tileIds);
      if (!result.success) {
        socket.emit("error", { message: result.error || "Cannot claim" });
        return;
      }

      log(`Player ${socket.id} claims ${claimType} in room ${roomCode}`, "socket");
      broadcastState(io, roomCode);
      handleCallingResolution(io, roomCode);
    });

    socket.on("game:claim-pass", () => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) {
        socket.emit("error", { message: "Not in a room" });
        return;
      }

      const result = passOnDiscard(roomCode, socket.id);
      if (!result.success) {
        socket.emit("error", { message: result.error || "Cannot pass" });
        return;
      }

      broadcastState(io, roomCode);
      handleCallingResolution(io, roomCode);
    });

    socket.on("game:charleston-select", ({ tileId }) => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;

      const result = charlestonSelectTile(roomCode, socket.id, tileId);
      if (!result.success) {
        socket.emit("error", { message: result.error || "Cannot select tile" });
        return;
      }
      broadcastState(io, roomCode);
    });

    socket.on("game:charleston-ready", () => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;

      const result = charlestonReady(roomCode, socket.id);
      if (!result.success) {
        socket.emit("error", { message: result.error || "Cannot mark ready" });
        return;
      }

      if (result.allReady) {
        executeCharlestonPass(roomCode);
        const room = getRoom(roomCode);
        if (room && room.state.phase === "charleston" && room.state.charleston?.secondCharlestonOffered) {
          charlestonBotVote(roomCode);
          const humanSeats = room.state.players.filter(p => !p.isBot && !p.controlledBy);
          if (humanSeats.length === 0) {
            charlestonVote(roomCode, room.state.players[0].id, true);
          }
        }
        if (room && room.state.phase === "charleston" && !room.state.charleston?.secondCharlestonOffered) {
          charlestonBotAutoSelect(roomCode);
        }
        if (room && room.state.phase === "draw") {
          handleBotTurns(io, roomCode);
        }
      }

      broadcastState(io, roomCode);
    });

    socket.on("game:charleston-skip", () => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;

      const success = charlestonSkip(roomCode, socket.id);
      if (success) {
        log(`Charleston skipped in room ${roomCode}`, "socket");
        broadcastState(io, roomCode);
        handleBotTurns(io, roomCode);
      }
    });

    socket.on("game:charleston-vote", ({ accept }) => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;

      const result = charlestonVote(roomCode, socket.id, accept);
      if (!result.success) {
        socket.emit("error", { message: result.error || "Cannot vote" });
        return;
      }

      if (result.decided) {
        if (result.accepted) {
          charlestonBotAutoSelect(roomCode);
        } else {
          handleBotTurns(io, roomCode);
        }
      }

      broadcastState(io, roomCode);
    });

    socket.on("game:reset", () => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;

      const success = resetGame(roomCode);
      if (success) {
        log(`Game reset in room ${roomCode}`, "socket");
        io.to(roomCode).emit("game:started");
        charlestonBotAutoSelect(roomCode);
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
