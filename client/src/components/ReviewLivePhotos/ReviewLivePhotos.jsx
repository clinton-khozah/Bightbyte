import React, { useEffect, useRef, useState } from "react";
import { uploadFiles } from "../../api";
import "./ReviewLivePhotos.css";

const ANGLES = [
  { key: "front", label: "Front" },
  { key: "rear", label: "Rear" },
  { key: "left", label: "Left side" },
  { key: "right", label: "Right side" },
];

const ReviewLivePhotos = ({ photos, onCaptured }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState("front");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      return undefined;
    }
    let cancelled = false;
    const openCamera = async () => {
      setError("");
      streamRef.current?.getTracks().forEach((track) => track.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError("Allow camera access to take the four vehicle photos.");
      }
    };
    openCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [active]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || busy || !active) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      canvas.getContext("2d").drawImage(video, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      const file = new File([blob], `${active}-${Date.now()}.jpg`, { type: "image/jpeg" });
      const { urls } = await uploadFiles([file]);
      const taken = { ...photos, [active]: urls[0] };
      onCaptured?.(active, urls[0]);
      const next = ANGLES.find((angle) => !taken[angle.key]);
      setActive(next?.key || "");
    } catch {
      setError("Could not save that photo. Take it again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="review-live">
      <p className="review-live__hint">Take live photos of the front, rear and both sides.</p>
      <div className="review-live__grid">
        {ANGLES.map((angle) => {
          const taken = Boolean(photos?.[angle.key]);
          const live = active === angle.key;
          return (
            <div key={angle.key} className={`review-live__slot${live ? " is-live" : ""}`}>
              <span>{angle.label}</span>
              {live ? (
                <video ref={videoRef} autoPlay playsInline muted />
              ) : taken ? (
                <img src={photos[angle.key]} alt={angle.label} />
              ) : (
                <button type="button" className="review-live__empty" onClick={() => setActive(angle.key)}>
                  Take photo
                </button>
              )}
              {live ? (
                <button type="button" className="fc-btn fc-btn--primary" disabled={busy} onClick={capture}>
                  {busy ? "Saving…" : "Capture"}
                </button>
              ) : taken ? (
                <button
                  type="button"
                  className="review-live__retake"
                  onClick={() => {
                    onCaptured?.(angle.key, "");
                    setActive(angle.key);
                  }}
                >
                  Retake
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {error ? <p className="fc-error">{error}</p> : null}
    </div>
  );
};

export default ReviewLivePhotos;
