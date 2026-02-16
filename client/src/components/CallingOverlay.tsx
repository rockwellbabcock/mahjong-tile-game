import { useState, useMemo } from "react";
import { type Tile as TileType, type ClientCallingView, type ClaimType } from "@shared/schema";
import { Tile } from "./Tile";
import { Button } from "@/components/ui/button";
import { Hand, ShieldCheck, SkipForward } from "lucide-react";

interface CallingOverlayProps {
  callingState: ClientCallingView;
  hand: TileType[];
  onClaim: (claimType: ClaimType, tileIds: string[]) => void;
  onPass: () => void;
}

export function CallingOverlay({ callingState, hand, onClaim, onPass }: CallingOverlayProps) {
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [selectedClaimType, setSelectedClaimType] = useState<ClaimType | null>(null);

  const discardTile = callingState.discardedTile;

  const matchingTiles = useMemo(() => {
    return hand.filter(t =>
      (t.suit === discardTile.suit && t.value === discardTile.value) || t.isJoker
    );
  }, [hand, discardTile]);

  const canPung = matchingTiles.length >= 2;
  const canKong = matchingTiles.length >= 3;
  const canQuint = matchingTiles.length >= 4;

  if (callingState.hasClaimed || callingState.hasPassed) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-card-border p-3 text-center" data-testid="calling-waiting">
        <p className="text-sm text-muted-foreground">
          {callingState.hasClaimed
            ? "Your claim has been submitted. Waiting for other players..."
            : "You passed. Waiting for other players..."}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {callingState.claims.length} claim(s), {callingState.passedPlayers.length} pass(es)
        </p>
      </div>
    );
  }

  const handleSelectTile = (tileId: string) => {
    setSelectedTileIds(prev => {
      if (prev.includes(tileId)) return prev.filter(id => id !== tileId);
      return [...prev, tileId];
    });
  };

  const handleClaim = (type: ClaimType) => {
    if (type === "mahjong") {
      onClaim("mahjong", []);
      return;
    }

    const required = type === "pung" ? 2 : type === "kong" ? 3 : 4;
    if (selectedTileIds.length === required) {
      onClaim(type, selectedTileIds);
    } else {
      setSelectedClaimType(type);
    }
  };

  const handleSubmitClaim = () => {
    if (!selectedClaimType) return;
    onClaim(selectedClaimType, selectedTileIds);
  };

  const requiredForClaim = selectedClaimType === "pung" ? 2 : selectedClaimType === "kong" ? 3 : selectedClaimType === "quint" ? 4 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-card-border p-3 sm:p-4" data-testid="calling-overlay">
      <div className="max-w-2xl mx-auto space-y-3">
        <div className="flex items-center justify-center gap-3">
          <span className="text-sm font-medium">Discarded:</span>
          <Tile tile={discardTile} size="sm" />
          <span className="text-xs text-muted-foreground">
            by {callingState.discardedBy}
          </span>
        </div>

        {selectedClaimType ? (
          <div className="space-y-2">
            <p className="text-sm text-center">
              Select {requiredForClaim} matching tile(s) from your hand for {selectedClaimType}
              <span className="ml-1 text-muted-foreground">({selectedTileIds.length}/{requiredForClaim})</span>
            </p>
            <div className="flex items-center justify-center gap-1 flex-wrap">
              {matchingTiles.map(tile => (
                <div
                  key={tile.id}
                  className={`cursor-pointer transition-transform ${
                    selectedTileIds.includes(tile.id) ? "ring-2 ring-primary rounded-md -translate-y-1" : ""
                  }`}
                  onClick={() => handleSelectTile(tile.id)}
                  data-testid={`calling-tile-${tile.id}`}
                >
                  <Tile tile={tile} size="sm" />
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-2">
              <Button
                onClick={handleSubmitClaim}
                disabled={selectedTileIds.length !== requiredForClaim}
                data-testid="button-submit-claim"
              >
                <ShieldCheck className="w-4 h-4 mr-1" />
                Confirm {selectedClaimType}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setSelectedClaimType(null); setSelectedTileIds([]); }}
                data-testid="button-cancel-claim"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {canPung && (
              <Button onClick={() => handleClaim("pung")} data-testid="button-claim-pung">
                <Hand className="w-4 h-4 mr-1" />
                Pung
              </Button>
            )}
            {canKong && (
              <Button onClick={() => handleClaim("kong")} data-testid="button-claim-kong">
                <Hand className="w-4 h-4 mr-1" />
                Kong
              </Button>
            )}
            {canQuint && (
              <Button onClick={() => handleClaim("quint")} data-testid="button-claim-quint">
                <Hand className="w-4 h-4 mr-1" />
                Quint
              </Button>
            )}
            <Button onClick={() => handleClaim("mahjong")} variant="default" data-testid="button-claim-mahjong">
              <ShieldCheck className="w-4 h-4 mr-1" />
              Mahjong!
            </Button>
            <Button variant="outline" onClick={onPass} data-testid="button-claim-pass">
              <SkipForward className="w-4 h-4 mr-1" />
              Pass
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
