import React, { useRef, useEffect, useState } from "react";
import { Stage, Layer, Line } from "react-konva";
import { Socket } from "socket.io-client";

type Props = { sessionId: string; socket: Socket | null };

export default function WhiteboardCanvas({ sessionId, socket }: Props) {
  const [lines, setLines] = useState<Array<{ points: number[]; stroke: string }>>([]);
  const isDrawingRef = useRef(false);
  const stageRef = useRef<any>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on("draw", ({ stroke }) => {
      setLines((prev) => [...prev, stroke]);
    });

    return () => {
      socket.off("draw");
    };
  }, [socket]);

  if (!socket) return null; // prevent rendering before socket ready

  const handleMouseDown = (e: any) => {
    isDrawingRef.current = true;
    const pos = e.target.getStage().getPointerPosition();
    const newLine = { points: [pos.x, pos.y], stroke: "#000" };
    setLines((prev) => [...prev, newLine]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawingRef.current || !socket) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    setLines((prev) => {
      const last = prev[prev.length - 1];
      const updatedLine = {
        ...last,
        points: [...last.points, point.x, point.y],
      };

      const updated = [...prev.slice(0, -1), updatedLine];

      socket.emit("draw", { sessionId, stroke: updatedLine });

      return updated;
    });
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
  };

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight - 60}
      onMouseDown={handleMouseDown}
      onMousemove={handleMouseMove}
      onMouseup={handleMouseUp}
      ref={stageRef}
    >
      <Layer>
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
      </Layer>
    </Stage>
  );
}
