import { Request, Response } from "express"
import * as tf from "@tensorflow/tfjs-node"
import * as mobilenet from "@tensorflow-models/mobilenet"

let model: mobilenet.MobileNet | null = null

export async function loadModel() {
  model = await mobilenet.load()
  console.log("MobileNet ML model loaded!")
}

export async function predictImage(req: Request, res: Response) {
  try {
    if (!model) {
      return res.status(500).json({ error: "Model not loaded" })
    }

    const file = req.file
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    console.log("Uploaded type:", file.mimetype)

    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/bmp"]

    if (!allowed.includes(file.mimetype)) {
      return res.status(400)
        .json({ error: "Unsupported image type. Please upload PNG/JPEG/GIF/BMP." })
    }

    const tensor = tf.node.decodeImage(file.buffer, 3)
    const predictions = await model.classify(tensor as any)

    return res.json({ predictions })

  } catch (err) {
    console.error("Prediction Failed:", err)
    return res.status(500).json({ error: "ML prediction failed" })
  }
}
