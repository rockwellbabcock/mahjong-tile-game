import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { type PatternMatch } from "@/lib/patterns";
import { type ClientPlayAgainView } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Trophy, ThumbsUp, ThumbsDown, Clock, Check } from "lucide-react";

interface RackPattern {
  name: string;
  description: string;
}

interface WinOverlayProps {
  result: PatternMatch & {
    winnerName?: string;
    winnerSeat?: string;
    isMe?: boolean;
    rack1Pattern?: RackPattern;
    rack2Pattern?: RackPattern;
  };
  playAgain?: ClientPlayAgainView;
  onVotePlayAgain: (vote: boolean) => void;
}

export function WinOverlay({ result, playAgain, onVotePlayAgain }: WinOverlayProps) {
  const isMultiplayer = result.winnerName !== undefined;
  const isMe = result.isMe ?? true;
  const hasSiamesePatterns = result.rack1Pattern && result.rack2Pattern;

  const [timeLeft, setTimeLeft] = useState<number>(90);

  useEffect(() => {
    if (!playAgain) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((playAgain.timeoutAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [playAgain?.timeoutAt]);

  const hasVoted = playAgain?.myVote !== undefined;

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

        {hasSiamesePatterns ? (
          <div className="mb-4" data-testid="text-win-pattern">
            <p className="text-lg font-semibold text-amber-700 dark:text-amber-400 mb-3">
              {isMultiplayer
                ? isMe
                  ? "Both racks won!"
                  : `${result.winnerName} (${result.winnerSeat}) won with both racks!`
                : "Both racks won!"
              }
            </p>
            <div className="space-y-3 text-left">
              <div className="bg-muted/50 rounded-md p-3" data-testid="text-rack1-pattern">
                <p className="text-sm font-semibold text-foreground mb-1">
                  Rack 1: {result.rack1Pattern!.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.rack1Pattern!.description}
                </p>
              </div>
              <div className="bg-muted/50 rounded-md p-3" data-testid="text-rack2-pattern">
                <p className="text-sm font-semibold text-foreground mb-1">
                  Rack 2: {result.rack2Pattern!.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.rack2Pattern!.description}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}

        {result.matched.length > 0 && (
          <div className="mb-6 text-left bg-muted/50 rounded-md p-4 text-sm text-muted-foreground" data-testid="text-win-tiles">
            <p className="font-semibold text-foreground mb-1">Winning tiles:</p>
            {result.matched.map((m, i) => (
              <p key={i}>{m}</p>
            ))}
          </div>
        )}

        {playAgain && (
          <div className="mt-4 border-t border-border pt-4" data-testid="play-again-section">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground" data-testid="text-play-again-timer">
                {timeLeft}s remaining to vote
              </span>
            </div>

            <p className="text-sm font-medium text-foreground mb-3">Play again?</p>

            <div className="space-y-2 mb-4">
              {playAgain.votes.map((v) => (
                <div
                  key={v.seat}
                  className="flex items-center justify-between px-3 py-1.5 rounded-md bg-muted/30"
                  data-testid={`play-again-voter-${v.seat}`}
                >
                  <span className="text-sm text-foreground">
                    {v.name} {v.isBot && "(Bot)"}
                  </span>
                  <span>
                    {v.voted ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-muted-foreground animate-pulse" />
                    )}
                  </span>
                </div>
              ))}
            </div>

            {!hasVoted ? (
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => onVotePlayAgain(true)}
                  data-testid="button-vote-yes"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Yes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onVotePlayAgain(false)}
                  data-testid="button-vote-no"
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  No
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-vote-submitted">
                {playAgain.myVote ? "You voted yes" : "You voted no"} — waiting for others...
              </p>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
