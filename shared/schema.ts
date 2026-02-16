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

export interface PlayerState {
  id: string;
  name: string;
  seat: PlayerSeat;
  hand: Tile[];
  exposures: Tile[][];
  connected: boolean;
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
  }[];
  myHand: Tile[];
  mySeat: PlayerSeat;
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
}

export interface DisconnectedPlayerInfo {
  playerName: string;
  seat: PlayerSeat;
  timeoutAt: number;
}

export type TimeoutAction = "bot" | "end" | "wait";

export interface ServerToClientEvents {
  "room:created": (data: { roomCode: string; seat: PlayerSeat }) => void;
  "room:joined": (data: { roomCode: string; seat: PlayerSeat; playerName: string }) => void;
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
  "room:create": (data: { playerName: string }) => void;
  "room:join": (data: { roomCode: string; playerName: string }) => void;
  "room:rejoin": (data: { roomCode: string; playerName: string }) => void;
  "game:draw": () => void;
  "game:discard": (data: { tileId: string }) => void;
  "game:sort": () => void;
  "game:reset": () => void;
  "game:timeout-action": (data: { action: TimeoutAction }) => void;
  "game:claim": (data: { claimType: ClaimType; tileIds: string[] }) => void;
}
