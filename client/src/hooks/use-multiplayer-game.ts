import { useState, useCallback, useEffect, useRef } from "react";
import { type ClientRoomView, type PlayerSeat, type DisconnectedPlayerInfo, type TimeoutAction } from "@shared/schema";
import { getSocket, type GameSocket } from "@/lib/socket";
import { getHints, type PatternMatch } from "@shared/patterns";

export type LobbyState = "idle" | "creating" | "joining" | "waiting" | "playing";

const SESSION_KEY_ROOM = "mahjong-session-room";
const SESSION_KEY_NAME = "mahjong-session-name";
const SESSION_KEY_SEAT = "mahjong-session-seat";
const SESSION_KEY_TOKEN = "mahjong-session-token";

export function useMultiplayerGame() {
  const [lobbyState, setLobbyState] = useState<LobbyState>("idle");
  const [gameState, setGameState] = useState<ClientRoomView | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [mySeat, setMySeat] = useState<PlayerSeat | null>(null);
  const [playerName, setPlayerName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [winInfo, setWinInfo] = useState<{
    winnerId: string;
    winnerName: string;
    winnerSeat: PlayerSeat;
    patternName: string;
    description: string;
  } | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [disconnectedPlayer, setDisconnectedPlayer] = useState<DisconnectedPlayerInfo | null>(null);
  const [timedOutPlayer, setTimedOutPlayer] = useState<DisconnectedPlayerInfo | null>(null);
  const [gameEnded, setGameEnded] = useState<string | null>(null);

  const socketRef = useRef<GameSocket | null>(null);
  const hasAttemptedRejoin = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on("room:created", (data) => {
      setRoomCode(data.roomCode);
      setMySeat(data.seat);
      setLobbyState("waiting");
      setPlayerCount(1);
      setError(null);
    });

    socket.on("room:joined", (data) => {
      setRoomCode(data.roomCode);
      setMySeat(data.seat);
      setPlayerName(data.playerName);
      setLobbyState("waiting");
      setError(null);
      sessionStorage.setItem(SESSION_KEY_ROOM, data.roomCode);
      sessionStorage.setItem(SESSION_KEY_NAME, data.playerName);
      sessionStorage.setItem(SESSION_KEY_SEAT, data.seat);
    });

    socket.on("room:player-joined", (data) => {
      setPlayerCount(data.playerCount);
    });

    socket.on("room:player-left", (data) => {
      setPlayerCount(data.playerCount);
    });

    socket.on("game:started", () => {
      setLobbyState("playing");
      setWinInfo(null);
      setDisconnectedPlayer(null);
      setTimedOutPlayer(null);
      setGameEnded(null);
    });

    socket.on("game:state", (state) => {
      setGameState(state);
      setMySeat(state.mySeat);
      setRoomCode(state.roomCode);
      if (state.started) {
        setLobbyState("playing");
      }
      setPlayerCount(state.players.length);

      if (state.rejoinToken) {
        sessionStorage.setItem(SESSION_KEY_TOKEN, state.rejoinToken);
        sessionStorage.setItem(SESSION_KEY_ROOM, state.roomCode);
        const me = state.players.find(p => p.seat === state.mySeat);
        if (me) {
          sessionStorage.setItem(SESSION_KEY_NAME, me.name);
        }
      }

      if (state.disconnectedPlayers.length > 0) {
        setDisconnectedPlayer(state.disconnectedPlayers[0]);
      } else {
        setDisconnectedPlayer(null);
      }
    });

    socket.on("game:win", (data) => {
      setWinInfo(data);
    });

    socket.on("player:disconnected", (data) => {
      setDisconnectedPlayer(data);
    });

    socket.on("player:reconnected", (data) => {
      setDisconnectedPlayer(null);
      setTimedOutPlayer(null);
    });

    socket.on("player:timeout", (data) => {
      setTimedOutPlayer(data);
    });

    socket.on("game:ended", (data) => {
      setGameEnded(data.reason);
      setLobbyState("idle");
      setGameState(null);
      setRoomCode(null);
      setMySeat(null);
      setDisconnectedPlayer(null);
      setTimedOutPlayer(null);
      sessionStorage.removeItem(SESSION_KEY_ROOM);
      sessionStorage.removeItem(SESSION_KEY_NAME);
      sessionStorage.removeItem(SESSION_KEY_SEAT);
      sessionStorage.removeItem(SESSION_KEY_TOKEN);
    });

    socket.on("error", (data) => {
      setError(data.message);
      setTimeout(() => setError(null), 5000);
    });

    if (!hasAttemptedRejoin.current) {
      hasAttemptedRejoin.current = true;
      const savedRoom = sessionStorage.getItem(SESSION_KEY_ROOM);
      const savedName = sessionStorage.getItem(SESSION_KEY_NAME);
      const savedToken = sessionStorage.getItem(SESSION_KEY_TOKEN);
      if (savedRoom && savedName && savedToken) {
        setLobbyState("joining");
        const attemptRejoin = () => {
          socket.emit("room:rejoin", { roomCode: savedRoom, playerName: savedName, rejoinToken: savedToken });
        };
        if (socket.connected) {
          attemptRejoin();
        } else {
          socket.once("connect", attemptRejoin);
        }
      }
    }

    return () => {
      socket.off("room:created");
      socket.off("room:joined");
      socket.off("room:player-joined");
      socket.off("room:player-left");
      socket.off("game:started");
      socket.off("game:state");
      socket.off("game:win");
      socket.off("player:disconnected");
      socket.off("player:reconnected");
      socket.off("player:timeout");
      socket.off("game:ended");
      socket.off("error");
    };
  }, []);

  const createRoom = useCallback((name: string) => {
    setPlayerName(name);
    setLobbyState("creating");
    setError(null);
    setGameEnded(null);
    socketRef.current?.emit("room:create", { playerName: name });
  }, []);

  const joinRoom = useCallback((code: string, name: string) => {
    setPlayerName(name);
    setLobbyState("joining");
    setError(null);
    setGameEnded(null);
    socketRef.current?.emit("room:join", { roomCode: code.toUpperCase(), playerName: name });
  }, []);

  const draw = useCallback(() => {
    socketRef.current?.emit("game:draw");
  }, []);

  const discard = useCallback((tileId: string) => {
    socketRef.current?.emit("game:discard", { tileId });
  }, []);

  const sortHand = useCallback(() => {
    socketRef.current?.emit("game:sort");
  }, []);

  const toggleHints = useCallback(() => {
    setShowHints(prev => !prev);
  }, []);

  const resetGame = useCallback(() => {
    setWinInfo(null);
    socketRef.current?.emit("game:reset");
  }, []);

  const handleTimeoutAction = useCallback((action: TimeoutAction) => {
    socketRef.current?.emit("game:timeout-action", { action });
    if (action === "wait") {
      setTimedOutPlayer(null);
    }
  }, []);

  const isMyTurn = gameState ? gameState.mySeat === gameState.currentTurn : false;

  const hints = gameState && gameState.myHand.length > 0 ? getHints(gameState.myHand) : null;

  return {
    lobbyState,
    gameState,
    roomCode,
    mySeat,
    playerName,
    error,
    playerCount,
    winInfo,
    isMyTurn,
    showHints,
    hints,
    disconnectedPlayer,
    timedOutPlayer,
    gameEnded,
    createRoom,
    joinRoom,
    draw,
    discard,
    sortHand,
    toggleHints,
    resetGame,
    handleTimeoutAction,
  };
}
