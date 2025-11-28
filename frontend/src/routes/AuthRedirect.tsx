import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
// import keycloak from "../keycloak";

export default function AuthRedirect() {
  const nav = useNavigate();
  useEffect(() => {
    nav("/");
  }, [nav]);
  return <div>Redirecting...</div>;
}
