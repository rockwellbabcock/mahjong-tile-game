import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMultiplayerGame } from "@/hooks/use-multiplayer-game";
import { SEAT_ORDER, type PlayerSeat, type GameMode, type RoomConfig, type ZombieBlanksConfig } from "@shared/schema";
import { useLocation } from "wouter";
import { Users, Copy, Check, Loader2, ArrowRight, Plus, Bot, Gem, Info } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

interface LobbyPageProps {
  game: ReturnType<typeof useMultiplayerGame>;
}

export default function LobbyPage({ game }: LobbyPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [name, setName] = useState(() => {
    return localStorage.getItem("mahjong-player-name") || "";
  });
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>("4-player");
  const [fillWithBots, setFillWithBots] = useState(false);
  const [zombieBlanks, setZombieBlanks] = useState<ZombieBlanksConfig>({
    enabled: false,
    count: 6,
    exchangeAnytime: true,
  });
  const [, setLocation] = useLocation();

  const { lobbyState, roomCode, error, playerCount, createRoom, joinRoom, gameState, gameEnded } = game;

  function handleCreate() {
    if (!name.trim()) return;
    localStorage.setItem("mahjong-player-name", name.trim());
    const config: RoomConfig = { gameMode, fillWithBots, zombieBlanks };
    createRoom(name.trim(), config);
  }

  function handleJoin() {
    if (!name.trim() || !joinCode.trim()) return;
    localStorage.setItem("mahjong-player-name", name.trim());
    joinRoom(joinCode.trim(), name.trim());
  }

  function handleCopyCode() {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (lobbyState === "playing") {
    return null;
  }

  const isSiamese = gameMode === "2-player";
  const maxHumans = isSiamese ? (fillWithBots ? 1 : 2) : 4;

  if (lobbyState === "waiting" && roomCode) {
    const lobbySeats = isSiamese
      ? (["East", "South"] as PlayerSeat[])
      : SEAT_ORDER;

    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background p-3 sm:p-4">
        <Card className="w-full max-w-md p-4 sm:p-6">
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2" data-testid="text-waiting-title">
              {isSiamese ? "Waiting for Opponent" : "Waiting for Players"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {fillWithBots && isSiamese
                ? "Starting game with bot opponent..."
                : "Share this room code with friends to join"
              }
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
            <div
              className="text-2xl sm:text-4xl font-mono font-bold tracking-[0.3em] text-foreground bg-muted px-4 sm:px-6 py-2 sm:py-3 rounded-md select-all"
              data-testid="text-room-code"
            >
              {roomCode}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyCode}
              data-testid="button-copy-code"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground" data-testid="text-player-count">
                {Math.min(playerCount, maxHumans)} / {maxHumans} {isSiamese ? "Players (2 hands each)" : "Players"}
              </span>
              {fillWithBots && (
                <span className="text-xs text-muted-foreground">
                  {isSiamese ? "(bot opponent)" : "(bots will fill remaining)"}
                </span>
              )}
            </div>

            <div className={`grid gap-2 ${lobbySeats.length <= 2 ? "grid-cols-2" : "grid-cols-2"}`}>
              {lobbySeats.map((seat, idx) => {
                const player = gameState?.players.find(p => p.seat === seat);
                const label = isSiamese ? (idx === 0 ? "Player 1" : "Player 2") : seat;
                return (
                  <div
                    key={seat}
                    className={`flex items-center gap-2 p-3 rounded-md border ${
                      player
                        ? player.isBot
                          ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
                          : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                        : "bg-muted/30 border-dashed border-border"
                    }`}
                    data-testid={`seat-${seat.toLowerCase()}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        player
                          ? player.isBot ? "bg-blue-500" : "bg-emerald-500"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-muted-foreground uppercase">{label}</p>
                      <div className="flex items-center gap-1">
                        {player?.isBot && <Bot className="w-3 h-3 text-blue-500 shrink-0" />}
                        <p className="text-sm font-medium text-foreground truncate">
                          {player ? player.name : "Waiting..."}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {isSiamese && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Each player controls 2 hands - both must win to claim victory
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span data-testid="text-waiting-message">
              {isSiamese
                ? fillWithBots
                  ? "Starting with bot opponent..."
                  : "Waiting for 1 more player to join"
                : fillWithBots
                  ? "Game starts when you join - bots fill remaining spots"
                  : `Game starts when ${maxHumans} players join`
              }
            </span>
          </div>

          {error && (
            <p className="mt-4 text-sm text-destructive text-center" data-testid="text-error">
              {error}
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background p-3 sm:p-4">
      <div className="w-full max-w-md space-y-4 sm:space-y-6">
        <div className="text-center relative">
          <div className="absolute right-0 top-0">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className={theme === "jade" ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700" : ""}
              data-testid="button-theme-toggle-lobby"
            >
              <Gem className="w-4 h-4 mr-1" />
              {theme === "jade" ? "Jade" : "Felt"}
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1" data-testid="text-lobby-title">
            American Mahjong
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Play American Mahjong online with friends
          </p>
        </div>

        <Card className="p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Your Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                data-testid="input-player-name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Game Mode
              </label>
              <div className="flex gap-2" data-testid="game-mode-selector">
                <Button
                  variant={gameMode === "4-player" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGameMode("4-player")}
                  className="flex-1"
                  data-testid="button-mode-4player"
                >
                  4-Player
                </Button>
                <Button
                  variant={gameMode === "2-player" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGameMode("2-player")}
                  className="flex-1"
                  data-testid="button-mode-2player"
                >
                  2-Player (Siamese)
                </Button>
              </div>
              {gameMode === "2-player" && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Each player controls 2 positions (you + the player across from you)
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 py-1">
              <button
                type="button"
                role="checkbox"
                aria-checked={fillWithBots}
                onClick={() => setFillWithBots(!fillWithBots)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  fillWithBots
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/40 bg-transparent"
                }`}
                data-testid="checkbox-fill-bots"
              >
                {fillWithBots && <Check className="w-3 h-3" />}
              </button>
              <label
                className="text-sm text-foreground cursor-pointer select-none"
                onClick={() => setFillWithBots(!fillWithBots)}
              >
                Fill empty spots with bots
              </label>
              <Bot className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>

            <div className="flex items-center gap-3 py-1">
              <button
                type="button"
                role="checkbox"
                aria-checked={zombieBlanks.enabled}
                onClick={() => setZombieBlanks(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  zombieBlanks.enabled
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/40 bg-transparent"
                }`}
                data-testid="checkbox-include-blanks"
              >
                {zombieBlanks.enabled && <Check className="w-3 h-3" />}
              </button>
              <label
                className="text-sm text-foreground cursor-pointer select-none"
                onClick={() => setZombieBlanks(prev => ({ ...prev, enabled: !prev.enabled }))}
              >
                Include Zombie Blanks
              </label>
              <div className="relative group">
                <Info className="w-4 h-4 text-muted-foreground shrink-0 cursor-help" data-testid="icon-blanks-info" />
                <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 rounded-md bg-popover border border-border shadow-md text-xs text-popover-foreground z-50">
                  Adds blank tiles to the deck. Exchange a blank from your hand for any tile in the discard pile — a 1-for-1 swap that lets you grab exactly what you need!
                </div>
              </div>
            </div>

            {zombieBlanks.enabled && (
              <div className="ml-8 space-y-2 pb-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Number of blanks:</span>
                  <div className="flex gap-1">
                    {([4, 6, 8] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setZombieBlanks(prev => ({ ...prev, count: n }))}
                        className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
                          zombieBlanks.count === n
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover-elevate"
                        }`}
                        data-testid={`button-blank-count-${n}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={zombieBlanks.exchangeAnytime}
                    onClick={() => setZombieBlanks(prev => ({ ...prev, exchangeAnytime: !prev.exchangeAnytime }))}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      zombieBlanks.exchangeAnytime
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/40 bg-transparent"
                    }`}
                    data-testid="checkbox-exchange-anytime"
                  >
                    {zombieBlanks.exchangeAnytime && <Check className="w-2.5 h-2.5" />}
                  </button>
                  <label
                    className="text-xs text-muted-foreground cursor-pointer select-none"
                    onClick={() => setZombieBlanks(prev => ({ ...prev, exchangeAnytime: !prev.exchangeAnytime }))}
                  >
                    Allow exchange anytime (not just on your turn)
                  </label>
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || lobbyState === "creating"}
                className="w-full mb-3"
                data-testid="button-create-game"
              >
                {lobbyState === "creating" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create New Game
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-xs text-muted-foreground uppercase">
                    or join existing
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Room code"
                  maxLength={6}
                  className="font-mono tracking-wider uppercase"
                  data-testid="input-room-code"
                />
                <Button
                  onClick={handleJoin}
                  disabled={!name.trim() || !joinCode.trim() || lobbyState === "joining"}
                  variant="outline"
                  data-testid="button-join-game"
                >
                  {lobbyState === "joining" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {gameEnded && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-center" data-testid="text-game-ended">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{gameEnded}</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive text-center" data-testid="text-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
