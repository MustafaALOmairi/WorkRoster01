import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";
import { Pool } from "pg";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
  "borderColor": "<hex color>",
  "imagePrompt": "<detailed image generation prompt for a decorative background image matching the theme, e.g. for anime theme describe anime characters, for cars describe car imagery, for ocean describe underwater scene. Make it vivid and artistic, suitable as a calendar background with some transparency>"
}

Rules:
- All colors must be valid 6-digit hex codes starting with #
- Shift colors should be distinct and readable against their backgrounds
- The theme should feel cohesive and match the description's mood
- Choose light or dark mode based on what fits the description
- Ensure sufficient contrast between text and backgrounds
- Morning shifts = warm/bright, Evening = warm/muted, Night = cool/dark, Rest = calm/neutral
- The imagePrompt should describe a beautiful decorative image that matches the theme concept`;

      const colorsResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a calendar theme inspired by: "${description}"` },
        ],
        temperature: 0.8,
        max_tokens: 600,
      });

      const content = colorsResponse.choices[0]?.message?.content?.trim() || "";
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const theme = JSON.parse(jsonStr);

      if (!theme.shiftColors || !theme.accent || !theme.surfaceBg) {
        res.status(500).json({ error: "Invalid theme generated" });
        return;
      }

      let backgroundImage: string | undefined;
      try {
        const imgPrompt = theme.imagePrompt || `Beautiful artistic illustration inspired by "${description}", decorative background, vibrant colors, digital art style`;
        const imageResponse = await openai.images.generate({
          model: "gpt-image-1",
          prompt: imgPrompt + ". Clean artistic illustration, no text, suitable as a subtle background overlay for a mobile calendar app.",
          size: "1024x1024",
        });
        const b64 = imageResponse.data?.[0]?.b64_json;
        if (b64) {
          backgroundImage = `data:image/png;base64,${b64}`;
        }
      } catch (imgError: any) {
        console.error("Image generation failed (continuing without image):", imgError?.message);
      }

      delete theme.imagePrompt;
      res.json({ ...theme, backgroundImage });
    } catch (error: any) {
      console.error("Theme generation error:", error?.message || error);
      res.status(500).json({ error: "Failed to generate theme" });
    }
  });

  app.post("/api/holidays/share", async (req: Request, res: Response) => {
    try {
      const { holidays } = req.body;
      if (!holidays || !Array.isArray(holidays) || holidays.length === 0) {
        res.status(400).json({ error: "No holidays provided" });
        return;
      }
      const id = generateId();
      await pool.query(
        "INSERT INTO shared_holidays (id, holidays, created_at) VALUES ($1, $2, $3)",
        [id, JSON.stringify(holidays), Date.now()]
      );
      res.json({ id, url: `/import-holidays/${id}` });
    } catch (err: any) {
      console.error("Share holidays error:", err?.message);
      res.status(500).json({ error: "Failed to share holidays" });
    }
  });

  app.get("/api/holidays/share/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "SELECT holidays, created_at FROM shared_holidays WHERE id = $1",
        [id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Holidays not found" });
        return;
      }
      const row = result.rows[0];
      res.json({ holidays: row.holidays, createdAt: row.created_at });
    } catch (err: any) {
      console.error("Get shared holidays error:", err?.message);
      res.status(500).json({ error: "Failed to get holidays" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
