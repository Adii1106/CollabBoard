import React, { useState } from "react"
import axios from "axios"
import keycloak from "../keycloak"
import { FiX, FiUploadCloud, FiCpu } from "react-icons/fi"

type Props = {
  show: boolean
  onClose: () => void
}
type Prediction = {
  className: string
  probability: number
}

export default function AIToolsModal({ show, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(false)

  if (!show){
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]

    if (!f){
      return
    }

    setFile(f)
    setPreview(URL.createObjectURL(f))
    setPredictions([])
  }

  const handlePredict = async () => {
    if (!file) {
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append("image", file)

    if (keycloak.token && keycloak.isTokenExpired(30)) {
      await keycloak.updateToken(30)
    }

    const token = keycloak.token
    if (!token) {
      alert("Authentication error: No valid token found")
      setLoading(false)
      return
    }

    try {
      const res = await axios.post(
        "http://localhost:3001/api/ml/predict",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
            Accept: "application/json",
          },
          withCredentials: true
        }
      )

      setPredictions(res.data.predictions)

    } catch (err) {
      console.error("ML prediction failed:", err)
      alert("Failed to get prediction. Check console.")
    }

    setLoading(false)
  }


  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100%", height: "100%",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
      className="animate-fade-in"
    >
      <div className="glass-panel p-4" style={{ width: "450px", borderRadius: "1rem", background: "white" }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="m-0 d-flex align-items-center gap-2 text-primary">
            <FiCpu /> AI Image Classifier
          </h5>
          <button className="btn btn-sm btn-light rounded-circle p-2" onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <div className="mb-4">
          <label
            className="d-flex flex-column align-items-center justify-content-center border border-2 border-dashed rounded-3 p-4 bg-light cursor-pointer"
            style={{ cursor: "pointer", borderColor: "var(--border-color)" }}
          >
            <input type="file" accept="image/*" onChange={handleFileChange} className="d-none" />
            {preview ? (
              <img
                src={preview}
                alt="preview"
                className="img-fluid rounded shadow-sm"
                style={{ maxHeight: "200px" }}
              />
            ) : (
              <div className="text-center text-muted">
                <FiUploadCloud size={32} className="mb-2" />
                <p className="m-0 small">Click to upload an image</p>
              </div>
            )}
          </label>
        </div>

        {predictions.length > 0 && (
          <div className="mb-4">
            <h6 className="small text-muted fw-bold text-uppercase mb-2">Results</h6>
            <div className="d-flex flex-column gap-2">
              {predictions.map((p, i) => (
                <div key={i} className="d-flex align-items-center justify-content-between bg-light p-2 rounded">
                  <span className="fw-medium">{p.className}</span>
                  <span className="badge bg-primary rounded-pill">
                    {Math.round(p.probability * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="d-grid">
          <button
            className="btn btn-primary"
            onClick={handlePredict}
            disabled={loading || !file}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Analyzing...
              </>
            ) : (
              "Run Prediction"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}