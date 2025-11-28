import  { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import keycloak from "../keycloak";

export default function Landing() {
  const nav = useNavigate();
  const [joinId, setJoinId] = useState("");

  const createSession = async () => {
    try {
      const res = await api.post("/api/session/create", {
        name: "My Whiteboard",
      });

      nav(`/session/${res.data.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create session");
    }
  };


  const joinSession = async () => {
    if (!joinId) return alert("Please enter session ID");

    try {
      await api.post(`/api/session/join/${joinId}`);
      nav(`/session/${joinId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to join session");
    }
  }


  return (
    <div className="container py-5">
      <h1>Welcome, {keycloak.tokenParsed?.preferred_username}</h1>

      <div className="mt-4">
        <button className="btn btn-primary me-2" onClick={createSession}>
          Create Session
        </button>

        <input
          className="form-control d-inline-block w-50 me-2"
          placeholder="Session ID"
          value={joinId}
          onChange={(e) => setJoinId(e.target.value)}
        />

        <button className="btn btn-outline-primary" onClick={joinSession}>
          Join Session
        </button>
      </div>

      <button
        className="btn btn-danger mt-4"
        onClick={() => keycloak.logout()}
      >
        Logout
      </button>
    </div>
  );
}
