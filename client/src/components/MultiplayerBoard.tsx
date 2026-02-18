import { motion, AnimatePresence } from "framer-motion";
import { type Tile as TileType, type ClientRoomView, type PlayerSeat, type DisconnectedPlayerInfo, type TimeoutAction, SEAT_ORDER } from "@shared/schema";
import { type PatternMatch } from "@shared/patterns";
import { Tile, TileBack } from "./Tile";
import { HintPanel } from "./HintPanel";
import { GameTooltip } from "./GameTooltip";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Lightbulb, Palette, Copy, Check, Hand, WifiOff, Clock, X, Bot, Gem, Layers, FlaskConical, Flag, Loader2 } from "lucide-react";
import { useTileStyle } from "@/hooks/use-tile-style";
import { useTheme } from "@/hooks/use-theme";
import { useMatTheme, MAT_COLORS, MAT_LABELS } from "@/hooks/use-mat-theme";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";

interface MultiplayerBoardProps {
  gameState: ClientRoomView;
  isMyTurn: boolean;
  activeControlSeat: PlayerSeat | null;
  showHints: boolean;

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

  onTimeoutAction,
  onSelectPattern,
  onSwapJoker,
  onZombieExchange,
  onTestSiameseWin,
  onForfeit,
}: MultiplayerBoardProps) {
  const { tileStyle, cycleTileStyle } = useTileStyle();
  const { theme, toggleTheme } = useTheme();
  const { matTheme, cycleMatTheme } = useMatTheme();
  const mat = MAT_COLORS[matTheme];
  const [copied, setCopied] = useState(false);
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
  const [dragSourceRack, setDragSourceRack] = useState<"main" | "partner" | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverRack, setDragOverRack] = useState<"main" | "partner" | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number, rack: "main" | "partner") => {
    dragIndexRef.current = index;
    setDragSourceRack(rack);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${rack}:${index}`);
    const target = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => target.style.opacity = "0.4");
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    dragIndexRef.current = null;
    setDragSourceRack(null);
    setDragOverIndex(null);
    setDragOverRack(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number, rack: "main" | "partner") => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
    setDragOverRack(rack);
  }, []);

  const handleRackDragOver = useCallback((e: React.DragEvent, rack: "main" | "partner") => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverRack(rack);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number, hand: TileType[], forSeat?: PlayerSeat, dropRack?: "main" | "partner") => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    const fromRack = dragSourceRack;

    if (fromIndex === null) {
      setDragOverIndex(null);
      setDragOverRack(null);
      return;
    }

    const isSiameseMode = !!gameState.partnerHand && gameState.mySeats.length > 1;
    if (isSiameseMode && fromRack && dropRack && fromRack !== dropRack) {
      const partnerSeat = gameState.mySeats.find(s => s !== gameState.mySeat);
      if (partnerSeat) {
        const sourceHand = fromRack === "main" ? gameState.myHand : gameState.partnerHand!;
        const tile = sourceHand[fromIndex];
        if (tile) {
          const sourceSeat = fromRack === "main" ? gameState.mySeat : partnerSeat;
          const targetSeat = fromRack === "main" ? partnerSeat : gameState.mySeat;
          onTransfer(tile.id, sourceSeat, targetSeat);
        }
      }
    } else if (fromIndex !== dropIndex) {
      const reordered = [...hand];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(dropIndex, 0, moved);
      onReorderHand(reordered.map(t => t.id), forSeat);
    }

    dragIndexRef.current = null;
    setDragSourceRack(null);
    setDragOverIndex(null);
    setDragOverRack(null);
  }, [onReorderHand, onTransfer, dragSourceRack, gameState.partnerHand, gameState.mySeats, gameState.mySeat, gameState.myHand]);

  const handleRackDrop = useCallback((e: React.DragEvent, dropRack: "main" | "partner") => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    const fromRack = dragSourceRack;

    if (fromIndex === null || !fromRack || fromRack === dropRack) {
      setDragOverIndex(null);
      setDragOverRack(null);
      return;
    }

    const partnerSeat = gameState.mySeats.find(s => s !== gameState.mySeat);
    if (partnerSeat) {
      const sourceHand = fromRack === "main" ? gameState.myHand : gameState.partnerHand!;
      const tile = sourceHand[fromIndex];
      if (tile) {
        const sourceSeat = fromRack === "main" ? gameState.mySeat : partnerSeat;
        const targetSeat = fromRack === "main" ? partnerSeat : gameState.mySeat;
        onTransfer(tile.id, sourceSeat, targetSeat);
      }
    }

    dragIndexRef.current = null;
    setDragSourceRack(null);
    setDragOverIndex(null);
    setDragOverRack(null);
  }, [onTransfer, dragSourceRack, gameState.partnerHand, gameState.mySeats, gameState.mySeat, gameState.myHand]);

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
        return "Your turn - drag tiles between racks or click to discard.";
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

      <div className={`flex items-center justify-between gap-2 px-2 py-1.5 ${mat.headerBg} border-b ${mat.headerBorder} flex-wrap z-10`}>
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
                      ? "Discard"
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
          <Button variant="outline" size="sm" onClick={() => onSort(activeControlSeat || undefined)}
            className="h-7 px-2 text-xs bg-stone-800 border-stone-600 text-stone-300 hover:text-white"
            data-testid="button-sort"
          >
            <ArrowUpDown className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { cycleTileStyle(); cycleMatTheme(); }}
            className="h-7 px-2 text-xs bg-stone-800 border-stone-600 text-stone-300 hover:text-white"
            data-testid="button-tile-style"
            title={`Style: ${tileStyle} / ${MAT_LABELS[matTheme]}`}
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
            className={`absolute inset-0 bg-gradient-to-b ${mat.tableFrom} ${mat.tableVia} ${mat.tableTo} ${mat.borderWidth} ${mat.borderColor} shadow-inner`}
            style={{ transform: "rotateX(8deg)", transformOrigin: "center bottom" }}
          >
            {mat.surfaceTexture === "dots" && (
              <div className={`absolute inset-0 ${mat.dotOpacity}`} style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, ${mat.dotColor} 1px, transparent 0)`,
                backgroundSize: "10px 10px",
              }} />
            )}
            {mat.surfaceTexture === "linen" && (
              <div className={`absolute inset-0 ${mat.dotOpacity}`} style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23ffffff' fill-opacity='0.06'/%3E%3C/svg%3E")`,
              }} />
            )}
            <div className={`absolute inset-0 bg-gradient-to-b ${mat.surfaceOverlay} pointer-events-none`} />

            {mat.innerBorderColor !== "transparent" && (
              <div className="absolute inset-2 sm:inset-3 pointer-events-none rounded-sm" style={{
                border: `1px solid ${mat.innerBorderColor}`,
              }} />
            )}

            {mat.centerMotif === "tong" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg className="w-28 h-28 sm:w-44 sm:h-44 md:w-56 md:h-56 opacity-60" viewBox="0 0 200 200" fill="none">
                  <circle cx="100" cy="100" r="90" stroke={mat.centerMotifColor} strokeWidth="2.5" />
                  <circle cx="100" cy="100" r="80" stroke={mat.centerMotifColor} strokeWidth="1" />
                  <circle cx="100" cy="100" r="35" stroke={mat.centerMotifColor} strokeWidth="2" />
                  <rect x="88" y="88" width="24" height="24" rx="2" stroke={mat.centerMotifColor} strokeWidth="2" fill="none" />
                  <line x1="100" y1="65" x2="100" y2="88" stroke={mat.centerMotifColor} strokeWidth="1.5" />
                  <line x1="100" y1="112" x2="100" y2="135" stroke={mat.centerMotifColor} strokeWidth="1.5" />
                  <line x1="65" y1="100" x2="88" y2="100" stroke={mat.centerMotifColor} strokeWidth="1.5" />
                  <line x1="112" y1="100" x2="135" y2="100" stroke={mat.centerMotifColor} strokeWidth="1.5" />
                  <path d="M100 10L100 20M100 180L100 190M10 100L20 100M180 100L190 100" stroke={mat.centerMotifColor} strokeWidth="1.5" />
                  <path d="M100 35L103 42L100 45L97 42Z" fill={mat.centerMotifColor} />
                  <path d="M100 165L103 158L100 155L97 158Z" fill={mat.centerMotifColor} />
                  <path d="M35 100L42 97L45 100L42 103Z" fill={mat.centerMotifColor} />
                  <path d="M165 100L158 97L155 100L158 103Z" fill={mat.centerMotifColor} />
                  <circle cx="100" cy="100" r="6" fill={mat.centerMotifColor} />
                  <path d="M30 30L38 22M170 30L162 22M30 170L38 178M170 170L162 178" stroke={mat.centerMotifColor} strokeWidth="1" />
                  <circle cx="29" cy="29" r="3" stroke={mat.centerMotifColor} strokeWidth="1" fill="none" />
                  <circle cx="171" cy="29" r="3" stroke={mat.centerMotifColor} strokeWidth="1" fill="none" />
                  <circle cx="29" cy="171" r="3" stroke={mat.centerMotifColor} strokeWidth="1" fill="none" />
                  <circle cx="171" cy="171" r="3" stroke={mat.centerMotifColor} strokeWidth="1" fill="none" />
                </svg>
              </div>
            )}

            {mat.centerMotif === "compass" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg className="w-24 h-24 sm:w-36 sm:h-36 md:w-48 md:h-48 opacity-40" viewBox="0 0 200 200" fill="none">
                  <circle cx="100" cy="100" r="85" stroke={mat.centerMotifColor} strokeWidth="1" strokeDasharray="4 6" />
                  <circle cx="100" cy="100" r="70" stroke={mat.centerMotifColor} strokeWidth="0.5" />
                  <line x1="100" y1="20" x2="100" y2="180" stroke={mat.centerMotifColor} strokeWidth="0.5" />
                  <line x1="20" y1="100" x2="180" y2="100" stroke={mat.centerMotifColor} strokeWidth="0.5" />
                  <line x1="43" y1="43" x2="157" y2="157" stroke={mat.centerMotifColor} strokeWidth="0.3" />
                  <line x1="157" y1="43" x2="43" y2="157" stroke={mat.centerMotifColor} strokeWidth="0.3" />
                  <circle cx="100" cy="100" r="4" fill={mat.centerMotifColor} />
                </svg>
              </div>
            )}

            {mat.borderMotif === "bamboo" && (
              <>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none hidden sm:block">
                  <svg className="w-40 h-4 md:w-64 md:h-5" viewBox="0 0 256 20" fill="none">
                    <path d="M0 10 Q16 3, 32 10 Q48 17, 64 10 Q80 3, 96 10 Q112 17, 128 10 Q144 3, 160 10 Q176 17, 192 10 Q208 3, 224 10 Q240 17, 256 10" stroke={mat.borderMotifColor} strokeWidth="1.5" fill="none" />
                    <path d="M20 6L24 2L28 6M52 14L56 18L60 14M84 6L88 2L92 6M116 14L120 18L124 14M148 6L152 2L156 6M180 14L184 18L188 14M212 6L216 2L220 6M244 14L248 18L252 14" stroke={mat.borderMotifColor} strokeWidth="0.8" fill="none" />
                  </svg>
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none hidden sm:block">
                  <svg className="w-40 h-4 md:w-64 md:h-5" viewBox="0 0 256 20" fill="none" style={{ transform: "scaleY(-1)" }}>
                    <path d="M0 10 Q16 3, 32 10 Q48 17, 64 10 Q80 3, 96 10 Q112 17, 128 10 Q144 3, 160 10 Q176 17, 192 10 Q208 3, 224 10 Q240 17, 256 10" stroke={mat.borderMotifColor} strokeWidth="1.5" fill="none" />
                    <path d="M20 6L24 2L28 6M52 14L56 18L60 14M84 6L88 2L92 6M116 14L120 18L124 14M148 6L152 2L156 6M180 14L184 18L188 14M212 6L216 2L220 6M244 14L248 18L252 14" stroke={mat.borderMotifColor} strokeWidth="0.8" fill="none" />
                  </svg>
                </div>
              </>
            )}

            {mat.borderMotif === "geometric" && (
              <>
                <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none hidden sm:block">
                  <svg className="w-32 h-3 md:w-48 md:h-3" viewBox="0 0 192 12" fill="none">
                    {[0,24,48,72,96,120,144,168].map(x => (
                      <rect key={x} x={x} y="2" width="16" height="8" rx="1" stroke={mat.borderMotifColor} strokeWidth="0.8" fill="none" />
                    ))}
                  </svg>
                </div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none hidden sm:block">
                  <svg className="w-32 h-3 md:w-48 md:h-3" viewBox="0 0 192 12" fill="none">
                    {[0,24,48,72,96,120,144,168].map(x => (
                      <rect key={x} x={x} y="2" width="16" height="8" rx="1" stroke={mat.borderMotifColor} strokeWidth="0.8" fill="none" />
                    ))}
                  </svg>
                </div>
              </>
            )}

            {mat.cornerStyle === "dragon-scroll" && (
              <>
                {[
                  { pos: "top-1 left-1 sm:top-2 sm:left-2", flip: "" },
                  { pos: "top-1 right-1 sm:top-2 sm:right-2", flip: "scaleX(-1)" },
                  { pos: "bottom-1 left-1 sm:bottom-2 sm:left-2", flip: "scaleY(-1)" },
                  { pos: "bottom-1 right-1 sm:bottom-2 sm:right-2", flip: "scale(-1,-1)" },
                ].map(({ pos, flip }, i) => (
                  <svg key={i} className={`absolute ${pos} w-12 h-12 sm:w-20 sm:h-20 pointer-events-none`} viewBox="0 0 80 80" fill="none" style={flip ? { transform: flip } : undefined}>
                    <path d="M6 50C6 28 28 6 50 6" stroke={mat.cornerColor} strokeWidth="1.5" fill="none" />
                    <path d="M10 50C10 32 32 10 50 10" stroke={mat.cornerColor} strokeWidth="0.8" fill="none" />
                    <path d="M6 6C6 6 18 6 18 6C18 6 18 18 18 18" stroke={mat.cornerColor} strokeWidth="1.5" fill="none" />
                    <path d="M6 6L6 6" stroke={mat.cornerColor} strokeWidth="2" strokeLinecap="round" />
                    <circle cx="8" cy="8" r="3" stroke={mat.cornerColor} strokeWidth="1" fill="none" />
                    <circle cx="8" cy="8" r="1.2" fill={mat.cornerColor} />
                    <path d="M12 30C16 22 22 16 30 12" stroke={mat.cornerColor} strokeWidth="1" fill="none" />
                    <path d="M14 38C20 28 28 20 38 14" stroke={mat.cornerColor} strokeWidth="0.6" fill="none" />
                    <path d="M50 6C50 6 46 10 48 14C50 18 54 16 52 12C50 8 50 6 50 6Z" stroke={mat.cornerColor} strokeWidth="0.8" fill={mat.cornerColor} opacity="0.4" />
                    <path d="M6 50C6 50 10 46 14 48C18 50 16 54 12 52C8 50 6 50 6 50Z" stroke={mat.cornerColor} strokeWidth="0.8" fill={mat.cornerColor} opacity="0.4" />
                    <path d="M22 6L22 10M28 6L28 8M34 6L34 8M40 6L40 9M6 22L10 22M6 28L8 28M6 34L8 34M6 40L9 40" stroke={mat.cornerColor} strokeWidth="0.6" />
                  </svg>
                ))}
              </>
            )}

            {mat.cornerStyle === "floral" && (
              <>
                {[
                  { pos: "top-1 left-1 sm:top-3 sm:left-3", flip: "" },
                  { pos: "top-1 right-1 sm:top-3 sm:right-3", flip: "scaleX(-1)" },
                  { pos: "bottom-1 left-1 sm:bottom-3 sm:left-3", flip: "scaleY(-1)" },
                  { pos: "bottom-1 right-1 sm:bottom-3 sm:right-3", flip: "scale(-1,-1)" },
                ].map(({ pos, flip }, i) => (
                  <svg key={i} className={`absolute ${pos} w-10 h-10 sm:w-16 sm:h-16 pointer-events-none`} viewBox="0 0 64 64" fill="none" style={flip ? { transform: flip } : undefined}>
                    <path d="M4 4C4 4 20 4 20 4C20 4 20 20 20 20" stroke={mat.cornerColor} strokeWidth="0.8" fill="none" />
                    <path d="M8 4C14 10 14 18 8 24" stroke={mat.cornerColor} strokeWidth="0.6" fill="none" />
                    <path d="M4 8C10 14 18 14 24 8" stroke={mat.cornerColor} strokeWidth="0.6" fill="none" />
                    <circle cx="10" cy="10" r="3" stroke={mat.cornerColor} strokeWidth="0.8" fill="none" />
                    <circle cx="10" cy="10" r="1" fill={mat.cornerColor} />
                    <path d="M6 16C8 14 10 12 14 12C10 16 8 18 6 16Z" fill={mat.cornerColor} opacity="0.3" />
                    <path d="M16 6C14 8 12 10 12 14C16 10 18 8 16 6Z" fill={mat.cornerColor} opacity="0.3" />
                  </svg>
                ))}
              </>
            )}

            {mat.cornerStyle === "geometric" && (
              <>
                {[
                  { pos: "top-1 left-1 sm:top-2 sm:left-2", flip: "" },
                  { pos: "top-1 right-1 sm:top-2 sm:right-2", flip: "scaleX(-1)" },
                  { pos: "bottom-1 left-1 sm:bottom-2 sm:left-2", flip: "scaleY(-1)" },
                  { pos: "bottom-1 right-1 sm:bottom-2 sm:right-2", flip: "scale(-1,-1)" },
                ].map(({ pos, flip }, i) => (
                  <svg key={i} className={`absolute ${pos} w-6 h-6 sm:w-10 sm:h-10 pointer-events-none`} viewBox="0 0 40 40" fill="none" style={flip ? { transform: flip } : undefined}>
                    <path d="M4 4L16 4L16 16L4 16Z" stroke={mat.cornerColor} strokeWidth="0.8" fill="none" />
                    <path d="M4 4L16 16M16 4L4 16" stroke={mat.cornerColor} strokeWidth="0.4" />
                    <rect x="7" y="7" width="6" height="6" stroke={mat.cornerColor} strokeWidth="0.5" fill="none" />
                  </svg>
                ))}
              </>
            )}

            <div className="absolute inset-0 flex flex-col p-1 sm:p-2">
              {isSiamese ? (
                <>
                  <div className="flex flex-col items-center pt-1 gap-1" data-testid="player-card-opponent">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md ${
                      otherPlayers.some(p => p.seat === gameState.currentTurn)
                        ? mat.activeGlow
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
                    {opponentInfo && (opponentInfo.main.exposures.length > 0 || (opponentInfo.partner && opponentInfo.partner.exposures.length > 0)) && (
                      <div className="flex flex-wrap items-center justify-center gap-1.5" data-testid="opponent-exposed-sets">
                        {opponentInfo.main.exposures.map((group, gi) => (
                          <div key={`r1-${gi}`} className="flex items-center gap-0.5 bg-white/10 rounded-md px-1 py-0.5" data-testid={`opponent-exposure-r1-${gi}`}>
                            <span className="text-[8px] text-white/40 mr-0.5">R1</span>
                            {group.tiles.map(tile => (
                              <div key={tile.id} className="relative">
                                <Tile tile={tile} size="xs" />
                                {tile.id === group.fromDiscardId && (
                                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-400 border border-orange-500" />
                                )}
                              </div>
                            ))}
                            <span className="text-[8px] text-white/30 ml-0.5 capitalize">{group.claimType}</span>
                          </div>
                        ))}
                        {opponentInfo.partner?.exposures.map((group, gi) => (
                          <div key={`r2-${gi}`} className="flex items-center gap-0.5 bg-white/10 rounded-md px-1 py-0.5" data-testid={`opponent-exposure-r2-${gi}`}>
                            <span className="text-[8px] text-white/40 mr-0.5">R2</span>
                            {group.tiles.map(tile => (
                              <div key={tile.id} className="relative">
                                <Tile tile={tile} size="xs" />
                                {tile.id === group.fromDiscardId && (
                                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-400 border border-orange-500" />
                                )}
                              </div>
                            ))}
                            <span className="text-[8px] text-white/30 ml-0.5 capitalize">{group.claimType}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
                        ? mat.activeGlow
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
                              ? mat.activeGlow
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
                                      <div key={tile.id} className="relative">
                                        <Tile tile={tile} size="xs" />
                                        {tile.id === group.fromDiscardId && (
                                          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-400 border border-orange-500" />
                                        )}
                                      </div>
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
                                  ? mat.activeGlow
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
                                          <div key={tile.id} className="relative">
                                            <Tile tile={tile} size="xs" />
                                            {tile.id === group.fromDiscardId && (
                                              <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-400 border border-orange-500" />
                                            )}
                                          </div>
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
                                  ? mat.activeGlow
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
                                          <div key={tile.id} className="relative">
                                            <Tile tile={tile} size="xs" />
                                            {tile.id === group.fromDiscardId && (
                                              <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-400 border border-orange-500" />
                                            )}
                                          </div>
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
                <div className="flex items-center justify-center mb-2">
                  <span className="text-[10px] text-stone-400">
                    {gameState.phase === "discard" ? "Click a tile to discard, or drag tiles between racks" : "Drag tiles between racks to rearrange"}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider text-center mb-1" data-testid="text-hand-label">
                    Rack 1 ({gameState.myHand.length}) - {gameState.mySeat}
                  </h3>
                  {(() => {
                    const r1Player = gameState.players.find(p => p.seat === gameState.mySeat);
                    return r1Player && r1Player.exposures.length > 0 ? (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap mb-1" data-testid="my-exposed-sets-r1">
                        {r1Player.exposures.map((group, gi) => (
                          <div key={gi} className="flex items-center gap-0.5 bg-stone-800/60 rounded-md px-1.5 py-0.5 border border-stone-700" data-testid={`my-exposure-r1-${gi}`}>
                            {group.tiles.map(tile => (
                              <div key={tile.id} className="relative">
                                <Tile tile={tile} size="xs" />
                                {tile.id === group.fromDiscardId && (
                                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-400 border border-orange-500" />
                                )}
                              </div>
                            ))}
                            <span className="text-[8px] text-stone-500 ml-0.5 capitalize">{group.claimType}</span>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  <div
                    className={`flex items-center justify-center gap-0.5 sm:gap-1 p-2 bg-stone-800/80 rounded-md border flex-wrap transition-colors duration-150 ${
                      dragSourceRack === "partner" && dragOverRack === "main"
                        ? "border-purple-500 bg-purple-900/30"
                        : "border-stone-700"
                    }`}
                    data-testid="hand-main"
                    onDragOver={(e) => handleRackDragOver(e, "main")}
                    onDrop={(e) => handleRackDrop(e, "main")}
                  >
                    {gameState.myHand.map((tile, idx) => {
                      const isHighlighted = highlightedTileIds.has(tile.id);
                      const isDragOver = dragOverIndex === idx && dragOverRack === "main" && !(dragSourceRack === "main" && dragIndexRef.current === idx);
                      return (
                        <div
                          key={tile.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx, "main")}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, idx, "main")}
                          onDrop={(e) => handleDrop(e, idx, gameState.myHand, gameState.mySeat, "main")}
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
                                : isMyTurn && gameState.phase === "discard"
                            }
                            onClick={() => {
                              if (tile.suit === "Blank" && gameState.zombieBlanks?.enabled && canZombieExchange) {
                                setZombieBlankSelected(zombieBlankSelected === tile.id ? null : tile.id);
                              } else if (gameState.phase === "discard" && !zombieBlankSelected) {
                                onDiscard(tile.id, gameState.mySeat);
                              }
                            }}
                            dimmed={zombieBlankSelected ? zombieBlankSelected !== tile.id : (activeSuggestionPattern ? !isHighlighted : false)}
                          />
                        </div>
                      );
                    })}
                    {gameState.myHand.length === 0 && (
                      <div className="text-xs text-stone-500 py-4">Empty rack</div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider text-center mb-1" data-testid="text-partner-hand-label">
                    Rack 2 ({gameState.partnerHand.length}) - {gameState.mySeats.find(s => s !== gameState.mySeat)}
                  </h3>
                  {(() => {
                    const partnerSeat = gameState.mySeats.find(s => s !== gameState.mySeat);
                    const r2Player = partnerSeat ? gameState.players.find(p => p.seat === partnerSeat) : null;
                    return r2Player && r2Player.exposures.length > 0 ? (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap mb-1" data-testid="my-exposed-sets-r2">
                        {r2Player.exposures.map((group, gi) => (
                          <div key={gi} className="flex items-center gap-0.5 bg-stone-800/60 rounded-md px-1.5 py-0.5 border border-stone-700" data-testid={`my-exposure-r2-${gi}`}>
                            {group.tiles.map(tile => (
                              <div key={tile.id} className="relative">
                                <Tile tile={tile} size="xs" />
                                {tile.id === group.fromDiscardId && (
                                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-400 border border-orange-500" />
                                )}
                              </div>
                            ))}
                            <span className="text-[8px] text-stone-500 ml-0.5 capitalize">{group.claimType}</span>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  <div
                    className={`flex items-center justify-center gap-0.5 sm:gap-1 p-2 bg-stone-800/80 rounded-md border flex-wrap transition-colors duration-150 ${
                      dragSourceRack === "main" && dragOverRack === "partner"
                        ? "border-purple-500 bg-purple-900/30"
                        : "border-stone-700"
                    }`}
                    data-testid="hand-partner"
                    onDragOver={(e) => handleRackDragOver(e, "partner")}
                    onDrop={(e) => handleRackDrop(e, "partner")}
                  >
                    {gameState.partnerHand.map((tile, idx) => {
                      const partnerSeat = gameState.mySeats.find(s => s !== gameState.mySeat)!;
                      const isDragOver = dragOverIndex === idx && dragOverRack === "partner" && !(dragSourceRack === "partner" && dragIndexRef.current === idx);
                      return (
                        <div
                          key={tile.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx, "partner")}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, idx, "partner")}
                          onDrop={(e) => handleDrop(e, idx, gameState.partnerHand!, partnerSeat, "partner")}
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
                                : isMyTurn && gameState.phase === "discard"
                            }
                            onClick={() => {
                              if (tile.suit === "Blank" && gameState.zombieBlanks?.enabled && canZombieExchange) {
                                setZombieBlankSelected(zombieBlankSelected === tile.id ? null : tile.id);
                              } else if (gameState.phase === "discard" && !zombieBlankSelected) {
                                onDiscard(tile.id, partnerSeat);
                              }
                            }}
                            dimmed={zombieBlankSelected ? zombieBlankSelected !== tile.id : false}
                          />
                        </div>
                      );
                    })}
                    {gameState.partnerHand.length === 0 && (
                      <div className="text-xs text-stone-500 py-4">Empty rack</div>
                    )}
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
                        onDragStart={(e) => handleDragStart(e, idx, "main")}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, idx, "main")}
                        onDrop={(e) => handleDrop(e, idx, displayHand, activeControlSeat || undefined, "main")}
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
