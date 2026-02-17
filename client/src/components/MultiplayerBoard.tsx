import { motion, AnimatePresence } from "framer-motion";
import { type Tile as TileType, type ClientRoomView, type PlayerSeat, type DisconnectedPlayerInfo, type TimeoutAction, SEAT_ORDER } from "@shared/schema";
import { type PatternMatch } from "@shared/patterns";
import { Tile, TileBack } from "./Tile";
import { HintPanel } from "./HintPanel";
import { GameTooltip } from "./GameTooltip";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Lightbulb, Palette, Copy, Check, Hand, WifiOff, Clock, X, Bot, Eye, ArrowLeftRight, Gem, Layers, FlaskConical, Repeat2, Flag, Loader2 } from "lucide-react";
import { useTileStyle } from "@/hooks/use-tile-style";
import { useTheme } from "@/hooks/use-theme";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";

interface MultiplayerBoardProps {
  gameState: ClientRoomView;
  isMyTurn: boolean;
  activeControlSeat: PlayerSeat | null;
  showHints: boolean;
  autoShowHints: boolean;
  hints: {
    closest: PatternMatch[];
    bestHint: string;
    tilesAway: number;
  } | null;
  winInfo: {
    winnerId: string;
    winnerName: string;
    winnerSeat: PlayerSeat;
    patternName: string;
    description: string;
  } | null;
  disconnectedPlayer: DisconnectedPlayerInfo | null;
  timedOutPlayer: DisconnectedPlayerInfo | null;
  activeSuggestionPattern: string | null;
  onDraw: (forSeat?: PlayerSeat) => void;
  onDiscard: (id: string, forSeat?: PlayerSeat) => void;
  onSort: (forSeat?: PlayerSeat) => void;
  onReorderHand: (tileIds: string[], forSeat?: PlayerSeat) => void;
  onTransfer: (tileId: string, fromSeat: PlayerSeat, toSeat: PlayerSeat) => void;
  onToggleHints: () => void;
  onToggleAutoShowHints: () => void;
  onTimeoutAction: (action: TimeoutAction) => void;
  onSelectPattern: (patternId: string | null) => void;
  onSwapJoker: (myTileId: string, targetSeat: PlayerSeat, exposureIndex: number) => void;
  onZombieExchange: (blankTileId: string, discardTileId: string) => void;
  onTestSiameseWin?: () => void;
  onForfeit?: () => void;
}

function getRelativePosition(mySeat: PlayerSeat, targetSeat: PlayerSeat): string {
  const myIdx = SEAT_ORDER.indexOf(mySeat);
  const targetIdx = SEAT_ORDER.indexOf(targetSeat);
  const diff = (targetIdx - myIdx + 4) % 4;
  if (diff === 0) return "You";
  if (diff === 1) return "Right";
  if (diff === 2) return "Across";
  return "Left";
}

function ReconnectCountdown({ timeoutAt }: { timeoutAt: number }) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((timeoutAt - Date.now()) / 1000)));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((timeoutAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeoutAt]);

  return <span data-testid="text-reconnect-countdown">{secondsLeft}s</span>;
}


export function MultiplayerBoard({
  gameState,
  isMyTurn,
  activeControlSeat,
  showHints,
  autoShowHints,
  hints,
  winInfo,
  disconnectedPlayer,
  timedOutPlayer,
  activeSuggestionPattern,
  onDraw,
  onDiscard,
  onSort,
  onReorderHand,
  onTransfer,
  onToggleHints,
  onToggleAutoShowHints,
  onTimeoutAction,
  onSelectPattern,
  onSwapJoker,
  onZombieExchange,
  onTestSiameseWin,
  onForfeit,
}: MultiplayerBoardProps) {
  const { tileStyle, cycleTileStyle } = useTileStyle();
  const { theme, toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [transferMode, setTransferMode] = useState(false);
  const [showDiscardMobile, setShowDiscardMobile] = useState(false);
  const [jokerSwapTarget, setJokerSwapTarget] = useState<{ seat: PlayerSeat; exposureIndex: number; matchSuit: string; matchValue: string | number | null } | null>(null);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const [zombieBlankSelected, setZombieBlankSelected] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (showDiscardMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showDiscardMobile]);
  const tileSize = isMobile ? "sm" : "md";
  const discardTileSize = isMobile ? "xs" : "sm";

  useEffect(() => {
    if (!isMyTurn || (gameState.phase !== "draw" && gameState.phase !== "discard")) {
      setJokerSwapTarget(null);
    }
  }, [isMyTurn, gameState.phase]);

  const canZombieExchange = useMemo(() => {
    if (!gameState.zombieBlanks?.enabled) return false;
    if (gameState.phase === "won" || gameState.phase === "charleston" || gameState.phase === "calling") return false;
    if (gameState.discardPile.length === 0) return false;
    if (gameState.zombieBlanks.exchangeAnytime) return true;
    return isMyTurn && (gameState.phase === "draw" || gameState.phase === "discard");
  }, [gameState.zombieBlanks, gameState.phase, isMyTurn, gameState.discardPile.length]);

  useEffect(() => {
    if (!canZombieExchange) {
      setZombieBlankSelected(null);
    }
  }, [canZombieExchange]);

  const highlightedTileIds = useMemo(() => {
    if (!activeSuggestionPattern || !hints) return new Set<string>();
    const pattern = hints.closest.find(p => p.patternId === activeSuggestionPattern);
    if (!pattern) return new Set<string>();
    return new Set(pattern.contributingTileIds);
  }, [activeSuggestionPattern, hints]);

  function handleCopyCode() {
    navigator.clipboard.writeText(gameState.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    const target = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => target.style.opacity = "0.4");
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number, hand: TileType[], forSeat?: PlayerSeat) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }
    const reordered = [...hand];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    onReorderHand(reordered.map(t => t.id), forSeat);
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }, [onReorderHand]);

  const isPlayingPartner = activeControlSeat && activeControlSeat !== gameState.mySeat;
  const displayHand = isPlayingPartner && gameState.partnerHand ? gameState.partnerHand : gameState.myHand;
  const displaySeat = activeControlSeat || gameState.mySeat;

  function getStatusMessage() {
    if (zombieBlankSelected) {
      return "Click a tile in the discard pile to exchange it for your Blank tile. Click the Blank again to cancel.";
    }
    if (disconnectedPlayer) {
      return `Waiting for ${disconnectedPlayer.playerName} to reconnect...`;
    }
    if (gameState.phase === "won") {
      if (winInfo) {
        return winInfo.winnerId === gameState.players.find(p => p.seat === gameState.mySeat)?.id
          ? `You won with ${winInfo.patternName}!`
          : `${winInfo.winnerName} (${winInfo.winnerSeat}) won with ${winInfo.patternName}!`;
      }
      return "Game over!";
    }
    if (isMyTurn) {
      if (isSiamese) {
        if (gameState.phase === "draw") return "Your turn - draw a tile from the pool.";
        return "Your turn - transfer tiles between racks or discard.";
      }
      const prefix = isPlayingPartner ? `Your partner's turn (${displaySeat})` : "Your turn";
      if (gameState.phase === "draw") return `${prefix} - click Draw to pick a tile from the wall.`;
      return `${prefix} - pick a tile from your hand to discard it.`;
    }
    if (gameState.phase === "calling") {
      return "A tile was discarded - decide if you want to claim it or pass.";
    }
    const currentPlayer = gameState.players.find(p => p.seat === gameState.currentTurn);
    if (gameState.gameMode === "2-player" && currentPlayer) {
      const controller = currentPlayer.controlledBy
        ? gameState.players.find(p => p.id === currentPlayer.controlledBy)
        : currentPlayer;
      const opponentName = controller?.name || currentPlayer.name;
      const isBotTurn = currentPlayer.isBot || controller?.isBot;
      if (isBotTurn) {
        return `${opponentName} is thinking...`;
      }
      return `Waiting for ${opponentName} to ${gameState.phase === "draw" ? "draw" : "discard"} (${gameState.currentTurn})...`;
    }
    if (currentPlayer?.isBot) {
      return `${currentPlayer.name} is thinking...`;
    }
    const nameLabel = currentPlayer?.name || gameState.currentTurn;
    return `Waiting for ${nameLabel} to ${gameState.phase === "draw" ? "draw" : "discard"}...`;
  }

  const otherPlayers = gameState.players.filter(p => {
    if (p.seat === gameState.mySeat) return false;
    if (gameState.gameMode === "2-player" && gameState.mySeats.includes(p.seat)) return false;
    return true;
  });

  const isSiamese = gameState.gameMode === "2-player";

  const opponentInfo = isSiamese ? (() => {
    const opponentSeats = otherPlayers;
    const mainOpponent = opponentSeats.find(p => !p.controlledBy) || opponentSeats[0];
    const partnerOpponent = opponentSeats.find(p => p.controlledBy === mainOpponent?.id);
    return mainOpponent ? { main: mainOpponent, partner: partnerOpponent } : null;
  })() : null;

  const acrossPlayer = otherPlayers.find(p => getRelativePosition(gameState.mySeat, p.seat) === "Across");
  const leftPlayer = otherPlayers.find(p => getRelativePosition(gameState.mySeat, p.seat) === "Left");
  const rightPlayer = otherPlayers.find(p => getRelativePosition(gameState.mySeat, p.seat) === "Right");

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-stone-800" data-testid="game-board">

      <div className="flex items-center justify-between gap-2 px-2 py-1.5 bg-stone-900/90 border-b border-stone-700 flex-wrap z-10">
        <div className="flex items-center gap-2">
          <h1 className="text-sm sm:text-base font-bold text-white tracking-wide" data-testid="text-title">
            American Mahjong
          </h1>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-stone-400" data-testid="text-room-code-header">
              {gameState.roomCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="text-stone-400 hover:text-white transition-colors"
              data-testid="button-copy-code"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <span
            className={`inline-block px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold ${
              gameState.phase === "calling"
                ? "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                : isMyTurn && gameState.phase === "discard"
                  ? "bg-orange-500/30 text-orange-300 border border-orange-500/40"
                  : isMyTurn && gameState.phase === "draw"
                    ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                    : gameState.phase === "won"
                      ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                      : "bg-blue-500/30 text-blue-300 border border-blue-500/40"
            }`}
            data-testid="text-phase"
          >
            {gameState.phase === "won"
              ? "Game Over"
              : gameState.phase === "calling"
                ? "Calling"
                : isMyTurn
                  ? (gameState.phase === "draw"
                    ? (isSiamese ? "Draw" : `${isPlayingPartner ? displaySeat + "'s" : "Your"} Draw`)
                    : (isSiamese
                      ? (<><span className="sm:hidden">Discard</span><span className="hidden sm:inline">Discard / Transfer</span></>)
                      : `${isPlayingPartner ? displaySeat + "'s" : "Your"} Discard`))
                  : `${gameState.currentTurn}'s turn`
            }
          </span>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDiscardMobile(!showDiscardMobile)}
            className="sm:hidden h-7 px-2 text-xs bg-stone-800 border-stone-600 text-stone-300 hover:text-white"
            data-testid="button-show-discards-mobile"
          >
            <Layers className="w-3 h-3" />
            <span className="ml-1">{gameState.discardPile.length}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleHints}
            className={`h-7 px-2 text-xs bg-stone-800 border-stone-600 text-stone-300 hover:text-white ${showHints ? "bg-blue-900/50 border-blue-600 text-blue-300" : ""}`}
            data-testid="button-hint"
          >
            <Lightbulb className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleAutoShowHints}
            className={`h-7 px-2 text-xs bg-stone-800 border-stone-600 text-stone-300 hover:text-white ${autoShowHints ? "bg-emerald-900/50 border-emerald-600 text-emerald-300" : ""}`}
            data-testid="button-auto-hints"
          >
            <Eye className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSort(activeControlSeat || undefined)}
            className="h-7 px-2 text-xs bg-stone-800 border-stone-600 text-stone-300 hover:text-white"
            data-testid="button-sort"
          >
            <ArrowUpDown className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={cycleTileStyle}
            className="h-7 px-2 text-xs bg-stone-800 border-stone-600 text-stone-300 hover:text-white"
            data-testid="button-tile-style"
          >
            <Palette className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className={`h-7 px-2 text-xs bg-stone-800 border-stone-600 text-stone-300 hover:text-white ${theme === "jade" ? "bg-emerald-900/50 border-emerald-600 text-emerald-300" : ""}`}
            data-testid="button-theme-toggle"
          >
            <Gem className="w-3 h-3" />
          </Button>
          {isSiamese && onTestSiameseWin && gameState.phase !== "won" && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTestSiameseWin}
              className="h-7 px-2 text-xs bg-stone-800 border-amber-600 text-amber-300 hover:text-amber-200"
              data-testid="button-test-siamese-win"
            >
              <FlaskConical className="w-3 h-3" />
            </Button>
          )}
          {onForfeit && gameState.phase !== "won" && (
            confirmForfeit ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-red-300">Forfeit?</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { onForfeit(); setConfirmForfeit(false); }}
                  className="h-7 px-2 text-xs bg-red-900/50 border-red-600 text-red-300"
                  data-testid="button-forfeit-confirm"
                >
                  Yes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmForfeit(false)}
                  className="h-7 px-2 text-xs bg-stone-800 border-stone-600 text-stone-300"
                  data-testid="button-forfeit-cancel"
                >
                  No
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmForfeit(true)}
                className="h-7 px-2 text-xs bg-stone-800 border-red-600/50 text-red-400/70"
                data-testid="button-forfeit"
              >
                <Flag className="w-3 h-3" />
              </Button>
            )
          )}
        </div>
      </div>

      <div
        className={`text-center py-1 text-xs sm:text-sm font-medium ${
          isMyTurn
            ? "bg-emerald-600/80 text-white"
            : gameState.phase === "won"
              ? "bg-amber-600/80 text-white"
              : gameState.phase === "calling"
                ? "bg-purple-600/80 text-white"
                : "bg-stone-700/80 text-stone-200"
        }`}
        data-testid="status-bar"
      >
        {(() => {
          const msg = getStatusMessage();
          const currentPlayer = gameState.players.find(p => p.seat === gameState.currentTurn);
          const isBotThinking = !isMyTurn && gameState.phase !== "won" && gameState.phase !== "calling" && currentPlayer?.isBot;
          if (isBotThinking) {
            return (
              <span className="inline-flex items-center gap-1.5" data-testid="bot-thinking-indicator">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {msg}
              </span>
            );
          }
          return msg;
        })()}
      </div>

      {disconnectedPlayer && (
        <div
          className="px-4 py-2 bg-amber-600/80 flex items-center justify-center gap-3"
          data-testid="banner-disconnected"
        >
          <WifiOff className="w-4 h-4 text-white shrink-0" />
          <span className="text-xs font-medium text-white">
            Waiting for {disconnectedPlayer.playerName} ({disconnectedPlayer.seat}) to reconnect...
          </span>
          <span className="flex items-center gap-1 text-xs text-amber-200">
            <Clock className="w-3 h-3" />
            <ReconnectCountdown timeoutAt={disconnectedPlayer.timeoutAt} />
          </span>
        </div>
      )}

      {timedOutPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="dialog-timeout">
          <div className="bg-card border border-border rounded-md p-6 max-w-sm w-full mx-4 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground" data-testid="text-timeout-title">Player Disconnected</h3>
                <p className="text-sm text-muted-foreground">
                  {timedOutPlayer.playerName} ({timedOutPlayer.seat}) didn't reconnect in time.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">What would you like to do?</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => onTimeoutAction("end")} variant="outline" data-testid="button-timeout-end">
                <X className="w-4 h-4 mr-2" />
                End Game
              </Button>
              <Button onClick={() => onTimeoutAction("wait")} variant="outline" data-testid="button-timeout-wait">
                <Clock className="w-4 h-4 mr-2" />
                Keep Waiting
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 relative overflow-hidden" style={{ perspective: "900px" }}>
          <div
            className="absolute inset-0 bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-700 border-4 sm:border-8 border-stone-600 shadow-inner"
            style={{ transform: "rotateX(8deg)", transformOrigin: "center bottom" }}
          >
            <div className="absolute inset-0 opacity-15" style={{
              backgroundImage: "radial-gradient(circle at 2px 2px, rgba(0,0,0,0.15) 1px, transparent 0)",
              backgroundSize: "10px 10px",
            }} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/5 pointer-events-none" />

            <div className="absolute inset-0 flex flex-col p-1 sm:p-2">
              {isSiamese ? (
                <>
                  <div className="flex justify-center pt-1" data-testid="player-card-opponent">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md ${
                      otherPlayers.some(p => p.seat === gameState.currentTurn)
                        ? "bg-emerald-500/20 border border-emerald-400/40"
                        : "bg-black/30 border border-white/10"
                    }`}>
                      {opponentInfo && (
                        <>
                          <div className={`w-2 h-2 rounded-full ${opponentInfo.main.connected ? (opponentInfo.main.isBot ? "bg-blue-400" : "bg-emerald-400") : "bg-red-400"}`} />
                          <span className="text-xs font-bold text-white/90">{opponentInfo.main.name}</span>
                          {opponentInfo.main.isBot && <Bot className="w-3 h-3 text-blue-400 shrink-0" data-testid="bot-icon-opponent" />}
                          <span className="text-[10px] text-white/50 ml-1">R1: {opponentInfo.main.handCount}</span>
                          {opponentInfo.partner && <span className="text-[10px] text-white/50">R2: {opponentInfo.partner.handCount}</span>}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative w-[180px] h-[80px] sm:w-[240px] sm:h-[100px]">
                        {Array.from({ length: Math.min(30, gameState.wallCount) }).map((_, i) => (
                          <div
                            key={`pool-${i}`}
                            className="absolute rounded-sm bg-gradient-to-b from-rose-100 to-rose-200 dark:from-rose-300/70 dark:to-rose-400/70 border border-rose-300/50 shadow-sm"
                            style={{
                              width: isMobile ? "14px" : "18px",
                              height: isMobile ? "18px" : "22px",
                              left: `${15 + (i % 8) * (isMobile ? 16 : 22) + (i > 15 ? 6 : 0)}px`,
                              top: `${10 + Math.floor(i / 8) * (isMobile ? 20 : 26) + (i % 3) * 2}px`,
                              transform: `rotate(${(i * 17 + i * i * 3) % 30 - 15}deg)`,
                              zIndex: i,
                            }}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-xs font-bold text-white/50 uppercase tracking-wider">
                          Pool: {gameState.wallCount}
                        </span>
                        <span className="text-[10px] sm:text-xs text-white/30">|</span>
                        <span className="text-[10px] sm:text-xs font-bold text-white/50 uppercase tracking-wider" data-testid="text-discard-count">
                          Discards: {gameState.discardPile.length}
                        </span>
                      </div>

                      <div
                        className="hidden sm:flex flex-wrap gap-0.5 justify-center max-w-[260px] md:max-w-[320px] max-h-[80px] overflow-y-auto p-1.5 bg-black/15 rounded-md"
                        data-testid="discard-pile-list"
                      >
                        {gameState.discardPile.length === 0 ? (
                          <p className="text-xs italic text-white/30">No discards yet</p>
                        ) : (
                          gameState.discardPile.map((tile, i) => (
                            <motion.div
                              key={tile.id}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                              className={`${zombieBlankSelected && tile.suit !== "Blank" ? "cursor-pointer ring-2 ring-green-400 rounded-sm" : ""}`}
                              onClick={() => {
                                if (zombieBlankSelected && tile.suit !== "Blank") {
                                  onZombieExchange(zombieBlankSelected, tile.id);
                                  setZombieBlankSelected(null);
                                }
                              }}
                              data-testid={`discard-tile-${i}`}
                            >
                              <Tile tile={tile} size="xs" dimmed={zombieBlankSelected ? tile.suit === "Blank" : false} />
                            </motion.div>
                          ))
                        )}
                      </div>
                      <div
                        className="sm:hidden flex flex-wrap gap-0.5 justify-center max-w-[200px] max-h-[50px] overflow-hidden p-1 bg-black/15 rounded-md"
                        onClick={() => setShowDiscardMobile(true)}
                        data-testid="discard-pile-list-mobile"
                      >
                        {gameState.discardPile.length === 0 ? (
                          <p className="text-[10px] italic text-white/30">No discards</p>
                        ) : (
                          gameState.discardPile.slice(-6).map((tile, i) => (
                            <div key={tile.id} className="scale-75 origin-center" data-testid={`discard-tile-mobile-preview-${i}`}>
                              <Tile tile={tile} size="xs" />
                            </div>
                          ))
                        )}
                        {gameState.discardPile.length > 6 && (
                          <span className="text-[9px] text-white/40">+{gameState.discardPile.length - 6}</span>
                        )}
                      </div>

                      {isMyTurn && gameState.phase === "draw" && (
                        <Button
                          onClick={() => onDraw(activeControlSeat || undefined)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg"
                          data-testid="button-draw"
                        >
                          Draw from Pool
                        </Button>
                      )}
                      {!isMyTurn && gameState.phase !== "won" && gameState.phase !== "calling" && (
                        <p className="text-white/40 text-xs text-center inline-flex items-center gap-1.5 justify-center">
                          {(() => {
                            const cp = gameState.players.find(p => p.seat === gameState.currentTurn);
                            if (cp?.isBot) return (<><Loader2 className="w-3 h-3 animate-spin" />{cp.name} is thinking...</>);
                            return <>Waiting for {cp?.name || gameState.currentTurn}...</>;
                          })()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center pb-1">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md ${
                      gameState.mySeat === gameState.currentTurn
                        ? "bg-emerald-500/20 border border-emerald-400/40"
                        : "bg-black/30 border border-white/10"
                    }`}>
                      <span className="text-xs font-bold text-white/90">
                        {gameState.players.find(p => p.seat === gameState.mySeat)?.name || "You"}
                      </span>
                      <span className="text-[10px] text-white/50">{gameState.mySeat}</span>
                      {gameState.mySeat === gameState.currentTurn && (
                        <span className="text-[10px] font-bold text-emerald-300 uppercase animate-pulse">Your Turn</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start">
                    <div className="w-8 sm:w-12" />
                    <div className="flex-1 flex justify-center">
                      <div className="flex items-center gap-px">
                        {Array.from({ length: Math.min(18, Math.ceil(gameState.wallCount / 4)) }).map((_, i) => (
                          <div key={`wall-top-${i}`} className="w-3 h-4 sm:w-4 sm:h-5 rounded-sm bg-gradient-to-b from-rose-100 to-rose-200 dark:from-rose-300/60 dark:to-rose-400/60 border border-rose-300/50 shadow-sm" />
                        ))}
                      </div>
                    </div>
                    <div className="w-8 sm:w-12" />
                  </div>

                  <div className="flex-1 flex min-h-0">
                    <div className="flex flex-col items-center justify-center gap-px w-8 sm:w-12">
                      {Array.from({ length: Math.min(8, Math.ceil(gameState.wallCount / 4)) }).map((_, i) => (
                        <div key={`wall-left-${i}`} className="w-4 h-3 sm:w-5 sm:h-4 rounded-sm bg-gradient-to-b from-rose-100 to-rose-200 dark:from-rose-300/60 dark:to-rose-400/60 border border-rose-300/50 shadow-sm" />
                      ))}
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-between min-h-0 py-1">
                      {acrossPlayer ? (
                        <div className="flex items-start gap-2" data-testid={`player-card-${acrossPlayer.seat.toLowerCase()}`}>
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${
                            acrossPlayer.seat === gameState.currentTurn
                              ? "bg-emerald-500/20 border border-emerald-400/40"
                              : "bg-black/30 border border-white/10"
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${acrossPlayer.connected ? (acrossPlayer.isBot ? "bg-blue-400" : "bg-emerald-400") : "bg-red-400"}`} />
                            <span className="text-xs font-bold text-white/90 truncate max-w-[80px]">{acrossPlayer.name}</span>
                            {acrossPlayer.isBot && acrossPlayer.seat === gameState.currentTurn ? (
                              <Loader2 className="w-3 h-3 text-blue-400 shrink-0 animate-spin" data-testid={`bot-thinking-${acrossPlayer.seat.toLowerCase()}`} />
                            ) : acrossPlayer.isBot ? (
                              <Bot className="w-3 h-3 text-blue-400 shrink-0" />
                            ) : null}
                            <span className="text-[10px] text-white/50">{acrossPlayer.seat}</span>
                            <Hand className="w-3 h-3 text-white/60" />
                            <span className="text-[10px] text-white/60 font-mono">{acrossPlayer.handCount}</span>
                          </div>
                          {acrossPlayer.exposures.length > 0 && (
                            <div className="flex flex-col gap-0.5" data-testid={`exposed-sets-${acrossPlayer.seat.toLowerCase()}`}>
                              {acrossPlayer.exposures.map((group, gi) => {
                                const hasJoker = group.tiles.some(t => t.suit === "Joker");
                                const nonJoker = group.tiles.find(t => !t.isJoker);
                                const canSwap = isMyTurn && (gameState.phase === "draw" || gameState.phase === "discard") && hasJoker;
                                const isSwapSelected = jokerSwapTarget?.seat === acrossPlayer.seat && jokerSwapTarget?.exposureIndex === gi;
                                return (
                                  <div
                                    key={gi}
                                    className={`flex items-center gap-0.5 rounded-md px-1 py-0.5 ${isSwapSelected ? "bg-amber-200/50 ring-2 ring-amber-400" : canSwap ? "bg-white/10 cursor-pointer" : "bg-white/10"}`}
                                    onClick={() => {
                                      if (canSwap && nonJoker) {
                                        setJokerSwapTarget(isSwapSelected ? null : { seat: acrossPlayer.seat, exposureIndex: gi, matchSuit: nonJoker.suit, matchValue: nonJoker.value });
                                      }
                                    }}
                                    data-testid={`exposure-group-${acrossPlayer.seat.toLowerCase()}-${gi}`}
                                  >
                                    {group.tiles.map(tile => (
                                      <Tile key={tile.id} tile={tile} size="xs" />
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : <div />}

                      <div className="flex items-center justify-between w-full flex-1 min-h-0">
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          {leftPlayer && (
                            <>
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                                leftPlayer.seat === gameState.currentTurn
                                  ? "bg-emerald-500/20 border border-emerald-400/40"
                                  : "bg-black/30 border border-white/10"
                              }`} data-testid={`player-card-${leftPlayer.seat.toLowerCase()}`}>
                                <div className={`w-2 h-2 rounded-full ${leftPlayer.connected ? (leftPlayer.isBot ? "bg-blue-400" : "bg-emerald-400") : "bg-red-400"}`} />
                                <span className="text-[10px] sm:text-xs font-bold text-white/90 truncate max-w-[60px]">{leftPlayer.name}</span>
                                {leftPlayer.isBot && leftPlayer.seat === gameState.currentTurn ? (
                                  <Loader2 className="w-3 h-3 text-blue-400 shrink-0 animate-spin" data-testid={`bot-thinking-${leftPlayer.seat.toLowerCase()}`} />
                                ) : leftPlayer.isBot ? (
                                  <Bot className="w-3 h-3 text-blue-400 shrink-0" />
                                ) : null}
                                <span className="text-[10px] text-white/50">{leftPlayer.seat}</span>
                              </div>
                              <span className="text-[10px] text-white/50 flex items-center gap-1"><Hand className="w-3 h-3" />{leftPlayer.handCount}</span>
                              {leftPlayer.exposures.length > 0 && (
                                <div className="flex flex-col gap-0.5" data-testid={`exposed-sets-${leftPlayer.seat.toLowerCase()}`}>
                                  {leftPlayer.exposures.map((group, gi) => {
                                    const hasJoker = group.tiles.some(t => t.suit === "Joker");
                                    const nonJoker = group.tiles.find(t => !t.isJoker);
                                    const canSwap = isMyTurn && (gameState.phase === "draw" || gameState.phase === "discard") && hasJoker;
                                    const isSwapSelected = jokerSwapTarget?.seat === leftPlayer.seat && jokerSwapTarget?.exposureIndex === gi;
                                    return (
                                      <div
                                        key={gi}
                                        className={`flex items-center gap-0.5 rounded-md px-1 py-0.5 ${isSwapSelected ? "bg-amber-200/50 ring-2 ring-amber-400" : canSwap ? "bg-white/10 cursor-pointer" : "bg-white/10"}`}
                                        onClick={() => {
                                          if (canSwap && nonJoker) {
                                            setJokerSwapTarget(isSwapSelected ? null : { seat: leftPlayer.seat, exposureIndex: gi, matchSuit: nonJoker.suit, matchValue: nonJoker.value });
                                          }
                                        }}
                                        data-testid={`exposure-group-${leftPlayer.seat.toLowerCase()}-${gi}`}
                                      >
                                        {group.tiles.map(tile => (
                                          <Tile key={tile.id} tile={tile} size="xs" />
                                        ))}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-2">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] sm:text-xs font-bold text-white/50 uppercase tracking-wider">
                                Wall: {gameState.wallCount}
                              </span>
                              <span className="text-[10px] sm:text-xs text-white/30">|</span>
                              <span className="text-[10px] sm:text-xs font-bold text-white/50 uppercase tracking-wider" data-testid="text-discard-count">
                                Discards: {gameState.discardPile.length}
                              </span>
                            </div>
                            <div
                              className="hidden sm:flex flex-wrap gap-0.5 justify-center max-w-[220px] md:max-w-[280px] lg:max-w-[360px] max-h-[100px] md:max-h-[140px] overflow-y-auto p-1.5 bg-black/15 rounded-md"
                              data-testid="discard-pile-list"
                            >
                              {gameState.discardPile.length === 0 ? (
                                <p className="text-xs italic text-white/30">No discards yet</p>
                              ) : (
                                gameState.discardPile.map((tile, i) => (
                                  <motion.div
                                    key={tile.id}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.2 }}
                                    className={`${zombieBlankSelected && tile.suit !== "Blank" ? "cursor-pointer ring-2 ring-green-400 rounded-sm" : ""}`}
                                    onClick={() => {
                                      if (zombieBlankSelected && tile.suit !== "Blank") {
                                        onZombieExchange(zombieBlankSelected, tile.id);
                                        setZombieBlankSelected(null);
                                      }
                                    }}
                                    data-testid={`discard-tile-${i}`}
                                  >
                                    <Tile tile={tile} size="xs" dimmed={zombieBlankSelected ? tile.suit === "Blank" : false} />
                                  </motion.div>
                                ))
                              )}
                            </div>
                            <div
                              className="sm:hidden flex flex-wrap gap-0.5 justify-center max-w-[200px] max-h-[50px] overflow-hidden p-1 bg-black/15 rounded-md"
                              onClick={() => { if (!zombieBlankSelected) setShowDiscardMobile(true); }}
                              data-testid="discard-pile-list-mobile"
                            >
                              {gameState.discardPile.length === 0 ? (
                                <p className="text-[10px] italic text-white/30">No discards</p>
                              ) : (
                                gameState.discardPile.slice(-6).map((tile, i) => (
                                  <div key={tile.id} className="scale-75 origin-center" data-testid={`discard-tile-mobile-preview-${i}`}>
                                    <Tile tile={tile} size="xs" />
                                  </div>
                                ))
                              )}
                              {gameState.discardPile.length > 6 && (
                                <span className="text-[9px] text-white/40">+{gameState.discardPile.length - 6}</span>
                              )}
                            </div>
                          </div>

                          {isMyTurn && gameState.phase === "draw" && (
                            <div className="mt-2">
                              <Button
                                onClick={() => onDraw(activeControlSeat || undefined)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg"
                                data-testid="button-draw"
                              >
                                Draw Tile
                              </Button>
                            </div>
                          )}
                          {!isMyTurn && gameState.phase !== "won" && gameState.phase !== "calling" && (
                            <p className="text-white/40 text-xs mt-1 text-center inline-flex items-center gap-1.5 justify-center">
                              {(() => {
                                const cp = gameState.players.find(p => p.seat === gameState.currentTurn);
                                if (cp?.isBot) return (<><Loader2 className="w-3 h-3 animate-spin" />{cp.name} is thinking...</>);
                                return <>Waiting for {cp?.name || gameState.currentTurn}...</>;
                              })()}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          {rightPlayer && (
                            <>
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                                rightPlayer.seat === gameState.currentTurn
                                  ? "bg-emerald-500/20 border border-emerald-400/40"
                                  : "bg-black/30 border border-white/10"
                              }`} data-testid={`player-card-${rightPlayer.seat.toLowerCase()}`}>
                                <div className={`w-2 h-2 rounded-full ${rightPlayer.connected ? (rightPlayer.isBot ? "bg-blue-400" : "bg-emerald-400") : "bg-red-400"}`} />
                                <span className="text-[10px] sm:text-xs font-bold text-white/90 truncate max-w-[60px]">{rightPlayer.name}</span>
                                {rightPlayer.isBot && rightPlayer.seat === gameState.currentTurn ? (
                                  <Loader2 className="w-3 h-3 text-blue-400 shrink-0 animate-spin" data-testid={`bot-thinking-${rightPlayer.seat.toLowerCase()}`} />
                                ) : rightPlayer.isBot ? (
                                  <Bot className="w-3 h-3 text-blue-400 shrink-0" />
                                ) : null}
                                <span className="text-[10px] text-white/50">{rightPlayer.seat}</span>
                              </div>
                              <span className="text-[10px] text-white/50 flex items-center gap-1"><Hand className="w-3 h-3" />{rightPlayer.handCount}</span>
                              {rightPlayer.exposures.length > 0 && (
                                <div className="flex flex-col gap-0.5" data-testid={`exposed-sets-${rightPlayer.seat.toLowerCase()}`}>
                                  {rightPlayer.exposures.map((group, gi) => {
                                    const hasJoker = group.tiles.some(t => t.suit === "Joker");
                                    const nonJoker = group.tiles.find(t => !t.isJoker);
                                    const canSwap = isMyTurn && (gameState.phase === "draw" || gameState.phase === "discard") && hasJoker;
                                    const isSwapSelected = jokerSwapTarget?.seat === rightPlayer.seat && jokerSwapTarget?.exposureIndex === gi;
                                    return (
                                      <div
                                        key={gi}
                                        className={`flex items-center gap-0.5 rounded-md px-1 py-0.5 ${isSwapSelected ? "bg-amber-200/50 ring-2 ring-amber-400" : canSwap ? "bg-white/10 cursor-pointer" : "bg-white/10"}`}
                                        onClick={() => {
                                          if (canSwap && nonJoker) {
                                            setJokerSwapTarget(isSwapSelected ? null : { seat: rightPlayer.seat, exposureIndex: gi, matchSuit: nonJoker.suit, matchValue: nonJoker.value });
                                          }
                                        }}
                                        data-testid={`exposure-group-${rightPlayer.seat.toLowerCase()}-${gi}`}
                                      >
                                        {group.tiles.map(tile => (
                                          <Tile key={tile.id} tile={tile} size="xs" />
                                        ))}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white/70">
                          {gameState.players.find(p => p.seat === gameState.mySeat)?.name || "You"} ({gameState.mySeat})
                        </span>
                        {gameState.mySeat === gameState.currentTurn && (
                          <span className="text-[10px] font-bold text-emerald-300 uppercase animate-pulse">Your Turn</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-px w-8 sm:w-12">
                      {Array.from({ length: Math.min(8, Math.ceil(gameState.wallCount / 4)) }).map((_, i) => (
                        <div key={`wall-right-${i}`} className="w-4 h-3 sm:w-5 sm:h-4 rounded-sm bg-gradient-to-b from-rose-100 to-rose-200 dark:from-rose-300/60 dark:to-rose-400/60 border border-rose-300/50 shadow-sm" />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-end">
                    <div className="w-8 sm:w-12" />
                    <div className="flex-1 flex justify-center">
                      <div className="flex items-center gap-px">
                        {Array.from({ length: Math.min(18, Math.ceil(gameState.wallCount / 4)) }).map((_, i) => (
                          <div key={`wall-bottom-${i}`} className="w-3 h-4 sm:w-4 sm:h-5 rounded-sm bg-gradient-to-b from-rose-100 to-rose-200 dark:from-rose-300/60 dark:to-rose-400/60 border border-rose-300/50 shadow-sm" />
                        ))}
                      </div>
                    </div>
                    <div className="w-8 sm:w-12" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showHints && hints && (
            <div className="px-3 py-2 bg-stone-900/90 border-t border-stone-700">
              <HintPanel
                closest={hints.closest}
                bestHint={hints.bestHint}
                tilesAway={hints.tilesAway}
                activeSuggestionPattern={activeSuggestionPattern}
                onSelectPattern={onSelectPattern}
              />
            </div>
          )}
        </AnimatePresence>

        <div className="bg-stone-900/95 border-t-2 border-stone-600 p-2 sm:p-3" data-testid="player-hand-area">
          {isSiamese && gameState.partnerHand ? (
            <>
              {isMyTurn && (gameState.phase === "draw" || gameState.phase === "discard") && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTransferMode(!transferMode)}
                    className={`h-7 text-xs ${transferMode ? "bg-purple-900/50 border-purple-600 text-purple-300" : "bg-stone-800 border-stone-600 text-stone-300"}`}
                    data-testid="button-transfer-mode"
                  >
                    <ArrowLeftRight className="w-3 h-3 mr-1" />
                    {transferMode ? "Transfer On" : "Transfer"}
                  </Button>
                  <span className="text-[10px] text-stone-400">
                    {transferMode
                      ? "Click a tile to move it to your other rack"
                      : gameState.phase === "discard" ? "Click a tile to discard" : "Draw or transfer"
                    }
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider text-center mb-1" data-testid="text-hand-label">
                    Rack 1 ({gameState.myHand.length}) - {gameState.mySeat}
                  </h3>
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1 p-2 bg-stone-800/80 rounded-md border border-stone-700 flex-wrap" data-testid="hand-main">
                    {gameState.myHand.map((tile, idx) => {
                      const isHighlighted = highlightedTileIds.has(tile.id);
                      const partnerSeat = gameState.mySeats.find(s => s !== gameState.mySeat);
                      const isDragOver = dragOverIndex === idx && dragIndexRef.current !== idx;
                      return (
                        <div
                          key={tile.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={(e) => handleDrop(e, idx, gameState.myHand, gameState.mySeat)}
                          className={`relative cursor-grab active:cursor-grabbing transition-transform duration-150 ${
                            isDragOver ? "scale-110 -translate-y-1" : ""
                          } ${
                            zombieBlankSelected === tile.id
                              ? "ring-2 ring-green-400 rounded-md scale-105 -translate-y-1"
                              : tile.suit === "Blank" && canZombieExchange && !zombieBlankSelected
                                ? "ring-1 ring-green-400/50 rounded-md"
                                : isHighlighted && activeSuggestionPattern
                                  ? "ring-2 ring-blue-400 rounded-md"
                                  : ""
                          }`}
                          data-testid={`hand-tile-${idx}`}
                        >
                          {isDragOver && (
                            <div className="absolute -left-0.5 top-0 bottom-0 w-1 bg-blue-400 rounded-full z-10" />
                          )}
                          <Tile
                            tile={tile}
                            size={tileSize}
                            isInteractive={
                              tile.suit === "Blank" && gameState.zombieBlanks?.enabled && canZombieExchange
                                ? true
                                : isMyTurn && (gameState.phase === "discard" || (gameState.phase === "draw" && transferMode))
                            }
                            onClick={() => {
                              if (tile.suit === "Blank" && gameState.zombieBlanks?.enabled && canZombieExchange) {
                                setZombieBlankSelected(zombieBlankSelected === tile.id ? null : tile.id);
                              } else if (transferMode && partnerSeat) {
                                onTransfer(tile.id, gameState.mySeat, partnerSeat);
                              } else if (gameState.phase === "discard" && !zombieBlankSelected) {
                                onDiscard(tile.id, gameState.mySeat);
                              }
                            }}
                            dimmed={zombieBlankSelected ? zombieBlankSelected !== tile.id : (activeSuggestionPattern ? !isHighlighted : false)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider text-center mb-1" data-testid="text-partner-hand-label">
                    Rack 2 ({gameState.partnerHand.length}) - {gameState.mySeats.find(s => s !== gameState.mySeat)}
                  </h3>
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1 p-2 bg-stone-800/80 rounded-md border border-stone-700 flex-wrap" data-testid="hand-partner">
                    {gameState.partnerHand.map((tile, idx) => {
                      const partnerSeat = gameState.mySeats.find(s => s !== gameState.mySeat)!;
                      const isDragOver = dragOverIndex === idx && dragIndexRef.current !== idx;
                      return (
                        <div
                          key={tile.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={(e) => handleDrop(e, idx, gameState.partnerHand!, partnerSeat)}
                          className={`relative cursor-grab active:cursor-grabbing transition-transform duration-150 ${
                            isDragOver ? "scale-110 -translate-y-1" : ""
                          } ${
                            zombieBlankSelected === tile.id
                              ? "ring-2 ring-green-400 rounded-md scale-105 -translate-y-1"
                              : tile.suit === "Blank" && canZombieExchange && !zombieBlankSelected
                                ? "ring-1 ring-green-400/50 rounded-md"
                                : ""
                          }`}
                          data-testid={`partner-tile-${idx}`}
                        >
                          {isDragOver && (
                            <div className="absolute -left-0.5 top-0 bottom-0 w-1 bg-blue-400 rounded-full z-10" />
                          )}
                          <Tile
                            tile={tile}
                            size={tileSize}
                            isInteractive={
                              tile.suit === "Blank" && gameState.zombieBlanks?.enabled && canZombieExchange
                                ? true
                                : isMyTurn && (gameState.phase === "discard" || (gameState.phase === "draw" && transferMode))
                            }
                            onClick={() => {
                              if (tile.suit === "Blank" && gameState.zombieBlanks?.enabled && canZombieExchange) {
                                setZombieBlankSelected(zombieBlankSelected === tile.id ? null : tile.id);
                              } else if (transferMode) {
                                onTransfer(tile.id, partnerSeat, gameState.mySeat);
                              } else if (gameState.phase === "discard" && !zombieBlankSelected) {
                                onDiscard(tile.id, partnerSeat);
                              }
                            }}
                            dimmed={zombieBlankSelected ? zombieBlankSelected !== tile.id : false}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider" data-testid="text-hand-label">
                  Your <GameTooltip term="hand">Hand</GameTooltip> ({displayHand.length}) - {displaySeat}
                </h3>
                {jokerSwapTarget ? (
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-400 animate-pulse" data-testid="text-swap-instruction">
                      Click a matching tile to swap for the Joker
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setJokerSwapTarget(null)}
                      className="h-6 px-2 text-xs text-stone-400"
                      data-testid="button-cancel-swap"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </span>
                ) : isMyTurn && gameState.phase === "discard" ? (
                  <span className="text-[10px] font-bold text-orange-400 animate-pulse">
                    Click a tile to discard
                  </span>
                ) : null}
              </div>

              {(() => {
                const myPlayer = gameState.players.find(p => p.seat === displaySeat);
                return myPlayer && myPlayer.exposures.length > 0 ? (
                  <div className="mb-1.5" data-testid="my-exposed-sets">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {myPlayer.exposures.map((group, gi) => (
                        <div
                          key={gi}
                          className="flex items-center gap-0.5 bg-stone-800/60 rounded-md px-1.5 py-1 border border-stone-700"
                          data-testid={`my-exposure-group-${gi}`}
                        >
                          {group.tiles.map(tile => (
                            <div key={tile.id} className="relative">
                              <Tile tile={tile} size={tileSize} data-testid={`my-exposure-tile-${tile.id}`} />
                              {tile.id === group.fromDiscardId && (
                                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-orange-400 border border-orange-500" data-testid={`my-discard-marker-${tile.id}`} />
                              )}
                            </div>
                          ))}
                          <span className="text-[10px] text-stone-500 ml-1 capitalize">{group.claimType}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="flex items-end justify-center gap-1 w-full flex-wrap">
                <div className="flex items-center justify-center gap-0.5 sm:gap-1 p-2 sm:p-3 bg-stone-800/80 rounded-md border border-stone-700 flex-wrap" data-testid="hand-main">
                  {displayHand.map((tile, idx) => {
                    const isHighlighted = highlightedTileIds.has(tile.id);
                    const isSwapMatch = jokerSwapTarget && !tile.isJoker &&
                      tile.suit === jokerSwapTarget.matchSuit &&
                      tile.value === jokerSwapTarget.matchValue;
                    const isDragOver = dragOverIndex === idx && dragIndexRef.current !== idx;
                    return (
                      <div
                        key={tile.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx, displayHand, activeControlSeat || undefined)}
                        className={`relative cursor-grab active:cursor-grabbing transition-transform duration-150 ${
                          isDragOver ? "scale-110 -translate-y-1" : ""
                        } ${
                          zombieBlankSelected === tile.id
                            ? "ring-2 ring-green-400 rounded-md scale-105 -translate-y-1"
                            : tile.suit === "Blank" && canZombieExchange && !zombieBlankSelected
                              ? "ring-1 ring-green-400/50 rounded-md"
                              : isSwapMatch
                                ? "ring-2 ring-amber-400 rounded-md"
                                : isHighlighted && activeSuggestionPattern
                                  ? "ring-2 ring-blue-400 rounded-md"
                                  : ""
                        }`}
                        data-testid={`hand-tile-${idx}`}
                      >
                        {isDragOver && (
                          <div className="absolute -left-0.5 top-0 bottom-0 w-1 bg-blue-400 rounded-full z-10" />
                        )}
                        <Tile
                          tile={tile}
                          size={tileSize}
                          isInteractive={
                            zombieBlankSelected === tile.id
                              ? true
                              : jokerSwapTarget
                                ? !!isSwapMatch
                                : tile.suit === "Blank" && gameState.zombieBlanks?.enabled && canZombieExchange
                                  ? true
                                  : (isMyTurn && gameState.phase === "discard")
                          }
                          onClick={() => {
                            if (tile.suit === "Blank" && gameState.zombieBlanks?.enabled && canZombieExchange) {
                              setZombieBlankSelected(zombieBlankSelected === tile.id ? null : tile.id);
                              setJokerSwapTarget(null);
                            } else if (jokerSwapTarget && isSwapMatch) {
                              onSwapJoker(tile.id, jokerSwapTarget.seat, jokerSwapTarget.exposureIndex);
                              setJokerSwapTarget(null);
                            } else if (!jokerSwapTarget && !zombieBlankSelected) {
                              onDiscard(tile.id, activeControlSeat || undefined);
                            }
                          }}
                          dimmed={
                            zombieBlankSelected
                              ? zombieBlankSelected !== tile.id
                              : jokerSwapTarget
                                ? !isSwapMatch
                                : (activeSuggestionPattern ? !isHighlighted : false)
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showDiscardMobile && (
        <div className="fixed inset-0 z-40 sm:hidden" data-testid="discard-pile-mobile">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDiscardMobile(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-stone-900 border-t border-stone-700 rounded-t-lg max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-stone-700">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Discarded Tiles
                </h3>
                <p className="text-xs text-stone-400">
                  {gameState.discardPile.length} tile{gameState.discardPile.length !== 1 ? "s" : ""}
                  {gameState.lastDiscardedBy && gameState.lastDiscard && (
                    <span className="ml-1">(last by {gameState.lastDiscardedBy})</span>
                  )}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowDiscardMobile(false)} className="text-stone-400" data-testid="button-close-discards">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {gameState.discardPile.length === 0 ? (
                <p className="text-sm italic text-stone-500 text-center py-4">No discards yet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 content-start">
                  {gameState.discardPile.map((tile, i) => (
                    <motion.div
                      key={tile.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`${zombieBlankSelected && tile.suit !== "Blank" ? "cursor-pointer ring-2 ring-green-400 rounded-sm" : ""}`}
                      onClick={() => {
                        if (zombieBlankSelected && tile.suit !== "Blank") {
                          onZombieExchange(zombieBlankSelected, tile.id);
                          setZombieBlankSelected(null);
                          setShowDiscardMobile(false);
                        }
                      }}
                      data-testid={`discard-tile-mobile-${i}`}
                    >
                      <Tile tile={tile} size="xs" dimmed={zombieBlankSelected ? tile.suit === "Blank" : false} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
