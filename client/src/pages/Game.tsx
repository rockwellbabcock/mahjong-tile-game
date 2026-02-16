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
    showHints,
    hints,
    winInfo,
    disconnectedPlayer,
    timedOutPlayer,
    gameEnded,
    draw,
    discard,
    sortHand,
    toggleHints,
    resetGame,
    handleTimeoutAction,
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
          showHints={showHints}
          hints={hints}
          winInfo={winInfo}
          disconnectedPlayer={disconnectedPlayer}
          timedOutPlayer={timedOutPlayer}
          onDraw={draw}
          onDiscard={discard}
          onSort={sortHand}
          onToggleHints={toggleHints}
          onTimeoutAction={handleTimeoutAction}
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
