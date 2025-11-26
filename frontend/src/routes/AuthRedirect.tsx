import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import keycloak from "../keycloak";

export default function AuthRedirect() {
  const nav = useNavigate();
  useEffect(() => {
    // called after Keycloak redirects back; we can parse tokens if needed
    nav("/");
  }, [nav]);
  return <div>Redirecting...</div>;
}
