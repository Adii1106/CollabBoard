import React, { useRef, useEffect, useState } from "react";
import { Stage, Layer, Line } from "react-konva";
import { Socket, io } from "socket.io-client";

type Props = { sessionId: string };

export default function WhiteboardCanvas({ sessionId }: Props) {
  const [lines, setLines] = useState<Array<{ points: number[]; stroke: string }>>([]);
  const isDrawingRef = useRef(false);
  const stageRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // connect socket (assumes backend socket server at 3001)
    socketRef.current = io("http://localhost:3001", {
      query: { sessionId },
    });

    socketRef.current.on("draw", (stroke: any) => {
      setLines((prev) => [...prev, stroke]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [sessionId]);

  const handleMouseDown = (e: any) => {
    isDrawingRef.current = true;
    const pos = e.target.getStage().getPointerPosition();
    setLines((prev) => [...prev, { points: [pos.x, pos.y], stroke: "#000000" }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawingRef.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    setLines((prev) => {
      const last = prev[prev.length - 1];
      const updated = prev.slice(0, -1).concat([{ ...last, points: last.points.concat([point.x, point.y]) }]);
      // emit stroke incremental update
      socketRef.current?.emit("draw", updated[updated.length - 1]);
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
          <Line key={i} points={line.points} stroke={line.stroke} strokeWidth={3} tension={0.5} lineCap="round" />
        ))}
      </Layer>
    </Stage>
  );
}
