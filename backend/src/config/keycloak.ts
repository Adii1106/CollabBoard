import session from "express-session"
import Keycloak from "keycloak-connect"

const memoryStore = new session.MemoryStore()

const keycloak = new Keycloak(
  { store: memoryStore },
  {
    realm: process.env.KEYCLOAK_REALM || "",
    "auth-server-url": process.env.KEYCLOAK_AUTH_SERVER_URL || "",
    resource: process.env.KEYCLOAK_CLIENT_ID || "",
    "ssl-required": "external",
    "public-client": true,
  } as any
)

export function keycloakMiddleware() {
  const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || "super-secret",
    resave: false,
    saveUninitialized: true,
    store: memoryStore,
  })

  return { sessionMiddleware, keycloak }
}

export default keycloak
