import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server as IOServer } from "socket.io";
import axios from "axios";
import { keycloakMiddleware } from "./config/keycloak";
import sessionRoutes from "./routes/sessionRoutes";
import { loadModel } from "./controllers/mlController";
import mlRoutes from "./routes/mlRoutes";


dotenv.config()

const PORT = Number(process.env.PORT || 3001)
const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

const { sessionMiddleware, keycloak: keycloakInstance } = keycloakMiddleware()
app.use(sessionMiddleware)
app.use(keycloakInstance.middleware())

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/session", sessionRoutes)
app.use("/api/ml", mlRoutes)
loadModel()

const httpServer = http.createServer(app)

const io = new IOServer(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  }
})

async function validateToken(token: string) {
  try {

    const url = `${process.env.KEYCLOAK_AUTH_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`
    const resp = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })

    return resp.data

  } catch (err) {
    return null
  }
}

io.on("connection", async (socket) => {

  const token = socket.handshake.auth?.token || socket.handshake.query?.token

  if(!token){
    socket.emit("unauthorized")
    socket.disconnect()
    return
  }

  const userinfo = await validateToken(token)
  if (!userinfo) {
    socket.emit("unauthorized")
    socket.disconnect()
    return
  }

  console.log(`Socket connected: ${socket.id} user=${userinfo.sub}`);

  socket.on("join-room", (sessionId: string) => {
    socket.join(sessionId)
    socket.to(sessionId).emit("user-joined", {
      userId: userinfo.sub,
      socketId: socket.id,
    })
  });

  socket.on("leave-room", (sessionId: string) => {
    socket.leave(sessionId)
    socket.to(sessionId).emit("user-left", {
      userId: userinfo.sub,
      socketId: socket.id
    })
  });

  socket.on("draw", ({ sessionId, stroke }) => {
    socket.to(sessionId).emit("draw", { userId: userinfo.sub, stroke });
  });

  // UPDATED CURSOR EVENT
  socket.on("cursor-move", ({ sessionId, cursor }) => {
    socket.to(sessionId).emit("cursor-move", {
      userId: userinfo.sub,
      cursor,
      username: userinfo.preferred_username,
    });
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`)
  });
});

httpServer.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`)
});
