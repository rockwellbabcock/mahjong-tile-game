import { motion, AnimatePresence } from "framer-motion";
import { type Tile as TileType, type ClientRoomView, type PlayerSeat, type DisconnectedPlayerInfo, type TimeoutAction, SEAT_ORDER } from "@shared/schema";
import { type PatternMatch } from "@shared/patterns";
import { Tile, TileBack } from "./Tile";
import { HintPanel } from "./HintPanel";
import { GameTooltip } from "./GameTooltip";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Lightbulb, Palette, Copy, Check, Hand, WifiOff, Clock, X, Bot, Eye, ArrowLeftRight, Gem, Layers, FlaskConical, Repeat2 } from "lucide-react";
import { useTileStyle } from "@/hooks/use-tile-style";
import { useTheme } from "@/hooks/use-theme";
import { useState, useEffect, useMemo } from "react";

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
  onTransfer: (tileId: string, fromSeat: PlayerSeat, toSeat: PlayerSeat) => void;
  onToggleHints: () => void;
  onToggleAutoShowHints: () => void;
  onTimeoutAction: (action: TimeoutAction) => void;
  onSelectPattern: (patternId: string | null) => void;
  onSwapJoker: (myTileId: string, targetSeat: PlayerSeat, exposureIndex: number) => void;
  onTestSiameseWin?: () => void;
  onForfeit?: () => void;
}

const SEAT_LABELS: Record<PlayerSeat, string> = {
  East: "East",
  South: "South",
  West: "West",
  North: "North",
};

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
  onTransfer,
  onToggleHints,
  onToggleAutoShowHints,
  onTimeoutAction,
  onSelectPattern,
  onSwapJoker,
  onTestSiameseWin,
}: MultiplayerBoardProps) {
  const { tileStyle, cycleTileStyle } = useTileStyle();
  const { theme, toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [transferMode, setTransferMode] = useState(false);
  const [showDiscardMobile, setShowDiscardMobile] = useState(false);
  const [jokerSwapTarget, setJokerSwapTarget] = useState<{ seat: PlayerSeat; exposureIndex: number; matchSuit: string; matchValue: string | number } | null>(null);

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

  const isPlayingPartner = activeControlSeat && activeControlSeat !== gameState.mySeat;
  const displayHand = isPlayingPartner && gameState.partnerHand ? gameState.partnerHand : gameState.myHand;
  const displaySeat = activeControlSeat || gameState.mySeat;

  function getStatusMessage() {
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
      return `Waiting for ${opponentName} to ${gameState.phase === "draw" ? "draw" : "discard"} (${gameState.currentTurn})...`;
    }
    const nameLabel = currentPlayer?.isBot ? `${currentPlayer.name}` : (currentPlayer?.name || gameState.currentTurn);
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

  return (
    <div className="flex h-[100dvh] w-full" data-testid="game-board">
      <div className="flex-1 flex flex-col min-w-0">

        <div
          className={`px-4 py-2 border-b text-sm font-medium text-center ${
            isMyTurn
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : gameState.phase === "won"
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
          }`}
          data-testid="status-bar"
        >
          {getStatusMessage()}
        </div>

        {disconnectedPlayer && (
          <div
            className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex items-center justify-center gap-3"
            data-testid="banner-disconnected"
          >
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Waiting for {disconnectedPlayer.playerName} ({disconnectedPlayer.seat}) to reconnect...
            </span>
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
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

        <header className="flex items-center justify-between gap-2 p-3 border-b border-border flex-wrap">
          <div className="flex items-center gap-3">
            <TileBack count={gameState.wallCount} />
            <div>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider" data-testid="text-wall-label">
                {isSiamese ? "Pool" : <GameTooltip term="wall">Wall</GameTooltip>}
              </h2>
              <p className="text-xl font-bold text-foreground" data-testid="text-wall-count">{gameState.wallCount} tiles</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 mr-2">
              <span className="text-xs font-mono text-muted-foreground" data-testid="text-room-code-header">
                Room: {gameState.roomCode}
              </span>
              <Button variant="ghost" size="icon" onClick={handleCopyCode} className="h-6 w-6">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>

            <span
              className={`inline-block px-3 py-1 rounded-md text-xs font-bold border ${
                gameState.phase === "calling"
                  ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
                  : isMyTurn && gameState.phase === "discard"
                    ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800"
                    : isMyTurn && gameState.phase === "draw"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                      : gameState.phase === "won"
                        ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                        : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
              }`}
              data-testid="text-phase"
            >
              {gameState.phase === "won"
                ? "Game Over"
                : gameState.phase === "calling"
                  ? "Calling"
                  : isMyTurn
                    ? (gameState.phase === "draw"
                      ? (isSiamese ? "Your turn: Draw" : `${isPlayingPartner ? displaySeat + "'s" : "Your"} turn: Draw`)
                      : (isSiamese
                        ? (<><span className="sm:hidden">Discard</span><span className="hidden sm:inline">Your turn: Discard / Transfer</span></>)
                        : `${isPlayingPartner ? displaySeat + "'s" : "Your"} turn: Discard`))
                    : `${gameState.currentTurn}'s turn`
              }
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDiscardMobile(!showDiscardMobile)}
              className="md:hidden"
              data-testid="button-show-discards-mobile"
            >
              <Layers className="w-4 h-4" />
              <span className="ml-1">{gameState.discardPile.length}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onToggleHints}
              className={showHints ? "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700" : ""}
              data-testid="button-hint"
            >
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Suggest</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleAutoShowHints}
              className={autoShowHints ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700" : ""}
              data-testid="button-auto-hints"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Auto</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => onSort(activeControlSeat || undefined)} data-testid="button-sort">
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Sort</span>
            </Button>
            <Button variant="outline" size="sm" onClick={cycleTileStyle} data-testid="button-tile-style">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">{tileStyle === "classic" ? "Classic" : tileStyle === "emoji" ? "Modern" : "Text"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className={theme === "jade" ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700" : ""}
              data-testid="button-theme-toggle"
            >
              <Gem className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">{theme === "jade" ? "Jade" : "Felt"}</span>
            </Button>
            {isSiamese && onTestSiameseWin && gameState.phase !== "won" && (
              <Button
                variant="outline"
                size="sm"
                onClick={onTestSiameseWin}
                className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                data-testid="button-test-siamese-win"
              >
                <FlaskConical className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Test Win</span>
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-between p-2 sm:p-4 gap-2 sm:gap-3 overflow-y-auto">
          <div className="w-full max-w-3xl">
            {isSiamese && opponentInfo ? (
              <div className="mb-3">
                <div
                  className={`p-2 sm:p-3 rounded-md border ${
                    otherPlayers.some(p => p.seat === gameState.currentTurn)
                      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                      : "border-border bg-card"
                  }`}
                  data-testid="player-card-opponent"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${opponentInfo.main.connected ? (opponentInfo.main.isBot ? "bg-blue-500" : "bg-emerald-500") : "bg-red-500"}`} />
                        <span className="text-sm font-bold text-foreground">Opponent</span>
                        {opponentInfo.main.isBot && <Bot className="w-3 h-3 text-blue-500 shrink-0" data-testid="bot-icon-opponent" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{opponentInfo.main.name}</p>
                    </div>
                    {otherPlayers.some(p => p.seat === gameState.currentTurn) && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase shrink-0">
                        Their Turn
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`p-2 rounded-md border ${
                      opponentInfo.main.seat === gameState.currentTurn
                        ? "border-emerald-300 bg-emerald-100/50 dark:border-emerald-700 dark:bg-emerald-950/20"
                        : "border-border bg-background/50"
                    }`}>
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="text-xs font-bold text-muted-foreground uppercase">{opponentInfo.main.seat} - Hand 1</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Hand className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-mono text-muted-foreground">{opponentInfo.main.handCount}</span>
                        </div>
                      </div>
                    </div>
                    {opponentInfo.partner && (
                      <div className={`p-2 rounded-md border ${
                        opponentInfo.partner.seat === gameState.currentTurn
                          ? "border-emerald-300 bg-emerald-100/50 dark:border-emerald-700 dark:bg-emerald-950/20"
                          : "border-border bg-background/50"
                      }`}>
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="text-xs font-bold text-muted-foreground uppercase">{opponentInfo.partner.seat} - Hand 2</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Hand className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs font-mono text-muted-foreground">{opponentInfo.partner.handCount}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
            <div className={`grid gap-2 mb-3 ${otherPlayers.length <= 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {otherPlayers.map((player) => {
                const isCurrentTurn = player.seat === gameState.currentTurn;
                return (
                  <div
                    key={player.seat}
                    className={`p-2 sm:p-3 rounded-md border ${
                      isCurrentTurn
                        ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                        : "border-border bg-card"
                    }`}
                    data-testid={`player-card-${player.seat.toLowerCase()}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${player.connected ? (player.isBot ? "bg-blue-500" : "bg-emerald-500") : "bg-red-500"}`} />
                          <span className="text-xs font-bold text-muted-foreground uppercase">{player.seat}</span>
                          <span className="text-xs text-muted-foreground">({getRelativePosition(gameState.mySeat, player.seat)})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {player.isBot && <Bot className="w-3 h-3 text-blue-500 shrink-0" data-testid={`bot-icon-${player.seat.toLowerCase()}`} />}
                          <p className="text-sm font-medium text-foreground truncate">{player.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Hand className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm font-mono text-muted-foreground">{player.handCount}</span>
                      </div>
                    </div>
                    {isCurrentTurn && (
                      <div className="mt-1">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                          Current Turn
                        </span>
                      </div>
                    )}
                    {player.exposures.length > 0 && (
                      <div className="mt-1.5" data-testid={`exposed-sets-${player.seat.toLowerCase()}`}>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Exposed</span>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {player.exposures.map((group, gi) => {
                            const hasJoker = group.tiles.some(t => t.suit === "Joker");
                            const nonJoker = group.tiles.find(t => !t.isJoker);
                            const canSwap = isMyTurn && (gameState.phase === "draw" || gameState.phase === "discard") && hasJoker;
                            const isSwapSelected = jokerSwapTarget?.seat === player.seat && jokerSwapTarget?.exposureIndex === gi;
                            return (
                              <div
                                key={gi}
                                className={`flex items-center gap-0.5 rounded-md px-1 py-0.5 ${
                                  isSwapSelected
                                    ? "bg-amber-200/50 dark:bg-amber-800/30 ring-2 ring-amber-400 dark:ring-amber-600"
                                    : canSwap
                                      ? "bg-muted/30 cursor-pointer hover-elevate"
                                      : "bg-muted/30"
                                }`}
                                onClick={() => {
                                  if (canSwap && nonJoker) {
                                    if (isSwapSelected) {
                                      setJokerSwapTarget(null);
                                    } else {
                                      setJokerSwapTarget({
                                        seat: player.seat,
                                        exposureIndex: gi,
                                        matchSuit: nonJoker.suit,
                                        matchValue: nonJoker.value,
                                      });
                                    }
                                  }
                                }}
                                data-testid={`exposure-group-${player.seat.toLowerCase()}-${gi}`}
                              >
                                {group.tiles.map(tile => (
                                  <div key={tile.id} className="relative">
                                    <Tile
                                      tile={tile}
                                      size="xs"
                                      data-testid={`exposure-tile-${tile.id}`}
                                    />
                                    {tile.id === group.fromDiscardId && (
                                      <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-400" data-testid={`discard-marker-${tile.id}`} />
                                    )}
                                    {tile.isJoker && canSwap && (
                                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center" data-testid={`swap-indicator-${tile.id}`}>
                                        <Repeat2 className="w-2 h-2 text-white" />
                                      </div>
                                    )}
                                  </div>
                                ))}
                                <span className="text-[9px] text-muted-foreground ml-0.5 capitalize">{group.claimType}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}

            <AnimatePresence>
              {showHints && hints && (
                <div className="w-full max-w-lg mx-auto mb-3">
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

            {isMyTurn && gameState.phase === "draw" && (
              <div className="flex justify-center mb-3">
                <Button onClick={() => onDraw(activeControlSeat || undefined)} data-testid="button-draw">
                  {isSiamese ? "Draw from Pool" : "Draw Tile"}
                </Button>
              </div>
            )}

            {!showHints && !isMyTurn && gameState.phase !== "won" && (
              <p className="text-muted-foreground text-sm text-center">
                Waiting for {gameState.currentTurn} to play...
              </p>
            )}
          </div>
        </div>

        <footer className="border-t border-border p-2 sm:p-4" data-testid="player-hand-area">
          {isSiamese && gameState.partnerHand ? (
            <>
              {isMyTurn && (gameState.phase === "draw" || gameState.phase === "discard") && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTransferMode(!transferMode)}
                    className={transferMode ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700" : ""}
                    data-testid="button-transfer-mode"
                  >
                    <ArrowLeftRight className="w-4 h-4 mr-1" />
                    {transferMode ? "Transfer On" : "Transfer"}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {transferMode
                      ? "Click a tile to move it to your other rack"
                      : gameState.phase === "discard" ? "Click a tile to discard it" : "Draw a tile or transfer between racks"
                    }
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center mb-2" data-testid="text-hand-label">
                    Rack 1 ({gameState.myHand.length} tiles) - {gameState.mySeat}
                  </h3>
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1 p-2 sm:p-3 bg-card rounded-md border border-card-border flex-wrap" data-testid="hand-main">
                    {gameState.myHand.map((tile) => {
                      const isHighlighted = highlightedTileIds.has(tile.id);
                      const partnerSeat = gameState.mySeats.find(s => s !== gameState.mySeat);
                      return (
                        <div
                          key={tile.id}
                          className={`relative ${
                            isHighlighted && activeSuggestionPattern
                              ? "ring-2 ring-blue-400 dark:ring-blue-500 rounded-md"
                              : ""
                          }`}
                        >
                          <Tile
                            tile={tile}
                            size={tileSize}
                            isInteractive={isMyTurn && (gameState.phase === "discard" || (gameState.phase === "draw" && transferMode))}
                            onClick={() => {
                              if (transferMode && partnerSeat) {
                                onTransfer(tile.id, gameState.mySeat, partnerSeat);
                              } else if (gameState.phase === "discard") {
                                onDiscard(tile.id, gameState.mySeat);
                              }
                            }}
                            dimmed={activeSuggestionPattern ? !isHighlighted : false}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center mb-2" data-testid="text-partner-hand-label">
                    Rack 2 ({gameState.partnerHand.length} tiles) - {gameState.mySeats.find(s => s !== gameState.mySeat)}
                  </h3>
                  <div className="flex items-center justify-center gap-0.5 sm:gap-1 p-2 sm:p-3 bg-card rounded-md border border-card-border flex-wrap" data-testid="hand-partner">
                    {gameState.partnerHand.map((tile) => {
                      const partnerSeat = gameState.mySeats.find(s => s !== gameState.mySeat)!;
                      return (
                        <div key={tile.id} className="relative">
                          <Tile
                            tile={tile}
                            size={tileSize}
                            isInteractive={isMyTurn && (gameState.phase === "discard" || (gameState.phase === "draw" && transferMode))}
                            onClick={() => {
                              if (transferMode) {
                                onTransfer(tile.id, partnerSeat, gameState.mySeat);
                              } else if (gameState.phase === "discard") {
                                onDiscard(tile.id, partnerSeat);
                              }
                            }}
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
              <div className="flex items-center justify-center gap-2 mb-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-center" data-testid="text-hand-label">
                  Your <GameTooltip term="hand">Hand</GameTooltip> ({displayHand.length} tiles) - {displaySeat}
                </h3>
                {jokerSwapTarget ? (
                  <span className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 animate-pulse" data-testid="text-swap-instruction">
                      Click a matching tile to swap for the Joker
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setJokerSwapTarget(null)}
                      data-testid="button-cancel-swap"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  </span>
                ) : isMyTurn && gameState.phase === "discard" ? (
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400 animate-pulse">
                    Click a tile to discard
                  </span>
                ) : null}
              </div>

              {(() => {
                const myPlayer = gameState.players.find(p => p.seat === displaySeat);
                return myPlayer && myPlayer.exposures.length > 0 ? (
                  <div className="mb-2" data-testid="my-exposed-sets">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Exposed Sets</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {myPlayer.exposures.map((group, gi) => (
                        <div
                          key={gi}
                          className="flex items-center gap-0.5 bg-muted/30 rounded-md px-1.5 py-1 border border-border"
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
                          <span className="text-[10px] text-muted-foreground ml-1 capitalize">{group.claimType}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="flex items-end justify-center gap-1 w-full pb-2 flex-wrap">
                <div className="flex items-center justify-center gap-0.5 sm:gap-1 p-2 sm:p-3 bg-card rounded-md border border-card-border flex-wrap" data-testid="hand-main">
                  {displayHand.map((tile) => {
                    const isHighlighted = highlightedTileIds.has(tile.id);
                    const isSwapMatch = jokerSwapTarget && !tile.isJoker &&
                      tile.suit === jokerSwapTarget.matchSuit &&
                      tile.value === jokerSwapTarget.matchValue;
                    return (
                      <div
                        key={tile.id}
                        className={`relative ${
                          isSwapMatch
                            ? "ring-2 ring-amber-400 dark:ring-amber-500 rounded-md"
                            : isHighlighted && activeSuggestionPattern
                              ? "ring-2 ring-blue-400 dark:ring-blue-500 rounded-md"
                              : ""
                        }`}
                      >
                        <Tile
                          tile={tile}
                          size={tileSize}
                          isInteractive={jokerSwapTarget ? !!isSwapMatch : (isMyTurn && gameState.phase === "discard")}
                          onClick={() => {
                            if (jokerSwapTarget && isSwapMatch) {
                              onSwapJoker(tile.id, jokerSwapTarget.seat, jokerSwapTarget.exposureIndex);
                              setJokerSwapTarget(null);
                            } else if (!jokerSwapTarget) {
                              onDiscard(tile.id, activeControlSeat || undefined);
                            }
                          }}
                          dimmed={jokerSwapTarget ? !isSwapMatch : (activeSuggestionPattern ? !isHighlighted : false)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </footer>
      </div>

      <aside className="hidden md:flex w-64 md:w-72 lg:w-80 border-l border-border flex-col bg-card" data-testid="discard-pile-area">
        <div className="p-3 border-b border-border">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider" data-testid="text-discard-label">
            <GameTooltip term="discard">Discarded Tiles</GameTooltip>
          </h3>
          <p className="text-xs text-muted-foreground" data-testid="text-discard-count">
            {gameState.discardPile.length} tile{gameState.discardPile.length !== 1 ? "s" : ""}
            {gameState.lastDiscardedBy && gameState.lastDiscard && (
              <span className="ml-1">
                (last by {gameState.lastDiscardedBy})
              </span>
            )}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3" data-testid="discard-pile-list">
          {gameState.discardPile.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50">
              <p className="text-sm italic">No discards yet</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 content-start">
              {gameState.discardPile.map((tile, i) => (
                <motion.div
                  key={tile.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  data-testid={`discard-tile-${i}`}
                >
                  <Tile tile={tile} size={discardTileSize} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {showDiscardMobile && (
        <div className="fixed inset-0 z-40 md:hidden" data-testid="discard-pile-mobile">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDiscardMobile(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-lg max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Discarded Tiles
                </h3>
                <p className="text-xs text-muted-foreground">
                  {gameState.discardPile.length} tile{gameState.discardPile.length !== 1 ? "s" : ""}
                  {gameState.lastDiscardedBy && gameState.lastDiscard && (
                    <span className="ml-1">(last by {gameState.lastDiscardedBy})</span>
                  )}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowDiscardMobile(false)} data-testid="button-close-discards">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {gameState.discardPile.length === 0 ? (
                <p className="text-sm italic text-muted-foreground/50 text-center py-4">No discards yet</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 content-start">
                  {gameState.discardPile.map((tile, i) => (
                    <motion.div
                      key={tile.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      data-testid={`discard-tile-mobile-${i}`}
                    >
                      <Tile tile={tile} size="xs" />
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
