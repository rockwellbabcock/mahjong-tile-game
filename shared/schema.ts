import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We'll use a simple table for potential future saved games, 
// though current state is client-side as requested.
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  state: jsonb("state").notNull(), // Stores the entire game state
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const insertGameSchema = createInsertSchema(games).omit({ id: true, createdAt: true });

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;

// --- Game Logic Types (Shared) ---

export type Suit = "Bam" | "Crak" | "Dot" | "Wind" | "Dragon" | "Flower" | "Joker";
export type WindValue = "North" | "South" | "East" | "West";
export type DragonValue = "Green" | "Red" | "White";

export type FlowerName = "Plum" | "Orchid" | "Chrysanthemum" | "Bamboo";
export type SeasonName = "Spring" | "Summer" | "Fall" | "Winter";

export type TileValue = number | WindValue | DragonValue | FlowerName | SeasonName | null; 

export interface Tile {
  id: string; // Unique ID for React keys
  suit: Suit;
  value: TileValue; 
  isJoker?: boolean;
}

export type GamePhase = "draw" | "discard" | "won";

export type PlayerSeat = "East" | "South" | "West" | "North";
export const SEAT_ORDER: PlayerSeat[] = ["East", "South", "West", "North"];

export type ClaimType = "pung" | "kong" | "quint" | "mahjong";

export type GameMode = "4-player" | "2-player";

export interface RoomConfig {
  gameMode: GameMode;
  fillWithBots: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  seat: PlayerSeat;
  hand: Tile[];
  exposures: Tile[][];
  connected: boolean;
  rejoinToken?: string;
  isBot?: boolean;
  controlledBy?: string;
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
}

export interface ClientRoomView {
  roomCode: string;
  players: {
    id: string;
    name: string;
    seat: PlayerSeat;
    handCount: number;
    exposures: Tile[][];
    connected: boolean;
    isBot?: boolean;
    controlledBy?: string | null;
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
  partnerHand?: Tile[];
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
  "game:win": (data: { winnerId: string; winnerName: string; winnerSeat: PlayerSeat; patternName: string; description: string }) => void;
  "player:disconnected": (data: DisconnectedPlayerInfo) => void;
  "player:reconnected": (data: { playerName: string; seat: PlayerSeat }) => void;
  "player:timeout": (data: DisconnectedPlayerInfo) => void;
  "game:ended": (data: { reason: string }) => void;
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
}
