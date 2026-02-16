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

// Value can be a number (1-9) or a specific string for special tiles
export type TileValue = number | WindValue | DragonValue | null; 

export interface Tile {
  id: string; // Unique ID for React keys
  suit: Suit;
  value: TileValue; 
  isJoker?: boolean;
}

export type GamePhase = "draw" | "discard";
