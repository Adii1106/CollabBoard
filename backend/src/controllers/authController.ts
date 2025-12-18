import { Request, Response } from "express";
import prisma from "../prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "super-secret-key";

export async function register(req: Request, res: Response) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password required" });
        }

        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return res.status(400).json({ error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username, password: hashedPassword },
        });

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: "1d" });

        return res.json({ token, user: { id: user.id, username: user.username } });
    } catch (err) {
        console.error("Register error", err);
        res.status(500).json({ error: "Internal server error" });
    }
}

export async function login(req: Request, res: Response) {
    try {
        const { username, password } = req.body;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: "1d" });
        return res.json({ token, user: { id: user.id, username: user.username } });
    } catch (err) {
        console.error("Login error", err);
        res.status(500).json({ error: "Internal server error" });
    }
}
