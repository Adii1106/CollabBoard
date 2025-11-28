import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import keycloak from "./keycloak";
import "bootstrap/dist/css/bootstrap.min.css";

console.log("ENV CHECK:", import.meta.env);

keycloak
  .init({
    onLoad: "login-required",
    pkceMethod: "S256",
  })
  .then(() => {
    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>
    );
  })
  .catch((err) => console.error("Keycloak init failed", err));
