import { useState, useCallback, useEffect, useRef } from "react";
import { type ClientRoomView, type PlayerSeat, type DisconnectedPlayerInfo, type TimeoutAction, type RoomConfig, type GameMode, type DeadHandReason } from "@shared/schema";
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
  const [mySeats, setMySeats] = useState<PlayerSeat[]>([]);
  const [playerName, setPlayerName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [winInfo, setWinInfo] = useState<{
    winnerId: string;
    winnerName: string;
    winnerSeat: PlayerSeat;
    patternName: string;
    description: string;
    rack1Pattern?: { name: string; description: string };
    rack2Pattern?: { name: string; description: string };
  } | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [autoShowHints, setAutoShowHints] = useState(false);
  const [disconnectedPlayer, setDisconnectedPlayer] = useState<DisconnectedPlayerInfo | null>(null);
  const [timedOutPlayer, setTimedOutPlayer] = useState<DisconnectedPlayerInfo | null>(null);
  const [gameEnded, setGameEnded] = useState<string | null>(null);
  const [activeSuggestionPattern, setActiveSuggestionPattern] = useState<string | null>(null);
  const [deadHandAlert, setDeadHandAlert] = useState<{
    seat: PlayerSeat;
    playerName: string;
    reason: DeadHandReason;
    rack?: "main" | "partner" | "both";
    challengerName: string;
  } | null>(null);
  const [challengeFailedAlert, setChallengeFailedAlert] = useState<string | null>(null);

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
      setMySeats(state.mySeats);
      setRoomCode(state.roomCode);
      if (state.started) {
        setLobbyState("playing");
      }
      setPlayerCount(state.players.filter(p => !p.isBot).length);

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
      setMySeats([]);
      setDisconnectedPlayer(null);
      setTimedOutPlayer(null);
      sessionStorage.removeItem(SESSION_KEY_ROOM);
      sessionStorage.removeItem(SESSION_KEY_NAME);
      sessionStorage.removeItem(SESSION_KEY_SEAT);
      sessionStorage.removeItem(SESSION_KEY_TOKEN);
    });

    socket.on("game:dead-hand", (data) => {
      setDeadHandAlert(data);
      setTimeout(() => setDeadHandAlert(null), 8000);
    });

    socket.on("game:challenge-failed", (data) => {
      setChallengeFailedAlert(data.message);
      setTimeout(() => setChallengeFailedAlert(null), 5000);
    });

    socket.on("game:play-again-expired", () => {
      setGameEnded("Play again vote timed out.");
      setLobbyState("idle");
      setGameState(null);
      setRoomCode(null);
      setMySeat(null);
      setMySeats([]);
      setWinInfo(null);
      sessionStorage.removeItem(SESSION_KEY_ROOM);
      sessionStorage.removeItem(SESSION_KEY_NAME);
      sessionStorage.removeItem(SESSION_KEY_SEAT);
      sessionStorage.removeItem(SESSION_KEY_TOKEN);
    });

    socket.on("game:play-again-declined", () => {
      setGameEnded("A player declined to play again.");
      setLobbyState("idle");
      setGameState(null);
      setRoomCode(null);
      setMySeat(null);
      setMySeats([]);
      setWinInfo(null);
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
      socket.off("game:play-again-expired");
      socket.off("game:play-again-declined");
      socket.off("error");
    };
  }, []);

  const createRoom = useCallback((name: string, config?: RoomConfig) => {
    setPlayerName(name);
    setLobbyState("creating");
    setError(null);
    setGameEnded(null);
    socketRef.current?.emit("room:create", { playerName: name, config });
  }, []);

  const joinRoom = useCallback((code: string, name: string) => {
    setPlayerName(name);
    setLobbyState("joining");
    setError(null);
    setGameEnded(null);
    socketRef.current?.emit("room:join", { roomCode: code.toUpperCase(), playerName: name });
  }, []);

  const draw = useCallback((forSeat?: PlayerSeat) => {
    socketRef.current?.emit("game:draw", forSeat ? { seat: forSeat } : undefined);
  }, []);

  const discard = useCallback((tileId: string, forSeat?: PlayerSeat) => {
    socketRef.current?.emit("game:discard", { tileId, seat: forSeat });
  }, []);

  const sortHand = useCallback((forSeat?: PlayerSeat) => {
    socketRef.current?.emit("game:sort", forSeat ? { seat: forSeat } : undefined);
  }, []);

  const reorderHand = useCallback((tileIds: string[], forSeat?: PlayerSeat) => {
    socketRef.current?.emit("game:reorder", { tileIds, seat: forSeat });
  }, []);

  const transferTile = useCallback((tileId: string, fromSeat: PlayerSeat, toSeat: PlayerSeat) => {
    socketRef.current?.emit("game:transfer", { tileId, fromSeat, toSeat });
  }, []);

  const toggleHints = useCallback(() => {
    setShowHints(prev => !prev);
  }, []);

  const toggleAutoShowHints = useCallback(() => {
    setAutoShowHints(prev => {
      const next = !prev;
      if (next) setShowHints(true);
      return next;
    });
  }, []);

  const resetGame = useCallback(() => {
    setWinInfo(null);
    setActiveSuggestionPattern(null);
    socketRef.current?.emit("game:reset");
  }, []);

  const testSiameseWin = useCallback(() => {
    socketRef.current?.emit("game:test-siamese-win");
  }, []);

  const forfeitGame = useCallback(() => {
    socketRef.current?.emit("game:forfeit");
  }, []);

  const charlestonSelectTile = useCallback((tileId: string) => {
    socketRef.current?.emit("game:charleston-select", { tileId });
  }, []);

  const charlestonReady = useCallback(() => {
    socketRef.current?.emit("game:charleston-ready");
  }, []);

  const charlestonSkip = useCallback(() => {
    socketRef.current?.emit("game:charleston-skip");
  }, []);

  const charlestonVote = useCallback((accept: boolean) => {
    socketRef.current?.emit("game:charleston-vote", { accept });
  }, []);

  const claimDiscardTile = useCallback((claimType: "pung" | "kong" | "quint" | "mahjong", tileIds: string[]) => {
    socketRef.current?.emit("game:claim", { claimType, tileIds });
  }, []);

  const passOnDiscardTile = useCallback(() => {
    socketRef.current?.emit("game:claim-pass");
  }, []);

  const swapJoker = useCallback((myTileId: string, targetSeat: PlayerSeat, exposureIndex: number) => {
    socketRef.current?.emit("game:swap-joker", { myTileId, targetSeat, exposureIndex });
  }, []);

  const zombieExchange = useCallback((blankTileId: string, discardTileId: string) => {
    socketRef.current?.emit("game:zombie-exchange", { blankTileId, discardTileId });
  }, []);

  const handleTimeoutAction = useCallback((action: TimeoutAction) => {
    socketRef.current?.emit("game:timeout-action", { action });
    if (action === "wait") {
      setTimedOutPlayer(null);
    }
  }, []);

  const votePlayAgain = useCallback((vote: boolean) => {
    socketRef.current?.emit("game:play-again-vote", { vote });
  }, []);

  const selectSuggestionPattern = useCallback((patternId: string | null) => {
    setActiveSuggestionPattern(patternId);
  }, []);

  const isMyTurn = gameState ? gameState.mySeats.includes(gameState.currentTurn) : false;
  const activeControlSeat = gameState && isMyTurn ? gameState.currentTurn : null;

  const activeHand = gameState ? (
    activeControlSeat && activeControlSeat !== gameState.mySeat && gameState.partnerHand
      ? gameState.partnerHand
      : gameState.myHand
  ) : [];

  const hints = activeHand.length > 0 ? getHints(activeHand) : null;

  useEffect(() => {
    if (autoShowHints && gameState && gameState.phase === "discard" && isMyTurn) {
      setShowHints(true);
    }
  }, [autoShowHints, gameState?.myHand.length, gameState?.phase, isMyTurn]);

  return {
    lobbyState,
    gameState,
    roomCode,
    mySeat,
    mySeats,
    playerName,
    error,
    playerCount,
    winInfo,
    isMyTurn,
    activeControlSeat,
    showHints,
    autoShowHints,
    hints,
    disconnectedPlayer,
    timedOutPlayer,
    gameEnded,
    activeSuggestionPattern,
    createRoom,
    joinRoom,
    draw,
    discard,
    sortHand,
    reorderHand,
    transferTile,
    toggleHints,
    toggleAutoShowHints,
    resetGame,
    testSiameseWin,
    charlestonSelectTile,
    charlestonReady,
    charlestonSkip,
    charlestonVote,
    claimDiscardTile,
    passOnDiscardTile,
    swapJoker,
    zombieExchange,
    handleTimeoutAction,
    selectSuggestionPattern,
    forfeitGame,
    votePlayAgain,
  };
}
