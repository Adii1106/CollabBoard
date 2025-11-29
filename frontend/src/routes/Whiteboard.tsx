import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import WhiteboardCanvas from "../components/WhiteboardCanvas";
import { io, Socket } from "socket.io-client";
import keycloak from "../keycloak";
import AIToolsModal from "../components/AIToolsModal";
import ChatModal from "../components/ChatModal";
import { FiArrowLeft, FiCpu, FiCopy, FiCheck, FiMessageSquare } from "react-icons/fi";

export default function Whiteboard() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [ready, setReady] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const socket = socketRef.current;

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!ready || !socket) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 text-muted">
        <div className="spinner-border text-primary me-2" role="status" />
        Connecting to session...
      </div>
    );
  }

  return (
    <div className="vh-100 vw-100 position-relative overflow-hidden bg-light">
      {/* Floating Header */}
      <div className="position-absolute top-0 start-0 w-100 p-3 d-flex justify-content-between align-items-start pointer-events-none" style={{ zIndex: 10 }}>
        <div className="glass-panel px-3 py-2 rounded-pill d-flex align-items-center gap-3 pointer-events-auto">
          <button
            className="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center p-2 shadow-sm"
            onClick={() => navigate("/")}
            title="Leave Session"
          >
            <FiArrowLeft size={18} />
          </button>
          <div className="vr opacity-25"></div>
          <div className="d-flex align-items-center gap-2">
            <span className="small fw-medium text-muted">
              Session: <span className="text-dark font-monospace">{sessionId?.slice(0, 8)}...</span>
            </span>
            <button
              className="btn btn-link p-0 text-muted d-flex align-items-center"
              onClick={copySessionId}
              title="Copy Session ID"
            >
              {copied ? <FiCheck size={14} className="text-success" /> : <FiCopy size={14} />}
            </button>
          </div>
        </div>

        <div className="d-flex gap-2 pointer-events-auto">
          <button
            className={`btn glass-panel shadow-sm rounded-pill px-3 py-2 d-flex align-items-center gap-2 ${showChat ? "btn-primary text-white" : "btn-white text-primary"}`}
            onClick={() => setShowChat(!showChat)}
          >
            <FiMessageSquare size={18} />
            <span className="small fw-bold d-none d-sm-inline">Chat</span>
          </button>

          <button
            className="btn btn-white glass-panel text-primary shadow-sm rounded-pill px-3 py-2 d-flex align-items-center gap-2"
            onClick={() => setShowAI(true)}
          >
            <FiCpu size={18} />
            <span className="small fw-bold d-none d-sm-inline">AI Tools</span>
          </button>
        </div>
      </div>

      <WhiteboardCanvas
        sessionId={sessionId ?? ""}
        socket={socket}
      />

      <AIToolsModal show={showAI} onClose={() => setShowAI(false)} />

      <ChatModal
        show={showChat}
        onClose={() => setShowChat(false)}
        socket={socket}
        sessionId={sessionId ?? ""}
        username={keycloak.tokenParsed?.preferred_username || "User"}
      />
    </div>
  );
}
