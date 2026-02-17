import { useEffect } from "react";
import { useMultiplayerGame } from "@/hooks/use-multiplayer-game";
import { MultiplayerBoard } from "@/components/MultiplayerBoard";
import { WinOverlay } from "@/components/WinOverlay";
import { CharlestonOverlay } from "@/components/CharlestonOverlay";
import { CallingOverlay } from "@/components/CallingOverlay";
import { TileStyleContext, useTileStyleState } from "@/hooks/use-tile-style";
import { ThemeContext, useThemeState } from "@/hooks/use-theme";
import LobbyPage from "./Lobby";

export default function GamePage() {
  const game = useMultiplayerGame();
  const tileStyleValue = useTileStyleState();
  const themeValue = useThemeState();

  useEffect(() => {
    document.documentElement.classList.toggle("theme-jade", themeValue.theme === "jade");
  }, [themeValue.theme]);

  const {
    lobbyState,
    gameState,
    isMyTurn,
    activeControlSeat,
    showHints,
    autoShowHints,
    hints,
    winInfo,
    disconnectedPlayer,
    timedOutPlayer,
    gameEnded,
    activeSuggestionPattern,
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
  } = game;

  if (lobbyState !== "playing" || !gameState) {
    return (
      <ThemeContext.Provider value={themeValue}>
        <TileStyleContext.Provider value={tileStyleValue}>
          <LobbyPage game={game} />
        </TileStyleContext.Provider>
      </ThemeContext.Provider>
    );
  }

  const winResult = winInfo
    ? {
        patternId: "win",
        patternName: winInfo.patternName,
        description: winInfo.description,
        isComplete: true,
        tilesAway: 0,
        matched: [],
        missing: [],
        hint: "",
        contributingTileIds: [],
        winnerName: winInfo.winnerName,
        winnerSeat: winInfo.winnerSeat,
        isMe: winInfo.winnerId === gameState.players.find(p => p.seat === gameState.mySeat)?.id,
        rack1Pattern: winInfo.rack1Pattern,
        rack2Pattern: winInfo.rack2Pattern,
      }
    : null;

  return (
    <ThemeContext.Provider value={themeValue}>
      <TileStyleContext.Provider value={tileStyleValue}>
        <div className="h-screen bg-background text-foreground overflow-hidden">
          <MultiplayerBoard
            gameState={gameState}
            isMyTurn={isMyTurn}
            activeControlSeat={activeControlSeat}
            showHints={showHints}
            autoShowHints={autoShowHints}
            hints={hints}
            winInfo={winInfo}
            disconnectedPlayer={disconnectedPlayer}
            timedOutPlayer={timedOutPlayer}
            activeSuggestionPattern={activeSuggestionPattern}
            onDraw={draw}
            onDiscard={discard}
            onSort={sortHand}
            onReorderHand={reorderHand}
            onTransfer={transferTile}
            onToggleHints={toggleHints}
            onToggleAutoShowHints={toggleAutoShowHints}
            onTimeoutAction={handleTimeoutAction}
            onSelectPattern={selectSuggestionPattern}
            onSwapJoker={swapJoker}
            onZombieExchange={zombieExchange}
            onTestSiameseWin={testSiameseWin}
            onForfeit={forfeitGame}
          />

          {gameState.phase === "charleston" && gameState.charleston && (
            <CharlestonOverlay
              charleston={gameState.charleston}
              hand={gameState.myHand}
              onSelectTile={charlestonSelectTile}
              onReady={charlestonReady}
              onSkip={charlestonSkip}
              onVote={charlestonVote}
            />
          )}

          {gameState.phase === "calling" && gameState.callingState && (
            <CallingOverlay
              callingState={gameState.callingState}
              hand={gameState.myHand}
              onClaim={claimDiscardTile}
              onPass={passOnDiscardTile}
              pursuingConcealedPattern={
                hints !== null && hints.closest.length > 0 && hints.closest[0].concealedOnly === true
              }
            />
          )}

          {winResult && (
            <WinOverlay
              result={winResult}
              onPlayAgain={resetGame}
            />
          )}
        </div>
      </TileStyleContext.Provider>
    </ThemeContext.Provider>
  );
}
