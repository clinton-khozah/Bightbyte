import React, { useEffect, useRef, useState } from "react";
import { uploadFiles } from "../../api";
import "./ReviewLivePhotos.css";

const ANGLES = [
  { key: "front", label: "Front", prompt: "Stand at the front of the vehicle and take a photo." },
  { key: "rear", label: "Rear", prompt: "Now stand at the back and take a photo." },
  { key: "left", label: "Left side", prompt: "Now take a photo of the left side." },
  { key: "right", label: "Right side", prompt: "Now take a photo of the right side." },
];

const openStream = async () => {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
      audio: false,
    });
  } catch {
    return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
};

const ReviewLivePhotos = ({ photos, onCaptured }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const angle = ANGLES[step] || ANGLES[ANGLES.length - 1];
  const done = ANGLES.every((item) => photos?.[item.key]);
  const showCamera = !done || Boolean(photos && !photos[angle.key]);

  useEffect(() => {
    if (!showCamera) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      return undefined;
    }
    let cancelled = false;
    const start = async () => {
      setError("");
      setReady(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      try {
        const stream = await openStream();
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setReady(true);
      } catch {
        setError("Allow the camera in this browser, then take each side when we ask.");
      }
    };
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [showCamera, step]);

  const saveBlob = async (blob) => {
    setBusy(true);
    setError("");
    try {
      const file = new File([blob], `${angle.key}-${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
      const { urls } = await uploadFiles([file]);
      onCaptured?.(angle.key, urls[0]);
      const taken = { ...photos, [angle.key]: urls[0] };
      const leftover = ANGLES.findIndex((item) => !taken[item.key]);
      if (leftover >= 0) setStep(leftover);
    } catch {
      setError("Could not save that photo. Take it again.");
    } finally {
      setBusy(false);
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || busy) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) {
      setError("Could not capture from the camera. Try again.");
      return;
    }
    await saveBlob(blob);
  };

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await saveBlob(file);
  };

  return (
    <div className="review-live">
      <div className="review-live__steps" aria-hidden="true">
        {ANGLES.map((item, index) => (
          <span key={item.key} className={photos?.[item.key] ? "is-done" : index === step && !done ? "is-now" : ""}>
            {index + 1}. {item.label}
          </span>
        ))}
      </div>
      {done && photos[angle.key] ? (
        <p className="review-live__hint">All four photos are on file. Retake one if you need to.</p>
      ) : (
        <p className="review-live__hint">{angle.prompt}</p>
      )}
      {!done || !photos[angle.key] ? (
        <div className="review-live__stage">
          <strong>
            {step + 1} of 4 — {angle.label}
          </strong>
          <video ref={videoRef} autoPlay playsInline muted />
          {!ready && !error ? <em>Starting camera…</em> : null}
          <div className="review-live__actions">
            <button className="fc-btn fc-btn--primary" type="button" disabled={busy || !ready} onClick={capture}>
              {busy ? "Saving…" : `Take ${angle.label.toLowerCase()} photo`}
            </button>
            <button className="fc-btn" type="button" onClick={() => fileRef.current?.click()}>
              Use phone camera
            </button>
          </div>
        </div>
      ) : (
        <div className="review-live__thumbs">
          {ANGLES.map((item, index) => (
            <button
              key={item.key}
              type="button"
              className="review-live__thumb"
              onClick={() => {
                onCaptured?.(item.key, "");
                setStep(index);
              }}
            >
              <img src={photos[item.key]} alt={item.label} />
              <span>Retake {item.label.toLowerCase()}</span>
            </button>
          ))}
        </div>
      )}
      <input
        ref={fileRef}
        className="review-live__file"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
      />
      {error ? <p className="fc-error">{error}</p> : null}
    </div>
  );
};

export default ReviewLivePhotos;
