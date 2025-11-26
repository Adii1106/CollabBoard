import axios from "axios";
import keycloak from "./keycloak";

const api = axios.create({
  baseURL: "http://localhost:3001",
});

api.interceptors.request.use(async (config) => {
  // refresh token if needed
  if (keycloak.token && keycloak.isTokenExpired(30)) {
    await keycloak.updateToken(30);
  }

  config.headers = config.headers || {};
  config.headers["Authorization"] = `Bearer ${keycloak.token}`;
  return config;
});

export default api;
