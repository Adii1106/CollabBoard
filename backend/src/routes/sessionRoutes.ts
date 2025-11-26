import { Router } from "express";
import keycloak from "../config/keycloak";
import { createSession, joinSession } from "../controllers/sessionController";

const router = Router();

router.post("/create", keycloak.protect(), createSession);
router.post("/join/:id", keycloak.protect(), joinSession);

export default router;
