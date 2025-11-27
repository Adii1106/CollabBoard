import React, { useRef, useEffect, useState } from "react";
import { Stage, Layer, Line, Text } from "react-konva";
import { Socket } from "socket.io-client";
import Konva from "konva";

type Props = {
  sessionId: string;
  socket: Socket | null;
};

type CursorData = {
  x: number;
  y: number;
  username: string;
};

export default function WhiteboardCanvas({ sessionId, socket }: Props) {
  const [lines, setLines] = useState<
    Array<{ points: number[]; stroke: string }>
  >([]);
  const [cursors, setCursors] = useState<Record<string, CursorData>>({});
  const isDrawingRef = useRef(false);
  const stageRef = useRef<Konva.Stage | null>(null);

  // -------------------------------
  // RECEIVE EVENTS
  // -------------------------------
  useEffect(() => {
    if (!socket) return;

    // When other users draw
    socket.on("draw", ({ stroke }) => {
      setLines((prev) => [...prev, stroke]);
    });

    // When other users move cursor
    socket.on("cursor-move", ({ userId, cursor, username }) => {
      setCursors((prev) => ({
        ...prev,
        [userId]: { ...cursor, username },
      }));
    });

    return () => {
      socket.off("draw");
      socket.off("cursor-move");
    };
  }, [socket]);

  if (!socket) return null;

  // -------------------------------
  // LOCAL DRAW HANDLERS
  // -------------------------------
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    isDrawingRef.current = true;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const newLine = { points: [pos.x, pos.y], stroke: "#000000" };
    setLines((prev) => [...prev, newLine]);
  };
  
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
  
    // emit cursor
    socket?.emit("cursor-move", {
      sessionId,
      cursor: { x: pos.x, y: pos.y },
    });
  
    if (!isDrawingRef.current) return;
  
    setLines((prev) => {
      const last = prev[prev.length - 1];
      const updatedLine = {
        ...last,
        points: [...last.points, pos.x, pos.y],
      };
  
      const updated = [...prev.slice(0, -1), updatedLine];
  
      socket?.emit("draw", { sessionId, stroke: updatedLine });
  
      return updated;
    });
  };
  

  const handleMouseUp = () => {
    isDrawingRef.current = false;
  };

  // -------------------------------
  // RENDER CANVAS
  // -------------------------------
  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight - 60}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      ref={stageRef}
    >
      <Layer>
        {/* DRAWN LINES */}
        {lines.map((line, i) => (
          <Line
            key={i}
            points={line.points}
            stroke={line.stroke}
            strokeWidth={3}
            tension={0.5}
            lineCap="round"
          />
        ))}

        {/* CURSORS */}
        {Object.entries(cursors).map(([userId, cursor]) => (
          <React.Fragment key={userId}>
            {/* cursor dot */}
            <Line
              points={[cursor.x, cursor.y, cursor.x + 1, cursor.y + 1]}
              stroke="red"
              strokeWidth={6}
            />

            {/* username */}
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
  );
}
