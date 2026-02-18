import { db } from "./db";
import {
  games,
  feedback,
  type InsertGame,
  type Game,
  type InsertFeedback,
  type Feedback
} from "@shared/schema";

export interface IStorage {
  createGame(game: InsertGame): Promise<Game>;
  createFeedback(fb: InsertFeedback): Promise<Feedback>;
  listFeedback(): Promise<Feedback[]>;
}

export class DatabaseStorage implements IStorage {
  async createGame(insertGame: InsertGame): Promise<Game> {
    const [game] = await db.insert(games).values(insertGame).returning();
    return game;
  }

  async createFeedback(fb: InsertFeedback): Promise<Feedback> {
    const [result] = await db.insert(feedback).values(fb).returning();
    return result;
  }

  async listFeedback(): Promise<Feedback[]> {
    return await db.select().from(feedback);
  }
}

export const storage = new DatabaseStorage();
