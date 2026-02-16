import { useState, useCallback, useEffect, useRef } from "react";
import { type ClientRoomView, type PlayerSeat } from "@shared/schema";
import { getSocket, type GameSocket } from "@/lib/socket";
import { getHints, type PatternMatch } from "@shared/patterns";

export type LobbyState = "idle" | "creating" | "joining" | "waiting" | "playing";

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

  const socketRef = useRef<GameSocket | null>(null);

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
      setLobbyState("waiting");
      setError(null);
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
    });

    socket.on("game:state", (state) => {
      setGameState(state);
      setMySeat(state.mySeat);
      setRoomCode(state.roomCode);
      if (state.started) {
        setLobbyState("playing");
      }
      setPlayerCount(state.players.length);
    });

    socket.on("game:win", (data) => {
      setWinInfo(data);
    });

    socket.on("error", (data) => {
      setError(data.message);
      setTimeout(() => setError(null), 5000);
    });

    return () => {
      socket.off("room:created");
      socket.off("room:joined");
      socket.off("room:player-joined");
      socket.off("room:player-left");
      socket.off("game:started");
      socket.off("game:state");
      socket.off("game:win");
      socket.off("error");
    };
  }, []);

  const createRoom = useCallback((name: string) => {
    setPlayerName(name);
    setLobbyState("creating");
    setError(null);
    socketRef.current?.emit("room:create", { playerName: name });
  }, []);

  const joinRoom = useCallback((code: string, name: string) => {
    setPlayerName(name);
    setLobbyState("joining");
    setError(null);
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
    createRoom,
    joinRoom,
    draw,
    discard,
    sortHand,
    toggleHints,
    resetGame,
  };
}
