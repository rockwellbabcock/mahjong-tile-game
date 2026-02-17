import { useState, useMemo } from "react";
import { type Tile as TileType, type ClientCallingView, type ClaimType } from "@shared/schema";
import { Tile } from "./Tile";
import { Button } from "@/components/ui/button";
import { Hand, ShieldCheck, SkipForward, Lock, AlertTriangle, Loader2, ChevronRight } from "lucide-react";

interface CallingOverlayProps {
  callingState: ClientCallingView;
  hand: TileType[];
  onClaim: (claimType: ClaimType, tileIds: string[]) => void;
  onPass: () => void;
  pursuingConcealedPattern?: boolean;
}

export function CallingOverlay({ callingState, hand, onClaim, onPass, pursuingConcealedPattern }: CallingOverlayProps) {
  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [selectedClaimType, setSelectedClaimType] = useState<ClaimType | null>(null);
  const [confirmingExpose, setConfirmingExpose] = useState(false);

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
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-stone-900/95 border-t border-stone-600 p-3" data-testid="calling-waiting">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
            <p className="text-sm text-stone-300">
              {callingState.hasClaimed
                ? "Your claim has been submitted. Waiting for other players..."
                : "You passed. Waiting for other players..."}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span>{callingState.claims.length} claim(s)</span>
            <span>{callingState.passedPlayers.length} pass(es)</span>
          </div>
        </div>
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
      setConfirmingExpose(true);
      setSelectedClaimType(type);
    } else {
      setSelectedClaimType(type);
      setSelectedTileIds([]);
    }
  };

  const handleSubmitClaim = () => {
    if (!selectedClaimType) return;
    if (!confirmingExpose) {
      setConfirmingExpose(true);
      return;
    }
    onClaim(selectedClaimType, selectedTileIds);
  };

  const handleCancelClaim = () => {
    setSelectedClaimType(null);
    setSelectedTileIds([]);
    setConfirmingExpose(false);
  };

  const requiredForClaim = selectedClaimType === "pung" ? 2 : selectedClaimType === "kong" ? 3 : selectedClaimType === "quint" ? 4 : 0;

  const claimTypeLabel = (type: ClaimType) => {
    switch (type) {
      case "pung": return "Pung (3 tiles)";
      case "kong": return "Kong (4 tiles)";
      case "quint": return "Quint (5 tiles)";
      case "mahjong": return "Mahjong!";
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-stone-900/95 border-t border-stone-600 p-3 sm:p-4" data-testid="calling-overlay">
      <div className="max-w-2xl mx-auto space-y-3">
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2 bg-stone-800 rounded-lg px-3 py-1.5 border border-stone-600" data-testid="calling-discard-preview">
            <span className="text-xs font-medium text-stone-400">Call this tile:</span>
            <Tile tile={discardTile} size="sm" />
            <span className="text-[10px] text-stone-500">
              from {callingState.discardedBy}
            </span>
          </div>
        </div>

        {confirmingExpose && selectedClaimType && selectedClaimType !== "mahjong" ? (
          <div className="space-y-2" data-testid="calling-confirm-expose">
            <div className="flex items-center justify-center gap-1.5 text-sm text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Expose this set? It will be visible to all players.</span>
            </div>
            <div className="flex items-center justify-center gap-1 flex-wrap py-1">
              <Tile tile={discardTile} size="sm" />
              <ChevronRight className="w-3 h-3 text-stone-500" />
              {selectedTileIds.map(tid => {
                const t = hand.find(h => h.id === tid);
                return t ? <Tile key={tid} tile={t} size="sm" /> : null;
              })}
            </div>
            <div className="flex justify-center gap-2">
              <Button
                onClick={() => {
                  if (selectedClaimType) onClaim(selectedClaimType, selectedTileIds);
                }}
                className="bg-emerald-600 text-white border-emerald-500"
                data-testid="button-confirm-expose"
              >
                <ShieldCheck className="w-4 h-4 mr-1" />
                Yes, expose {selectedClaimType}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelClaim}
                className="border-stone-600 text-stone-300"
                data-testid="button-cancel-expose"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : selectedClaimType && selectedClaimType !== "mahjong" ? (
          <div className="space-y-2">
            <p className="text-sm text-center text-stone-300">
              Select {requiredForClaim} matching tile(s) from your hand for {selectedClaimType}
              <span className="ml-1 text-stone-500">({selectedTileIds.length}/{requiredForClaim})</span>
            </p>
            <div className="flex items-center justify-center gap-1 flex-wrap">
              {matchingTiles.map(tile => (
                <div
                  key={tile.id}
                  className={`cursor-pointer transition-transform ${
                    selectedTileIds.includes(tile.id) ? "ring-2 ring-emerald-400 rounded-md -translate-y-1" : ""
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
                className="bg-emerald-600 text-white border-emerald-500 disabled:opacity-50"
                data-testid="button-submit-claim"
              >
                <ShieldCheck className="w-4 h-4 mr-1" />
                Confirm {selectedClaimType}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelClaim}
                className="border-stone-600 text-stone-300"
                data-testid="button-cancel-claim"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {pursuingConcealedPattern && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400" data-testid="text-concealed-warning">
                <Lock className="w-3 h-3" />
                <span>Your closest pattern requires a concealed hand. Calling will break it.</span>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {canPung && (
                <Button
                  onClick={() => handleClaim("pung")}
                  disabled={pursuingConcealedPattern}
                  className="bg-blue-600 text-white border-blue-500 disabled:opacity-50"
                  data-testid="button-claim-pung"
                >
                  <Hand className="w-4 h-4 mr-1" />
                  {claimTypeLabel("pung")}
                </Button>
              )}
              {canKong && (
                <Button
                  onClick={() => handleClaim("kong")}
                  disabled={pursuingConcealedPattern}
                  className="bg-blue-600 text-white border-blue-500 disabled:opacity-50"
                  data-testid="button-claim-kong"
                >
                  <Hand className="w-4 h-4 mr-1" />
                  {claimTypeLabel("kong")}
                </Button>
              )}
              {canQuint && (
                <Button
                  onClick={() => handleClaim("quint")}
                  disabled={pursuingConcealedPattern}
                  className="bg-blue-600 text-white border-blue-500 disabled:opacity-50"
                  data-testid="button-claim-quint"
                >
                  <Hand className="w-4 h-4 mr-1" />
                  {claimTypeLabel("quint")}
                </Button>
              )}
              <Button
                onClick={() => handleClaim("mahjong")}
                className="bg-amber-600 text-white border-amber-500"
                data-testid="button-claim-mahjong"
              >
                <ShieldCheck className="w-4 h-4 mr-1" />
                Mahjong!
              </Button>
              <Button
                variant="outline"
                onClick={onPass}
                className="border-stone-600 text-stone-300"
                data-testid="button-claim-pass"
              >
                <SkipForward className="w-4 h-4 mr-1" />
                Pass
              </Button>
            </div>
            {!canPung && !canKong && !canQuint && (
              <p className="text-xs text-center text-stone-500">
                No matching tiles for exposure claims. You can still call Mahjong if this tile completes your hand.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
