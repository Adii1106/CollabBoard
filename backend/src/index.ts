import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "http"
import { Server as IOServer } from "socket.io"
import jwt from "jsonwebtoken"
import sessionRoutes from "./routes/sessionRoutes"
import authRoutes from "./routes/authRoutes"
import { loadModel } from "./controllers/mlController"
import mlRoutes from "./routes/mlRoutes"
import { authMiddleware } from "./middleware/auth"

dotenv.config()

const PORT = Number(process.env.PORT || 3001)
const SECRET = process.env.JWT_SECRET || "super-secret-key"

const app = express()

// CORS configuration for production
app.use(cors({
  origin: (origin, callback) => {
    console.log('[CORS] Request from origin:', origin)

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('[CORS] Allowing request with no origin')
      return callback(null, true)
    }

    // Allow localhost for development
    if (origin.includes('localhost')) {
      console.log('[CORS] Allowing localhost')
      return callback(null, true)
    }

    // Allow all vercel.app domains
    if (origin.includes('vercel.app')) {
      console.log('[CORS] Allowing vercel.app domain')
      return callback(null, true)
    }

    // Allow the specific Render backend domain
    if (origin.includes('onrender.com')) {
      console.log('[CORS] Allowing onrender.com domain')
      return callback(null, true)
    }

    console.log('[CORS] BLOCKED origin:', origin)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

// Middleware
app.use(authMiddleware)

app.get("/health", (_req, res) => res.json({ status: "ok" }))
app.use("/api/auth", authRoutes)
app.use("/api/session", sessionRoutes)
app.use("/api/ml", mlRoutes)
loadModel()

const httpServer = http.createServer(app)

const io = new IOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (origin.includes('localhost') || origin.includes('vercel.app') || origin.includes('onrender.com')) {
        return callback(null, true)
      }
      callback(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST']
  }
})

async function validateToken(token: string) {
  try {
    const payload = jwt.verify(token, SECRET) as any
    return {
      sub: payload.id,
      preferred_username: payload.username
    }
  } catch (err) {
    return null
  }
}

io.on("connection", async (socket) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token

  if (!token) {
    socket.emit("unauthorized")
    socket.disconnect()
    return
  }

  const userinfo = await validateToken(token as string)
  if (!userinfo) {
    socket.emit("unauthorized")
    socket.disconnect()
    return
  }

  console.log(`Socket connected: ${socket.id} user=${userinfo.sub}`)

  socket.on("join-room", async (sessionId: string) => {
    socket.join(sessionId)
    socket.data.sessionId = sessionId
    socket.data.username = userinfo.preferred_username
    socket.data.userId = userinfo.sub

    const sockets = await io.in(sessionId).fetchSockets()
    const users = sockets.map(s => ({
      userId: s.data.userId || s.id,
      username: s.data.username
    })).filter(u => u.username)

    socket.emit("room-users", users)

    socket.to(sessionId).emit("user-joined", {
      userId: userinfo.sub,
      socketId: socket.id,
      username: userinfo.preferred_username
    })
  })

  socket.on("leave-room", (sessionId: string) => {
    socket.leave(sessionId)
    socket.to(sessionId).emit("user-left", {
      userId: userinfo.sub,
      socketId: socket.id
    })
  })

  socket.on("draw", ({ sessionId, stroke }) => {
    socket.to(sessionId).emit("draw", { userId: userinfo.sub, stroke })
  })

  socket.on("draw-shape", ({ sessionId, shape }) => {
    socket.to(sessionId).emit("draw-shape", { userId: userinfo.sub, shape })
  })

  socket.on("cursor-move", ({ sessionId, cursor }) => {
    socket.to(sessionId).emit("cursor-move", {
      userId: userinfo.sub,
      cursor,
      username: userinfo.preferred_username,
    })
  })

  socket.on("chat-message", ({ sessionId, msg }) => {
    socket.to(sessionId).emit("chat-message", msg)
  })

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`)
    const sessionId = socket.data.sessionId
    if (sessionId) {
      socket.to(sessionId).emit("user-left", {
        userId: userinfo.sub,
        socketId: socket.id
      })
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`)
})