import React, { useRef, useEffect, useState, useCallback } from "react";
import { Stage, Layer, Line, Text } from "react-konva";
import Konva from "konva";
import { Socket } from "socket.io-client";

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
};

type ActionAdd = { type: "add"; stroke: Stroke };
type ActionRemove = { type: "remove"; stroke: Stroke };
type Action = ActionAdd | ActionRemove;

export default function WhiteboardCanvas({ sessionId, socket }: Props) {
  const [lines, setLines] = useState<Stroke[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorData>>({});
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(3);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");

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
        [userId]: { ...cursor, username },
      }));
    });

    return () => {
      socket.off("draw");
      socket.off("erase");
      socket.off("cursor-move");
    };
  }, [socket]);

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
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          padding: "10px",
          background: "#f5f5f5",
          borderBottom: "1px solid #ddd",
          alignItems: "center",
        }}
      >
        <button
          className="btn btn-sm"
          style={{
            background: tool === "brush" ? "#007bff" : "#e0e0e0",
            color: tool === "brush" ? "white" : "black",
          }}
          onClick={() => setTool("brush")}
        >
          Brush
        </button>

        <button
          className="btn btn-sm"
          style={{
            background: tool === "eraser" ? "#dc3545" : "#e0e0e0",
            color: tool === "eraser" ? "white" : "black",
          }}
          onClick={() => setTool("eraser")}
        >
          Eraser
        </button>

        {tool === "brush" && (
          <>
            <label>Color:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </>
        )}

        <label>
          Size: <strong>{size}px</strong>
        </label>
        <input
          type="range"
          min="1"
          max="60"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        />

        <button className="btn btn-sm btn-outline-secondary" onClick={handleUndo} disabled={!canUndo()}>
          Undo
        </button>
        <button className="btn btn-sm btn-outline-secondary" onClick={handleRedo} disabled={!canRedo()}>
          Redo
        </button>

        <button className="btn btn-sm btn-success" onClick={handleDownload}>
          Download PNG
        </button>
      </div>

      {/* Canvas */}
      <Stage
        width={window.innerWidth}
        height={window.innerHeight - 60}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={stageRef}
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
            />
          ))}

          {Object.entries(cursors).map(([userId, cursor]) => (
            <React.Fragment key={userId}>
              <Line
                points={[cursor.x, cursor.y, cursor.x + 1, cursor.y + 1]}
                stroke="red"
                strokeWidth={6}
              />
              <Text
                x={cursor.x + 10}
                y={cursor.y + 10}
                text={cursor.username}
                fontSize={14}
                fill="black"
              />
            </React.Fragment>
          ))}
        </Layer>
      </Stage>
    </>
  );
}
