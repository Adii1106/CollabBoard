import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import WhiteboardCanvas from "../components/WhiteboardCanvas";

export default function Whiteboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="container-fluid vh-100 p-0 d-flex flex-column">
      <header className="d-flex justify-content-between align-items-center p-2 border-bottom">
        <div>Session: {id}</div>
        <div>
          <button className="btn btn-sm btn-secondary me-2" onClick={() => navigate("/")}>Leave Session</button>
          {/* add download and end session buttons later */}
        </div>
      </header>

      <main className="flex-grow-1">
        <WhiteboardCanvas sessionId={id ?? ""} />
      </main>
    </div>
  );
}
