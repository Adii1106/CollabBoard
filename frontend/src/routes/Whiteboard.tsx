import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import WhiteboardCanvas from "../components/WhiteboardCanvas";
import { io, Socket } from "socket.io-client";
import keycloak from "../keycloak";

export default function Whiteboard() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function connectSocket() {
      if (keycloak.token && keycloak.isTokenExpired(30)) {
        await keycloak.updateToken(30);
      }

      const socket = io("http://localhost:3001", {
        auth: { token: keycloak.token },
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("Connected to socket:", socket.id);
        socket.emit("join-room", sessionId);
        setReady(true);
      });

      socket.on("unauthorized", () => {
        console.error("Socket unauthorized");
      });

      return () => socket.disconnect();
    }

    connectSocket();
  }, [sessionId]);

  // ✅ READ REF IN A LOCAL VARIABLE (fixes ESLint rule)
  const socket = socketRef.current;

  // Now it's safe to check it here
  if (!ready || !socket) {
    return <div className="text-center mt-5">Connecting to session...</div>;
  }

  return (
    <div className="container-fluid vh-100 p-0 d-flex flex-column">
      <header className="d-flex justify-content-between align-items-center p-2 border-bottom">
        <div>Session: {sessionId}</div>
        <button className="btn btn-sm btn-secondary" onClick={() => navigate("/")}>
          Leave Session
        </button>
      </header>

      <main className="flex-grow-1">
        <WhiteboardCanvas
          sessionId={sessionId ?? ""}
          socket={socket}   // safe and lint-clean
        />
      </main>
    </div>
  );
}
