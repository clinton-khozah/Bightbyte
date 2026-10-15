import React, { useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import CameraCapture from "../CameraCapture/CameraCapture";
import "./FirstLoginSelfie.css";

const FirstLoginSelfie = () => {
  const { refreshUser } = useAuth();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!url) {
      setError("Take a profile photo to continue.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ photo_url: url }),
      });
      await refreshUser();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="gh-selfie-overlay">
      <div className="gh-selfie" role="dialog" aria-modal="true">
        <h3>Take your profile photo</h3>
        <p>
          Drivers must capture a live photo when they first enter the system. This
          becomes your identity on check-ins and reviews.
        </p>
        <CameraCapture onCaptured={(next) => setUrl(next)} />
        {error ? <p className="fc-error">{error}</p> : null}
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="fc-btn fc-btn--primary" disabled={saving} onClick={save}>
            {saving ? "Saving" : "Save and continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FirstLoginSelfie;
