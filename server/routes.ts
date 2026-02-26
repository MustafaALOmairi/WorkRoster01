import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

declare module "express-session" {
  interface SessionData {
    userId: string;
    username: string;
    email?: string;
  }
}

function generateShortCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const PgSession = connectPgSimple(session);
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: true,
        sameSite: "none",
      },
    })
  );

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: "Username and password required" });
        return;
      }
      if (username.length < 3) {
        res.status(400).json({ error: "Username must be at least 3 characters" });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: "INVALID_EMAIL" });
        return;
      }

      const existing = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
      if (existing.rows.length > 0) {
        res.status(409).json({ error: "USERNAME_TAKEN" });
        return;
      }

      if (email) {
        const existingEmail = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existingEmail.rows.length > 0) {
          res.status(409).json({ error: "EMAIL_TAKEN" });
          return;
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        "INSERT INTO users (id, username, email, password) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id, username, email",
        [username, email || null, hashedPassword]
      );
      const user = result.rows[0];
      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({ id: user.id, username: user.username, email: user.email });
    } catch (err: any) {
      console.error("Register error:", err?.message);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: "Username and password required" });
        return;
      }

      const isEmail = username.includes("@");
      const result = isEmail
        ? await pool.query("SELECT id, username, email, password FROM users WHERE email = $1", [username])
        : await pool.query("SELECT id, username, email, password FROM users WHERE username = $1", [username]);
      if (result.rows.length === 0) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.email = user.email || undefined;
      res.json({ id: user.id, username: user.username, email: user.email });
    } catch (err: any) {
      console.error("Login error:", err?.message);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: "Logout failed" });
        return;
      }
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.session.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.json({ id: req.session.userId, username: req.session.username, email: req.session.email });
  });

  app.post("/api/user-data/save", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const { shiftConfig, notes, themePrefs, aiThemes } = req.body;
      await pool.query(
        `INSERT INTO user_data (user_id, shift_config, notes, theme_prefs, ai_themes, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
           shift_config = COALESCE($2, user_data.shift_config),
           notes = COALESCE($3, user_data.notes),
           theme_prefs = COALESCE($4, user_data.theme_prefs),
           ai_themes = COALESCE($5, user_data.ai_themes),
           updated_at = $6`,
        [
          req.session.userId,
          shiftConfig ? JSON.stringify(shiftConfig) : null,
          notes ? JSON.stringify(notes) : null,
          themePrefs ? JSON.stringify(themePrefs) : null,
          aiThemes ? JSON.stringify(aiThemes) : null,
          Date.now(),
        ]
      );
      res.json({ ok: true });
    } catch (err: any) {
      console.error("Save user data error:", err?.message);
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  app.get("/api/user-data/load", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const result = await pool.query(
        "SELECT shift_config, notes, theme_prefs, ai_themes, updated_at FROM user_data WHERE user_id = $1",
        [req.session.userId]
      );
      if (result.rows.length === 0) {
        res.json({ shiftConfig: null, notes: null, themePrefs: null, aiThemes: null });
        return;
      }
      const row = result.rows[0];
      res.json({
        shiftConfig: row.shift_config,
        notes: row.notes,
        themePrefs: row.theme_prefs,
        aiThemes: row.ai_themes,
        updatedAt: row.updated_at,
      });
    } catch (err: any) {
      console.error("Load user data error:", err?.message);
      res.status(500).json({ error: "Failed to load data" });
    }
  });

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
      const code = generateShortCode();
      await pool.query(
        "INSERT INTO shared_holidays (id, holidays, created_at) VALUES ($1, $2, $3)",
        [code, JSON.stringify(holidays), Date.now()]
      );
      res.json({ code });
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
