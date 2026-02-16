import { motion, AnimatePresence } from "framer-motion";
import { type PatternMatch } from "@/lib/patterns";
import { Lightbulb, ChevronDown, ChevronUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface HintPanelProps {
  closest: PatternMatch[];
  bestHint: string;
  tilesAway: number;
}

export function HintPanel({ closest, bestHint, tilesAway }: HintPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-4"
      data-testid="hint-panel"
    >
      <div className="flex items-start gap-3 mb-3">
        <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-bold text-blue-800 dark:text-blue-300">Hint</span>
            <span
              className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
              data-testid="text-tiles-away"
            >
              {tilesAway} tile{tilesAway !== 1 ? "s" : ""} away from closest win
            </span>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300" data-testid="text-best-hint">
            {bestHint}
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full justify-center text-blue-600 dark:text-blue-400 text-xs"
        data-testid="button-expand-hints"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3 h-3 mr-1" />
            Hide patterns
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3 mr-1" />
            Show closest patterns ({closest.length})
          </>
        )}
      </Button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3" data-testid="hint-pattern-list">
              {closest.map((match) => (
                <div
                  key={match.patternId}
                  className="bg-white dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md p-3"
                  data-testid={`hint-pattern-${match.patternId}`}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Target className="w-3 h-3 text-blue-500 dark:text-blue-400 shrink-0" />
                    <span className="text-xs font-bold text-foreground">{match.patternName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                      {match.tilesAway} away
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{match.description}</p>

                  {match.matched.length > 0 && (
                    <div className="mb-1">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Have: </span>
                      <span className="text-[10px] text-muted-foreground">
                        {match.matched.join(", ")}
                      </span>
                    </div>
                  )}

                  {match.missing.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase">Need: </span>
                      <span className="text-[10px] text-muted-foreground">
                        {match.missing.join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
