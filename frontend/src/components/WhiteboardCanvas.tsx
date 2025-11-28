import React, { useRef, useEffect, useState } from "react";
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

export default function WhiteboardCanvas({ sessionId, socket }: Props) {
  const [lines, setLines] = useState<Stroke[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorData>>({});

  const isDrawingRef = useRef(false);
  const stageRef = useRef<Konva.Stage | null>(null);

  // Brush settings
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(3);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");

  // ---------------------------------------------------
  // RECEIVE EVENTS FROM SERVER
  // ---------------------------------------------------
  useEffect(() => {
    socket.on("draw", ({ stroke }) => {
      setLines((prev) => [...prev, stroke]);
    });

    socket.on("erase", ({ strokeId }) => {
      setLines((prev) => prev.filter((line) => line.id !== strokeId));
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

  // ---------------------------------------------------
  // DETECT IF CURSOR TOUCHES A STROKE (ERASER)
  // ---------------------------------------------------
  const findStrokeToErase = (x: number, y: number): string | null => {
    const ERASER_RADIUS = size * 2;

    for (const stroke of lines) {
      const pts = stroke.points;

      for (let i = 0; i < pts.length - 2; i += 2) {
        const x1 = pts[i];
        const y1 = pts[i + 1];
        const x2 = pts[i + 2];
        const y2 = pts[i + 3];

        // distance from point to segment
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

        if (dx * dx + dy * dy < ERASER_RADIUS * ERASER_RADIUS) {
          return stroke.id;
        }
      }
    }

    return null;
  };

  // ---------------------------------------------------
  // DRAWING / ERASING HANDLERS
  // ---------------------------------------------------
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    if (tool === "eraser") {
      const targetId = findStrokeToErase(pos.x, pos.y);
      if (targetId) {
        setLines((prev) => prev.filter((l) => l.id !== targetId));
        socket.emit("erase", { sessionId, strokeId: targetId });
      }
      return;
    }

    // Brush mode
    isDrawingRef.current = true;

    const id = crypto.randomUUID();
    const newLine: Stroke = {
      id,
      points: [pos.x, pos.y],
      stroke: color,
      strokeWidth: size,
    };

    setLines((prev) => [...prev, newLine]);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    // Send cursor position
    socket.emit("cursor-move", {
      sessionId,
      cursor: { x: pos.x, y: pos.y },
    });

    if (tool === "eraser") {
      const targetId = findStrokeToErase(pos.x, pos.y);
      if (targetId) {
        setLines((prev) => prev.filter((l) => l.id !== targetId));
        socket.emit("erase", { sessionId, strokeId: targetId });
      }
      return;
    }

    if (!isDrawingRef.current) return;

    // Brush drawing
    setLines((prev) => {
      const last = prev[prev.length - 1];
      const updatedLine: Stroke = {
        ...last,
        points: [...last.points, pos.x, pos.y],
      };

      const updatedLines = [...prev.slice(0, -1), updatedLine];

      socket.emit("draw", { sessionId, stroke: updatedLine });

      return updatedLines;
    });
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
  };

  // ---------------------------------------------------
  // RENDER
  // ---------------------------------------------------
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
        {/* Brush mode */}
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

        {/* Eraser mode */}
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

        {/* Color picker */}
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

        {/* Size slider */}
        <label style={{ marginLeft: 20 }}>Size: {size}px</label>
        <input
          type="range"
          min="1"
          max="40"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        />
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

          {/* Cursors */}
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
                fontSize={16}
                fill="black"
              />
            </React.Fragment>
          ))}
        </Layer>
      </Stage>
    </>
  );
}
