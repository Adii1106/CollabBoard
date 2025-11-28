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
    if (!socket) return;

    // DRAW: incremental updates (add or replace by id)
    socket.on("draw", ({ stroke }: { stroke: Stroke }) => {
      setLines((prev) => {
        const exists = prev.find((l) => l.id === stroke.id);
        if (exists) {
          // update existing stroke in-place
          return prev.map((l) => (l.id === stroke.id ? stroke : l));
        }
        // add stroke if not present
        return [...prev, stroke];
      });
    });

    // ERASE: remove stroke by id
    socket.on("erase", ({ strokeId }: { strokeId: string }) => {
      setLines((prev) => prev.filter((l) => l.id !== strokeId));
    });

    // CURSOR: update remote cursors
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
  // Helpers
  // -------------------------------
  const pushAction = useCallback((action: Action) => {
    undoStackRef.current.push(action);
    // clear redo on new action
    redoStackRef.current = [];
  }, []);

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

    // always emit cursor
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

    // Brush mode: start stroke
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
    // do not push action until completed (mouseup)
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    // emit cursor
    socket.emit("cursor-move", { sessionId, cursor: { x: pos.x, y: pos.y } });

    if (tool === "eraser") {
      // continuous erasing
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

    // update current stroke and broadcast incremental stroke
    setLines((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      // ensure we are updating the stroke the user started
      if (!last || last.id !== currentStrokeIdRef.current) return prev;

      const updated: Stroke = {
        ...last,
        points: [...last.points, pos.x, pos.y],
        stroke: color,
        strokeWidth: size,
      };

      const newArr = [...prev.slice(0, -1), updated];

      // broadcast incremental update (receiver will update by id)
      socket.emit("draw", { sessionId, stroke: updated });

      return newArr;
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
  // Undo / Redo
  // -------------------------------
  const canUndo = () => undoStackRef.current.length > 0;
  const canRedo = () => redoStackRef.current.length > 0;

  const handleUndo = () => {
    const action = undoStackRef.current.pop();
    if (!action) return;

    if (action.type === "add") {
      setLines((prev) => prev.filter((l) => l.id !== action.stroke.id));
      socket.emit("erase", { sessionId, strokeId: action.stroke.id });
    } else if (action.type === "remove") {
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
    } else if (action.type === "remove") {
      setLines((prev) => prev.filter((l) => l.id !== action.stroke.id));
      socket.emit("erase", { sessionId, strokeId: action.stroke.id });
    }

    undoStackRef.current.push(action);
  };

  // keyboard shortcuts
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrl = isMac ? ev.metaKey : ev.ctrlKey;
      if (!ctrl) return;

      if (ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        handleUndo();
      } else if (ev.key.toLowerCase() === "y") {
        ev.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <label style={{ marginLeft: 8 }}>Color:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </>
        )}

        <label style={{ marginLeft: 12 }}>
          Size: <strong>{size}px</strong>
        </label>
        <input
          type="range"
          min="1"
          max="60"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        />

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={handleUndo}
            disabled={!canUndo()}
          >
            Undo
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={handleRedo}
            disabled={!canRedo()}
          >
            Redo
          </button>
        </div>
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
