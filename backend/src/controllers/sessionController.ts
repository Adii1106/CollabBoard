import { Request, Response } from "express";
import prisma from "../prisma/client";

export async function createSession(req: Request, res: Response) {
  try {
    const { name } = req.body;

    const session = await prisma.session.create({
      data: {
        name: name ?? null,
      },
    });

    return res.json(session);
  } catch (err) {
    console.error("createSession error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function joinSession(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const tokenData = (req as any).kauth?.grant?.access_token?.content;
    const userId = tokenData?.sub;

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ error: "Session not found" });

    if (userId) {
      await prisma.userSession.create({
        data: { sessionId: id, userId },
      });
    }

    res.json(session);
  } catch (err) {
    console.error("joinSession error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
