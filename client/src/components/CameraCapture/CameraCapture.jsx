import React, { useEffect, useRef, useState } from "react";
import { uploadFiles } from "../../api";
import "./CameraCapture.css";

const CameraCapture = ({ label = "Take photo", onCaptured }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = async () => {
    setError("");
    try {
      stop();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError("Camera blocked. Allow camera access or upload a file.");
    }
  };

  useEffect(() => {
    start();
    return stop;
  }, []);

  const capture = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    const { urls } = await uploadFiles([file]);
    setPreview(urls[0]);
    onCaptured?.(urls[0], file);
    stop();
  };

  const onFile = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;
    const { urls } = await uploadFiles(files);
    setPreview(urls[0]);
    onCaptured?.(urls[0], files[0]);
  };

  return (
    <div className="gh-cam">
      <span>{label}</span>
      {preview ? <img src={preview} alt="Captured" /> : <video ref={videoRef} autoPlay playsInline muted />}
      {error ? <p className="fc-error">{error}</p> : null}
      <div className="gh-cam__actions">
        {!preview ? (
          <button type="button" className="fc-btn fc-btn--primary" onClick={capture}>
            Capture
          </button>
        ) : (
          <button
            type="button"
            className="fc-btn"
            onClick={() => {
              setPreview("");
              start();
            }}
          >
            Retake
          </button>
        )}
        <label className="fc-btn">
          Upload instead
          <input type="file" accept="image/*" hidden onChange={onFile} />
        </label>
      </div>
    </div>
  );
};

export default CameraCapture;
