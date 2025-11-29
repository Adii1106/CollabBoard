import { Router } from "express"
import multer from "multer"
import { predictImage } from "../controllers/mlController"

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/bmp"]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Unsupported file type: " + file.mimetype))
    }
  }
})

const router = Router()

router.post("/predict", upload.single("image"), async (req, res, next) => {
  const auth = req.headers.authorization

  if (!auth) {
    return res.status(401).json({ error: "Missing Authorization header" })
  }
  next()
},
  predictImage
)

export default router
