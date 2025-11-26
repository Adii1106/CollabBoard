import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import keycloak from "../keycloak";

export default function Landing() {
  const [joinId, setJoinId] = useState("");
  const navigate = useNavigate();

  const createSession = async () => {
    // call backend to create session - placeholder for now
    // we will add backend endpoint later; for now generate UUID locally for dev
    const id = crypto.randomUUID();
    navigate(`/session/${id}`);
  };

  const joinSession = () => {
    if (!joinId) return alert("Enter session id to join");
    navigate(`/session/${joinId}`);
  };

  const logout = () => {
    keycloak.logout();
  };

  return (
    <div className="container py-5">
      <h1>collabboard</h1>
      <div className="mt-4">
        <button className="btn btn-primary me-2" onClick={createSession}>Create Session</button>
        <input className="form-control d-inline-block w-50 me-2" placeholder="Session ID" value={joinId} onChange={(e) => setJoinId(e.target.value)} />
        <button className="btn btn-outline-primary" onClick={joinSession}>Join Session</button>
      </div>

      <div className="mt-4">
        <button className="btn btn-danger" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
