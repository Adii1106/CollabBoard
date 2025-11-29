import { Router } from "express"
import { createSession, joinSession } from "../controllers/sessionController"

const router = Router()

router.post("/create", createSession)
router.post("/join/:id", joinSession)

export default router
