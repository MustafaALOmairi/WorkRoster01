import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface SharedHolidayBundle {
  holidays: Array<{
    name: string;
    startDate: string;
    endDate: string;
    color: string;
  }>;
  createdAt: number;
}

const sharedBundles = new Map<string, SharedHolidayBundle>();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/generate-theme", async (req: Request, res: Response) => {
    try {
      const { description, language } = req.body;
      if (!description || typeof description !== "string") {
        res.status(400).json({ error: "Description is required" });
        return;
      }

      const systemPrompt = `You are a color theme designer for a shift calendar app. Generate a cohesive color theme based on the user's description.

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "name": "<short English name>",
  "nameAr": "<short Arabic name>",
  "description": "<one-line English description>",
  "descriptionAr": "<one-line Arabic description>",
  "mode": "light" or "dark",
  "accent": "<hex color>",
  "shiftColors": {
    "morning": "<hex color for morning shift>",
    "evening": "<hex color for evening shift>",
    "night": "<hex color for night shift>",
    "rest": "<hex color for rest day>"
  },
  "headerBg": "<hex color>",
  "dayHeaderBg": "<hex color>",
  "surfaceBg": "<hex color>",
  "cardBg": "<hex color>",
  "textColor": "<hex color>",
  "textSecondary": "<hex color>",
  "borderColor": "<hex color>"
}

Rules:
- All colors must be valid 6-digit hex codes starting with #
- Shift colors should be distinct and readable against their backgrounds
- The theme should feel cohesive and match the description's mood
- Choose light or dark mode based on what fits the description
- Ensure sufficient contrast between text and backgrounds
- Morning shifts = warm/bright, Evening = warm/muted, Night = cool/dark, Rest = calm/neutral`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a calendar theme inspired by: "${description}"` },
        ],
        temperature: 0.8,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content?.trim() || "";
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const theme = JSON.parse(jsonStr);

      if (!theme.shiftColors || !theme.accent || !theme.surfaceBg) {
        res.status(500).json({ error: "Invalid theme generated" });
        return;
      }

      res.json(theme);
    } catch (error: any) {
      console.error("Theme generation error:", error?.message || error);
      res.status(500).json({ error: "Failed to generate theme" });
    }
  });

  app.post("/api/holidays/share", (req: Request, res: Response) => {
    try {
      const { holidays } = req.body;
      if (!holidays || !Array.isArray(holidays) || holidays.length === 0) {
        res.status(400).json({ error: "No holidays provided" });
        return;
      }
      const id = generateId();
      sharedBundles.set(id, { holidays, createdAt: Date.now() });
      res.json({ id, url: `/import-holidays/${id}` });
    } catch {
      res.status(500).json({ error: "Failed to share holidays" });
    }
  });

  app.get("/api/holidays/share/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const bundle = sharedBundles.get(id);
    if (!bundle) {
      res.status(404).json({ error: "Holidays not found" });
      return;
    }
    res.json(bundle);
  });

  const httpServer = createServer(app);
  return httpServer;
}
