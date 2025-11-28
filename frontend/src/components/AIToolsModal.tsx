import React, { useState } from "react";
import axios from "axios";
import keycloak from "../keycloak";

type Props = {
  show: boolean;
  onClose: () => void;
};
type Prediction = {
    className: string;
    probability: number;
  };

export default function AIToolsModal({ show, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);

  if (!show){return null}

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]

    if (!f){return}

    setFile(f);
    setPreview(URL.createObjectURL(f));

  }

  const handlePredict = async () => {
    if (!file){return}

    setLoading(true);
    const formData = new FormData();
    formData.append("image", file);
  
    if (keycloak.token && keycloak.isTokenExpired(30)) {
      await keycloak.updateToken(30);
    }
  
    const token = keycloak.token
    if (!token) {
      alert("Authentication error: No valid token found");
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
      );
  
      setPredictions(res.data.predictions)

    } catch (err) {

      console.error("ML prediction failed:", err);
      alert("Failed to get prediction. Check console.");
    }
  
    setLoading(false)
  };
  

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100%", height: "100%",
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div style={{
          width: 450,
          background: "white",
          padding: 20,
          borderRadius: 8,
        }}
      >
        <h4>AI Image Classifier</h4>

        <input type="file" accept="image/*" onChange={handleFileChange} />

        {preview && (
          <img
            src={preview}
            alt="preview"
            style={{ width: "100%", marginTop: 10 }}
          />
        )}

        <button
          className="btn btn-primary mt-3"
          onClick={handlePredict}
          disabled={loading}>
          {loading ? "Analyzing..." : "Run Prediction"}
        </button>

        <div className="mt-3">
          {predictions.map((p, i) => (
            <div key={i}>
              {p.className} – {Math.round(p.probability * 100)}%
            </div>
          ))}
        </div>

        <button className="btn btn-secondary mt-3" onClick={onClose}>
          Close
        </button>

      </div>
    </div>
  );
}