import { type Tile as TileType, type ClientCharlestonView } from "@shared/schema";
import { Tile } from "./Tile";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUp, ArrowLeft, Check, SkipForward } from "lucide-react";

interface CharlestonOverlayProps {
  charleston: ClientCharlestonView;
  hand: TileType[];
  onSelectTile: (tileId: string) => void;
  onReady: () => void;
  onSkip: () => void;
  onVote: (accept: boolean) => void;
}

const DIRECTION_INFO: Record<string, { label: string; icon: typeof ArrowRight; description: string }> = {
  right: { label: "Pass Right", icon: ArrowRight, description: "Select 3 tiles to pass to the player on your right" },
  across: { label: "Pass Across", icon: ArrowUp, description: "Select 3 tiles to pass to the player across from you" },
  left: { label: "Pass Left", icon: ArrowLeft, description: "Select 3 tiles to pass to the player on your left" },
};

const PASS_LABELS = [
  "First Pass",
  "Second Pass",
  "Third Pass",
  "Fourth Pass",
  "Fifth Pass",
  "Sixth Pass",
];

export function CharlestonOverlay({ charleston, hand, onSelectTile, onReady, onSkip, onVote }: CharlestonOverlayProps) {
  const dirInfo = DIRECTION_INFO[charleston.direction] || DIRECTION_INFO.right;
  const DirIcon = dirInfo.icon;
  const selectedSet = new Set(charleston.mySelectedTileIds);
  const alreadySubmitted = charleston.myReady;

  if (charleston.secondCharlestonOffered && charleston.mySecondVote === undefined) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-card rounded-md border border-card-border p-6 max-w-md w-full space-y-4">
          <h2 className="text-xl font-bold text-center" data-testid="text-charleston-vote-title">
            Second Charleston?
          </h2>
          <p className="text-sm text-muted-foreground text-center">
            The first Charleston is complete. Would you like to do a second Charleston?
            All players must agree for the second Charleston to happen.
          </p>
          <p className="text-xs text-muted-foreground text-center">
            A second Charleston reverses the order: Left, then Across, then Right.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => onVote(true)} data-testid="button-charleston-vote-yes">
              Yes, Continue
            </Button>
            <Button variant="outline" onClick={() => onVote(false)} data-testid="button-charleston-vote-no">
              No, Start Playing
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (charleston.secondCharlestonOffered && charleston.mySecondVote !== undefined) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="bg-card rounded-md border border-card-border p-6 max-w-md w-full space-y-4">
          <h2 className="text-lg font-bold text-center">Waiting for other players to vote...</h2>
          <p className="text-sm text-muted-foreground text-center">
            You voted: {charleston.mySecondVote ? "Yes" : "No"}
          </p>
        </div>
      </div>
    );
  }

  const passLabel = PASS_LABELS[charleston.passIndex] || `Pass ${charleston.passIndex + 1}`;
  const roundLabel = charleston.round === 1 ? "First Charleston" : "Second Charleston";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-card rounded-md border border-card-border p-4 sm:p-6 max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold" data-testid="text-charleston-title">
            {roundLabel} - {passLabel}
          </h2>
          <div className="flex items-center justify-center gap-2 text-lg font-semibold">
            <DirIcon className="w-5 h-5" />
            <span data-testid="text-charleston-direction">{dirInfo.label}</span>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-charleston-description">
            {dirInfo.description}
          </p>
        </div>

        <div className="bg-muted/30 rounded-md p-3 text-center space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">How it works</p>
          <p className="text-sm">
            In Charleston, players exchange tiles before the game begins.
            Select exactly <strong>3 tiles</strong> from your hand to pass {charleston.direction}.
            You will receive 3 tiles from another player in return.
          </p>
        </div>

        <div className="text-center">
          <span className="text-sm font-medium" data-testid="text-charleston-selected-count">
            Selected: {selectedSet.size} / 3
          </span>
          <span className="text-sm text-muted-foreground ml-3">
            Players ready: {charleston.readyCount} / {charleston.totalPlayers}
          </span>
        </div>

        <div className="flex items-center justify-center gap-0.5 sm:gap-1 flex-wrap p-2 sm:p-3 bg-card rounded-md border border-card-border" data-testid="charleston-hand">
          {hand.map((tile) => {
            const isSelected = selectedSet.has(tile.id);
            return (
              <div
                key={tile.id}
                className={`relative cursor-pointer transition-transform ${
                  isSelected ? "ring-2 ring-primary rounded-md -translate-y-2" : ""
                }`}
                onClick={() => !charleston.myReady && onSelectTile(tile.id)}
                data-testid={`charleston-tile-${tile.id}`}
              >
                <Tile
                  tile={tile}
                  size="sm"
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button
            onClick={onReady}
            disabled={selectedSet.size !== 3 || alreadySubmitted}
            data-testid="button-charleston-ready"
          >
            <Check className="w-4 h-4 mr-1" />
            {alreadySubmitted ? "Waiting for others..." : (selectedSet.size === 3 ? "Pass 3 Tiles" : `Pass (${selectedSet.size}/3)`)}
          </Button>
          {!alreadySubmitted && (
            <Button
              variant="outline"
              onClick={onSkip}
              data-testid="button-charleston-skip"
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Skip Charleston
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
