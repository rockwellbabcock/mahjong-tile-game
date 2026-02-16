import { motion } from "framer-motion";
import { type PatternMatch } from "@/lib/patterns";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trophy } from "lucide-react";

interface WinOverlayProps {
  result: PatternMatch & { winnerName?: string; winnerSeat?: string; isMe?: boolean };
  onPlayAgain: () => void;
}

export function WinOverlay({ result, onPlayAgain }: WinOverlayProps) {
  const isMultiplayer = result.winnerName !== undefined;
  const isMe = result.isMe ?? true;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      data-testid="win-overlay"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="bg-card border border-card-border rounded-md shadow-xl max-w-md w-full mx-4 p-8 text-center"
      >
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <h2
          className="text-2xl font-bold text-foreground mb-2"
          data-testid="text-win-title"
        >
          {isMe ? "MAHJONG!" : "Game Over"}
        </h2>

        <p
          className="text-lg font-semibold text-amber-700 dark:text-amber-400 mb-1"
          data-testid="text-win-pattern"
        >
          {isMultiplayer
            ? isMe
              ? `You won with: ${result.patternName}`
              : `${result.winnerName} (${result.winnerSeat}) won with: ${result.patternName}`
            : `You won with: ${result.patternName}`
          }
        </p>

        {result.description && (
          <p
            className="text-sm text-muted-foreground mb-6"
            data-testid="text-win-description"
          >
            {result.description}
          </p>
        )}

        {result.matched.length > 0 && (
          <div className="mb-6 text-left bg-muted/50 rounded-md p-4 text-sm text-muted-foreground" data-testid="text-win-tiles">
            <p className="font-semibold text-foreground mb-1">Winning tiles:</p>
            {result.matched.map((m, i) => (
              <p key={i}>{m}</p>
            ))}
          </div>
        )}

        <Button onClick={onPlayAgain} data-testid="button-play-again">
          <RotateCcw className="w-4 h-4 mr-2" />
          Play Again
        </Button>
      </motion.div>
    </motion.div>
  );
}
