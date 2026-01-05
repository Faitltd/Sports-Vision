import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertSlateSchema, insertGameSchema, insertFrameworkSchema,
  insertFrameworkRuleSchema, insertEvidenceSchema, insertWhyFactorSchema
} from "@shared/schema";
import { z } from "zod";
import { extractGamesFromImage, extractGamesFromText } from "./services/ocr";
import { researchGame, researchSpecificTopic } from "./services/perplexity";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/slates", async (req: Request, res: Response) => {
    try {
      const slates = await storage.getSlates();
      res.json(slates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch slates" });
    }
  });

  app.get("/api/slates/:id", async (req: Request, res: Response) => {
    try {
      const slate = await storage.getSlate(req.params.id);
      if (!slate) {
        return res.status(404).json({ error: "Slate not found" });
      }
      res.json(slate);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch slate" });
    }
  });

  app.post("/api/slates", async (req: Request, res: Response) => {
    try {
      const data = insertSlateSchema.parse(req.body);
      const slate = await storage.createSlate(data);
      res.status(201).json(slate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create slate" });
    }
  });

  app.patch("/api/slates/:id", async (req: Request, res: Response) => {
    try {
      const data = insertSlateSchema.partial().parse(req.body);
      const slate = await storage.updateSlate(req.params.id, data);
      if (!slate) {
        return res.status(404).json({ error: "Slate not found" });
      }
      res.json(slate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update slate" });
    }
  });

  app.delete("/api/slates/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteSlate(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete slate" });
    }
  });

  app.get("/api/slates/:slateId/games", async (req: Request, res: Response) => {
    try {
      const games = await storage.getGames(req.params.slateId);
      res.json(games);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch games" });
    }
  });

  app.get("/api/games/:id", async (req: Request, res: Response) => {
    try {
      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch game" });
    }
  });

  app.post("/api/slates/:slateId/games", async (req: Request, res: Response) => {
    try {
      const data = insertGameSchema.parse({ ...req.body, slateId: req.params.slateId });
      const game = await storage.createGame(data);
      
      const slate = await storage.getSlate(req.params.slateId);
      if (slate) {
        const games = await storage.getGames(req.params.slateId);
        await storage.updateSlate(req.params.slateId, { gameCount: games.length });
      }
      
      res.status(201).json(game);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create game" });
    }
  });

  app.post("/api/slates/:slateId/games/batch", async (req: Request, res: Response) => {
    try {
      const gamesData = z.array(insertGameSchema.omit({ slateId: true })).parse(req.body);
      const gamesWithSlate = gamesData.map(g => ({ ...g, slateId: req.params.slateId }));
      const games = await storage.createGames(gamesWithSlate);
      
      await storage.updateSlate(req.params.slateId, { gameCount: games.length });
      
      res.status(201).json(games);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create games" });
    }
  });

  app.patch("/api/games/:id", async (req: Request, res: Response) => {
    try {
      const data = insertGameSchema.partial().parse(req.body);
      const game = await storage.updateGame(req.params.id, data);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update game" });
    }
  });

  app.delete("/api/games/:id", async (req: Request, res: Response) => {
    try {
      const game = await storage.getGame(req.params.id);
      if (game) {
        await storage.deleteGame(req.params.id);
        const games = await storage.getGames(game.slateId);
        await storage.updateSlate(game.slateId, { gameCount: games.length });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete game" });
    }
  });

  app.get("/api/frameworks", async (req: Request, res: Response) => {
    try {
      const frameworks = await storage.getFrameworks();
      res.json(frameworks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch frameworks" });
    }
  });

  app.get("/api/frameworks/active", async (req: Request, res: Response) => {
    try {
      const framework = await storage.getActiveFramework();
      if (!framework) {
        return res.status(404).json({ error: "No active framework" });
      }
      res.json(framework);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active framework" });
    }
  });

  app.get("/api/frameworks/:id", async (req: Request, res: Response) => {
    try {
      const framework = await storage.getFramework(req.params.id);
      if (!framework) {
        return res.status(404).json({ error: "Framework not found" });
      }
      res.json(framework);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch framework" });
    }
  });

  app.post("/api/frameworks", async (req: Request, res: Response) => {
    try {
      const data = insertFrameworkSchema.parse(req.body);
      const framework = await storage.createFramework(data);
      res.status(201).json(framework);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create framework" });
    }
  });

  app.patch("/api/frameworks/:id", async (req: Request, res: Response) => {
    try {
      const data = insertFrameworkSchema.partial().parse(req.body);
      const framework = await storage.updateFramework(req.params.id, data);
      if (!framework) {
        return res.status(404).json({ error: "Framework not found" });
      }
      res.json(framework);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update framework" });
    }
  });

  app.delete("/api/frameworks/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteFramework(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete framework" });
    }
  });

  app.get("/api/frameworks/:frameworkId/rules", async (req: Request, res: Response) => {
    try {
      const rules = await storage.getFrameworkRules(req.params.frameworkId);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rules" });
    }
  });

  app.post("/api/frameworks/:frameworkId/rules", async (req: Request, res: Response) => {
    try {
      const data = insertFrameworkRuleSchema.parse({ ...req.body, frameworkId: req.params.frameworkId });
      const rule = await storage.createFrameworkRule(data);
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create rule" });
    }
  });

  app.patch("/api/framework-rules/:id", async (req: Request, res: Response) => {
    try {
      const data = insertFrameworkRuleSchema.partial().parse(req.body);
      const rule = await storage.updateFrameworkRule(req.params.id, data);
      if (!rule) {
        return res.status(404).json({ error: "Rule not found" });
      }
      res.json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update rule" });
    }
  });

  app.delete("/api/framework-rules/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteFrameworkRule(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete rule" });
    }
  });

  app.get("/api/frameworks/:frameworkId/versions", async (req: Request, res: Response) => {
    try {
      const versions = await storage.getFrameworkVersions(req.params.frameworkId);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch versions" });
    }
  });

  app.get("/api/games/:gameId/evidence", async (req: Request, res: Response) => {
    try {
      const { category } = req.query;
      let ev;
      if (category && typeof category === "string") {
        ev = await storage.getEvidenceByCategory(req.params.gameId, category);
      } else {
        ev = await storage.getEvidence(req.params.gameId);
      }
      res.json(ev);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch evidence" });
    }
  });

  app.post("/api/games/:gameId/evidence", async (req: Request, res: Response) => {
    try {
      const data = insertEvidenceSchema.parse({ ...req.body, gameId: req.params.gameId });
      const ev = await storage.createEvidence(data);
      res.status(201).json(ev);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create evidence" });
    }
  });

  app.get("/api/games/:gameId/snapshots", async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      let snapshots;
      if (type && typeof type === "string") {
        snapshots = await storage.getDataSnapshotsByType(req.params.gameId, type);
      } else {
        snapshots = await storage.getDataSnapshots(req.params.gameId);
      }
      res.json(snapshots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch snapshots" });
    }
  });

  app.get("/api/games/:gameId/why-factors", async (req: Request, res: Response) => {
    try {
      const factors = await storage.getWhyFactors(req.params.gameId);
      res.json(factors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch why factors" });
    }
  });

  app.post("/api/games/:gameId/why-factors", async (req: Request, res: Response) => {
    try {
      const data = insertWhyFactorSchema.parse({ ...req.body, gameId: req.params.gameId });
      const factor = await storage.createWhyFactor(data);
      res.status(201).json(factor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create why factor" });
    }
  });

  app.post("/api/games/:id/lock", async (req: Request, res: Response) => {
    try {
      const game = await storage.updateGame(req.params.id, { isLocked: true });
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      res.status(500).json({ error: "Failed to lock game" });
    }
  });

  app.post("/api/games/:id/unlock", async (req: Request, res: Response) => {
    try {
      const game = await storage.updateGame(req.params.id, { isLocked: false });
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      res.status(500).json({ error: "Failed to unlock game" });
    }
  });

  app.post("/api/games/:id/override", async (req: Request, res: Response) => {
    try {
      const { pick, pickLine, overrideReason } = req.body;
      const game = await storage.updateGame(req.params.id, { 
        pick, 
        pickLine, 
        overrideReason,
        status: "override"
      });
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      res.status(500).json({ error: "Failed to override game" });
    }
  });

  app.get("/api/slates/:slateId/export", async (req: Request, res: Response) => {
    try {
      const games = await storage.getGames(req.params.slateId);
      const lockedGames = games.filter(g => g.isLocked);
      
      const csvRows = [
        ["Game", "Pick", "Line", "Edge", "Confidence", "Notes"].join(",")
      ];
      
      for (const game of lockedGames) {
        const row = [
          `"${game.awayTeam} @ ${game.homeTeam}"`,
          game.pick || "",
          game.pickLine?.toString() || "",
          game.pickEdge ? `+${game.pickEdge}` : "",
          game.confidenceLow && game.confidenceHigh 
            ? `${Math.round(game.confidenceLow * 100)}-${Math.round(game.confidenceHigh * 100)}%`
            : "",
          `"${(game.notes || "").replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(","));
      }
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="slate-${req.params.slateId}-picks.csv"`);
      res.send(csvRows.join("\n"));
    } catch (error) {
      res.status(500).json({ error: "Failed to export slate" });
    }
  });

  app.post("/api/ocr/image", async (req: Request, res: Response) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "imageBase64 is required" });
      }
      const result = await extractGamesFromImage(imageBase64);
      res.json(result);
    } catch (error) {
      console.error("OCR error:", error);
      res.status(500).json({ error: "Failed to process image" });
    }
  });

  app.post("/api/ocr/text", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "text is required" });
      }
      const result = await extractGamesFromText(text);
      res.json(result);
    } catch (error) {
      console.error("Text parsing error:", error);
      res.status(500).json({ error: "Failed to parse text" });
    }
  });

  app.post("/api/games/:gameId/research", async (req: Request, res: Response) => {
    try {
      const game = await storage.getGame(req.params.gameId);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      const result = await researchGame(game.homeTeam, game.awayTeam);

      const evidenceItems = result.findings.map(f => ({
        gameId: game.id,
        type: "news" as const,
        category: f.category,
        source: f.source,
        sourceUrl: f.sourceUrl,
        headline: f.headline,
        snippet: f.snippet,
        relevanceScore: f.relevanceScore,
        citations: result.citations,
      }));

      if (evidenceItems.length > 0) {
        await storage.createEvidenceBatch(evidenceItems);
      }

      await storage.updateGame(game.id, { status: "ready" });

      res.json({ 
        success: true, 
        findingsCount: result.findings.length,
        findings: result.findings,
        citations: result.citations 
      });
    } catch (error) {
      console.error("Research error:", error);
      res.status(500).json({ error: "Failed to research game" });
    }
  });

  app.post("/api/games/:gameId/research-topic", async (req: Request, res: Response) => {
    try {
      const { topic } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "topic is required" });
      }

      const game = await storage.getGame(req.params.gameId);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      const result = await researchSpecificTopic(game.homeTeam, game.awayTeam, topic);
      res.json(result);
    } catch (error) {
      console.error("Research topic error:", error);
      res.status(500).json({ error: "Failed to research topic" });
    }
  });

  app.post("/api/slates/:slateId/enrich", async (req: Request, res: Response) => {
    try {
      const slate = await storage.getSlate(req.params.slateId);
      if (!slate) {
        return res.status(404).json({ error: "Slate not found" });
      }

      await storage.updateSlate(req.params.slateId, { status: "enriching" });

      const games = await storage.getGames(req.params.slateId);
      
      const results = [];
      for (const game of games) {
        try {
          await storage.updateGame(game.id, { status: "enriching" });
          
          const research = await researchGame(game.homeTeam, game.awayTeam);
          
          const evidenceItems = research.findings.map(f => ({
            gameId: game.id,
            type: "news" as const,
            category: f.category,
            source: f.source,
            sourceUrl: f.sourceUrl,
            headline: f.headline,
            snippet: f.snippet,
            relevanceScore: f.relevanceScore,
            citations: research.citations,
          }));

          if (evidenceItems.length > 0) {
            await storage.createEvidenceBatch(evidenceItems);
          }

          await storage.updateGame(game.id, { status: "ready" });
          results.push({ gameId: game.id, success: true, findingsCount: research.findings.length });
        } catch (gameError) {
          console.error(`Research error for game ${game.id}:`, gameError);
          results.push({ gameId: game.id, success: false, error: "Research failed" });
        }
      }

      await storage.updateSlate(req.params.slateId, { status: "ready" });

      res.json({ success: true, results });
    } catch (error) {
      console.error("Enrichment error:", error);
      res.status(500).json({ error: "Failed to enrich slate" });
    }
  });

  return httpServer;
}
