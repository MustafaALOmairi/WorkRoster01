import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";

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
