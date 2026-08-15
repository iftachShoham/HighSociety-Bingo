import { useState, useRef } from "react";
import { api } from "../api/client.js";

export default function ImageUpload({ value, onChange, label = "Tile Image" }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const data = await api.uploadImage(file);
      onChange(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="image-upload-area">
        {value && (
          <div className="image-preview">
            <img src={value} alt="Preview" />
            <button
              type="button"
              className="btn-danger"
              style={{ padding: "4px 10px", fontSize: "0.75rem" }}
              onClick={() => onChange("")}
            >
              Remove
            </button>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          ref={fileRef}
          style={{ display: "none" }}
          onChange={handleFile}
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : value ? "Change Image" : "Upload Image"}
        </button>
        {error && <p className="error-msg">{error}</p>}
      </div>
    </div>
  );
}
