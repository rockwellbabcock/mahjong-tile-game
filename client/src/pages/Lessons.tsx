import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLessons } from "@/hooks/use-lessons";
import {
  ArrowLeft, Lock, CheckCircle2, BookOpen, ChevronRight,
  ChevronLeft, Target, Shuffle, Hand, Brain, Shield, Sparkles,
  Users, Skull, Layers, Crown, Lightbulb, Zap
} from "lucide-react";

interface LessonDef {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: "basics" | "strategy" | "advanced";
  slides: LessonSlide[];
}

interface LessonSlide {
  title: string;
  content: React.ReactNode;
}

const LESSONS: LessonDef[] = [
  {
    id: "reading-card",
    title: "Reading the NMJL Card",
    description: "Learn how to read and interpret the National Mah Jongg League scoring card.",
    icon: <BookOpen className="w-5 h-5" />,
    category: "basics",
    slides: [
      {
        title: "What is the Card?",
        content: (
          <div className="space-y-3">
            <p>The NMJL card lists all valid winning hand patterns for the year. Each line on the card represents one possible winning combination.</p>
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-sm font-medium mb-2">Card Notation:</p>
              <div className="space-y-1 text-sm">
                <p><strong>F</strong> = Flower, <strong>D</strong> = Dragon</p>
                <p><strong>N, E, S, W</strong> = Wind tiles</p>
                <p>Numbers (1-9) = Numbered tiles in a suit</p>
                <p><strong>X</strong> = Concealed (hidden) group</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">New cards are released annually by the NMJL. Patterns change each year!</p>
          </div>
        ),
      },
      {
        title: "Suits and Colors",
        content: (
          <div className="space-y-3">
            <p>The card uses colors to indicate which suit to use:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-muted/50 rounded-md p-2">
                <span className="w-8 h-8 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">B</span>
                <span className="text-sm"><strong>Blue</strong> = Bam (Bamboo) suit</span>
              </div>
              <div className="flex items-center gap-3 bg-muted/50 rounded-md p-2">
                <span className="w-8 h-8 rounded bg-red-500/20 text-red-500 flex items-center justify-center font-bold">C</span>
                <span className="text-sm"><strong>Red</strong> = Crak (Character) suit</span>
              </div>
              <div className="flex items-center gap-3 bg-muted/50 rounded-md p-2">
                <span className="w-8 h-8 rounded bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">D</span>
                <span className="text-sm"><strong>Green</strong> = Dot (Circle) suit</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Some patterns require all one suit, others mix suits. Pay attention to the colors!</p>
          </div>
        ),
      },
      {
        title: "Reading a Pattern Line",
        content: (
          <div className="space-y-3">
            <p>Each line shows groups of tiles. Spaces separate the groups.</p>
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-sm font-medium mb-2">Example pattern:</p>
              <div className="flex items-center gap-1 justify-center mb-2">
                <span className="px-2 py-1 bg-card border border-border rounded text-xs font-mono">FF</span>
                <span className="px-2 py-1 bg-card border border-border rounded text-xs font-mono text-blue-500">111</span>
                <span className="px-2 py-1 bg-card border border-border rounded text-xs font-mono text-red-500">222</span>
                <span className="px-2 py-1 bg-card border border-border rounded text-xs font-mono text-emerald-500">333</span>
                <span className="px-2 py-1 bg-card border border-border rounded text-xs font-mono text-blue-500">44</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                2 Flowers + Three 1-Bams + Three 2-Craks + Three 3-Dots + Two 4-Bams
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Count the tiles in each group: pairs (2), pungs (3), kongs (4), quints (5). Total should equal 14.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "basic-patterns",
    title: "Basic Hand Patterns",
    description: "Understand common patterns: pairs, runs, pungs, kongs, and quints.",
    icon: <Target className="w-5 h-5" />,
    category: "basics",
    slides: [
      {
        title: "Types of Groups",
        content: (
          <div className="space-y-3">
            <p>Winning hands are made up of groups of matching tiles:</p>
            <div className="space-y-2">
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-sm font-medium">Pair (2 tiles)</p>
                <div className="flex gap-1 mt-1">
                  <span className="w-7 h-9 bg-card border border-border rounded text-xs flex items-center justify-center font-mono">3D</span>
                  <span className="w-7 h-9 bg-card border border-border rounded text-xs flex items-center justify-center font-mono">3D</span>
                </div>
              </div>
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-sm font-medium">Pung (3 matching tiles)</p>
                <div className="flex gap-1 mt-1">
                  <span className="w-7 h-9 bg-card border border-border rounded text-xs flex items-center justify-center font-mono">7B</span>
                  <span className="w-7 h-9 bg-card border border-border rounded text-xs flex items-center justify-center font-mono">7B</span>
                  <span className="w-7 h-9 bg-card border border-border rounded text-xs flex items-center justify-center font-mono">7B</span>
                </div>
              </div>
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-sm font-medium">Kong (4 matching tiles)</p>
                <div className="flex gap-1 mt-1">
                  {[1,2,3,4].map(i => (
                    <span key={i} className="w-7 h-9 bg-card border border-border rounded text-xs flex items-center justify-center font-mono">5C</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Even & Odd Patterns",
        content: (
          <div className="space-y-3">
            <p>Many card patterns focus on even numbers (2, 4, 6, 8) or odd numbers (1, 3, 5, 7, 9).</p>
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-sm font-medium mb-2">Example Even Pattern:</p>
              <div className="flex gap-1 justify-center">
                {["2B","2B","4B","4B","4B","6C","6C","6C","8D","8D","8D","8D","FF"].map((t, i) => (
                  <span key={i} className="w-6 h-8 bg-card border border-border rounded text-[9px] flex items-center justify-center font-mono">{t}</span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">Pair of 2s, Pung of 4s, Pung of 6s, Kong of 8s + Flower</p>
            </div>
            <p className="text-sm text-muted-foreground">Look for these number relationships early in your hand to choose which pattern to pursue.</p>
          </div>
        ),
      },
      {
        title: "Consecutive Runs",
        content: (
          <div className="space-y-3">
            <p>Some patterns use consecutive numbers in the same suit (like 1-2-3 or 5-6-7).</p>
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-sm font-medium mb-2">Consecutive Run Example:</p>
              <div className="flex gap-1 justify-center">
                {["1B","1B","1B","2B","2B","2B","3B","3B","3B","4B","4B","4B","FF"].map((t, i) => (
                  <span key={i} className="w-6 h-8 bg-card border border-border rounded text-[9px] flex items-center justify-center font-mono">{t}</span>
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Runs must be in the same suit. The card specifies which numbers and suits are valid for each pattern.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "charleston-strategy",
    title: "Charleston Strategy",
    description: "Master the art of the pre-game tile exchange to start with a stronger hand.",
    icon: <Shuffle className="w-5 h-5" />,
    category: "basics",
    slides: [
      {
        title: "What to Pass",
        content: (
          <div className="space-y-3">
            <p>The Charleston is your chance to dump tiles that don't fit your plan and hopefully receive better ones.</p>
            <div className="space-y-2">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-2">
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Pass these:</p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
                  <li>Tiles that don't match any pattern you're considering</li>
                  <li>Isolated tiles with no pairs or groups nearby</li>
                  <li>Tiles from suits you're not collecting</li>
                </ul>
              </div>
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2">
                <p className="text-sm font-medium text-destructive">Keep these:</p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
                  <li>Pairs and triples you've already started</li>
                  <li>Jokers (always valuable)</li>
                  <li>Tiles that fit multiple possible patterns</li>
                </ul>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Direction Matters",
        content: (
          <div className="space-y-3">
            <p>Pay attention to which direction you're passing. You'll receive tiles from the opposite direction.</p>
            <div className="bg-muted/50 rounded-md p-3 space-y-2 text-sm">
              <p>Pass <strong>Right</strong> = Receive from <strong>Left</strong></p>
              <p>Pass <strong>Across</strong> = Receive from <strong>Across</strong></p>
              <p>Pass <strong>Left</strong> = Receive from <strong>Right</strong></p>
            </div>
            <p className="text-sm text-muted-foreground">On the "across" pass, you trade directly with one player, so be careful what you send - you might get something similar back!</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "calling-strategy",
    title: "When to Call vs Pass",
    description: "Learn when claiming a discard helps you and when it hurts your chances.",
    icon: <Hand className="w-5 h-5" />,
    category: "strategy",
    slides: [
      {
        title: "The Cost of Calling",
        content: (
          <div className="space-y-3">
            <p>Calling a discard creates an <strong>exposure</strong> - tiles that are visible to all players. This has tradeoffs:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-2">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">Pros</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  <li>Gets you closer to winning</li>
                  <li>Locks in a group you need</li>
                  <li>Saves time waiting to draw</li>
                </ul>
              </div>
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-2">
                <p className="text-xs font-medium text-destructive mb-1">Cons</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  <li>Reveals your strategy</li>
                  <li>Others may stop discarding what you need</li>
                  <li>Some patterns require concealed hands</li>
                </ul>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "When to Call",
        content: (
          <div className="space-y-3">
            <p>Call when the benefit clearly outweighs the risk:</p>
            <div className="space-y-2">
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Call</strong> when you're very close to winning (1-2 tiles away)
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Call</strong> when the tile is rare and unlikely to appear again
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Pass</strong> when you're early in the game with many options
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Pass</strong> when calling would reveal too much about your hand
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "defensive-play",
    title: "Defensive Play",
    description: "Avoid feeding opponents the tiles they need to win.",
    icon: <Shield className="w-5 h-5" />,
    category: "strategy",
    slides: [
      {
        title: "Reading the Table",
        content: (
          <div className="space-y-3">
            <p>Watch what other players discard and call to figure out what they're collecting.</p>
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-sm font-medium mb-2">Warning Signs:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>Player calls multiple tiles in the same suit</li>
                <li>Player discards all of one suit (they don't need it)</li>
                <li>Player has many exposures and few concealed tiles</li>
                <li>Player stops discarding a particular number range</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">If a player has 3 exposures and only needs 2-3 more tiles, be very careful what you discard!</p>
          </div>
        ),
      },
      {
        title: "Safe Discards",
        content: (
          <div className="space-y-3">
            <p>Some discards are safer than others:</p>
            <div className="space-y-2">
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Safest:</strong> Tiles that were recently discarded by others (nobody wanted them)
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Safe:</strong> Tiles from a suit that an opponent just discarded
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Risky:</strong> Tiles from a suit an opponent is collecting
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Dangerous:</strong> Tiles that match an opponent's exposed groups
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "joker-strategy",
    title: "Joker Strategy",
    description: "Maximize the value of your Jokers and swap them from opponents.",
    icon: <Sparkles className="w-5 h-5" />,
    category: "strategy",
    slides: [
      {
        title: "Joker Rules",
        content: (
          <div className="space-y-3">
            <p>Jokers are wildcard tiles that can substitute for any tile in groups of <strong>3 or more</strong>.</p>
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-sm font-medium mb-2">Joker Rules:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>Can be used in pungs (3), kongs (4), and quints (5)</li>
                <li>Cannot be used in pairs</li>
                <li>Cannot be discarded once the game starts</li>
                <li>There are 8 Jokers in the deck</li>
              </ul>
            </div>
          </div>
        ),
      },
      {
        title: "Joker Swapping",
        content: (
          <div className="space-y-3">
            <p>You can swap a Joker from an opponent's exposure if you have the matching real tile!</p>
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-sm font-medium mb-2">How to Swap:</p>
              <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
                <li>It must be your turn (draw or discard phase)</li>
                <li>Find an opponent's exposure that contains a Joker</li>
                <li>Click on the exposure group with the Joker</li>
                <li>Click the matching real tile from your hand</li>
                <li>The Joker moves to your hand, your tile replaces it</li>
              </ol>
            </div>
            <p className="text-sm text-muted-foreground">Joker swapping is powerful - it gives you a wildcard while keeping the opponent's exposure intact.</p>
          </div>
        ),
      },
      {
        title: "When to Use Jokers",
        content: (
          <div className="space-y-3">
            <p>Use Jokers strategically to complete difficult groups:</p>
            <div className="space-y-2">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-2 text-sm">
                <strong>Best use:</strong> In quints (5 of a kind) where getting all 5 real tiles is very hard
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Good use:</strong> In kongs to complete a group you're missing one tile for
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-2 text-sm">
                <strong>Save them:</strong> Don't lock Jokers into pungs early - keep flexibility
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "siamese-tactics",
    title: "Siamese Mahjong Tactics",
    description: "Special strategies for the 2-player variant with dual racks.",
    icon: <Users className="w-5 h-5" />,
    category: "strategy",
    slides: [
      {
        title: "Managing Two Racks",
        content: (
          <div className="space-y-3">
            <p>In Siamese Mahjong, you control two racks. Both must form winning hands to win the game.</p>
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-sm font-medium mb-2">Key Differences:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>You manage Rack 1 and Rack 2 simultaneously</li>
                <li>Draw from a shared Pool (not Wall)</li>
                <li>Transfer tiles between racks during your turn</li>
                <li>Both racks must complete valid patterns</li>
              </ul>
            </div>
          </div>
        ),
      },
      {
        title: "Transfer Strategy",
        content: (
          <div className="space-y-3">
            <p>Use Transfer Mode to move tiles between your racks. This is the key advantage in Siamese!</p>
            <div className="space-y-2">
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Sort early:</strong> Decide which pattern each rack will pursue
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Transfer tiles:</strong> Move tiles to the rack where they're most useful
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Balance progress:</strong> Don't neglect one rack in favor of the other
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Watch the pool:</strong> With fewer tiles, every draw counts more
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "dead-hands",
    title: "Dead Hand Scenarios",
    description: "Understand when a hand becomes 'dead' and what to do about it.",
    icon: <Skull className="w-5 h-5" />,
    category: "advanced",
    slides: [
      {
        title: "What is a Dead Hand?",
        content: (
          <div className="space-y-3">
            <p>A hand becomes "dead" when it can no longer form any valid winning pattern. This can happen due to:</p>
            <div className="space-y-2">
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Wrong tile count:</strong> Having more or fewer than 13 tiles (14 after draw)
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Invalid exposure:</strong> Calling tiles incorrectly or exposing the wrong group
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Impossible pattern:</strong> Your exposures don't match any remaining valid pattern
              </div>
            </div>
            <p className="text-sm text-muted-foreground">A dead hand player must continue playing but cannot win. They still discard tiles, which helps other players.</p>
          </div>
        ),
      },
      {
        title: "Challenging Other Players",
        content: (
          <div className="space-y-3">
            <p>You can challenge another player if you believe their hand is dead.</p>
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-sm font-medium mb-2">Challenge System:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>Click "Challenge" on an opponent's player card</li>
                <li>If the challenge succeeds, that player's hand is declared dead</li>
                <li>If the challenge fails, no penalty - play continues normally</li>
                <li>Dead players skip turns and cannot draw or claim tiles</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">Use challenges sparingly - only when you're confident the opponent's hand is invalid.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "tile-counting",
    title: "Tile Counting",
    description: "Track which tiles have been played to improve your decisions.",
    icon: <Brain className="w-5 h-5" />,
    category: "advanced",
    slides: [
      {
        title: "Why Count Tiles?",
        content: (
          <div className="space-y-3">
            <p>There are exactly 4 of each numbered tile, 4 of each Wind, 4 of each Dragon, and 8 Jokers in American Mahjong.</p>
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-sm font-medium mb-2">Track These:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>How many of your needed tiles are in the discard pile?</li>
                <li>How many are in opponents' exposures?</li>
                <li>How many could still be in the wall or other hands?</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">If 3 of a tile are already visible and you need the 4th, your odds are slim. Consider switching patterns!</p>
          </div>
        ),
      },
      {
        title: "When to Switch Patterns",
        content: (
          <div className="space-y-3">
            <p>Don't be afraid to change your target pattern mid-game. Flexibility wins games.</p>
            <div className="space-y-2">
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Switch when:</strong> Key tiles for your pattern are mostly gone
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Switch when:</strong> You draw tiles that fit a different pattern better
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Don't switch when:</strong> You have exposed tiles that lock you in
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Don't switch when:</strong> You're only 1-2 tiles away from winning
              </div>
            </div>
            <p className="text-sm text-muted-foreground">The hint panel shows your closest patterns - use it to evaluate alternatives!</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "exposure-management",
    title: "Managing Exposures",
    description: "Learn to read and manage exposed tile groups effectively.",
    icon: <Layers className="w-5 h-5" />,
    category: "advanced",
    slides: [
      {
        title: "Reading Opponent Exposures",
        content: (
          <div className="space-y-3">
            <p>Each opponent's exposed groups tell a story about their hand. Learn to read it!</p>
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-sm font-medium mb-2">What exposures reveal:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>Which suit(s) they're collecting</li>
                <li>Whether they're going for consecutive or matching numbers</li>
                <li>How many tiles they still need (count exposed vs 14 total)</li>
                <li>Which card patterns they could be pursuing</li>
              </ul>
            </div>
          </div>
        ),
      },
      {
        title: "Protecting Your Strategy",
        content: (
          <div className="space-y-3">
            <p>Minimize the information you give away through your exposures.</p>
            <div className="space-y-2">
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                Call as few tiles as possible to keep your hand concealed
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                If you must call, delay until you're close to winning
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                Vary your discards to avoid revealing patterns
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Some winning patterns on the card are entirely concealed (no exposures allowed). These are harder but give less information away.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "endgame",
    title: "Endgame Strategy",
    description: "Tactics for the final rounds when the wall is running low.",
    icon: <Crown className="w-5 h-5" />,
    category: "advanced",
    slides: [
      {
        title: "Late Game Awareness",
        content: (
          <div className="space-y-3">
            <p>When the wall gets low, the game becomes more tense and strategic.</p>
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-sm font-medium mb-2">Late Game Tips:</p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>Count remaining wall tiles - plan your final moves</li>
                <li>Play more defensively - one wrong discard can give an opponent the win</li>
                <li>If you can't win, focus on preventing others from winning</li>
                <li>A wall game (no winner) is better than giving someone else the win</li>
              </ul>
            </div>
          </div>
        ),
      },
      {
        title: "Closing the Deal",
        content: (
          <div className="space-y-3">
            <p>When you're 1 tile away from winning (called "waiting" or "fishing"):</p>
            <div className="space-y-2">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md p-2 text-sm">
                <strong>Stay calm</strong> - don't reveal urgency through your play speed
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Remember:</strong> You can win by drawing OR by calling a discard
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Multiple outs:</strong> Patterns with Joker flexibility have more ways to win
              </div>
            </div>
            <p className="text-sm text-muted-foreground">The hint panel will show "0 tiles away" when you're one draw from victory!</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "quick-tips",
    title: "Quick Tips & Tricks",
    description: "Helpful shortcuts and features to improve your gameplay experience.",
    icon: <Zap className="w-5 h-5" />,
    category: "basics",
    slides: [
      {
        title: "Game Interface Tips",
        content: (
          <div className="space-y-3">
            <p>Get the most out of the game interface:</p>
            <div className="space-y-2">
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Drag & Drop:</strong> Rearrange tiles in your hand by dragging them
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Sort Button:</strong> Automatically organize tiles by suit and number
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Hint Panel:</strong> Toggle hints to see which patterns you're closest to
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Tile Styles:</strong> Switch between classic, text, and emoji tile displays
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Table Themes:</strong> Change the table color with the mat theme button
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Beginner Shortcuts",
        content: (
          <div className="space-y-3">
            <p>Features designed to help new players:</p>
            <div className="space-y-2">
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Hover tooltips:</strong> Hover over game terms for explanations
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Status bar:</strong> Shows what action is expected of you
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Bot opponents:</strong> Practice against bots before playing humans
              </div>
              <div className="bg-muted/50 rounded-md p-2 text-sm">
                <strong>Auto-hints:</strong> Enable auto-show hints to always see pattern guidance
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
];

const CATEGORIES = [
  { key: "basics" as const, label: "Basics", icon: <Lightbulb className="w-4 h-4" /> },
  { key: "strategy" as const, label: "Strategy", icon: <Brain className="w-4 h-4" /> },
  { key: "advanced" as const, label: "Advanced", icon: <Crown className="w-4 h-4" /> },
];

interface LessonsPageProps {
  onBack: () => void;
}

export default function LessonsPage({ onBack }: LessonsPageProps) {
  const { progress, remainingToday, canAccessLesson, startLesson, completeLesson, completedCount, isPremium, freeDailyLimit } = useLessons();
  const [activeLesson, setActiveLesson] = useState<LessonDef | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const handleOpenLesson = useCallback((lesson: LessonDef) => {
    if (!canAccessLesson(lesson.id)) return;
    if (startLesson(lesson.id)) {
      setActiveLesson(lesson);
      setActiveSlide(0);
    }
  }, [canAccessLesson, startLesson]);

  const handleCloseLesson = useCallback(() => {
    if (activeLesson) {
      const slideCount = activeLesson.slides.length;
      const pct = Math.round(((activeSlide + 1) / slideCount) * 100);
      completeLesson(activeLesson.id, pct);
    }
    setActiveLesson(null);
    setActiveSlide(0);
  }, [activeLesson, activeSlide, completeLesson]);

  const handleNextSlide = useCallback(() => {
    if (!activeLesson) return;
    if (activeSlide < activeLesson.slides.length - 1) {
      setActiveSlide(prev => prev + 1);
    } else {
      completeLesson(activeLesson.id, 100);
      setActiveLesson(null);
      setActiveSlide(0);
    }
  }, [activeLesson, activeSlide, completeLesson]);

  const handlePrevSlide = useCallback(() => {
    if (activeSlide > 0) setActiveSlide(prev => prev - 1);
  }, [activeSlide]);

  if (activeLesson) {
    const slide = activeLesson.slides[activeSlide];
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background p-3 sm:p-4">
        <div className="w-full max-w-lg">
          <Card className="p-5 sm:p-6" data-testid="lesson-viewer">
            <div className="flex items-center gap-2 mb-1">
              {activeLesson.slides.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= activeSlide ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              {activeSlide + 1} of {activeLesson.slides.length} &middot; {activeLesson.title}
            </p>

            <h2 className="text-lg font-bold text-foreground mb-3" data-testid="text-lesson-slide-title">
              {slide.title}
            </h2>

            <div className="text-sm text-foreground leading-relaxed min-h-[200px]">
              {slide.content}
            </div>

            <div className="flex items-center justify-between mt-5 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevSlide}
                disabled={activeSlide === 0}
                data-testid="button-lesson-prev"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseLesson}
                className="text-muted-foreground"
                data-testid="button-lesson-close"
              >
                Exit Lesson
              </Button>

              <Button
                size="sm"
                onClick={handleNextSlide}
                data-testid="button-lesson-next"
              >
                {activeSlide === activeLesson.slides.length - 1 ? "Complete" : "Next"}
                {activeSlide < activeLesson.slides.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-[100dvh] bg-background p-3 sm:p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="outline" size="sm" onClick={onBack} data-testid="button-lessons-back">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-lessons-title">
              Lessons
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Learn American Mahjong step by step
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground" data-testid="text-lessons-completed">
                {completedCount} / {LESSONS.length} completed
              </p>
              <div className="w-32 h-1.5 bg-muted rounded-full mt-0.5">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(completedCount / LESSONS.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {!isPremium && (
            <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md" data-testid="text-lessons-remaining">
              {remainingToday > 0
                ? `${remainingToday} lesson${remainingToday !== 1 ? "s" : ""} remaining today`
                : "Daily limit reached"}
            </div>
          )}
        </div>

        {!isPremium && remainingToday === 0 && (
          <Card className="p-4 mb-4 border-amber-500/30 bg-amber-500/5" data-testid="card-premium-prompt">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Daily limit reached</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You've used your {freeDailyLimit} free lessons for today. Lessons reset at midnight.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                  Unlock unlimited lessons with Premium ($4.99/mo)
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-6">
          {CATEGORIES.map(cat => {
            const catLessons = LESSONS.filter(l => l.category === cat.key);
            return (
              <div key={cat.key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-muted-foreground">{cat.icon}</span>
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    {cat.label}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    ({catLessons.filter(l => (progress.completedLessons[l.id] || 0) >= 100).length}/{catLessons.length})
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {catLessons.map(lesson => {
                    const score = progress.completedLessons[lesson.id] || 0;
                    const isCompleted = score >= 100;
                    const canAccess = canAccessLesson(lesson.id);
                    const isLocked = !canAccess;

                    return (
                      <Card
                        key={lesson.id}
                        className={`p-3 cursor-pointer transition-colors ${
                          isLocked
                            ? "opacity-60"
                            : "hover-elevate"
                        } ${isCompleted ? "border-emerald-500/30" : ""}`}
                        onClick={() => !isLocked && handleOpenLesson(lesson)}
                        data-testid={`card-lesson-${lesson.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-500"
                              : isLocked
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary/10 text-primary"
                          }`}>
                            {isLocked ? <Lock className="w-4 h-4" /> : isCompleted ? <CheckCircle2 className="w-5 h-5" /> : lesson.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-tight">
                              {lesson.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {lesson.description}
                            </p>
                            {score > 0 && score < 100 && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="w-16 h-1 bg-muted rounded-full">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${score}%` }} />
                                </div>
                                <span className="text-[10px] text-muted-foreground">{score}%</span>
                              </div>
                            )}
                          </div>
                          {!isLocked && (
                            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
