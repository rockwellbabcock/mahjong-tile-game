import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ChevronRight, ChevronLeft, Target, ArrowDownUp, Hand, Shuffle, Trophy } from "lucide-react";

interface TutorialOverlayProps {
  onClose: () => void;
}

interface TutorialSlide {
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  tip: string;
}

const SLIDES: TutorialSlide[] = [
  {
    title: "Your Goal",
    icon: <Target className="w-8 h-8" />,
    content: (
      <div className="space-y-3">
        <p>
          American Mahjong is a tile-matching game where you build a winning hand of <strong>14 tiles</strong> that matches one of the patterns on the scoring card.
        </p>
        <div className="bg-muted/50 rounded-md p-3">
          <p className="text-sm font-medium mb-2">A winning hand might look like:</p>
          <div className="flex flex-wrap gap-1 justify-center">
            {["1B","1B","1B", "2C","2C","2C", "3D","3D","3D", "4B","4B","4B", "5C","5C"].map((t, i) => (
              <span key={i} className="inline-flex items-center justify-center w-8 h-10 bg-card border border-border rounded text-xs font-mono font-bold">
                {t}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Groups of matching tiles arranged in a valid pattern
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          You start with 13 tiles and draw one each turn, keeping your hand at 13 or 14 tiles throughout the game.
        </p>
      </div>
    ),
    tip: "Study the scoring card before each game to pick a pattern to aim for.",
  },
  {
    title: "Drawing & Discarding",
    icon: <ArrowDownUp className="w-8 h-8" />,
    content: (
      <div className="space-y-3">
        <p>
          On your turn, you <strong>draw</strong> one tile from the wall (the pool of undealt tiles), then <strong>discard</strong> one tile you don't need.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-md p-3 text-center">
            <div className="w-10 h-12 bg-primary/20 border-2 border-primary/40 rounded-md mx-auto mb-2 flex items-center justify-center text-lg font-bold">
              ?
            </div>
            <p className="text-xs font-medium">Draw Phase</p>
            <p className="text-xs text-muted-foreground">Click "Draw" to take a tile</p>
          </div>
          <div className="bg-muted/50 rounded-md p-3 text-center">
            <div className="w-10 h-12 bg-destructive/20 border-2 border-destructive/40 rounded-md mx-auto mb-2 flex items-center justify-center text-lg font-bold">
              X
            </div>
            <p className="text-xs font-medium">Discard Phase</p>
            <p className="text-xs text-muted-foreground">Click a tile to discard it</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Think of it like a card game: pick one up, put one down. Your goal is to gradually improve your hand.
        </p>
      </div>
    ),
    tip: "Discard tiles that don't fit any pattern you're working toward.",
  },
  {
    title: "Calling Discards",
    icon: <Hand className="w-8 h-8" />,
    content: (
      <div className="space-y-3">
        <p>
          When another player discards a tile you need, you can <strong>call</strong> it to form an exposure (a visible group of matching tiles).
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
            <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">Pung</span>
            <span className="text-xs text-muted-foreground">You have 2 matching tiles, call the 3rd</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
            <span className="text-xs font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Kong</span>
            <span className="text-xs text-muted-foreground">You have 3 matching tiles, call the 4th</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
            <span className="text-xs font-bold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Quint</span>
            <span className="text-xs text-muted-foreground">You have 4 matching (with Joker), call the 5th</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
            <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">Mahjong</span>
            <span className="text-xs text-muted-foreground">This tile completes your hand!</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Called tiles become visible to all players. Higher claims (Mahjong) beat lower ones (Pung).
        </p>
      </div>
    ),
    tip: "Calling reveals your strategy. Only call when it strongly helps your hand.",
  },
  {
    title: "The Charleston",
    icon: <Shuffle className="w-8 h-8" />,
    content: (
      <div className="space-y-3">
        <p>
          Before the game begins, players pass tiles to improve their starting hands. This is the <strong>Charleston</strong> - a series of 3-tile exchanges.
        </p>
        <div className="bg-muted/50 rounded-md p-3">
          <p className="text-sm font-medium mb-2">Pass Order (First Charleston):</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/30 text-xs flex items-center justify-center font-bold">1</span>
              <span className="text-sm">Pass 3 tiles to the <strong>Right</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/30 text-xs flex items-center justify-center font-bold">2</span>
              <span className="text-sm">Pass 3 tiles <strong>Across</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/30 text-xs flex items-center justify-center font-bold">3</span>
              <span className="text-sm">Pass 3 tiles to the <strong>Left</strong></span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            An optional second Charleston reverses: Left, Across, Right.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Select 3 tiles you don't need. You might receive great tiles in return!
        </p>
      </div>
    ),
    tip: "Pass tiles that don't match any pattern you're considering.",
  },
  {
    title: "Declaring Mahjong",
    icon: <Trophy className="w-8 h-8" />,
    content: (
      <div className="space-y-3">
        <p>
          When your 14 tiles match a valid pattern on the scoring card, you've won! The game automatically detects your winning hand.
        </p>
        <div className="bg-muted/50 rounded-md p-3 space-y-2">
          <p className="text-sm font-medium">Ways to Win:</p>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold text-lg">A</span>
            <span className="text-sm">Draw the winning tile yourself</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500 font-bold text-lg">B</span>
            <span className="text-sm">Call another player's discard for Mahjong</span>
          </div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3">
          <p className="text-sm">
            <strong>Jokers</strong> are wild cards that can substitute for any tile in groups of 3 or more. Use them wisely!
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          The hint panel at the bottom shows how close you are to each possible winning pattern.
        </p>
      </div>
    ),
    tip: "Use the hint panel to track which patterns you're closest to completing.",
  },
];

export function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = SLIDES[currentSlide];

  const handleNext = useCallback(() => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      localStorage.setItem("mahjong-tutorial-seen", "true");
      onClose();
    }
  }, [currentSlide, onClose]);

  const handlePrev = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  }, [currentSlide]);

  const handleSkip = useCallback(() => {
    localStorage.setItem("mahjong-tutorial-seen", "true");
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg relative overflow-visible" data-testid="tutorial-overlay">
        <button
          onClick={handleSkip}
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover-elevate z-10"
          data-testid="button-tutorial-close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= currentSlide ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Step {currentSlide + 1} of {SLIDES.length}
          </p>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {slide.icon}
            </div>
            <h2 className="text-xl font-bold text-foreground" data-testid="text-tutorial-title">
              {slide.title}
            </h2>
          </div>

          <div className="text-sm text-foreground leading-relaxed min-h-[200px]">
            {slide.content}
          </div>

          <div className="mt-4 bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
            <p className="text-xs text-primary font-medium">
              Tip: {slide.tip}
            </p>
          </div>

          <div className="flex items-center justify-between mt-5 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentSlide === 0}
              data-testid="button-tutorial-prev"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
              data-testid="button-tutorial-skip"
            >
              Skip Tutorial
            </Button>

            <Button
              size="sm"
              onClick={handleNext}
              data-testid="button-tutorial-next"
            >
              {currentSlide === SLIDES.length - 1 ? "Start Playing" : "Next"}
              {currentSlide < SLIDES.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function shouldShowTutorial(): boolean {
  return !localStorage.getItem("mahjong-tutorial-seen");
}
