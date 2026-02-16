import { motion, AnimatePresence } from "framer-motion";
import { type Tile as TileType } from "@shared/schema";
import { Tile, TileBack } from "./Tile";

interface BoardProps {
  deckCount: number;
  discards: TileType[];
  hand: TileType[];
  phase: "draw" | "discard";
  lastDrawnTileId: string | null;
  onDiscard: (id: string) => void;
  onSort: () => void;
  onReset: () => void;
}

export function Board({
  deckCount,
  discards,
  hand,
  phase,
  lastDrawnTileId,
  onDiscard,
  onSort,
  onReset,
}: BoardProps) {
  
  // Helper: Split hand into main hand (13) and drawn tile (14th)
  // If phase is 'discard' and we have a lastDrawnTileId, we isolate it visually
  const drawnTile = lastDrawnTileId 
    ? hand.find(t => t.id === lastDrawnTileId) 
    : null;
    
  const mainHand = drawnTile 
    ? hand.filter(t => t.id !== lastDrawnTileId)
    : hand;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 flex flex-col h-[100dvh] gap-4 md:gap-8">
      
      {/* --- Top Bar: Stats & Controls --- */}
      <header className="flex items-center justify-between bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-white/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-lg">
               <TileBack count={deckCount} />
             </div>
             <div>
               <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Wall</h2>
               <p className="text-2xl font-display font-bold text-primary">{deckCount}</p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex flex-col items-end mr-4">
             <span className="text-xs font-bold text-muted-foreground uppercase">Current Phase</span>
             <span className={`text-lg font-bold ${phase === 'discard' ? 'text-orange-600' : 'text-primary'}`}>
               {phase === 'discard' ? 'Discard a Tile' : 'Drawing...'}
             </span>
          </div>

          <button 
            onClick={onSort}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-border shadow-sm hover:bg-slate-50 active:scale-95 transition-all text-slate-700"
          >
            Sort Hand
          </button>
          
          <button 
            onClick={onReset}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-95 transition-all border border-destructive/20"
          >
            Reset Game
          </button>
        </div>
      </header>

      {/* --- Middle: Discard Pile --- */}
      <main className="flex-1 flex flex-col items-center justify-center min-h-0 relative">
        {/* Background texture for the "table" center */}
        <div className="absolute inset-4 bg-primary/5 rounded-3xl border-2 border-dashed border-primary/10 -z-10" />
        
        <div className="w-full max-w-4xl p-6 overflow-y-auto max-h-full">
          <h3 className="text-center text-sm font-bold text-primary/40 uppercase tracking-widest mb-4">
            Discard Pile
          </h3>
          
          <div className="flex flex-wrap justify-center gap-2">
            <AnimatePresence mode="popLayout">
              {discards.map((tile, i) => (
                <motion.div
                  key={tile.id}
                  layoutId={tile.id} // Matches layoutId in Hand for smooth transition!
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                >
                  <Tile tile={tile} size="sm" />
                </motion.div>
              ))}
            </AnimatePresence>
            {discards.length === 0 && (
              <div className="w-full py-12 flex flex-col items-center justify-center text-muted-foreground/40 border-2 border-dashed border-primary/10 rounded-xl">
                 <span className="text-4xl mb-2 opacity-50">🀄</span>
                 <p className="font-display italic">No discards yet</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- Bottom: Player Hand --- */}
      <footer className="w-full">
        <div className="bg-gradient-to-t from-background via-background to-transparent pt-8 pb-4">
          <div className="flex flex-col items-center gap-4">
            
            {/* Phase Indicator (Mobile only) */}
            <div className="md:hidden text-center">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                phase === 'discard' 
                  ? 'bg-orange-100 text-orange-700 border-orange-200' 
                  : 'bg-primary/10 text-primary border-primary/20'
              }`}>
                {phase === 'discard' ? 'Your Turn: Discard' : 'Drawing Tile...'}
              </span>
            </div>

            {/* Hand Container */}
            <div className="flex items-end justify-center gap-2 md:gap-4 w-full overflow-x-auto px-4 pb-4 pt-8 min-h-[120px]">
              
              {/* Main Hand (Sorted/Grouped) */}
              <div className="flex items-center justify-center gap-1 md:gap-2 p-2 md:p-4 bg-white shadow-xl shadow-black/5 rounded-2xl border border-white/40 backdrop-blur-xl">
                <AnimatePresence mode="popLayout">
                  {mainHand.map((tile) => (
                    <motion.div key={tile.id} layout>
                        <Tile
                        tile={tile}
                        isInteractive={phase === 'discard'}
                        onClick={() => onDiscard(tile.id)}
                        />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* The Drawn Tile (Separated) */}
              <AnimatePresence>
                {drawnTile && (
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className="ml-2 md:ml-6 flex items-center justify-center p-2 md:p-4 bg-orange-50/80 shadow-xl shadow-orange-500/10 rounded-2xl border border-orange-200/50 backdrop-blur-xl relative"
                  >
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full whitespace-nowrap border border-orange-200">
                      NEW
                    </span>
                    <Tile
                      tile={drawnTile}
                      isInteractive={phase === 'discard'}
                      isRecent={true}
                      onClick={() => onDiscard(drawnTile.id)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
