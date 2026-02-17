import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  state: jsonb("state").notNull(),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const insertGameSchema = createInsertSchema(games).omit({ id: true, createdAt: true });

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;

// --- Game Logic Types (Shared) ---

export type Suit = "Bam" | "Crak" | "Dot" | "Wind" | "Dragon" | "Flower" | "Joker" | "Blank";
export type WindValue = "North" | "South" | "East" | "West";
export type DragonValue = "Green" | "Red" | "White";

export type FlowerName = "Plum" | "Orchid" | "Chrysanthemum" | "Bamboo" | "Lily" | "Lotus" | "Peony" | "Jasmine";

export type TileValue = number | WindValue | DragonValue | FlowerName | null; 

export interface Tile {
  id: string;
  suit: Suit;
  value: TileValue; 
  isJoker?: boolean;
}

export type GamePhase = "charleston" | "draw" | "discard" | "calling" | "won";

export type PlayerSeat = "East" | "South" | "West" | "North";
export const SEAT_ORDER: PlayerSeat[] = ["East", "South", "West", "North"];

export type ClaimType = "pung" | "kong" | "quint" | "mahjong";

export type GameMode = "4-player" | "2-player";

export type CharlestonDirection = "right" | "across" | "left";

export interface CharlestonState {
  round: 1 | 2;
  passIndex: number;
  direction: CharlestonDirection;
  selections: Partial<Record<PlayerSeat, string[]>>;
  readyPlayers: PlayerSeat[];
  secondCharlestonOffered: boolean;
  secondCharlestonVotes: Partial<Record<PlayerSeat, boolean>>;
  skipped: boolean;
}

export interface PendingClaim {
  playerId: string;
  seat: PlayerSeat;
  claimType: ClaimType;
  tileIds: string[];
}

export interface CallingState {
  discardedTile: Tile;
  discardedBy: PlayerSeat;
  claims: PendingClaim[];
  passedPlayers: PlayerSeat[];
  callingTimeout?: number;
}

export interface ClientCallingView {
  discardedTile: Tile;
  discardedBy: PlayerSeat;
  claims: { seat: PlayerSeat; claimType: ClaimType }[];
  passedPlayers: PlayerSeat[];
  hasClaimed: boolean;
  hasPassed: boolean;
}

export interface ExposureGroup {
  tiles: Tile[];
  fromDiscardId: string;
  claimType: ClaimType;
}

export interface ZombieBlanksConfig {
  enabled: boolean;
  count: 4 | 6 | 8;
  exchangeAnytime: boolean;
}

export interface RoomConfig {
  gameMode: GameMode;
  fillWithBots: boolean;
  zombieBlanks: ZombieBlanksConfig;
}

export type DeadHandReason = "tile-count" | "invalid-exposure" | "impossible-hand" | "technical";

export interface DeadHandStatus {
  isDead: boolean;
  reason?: DeadHandReason;
  challengedBy?: string;
  rack?: "main" | "partner" | "both";
}

export interface PlayerState {
  id: string;
  name: string;
  seat: PlayerSeat;
  hand: Tile[];
  exposures: ExposureGroup[];
  connected: boolean;
  rejoinToken?: string;
  isBot?: boolean;
  controlledBy?: string;
  deadHand?: DeadHandStatus;
}

export interface PlayAgainState {
  votes: Partial<Record<PlayerSeat, boolean>>;
  timeoutAt: number;
}

export interface ClientPlayAgainView {
  votes: { seat: PlayerSeat; name: string; voted: boolean; isBot?: boolean }[];
  myVote?: boolean;
  timeoutAt: number;
}

export interface RoomState {
  roomCode: string;
  players: PlayerState[];
  currentTurn: PlayerSeat;
  phase: GamePhase;
  wallCount: number;
  discardPile: Tile[];
  lastDiscard: Tile | null;
  lastDiscardedBy: PlayerSeat | null;
  winnerId: string | null;
  winnerSeat: PlayerSeat | null;
  started: boolean;
  config: RoomConfig;
  charleston?: CharlestonState;
  callingState?: CallingState;
  playAgain?: PlayAgainState;
}

export interface ClientCharlestonView {
  round: 1 | 2;
  passIndex: number;
  direction: CharlestonDirection;
  mySelectedTileIds: string[];
  myReady: boolean;
  readyCount: number;
  totalPlayers: number;
  secondCharlestonOffered: boolean;
  mySecondVote?: boolean;
  skipped: boolean;
}

export interface ClientRoomView {
  roomCode: string;
  players: {
    id: string;
    name: string;
    seat: PlayerSeat;
    handCount: number;
    exposures: ExposureGroup[];
    connected: boolean;
    isBot?: boolean;
    controlledBy?: string | null;
    deadHand?: DeadHandStatus;
  }[];
  myHand: Tile[];
  mySeat: PlayerSeat;
  mySeats: PlayerSeat[];
  currentTurn: PlayerSeat;
  phase: GamePhase;
  wallCount: number;
  discardPile: Tile[];
  lastDiscard: Tile | null;
  lastDiscardedBy: PlayerSeat | null;
  winnerId: string | null;
  winnerSeat: PlayerSeat | null;
  started: boolean;
  disconnectedPlayers: DisconnectedPlayerInfo[];
  rejoinToken?: string;
  gameMode: GameMode;
  zombieBlanks?: ZombieBlanksConfig;
  partnerHand?: Tile[];
  charleston?: ClientCharlestonView;
  callingState?: ClientCallingView;
  playAgain?: ClientPlayAgainView;
}

export interface DisconnectedPlayerInfo {
  playerName: string;
  seat: PlayerSeat;
  timeoutAt: number;
}

export type TimeoutAction = "end" | "wait";

export interface ServerToClientEvents {
  "room:created": (data: { roomCode: string; seat: PlayerSeat }) => void;
  "room:joined": (data: { roomCode: string; seat: PlayerSeat; playerName: string; rejoinToken?: string }) => void;
  "room:player-joined": (data: { playerName: string; seat: PlayerSeat; playerCount: number }) => void;
  "room:player-left": (data: { playerName: string; seat: PlayerSeat; playerCount: number }) => void;
  "game:state": (state: ClientRoomView) => void;
  "game:started": () => void;
  "game:win": (data: { winnerId: string; winnerName: string; winnerSeat: PlayerSeat; patternName: string; description: string; rack1Pattern?: { name: string; description: string }; rack2Pattern?: { name: string; description: string } }) => void;
  "player:disconnected": (data: DisconnectedPlayerInfo) => void;
  "player:reconnected": (data: { playerName: string; seat: PlayerSeat }) => void;
  "player:timeout": (data: DisconnectedPlayerInfo) => void;
  "game:ended": (data: { reason: string }) => void;
  "game:dead-hand": (data: { seat: PlayerSeat; playerName: string; reason: DeadHandReason; rack?: "main" | "partner" | "both"; challengerName: string }) => void;
  "game:challenge-failed": (data: { challengerName: string; targetSeat: PlayerSeat; message: string }) => void;
  "game:play-again-expired": () => void;
  "game:play-again-declined": () => void;
  "error": (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  "room:create": (data: { playerName: string; config?: RoomConfig }) => void;
  "room:join": (data: { roomCode: string; playerName: string }) => void;
  "room:rejoin": (data: { roomCode: string; playerName: string; rejoinToken: string }) => void;
  "game:draw": (data?: { seat?: PlayerSeat }) => void;
  "game:discard": (data: { tileId: string; seat?: PlayerSeat }) => void;
  "game:sort": (data?: { seat?: PlayerSeat }) => void;
  "game:reset": () => void;
  "game:timeout-action": (data: { action: TimeoutAction }) => void;
  "game:transfer": (data: { tileId: string; fromSeat: PlayerSeat; toSeat: PlayerSeat }) => void;
  "game:claim": (data: { claimType: ClaimType; tileIds: string[] }) => void;
  "game:claim-pass": () => void;
  "game:swap-joker": (data: { myTileId: string; targetSeat: PlayerSeat; exposureIndex: number }) => void;
  "game:reorder": (data: { tileIds: string[]; seat?: PlayerSeat }) => void;
  "game:test-siamese-win": () => void;
  "game:forfeit": () => void;
  "game:zombie-exchange": (data: { blankTileId: string; discardTileId: string }) => void;
  "game:challenge": (data: { targetSeat: PlayerSeat; rack?: "main" | "partner" }) => void;
  "game:play-again-vote": (data: { vote: boolean }) => void;
  "game:charleston-select": (data: { tileId: string }) => void;
  "game:charleston-ready": () => void;
  "game:charleston-skip": () => void;
  "game:charleston-vote": (data: { accept: boolean }) => void;
}
