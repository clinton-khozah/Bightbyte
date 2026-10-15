import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import "./PhotoViewer.css";

const PhotoViewer = ({ photos, index, alt, onClose, onIndex }) => {
  const list = photos || [];
  const current = list[index];
  const canPrev = index > 0;
  const canNext = index < list.length - 1;

  useEffect(() => {
    if (current == null) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && canPrev) onIndex(index - 1);
      if (event.key === "ArrowRight" && canNext) onIndex(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, index, canPrev, canNext, onClose, onIndex]);

  if (current == null) return null;

  return createPortal(
    <div className="photo-viewer" onClick={onClose} role="presentation">
      <div className="photo-viewer__frame" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="photo-viewer__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {canPrev ? (
          <button type="button" className="photo-viewer__nav photo-viewer__nav--prev" onClick={() => onIndex(index - 1)} aria-label="Previous photo">
            ‹
          </button>
        ) : null}
        <img src={current} alt={alt || "Photo"} />
        {canNext ? (
          <button type="button" className="photo-viewer__nav photo-viewer__nav--next" onClick={() => onIndex(index + 1)} aria-label="Next photo">
            ›
          </button>
        ) : null}
        <p className="photo-viewer__count">
          {index + 1} of {list.length}
        </p>
      </div>
    </div>,
    document.body,
  );
};

export default PhotoViewer;
