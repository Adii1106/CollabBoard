import React, { useRef, useEffect, useState, useCallback } from "react";
import { Stage, Layer, Line, Text, Path, Group, Rect } from "react-konva";
import Konva from "konva";
import { Socket } from "socket.io-client";
import { FiEdit2, FiTrash2, FiRotateCcw, FiRotateCw, FiDownload } from "react-icons/fi";

type Props = {
  sessionId: string;
  socket: Socket;
};

type Stroke = {
  id: string;
  points: number[];
  stroke: string;
  strokeWidth: number;
};

type CursorData = {
  x: number;
  y: number;
  username: string;
  lastUpdate: number;
  color: string;
};

type ActionAdd = { type: "add"; stroke: Stroke };
type ActionRemove = { type: "remove"; stroke: Stroke };
type Action = ActionAdd | ActionRemove;

const COLORS = ["#000000", "#ef4444", "#22c55e", "#3b82f6", "#eab308", "#a855f7"];
const CURSOR_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#f43f5e"];

const getCursorColor = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
};

export default function WhiteboardCanvas({ sessionId, socket }: Props) {
  const [lines, setLines] = useState<Stroke[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorData>>({});

  // Initialize from localStorage
  const [color, setColor] = useState(() => localStorage.getItem("wb_color") || "#000000");
  const [size, setSize] = useState(() => Number(localStorage.getItem("wb_size")) || 3);

  const [tool, setTool] = useState<"brush" | "eraser">("brush");

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("wb_color", color);
  }, [color]);

  useEffect(() => {
    localStorage.setItem("wb_size", String(size));
  }, [size]);

  const isDrawingRef = useRef(false);
  const stageRef = useRef<Konva.Stage | null>(null);
  const currentStrokeIdRef = useRef<string | null>(null);

  const undoStackRef = useRef<Action[]>([]);
  const redoStackRef = useRef<Action[]>([]);

  // -------------------------------
  // Socket listeners
  // -------------------------------
  useEffect(() => {
    socket.on("draw", ({ stroke }: { stroke: Stroke }) => {
      setLines((prev) => {
        const exists = prev.find((l) => l.id === stroke.id);
        if (exists) {
          return prev.map((l) => (l.id === stroke.id ? stroke : l));
        }
        return [...prev, stroke];
      });
    });

    socket.on("erase", ({ strokeId }: { strokeId: string }) => {
      setLines((prev) => prev.filter((l) => l.id !== strokeId));
    });

    socket.on("cursor-move", ({ userId, cursor, username }) => {
      setCursors((prev) => ({
        ...prev,
        [userId]: {
          ...cursor,
          username,
          lastUpdate: Date.now(),
          color: prev[userId]?.color || getCursorColor(userId)
        },
      }));
    });

    socket.on("user-left", ({ userId }) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    return () => {
      socket.off("draw");
      socket.off("erase");
      socket.off("cursor-move");
      socket.off("user-left");
    };
  }, [socket]);

  // -------------------------------
  // Inactivity Cleanup
  // -------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((key) => {
          if (now - next[key].lastUpdate > 10000) { // 10 seconds timeout
            delete next[key];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // -------------------------------
  // Undo / Redo helpers
  // -------------------------------
  const pushAction = useCallback((action: Action) => {
    undoStackRef.current.push(action);
    redoStackRef.current = [];
  }, []);

  const handleUndo = () => {
    const action = undoStackRef.current.pop();
    if (!action) return;

    if (action.type === "add") {
      setLines((prev) => prev.filter((l) => l.id !== action.stroke.id));
      socket.emit("erase", { sessionId, strokeId: action.stroke.id });
    } else {
      setLines((prev) => [...prev, action.stroke]);
      socket.emit("draw", { sessionId, stroke: action.stroke });
    }

    redoStackRef.current.push(action);
  };

  const handleRedo = () => {
    const action = redoStackRef.current.pop();
    if (!action) return;

    if (action.type === "add") {
      setLines((prev) => [...prev, action.stroke]);
      socket.emit("draw", { sessionId, stroke: action.stroke });
    } else {
      setLines((prev) => prev.filter((l) => l.id !== action.stroke.id));
      socket.emit("erase", { sessionId, strokeId: action.stroke.id });
    }

    undoStackRef.current.push(action);
  };

  const canUndo = () => undoStackRef.current.length > 0;
  const canRedo = () => redoStackRef.current.length > 0;

  // -------------------------------
  // Eraser hit-test
  // -------------------------------
  const findStrokeToErase = useCallback(
    (x: number, y: number, ERA_SIZE = Math.max(8, size * 2)): string | null => {
      for (const stroke of lines) {
        const pts = stroke.points;
        for (let i = 0; i < pts.length - 2; i += 2) {
          const x1 = pts[i];
          const y1 = pts[i + 1];
          const x2 = pts[i + 2];
          const y2 = pts[i + 3];

          const A = x - x1;
          const B = y - y1;
          const C = x2 - x1;
          const D = y2 - y1;

          const dot = A * C + B * D;
          const lenSq = C * C + D * D;
          let param = -1;
          if (lenSq !== 0) param = dot / lenSq;

          let xx, yy;
          if (param < 0) {
            xx = x1;
            yy = y1;
          } else if (param > 1) {
            xx = x2;
            yy = y2;
          } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
          }

          const dx = x - xx;
          const dy = y - yy;
          if (dx * dx + dy * dy < ERA_SIZE * ERA_SIZE) {
            return stroke.id;
          }
        }
      }
      return null;
    },
    [lines, size]
  );

  // -------------------------------
  // Mouse handlers
  // -------------------------------
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    socket.emit("cursor-move", { sessionId, cursor: { x: pos.x, y: pos.y } });

    if (tool === "eraser") {
      const targetId = findStrokeToErase(pos.x, pos.y);
      if (targetId) {
        const removed = lines.find((l) => l.id === targetId);
        if (removed) {
          setLines((prev) => prev.filter((l) => l.id !== targetId));
          pushAction({ type: "remove", stroke: removed });
          socket.emit("erase", { sessionId, strokeId: targetId });
        }
      }
      return;
    }

    isDrawingRef.current = true;
    const id = crypto.randomUUID();
    currentStrokeIdRef.current = id;

    const newStroke: Stroke = {
      id,
      points: [pos.x, pos.y],
      stroke: color,
      strokeWidth: size,
    };

    setLines((prev) => [...prev, newStroke]);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    socket.emit("cursor-move", { sessionId, cursor: { x: pos.x, y: pos.y } });

    if (tool === "eraser") {
      const targetId = findStrokeToErase(pos.x, pos.y);
      if (targetId) {
        const removed = lines.find((l) => l.id === targetId);
        if (removed) {
          setLines((prev) => prev.filter((l) => l.id !== targetId));
          pushAction({ type: "remove", stroke: removed });
          socket.emit("erase", { sessionId, strokeId: targetId });
        }
      }
      return;
    }

    if (!isDrawingRef.current) return;

    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.id !== currentStrokeIdRef.current) return prev;

      const updated: Stroke = {
        ...last,
        points: [...last.points, pos.x, pos.y],
        stroke: color,
        strokeWidth: size,
      };

      const arr = [...prev.slice(0, -1), updated];

      socket.emit("draw", { sessionId, stroke: updated });

      return arr;
    });
  };

  const handleMouseUp = () => {
    if (isDrawingRef.current && currentStrokeIdRef.current) {
      const stroke = lines.find((l) => l.id === currentStrokeIdRef.current);
      if (stroke) {
        pushAction({ type: "add", stroke });
      }
    }
    isDrawingRef.current = false;
    currentStrokeIdRef.current = null;
  };

  // -------------------------------
  // Download Whiteboard as PNG
  // -------------------------------
  const handleDownload = () => {
    if (!stageRef.current) return;

    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });

    const link = document.createElement("a");
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------
  // Render
  // -------------------------------
  return (
    <>
      {/* Canvas */}
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={stageRef}
        style={{ cursor: tool === "eraser" ? "crosshair" : "default" }}
      >
        <Layer>
          {lines.map((line) => (
            <Line
              key={line.id}
              points={line.points}
              stroke={line.stroke}
              strokeWidth={line.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          ))}

          {Object.entries(cursors).map(([userId, cursor]) => (
            <Group key={userId} x={cursor.x} y={cursor.y}>
              {/* Cursor Arrow */}
              <Path
                data="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19169L14.8418 17.4603L9.2627 17.4603L9.2627 17.4603L5.65376 12.3673Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth={1}
                rotation={-15}
              />

              {/* Username Label */}
              <Group x={16} y={16}>
                <Rect
                  fill={cursor.color}
                  cornerRadius={4}
                  width={cursor.username.length * 8 + 16}
                  height={24}
                  shadowColor="black"
                  shadowBlur={2}
                  shadowOpacity={0.2}
                  shadowOffset={{ x: 1, y: 1 }}
                />
                <Text
                  text={cursor.username}
                  fontSize={12}
                  fill="white"
                  fontStyle="bold"
                  padding={6}
                  align="center"
                />
              </Group>
            </Group>
          ))}
        </Layer>
      </Stage>

      {/* Floating Toolbar */}
      <div className="position-absolute bottom-0 start-50 translate-middle-x mb-4 d-flex flex-column align-items-center gap-3" style={{ zIndex: 20 }}>

        {/* Stroke Size & Color (Only visible when Brush is active) */}
        {tool === "brush" && (
          <div className="glass-panel px-3 py-2 rounded-pill d-flex align-items-center gap-3 animate-fade-in">
            <div className="d-flex gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className="btn btn-sm rounded-circle p-0 border-2"
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: c,
                    borderColor: color === c ? "white" : "transparent",
                    boxShadow: color === c ? "0 0 0 2px var(--primary-color)" : "none"
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="form-control form-control-color p-0 border-0 rounded-circle"
                style={{ width: 24, height: 24, overflow: "hidden" }}
                title="Custom Color"
              />
            </div>
            <div className="vr opacity-25"></div>
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted" style={{ width: 40 }}>{size}px</span>
              <input
                type="range"
                min="1"
                max="50"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="form-range"
                style={{ width: 100 }}
              />
            </div>
          </div>
        )}

        {/* Main Tools */}
        <div className="glass-panel px-4 py-2 rounded-pill d-flex align-items-center gap-2 shadow-lg">
          <button
            className={`btn btn-lg rounded-circle d-flex align-items-center justify-content-center p-2 ${tool === "brush" ? "btn-primary" : "btn-light text-muted"}`}
            onClick={() => setTool("brush")}
            title="Brush"
          >
            <FiEdit2 size={20} />
          </button>

          <button
            className={`btn btn-lg rounded-circle d-flex align-items-center justify-content-center p-2 ${tool === "eraser" ? "btn-danger text-white" : "btn-light text-muted"}`}
            onClick={() => setTool("eraser")}
            title="Eraser"
          >
            <FiTrash2 size={20} />
          </button>

          <div className="vr mx-2 opacity-25"></div>

          <button
            className="btn btn-light btn-sm rounded-circle p-2 text-muted"
            onClick={handleUndo}
            disabled={!canUndo()}
            title="Undo"
          >
            <FiRotateCcw size={18} />
          </button>

          <button
            className="btn btn-light btn-sm rounded-circle p-2 text-muted"
            onClick={handleRedo}
            disabled={!canRedo()}
            title="Redo"
          >
            <FiRotateCw size={18} />
          </button>

          <div className="vr mx-2 opacity-25"></div>

          <button
            className="btn btn-success btn-sm rounded-pill px-3 d-flex align-items-center gap-2"
            onClick={handleDownload}
            title="Download PNG"
          >
            <FiDownload size={16} />
            <span className="small fw-medium">Save</span>
          </button>
        </div>
      </div>
    </>
  );
}
