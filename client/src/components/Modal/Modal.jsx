import React from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

const Modal = ({ title, subtitle, children, onClose, wide, xl, compact }) =>
  createPortal(
    <div className="fc-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`fc-modal${xl ? " fc-modal--xl" : wide ? " fc-modal--wide" : ""}${compact ? " fc-modal--compact" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="fc-modal__head">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p className="fc-modal__sub">{subtitle}</p> : null}
          </div>
          {onClose ? (
            <button type="button" className="fc-modal__close" onClick={onClose} aria-label="Close">
              ×
            </button>
          ) : null}
        </header>
        <div className="fc-modal__body">{children}</div>
      </div>
    </div>,
    document.body,
  );

export default Modal;
