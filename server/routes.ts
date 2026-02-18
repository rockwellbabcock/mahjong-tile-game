import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertFeedbackSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post(api.games.create.path, async (req, res) => {
    try {
      const input = api.games.create.input.parse(req.body);
      const game = await storage.createGame(input);
      res.status(201).json(game);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.post("/api/feedback", async (req, res) => {
    try {
      const input = insertFeedbackSchema.parse(req.body);
      const result = await storage.createFeedback(input);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.get("/api/feedback", async (_req, res) => {
    try {
      const items = await storage.listFeedback();
      res.json(items);
    } catch {
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  return httpServer;
}
