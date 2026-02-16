import { useMultiplayerGame } from "@/hooks/use-multiplayer-game";
import { MultiplayerBoard } from "@/components/MultiplayerBoard";
import { WinOverlay } from "@/components/WinOverlay";
import { TileStyleContext, useTileStyleState } from "@/hooks/use-tile-style";
import LobbyPage from "./Lobby";

export default function GamePage() {
  const game = useMultiplayerGame();
  const tileStyleValue = useTileStyleState();

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
    transferTile,
    toggleHints,
    toggleAutoShowHints,
    resetGame,
    handleTimeoutAction,
    selectSuggestionPattern,
  } = game;

  if (lobbyState !== "playing" || !gameState) {
    return (
      <TileStyleContext.Provider value={tileStyleValue}>
        <LobbyPage game={game} />
      </TileStyleContext.Provider>
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
      }
    : null;

  return (
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
          onTransfer={transferTile}
          onToggleHints={toggleHints}
          onToggleAutoShowHints={toggleAutoShowHints}
          onTimeoutAction={handleTimeoutAction}
          onSelectPattern={selectSuggestionPattern}
        />

        {winResult && (
          <WinOverlay
            result={winResult}
            onPlayAgain={resetGame}
          />
        )}
      </div>
    </TileStyleContext.Provider>
  );
}
