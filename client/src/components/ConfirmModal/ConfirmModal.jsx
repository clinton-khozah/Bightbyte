import React from "react";
import Modal from "../Modal/Modal";
import "./ConfirmModal.css";

const ConfirmModal = ({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  busy,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;
  return (
    <Modal title={title} subtitle="Please confirm before this change is applied." onClose={onCancel}>
      <div className="confirm-modal">
        <p>{message}</p>
        <div className="fc-form__actions">
          <button className="fc-btn" type="button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className={`fc-btn ${tone === "danger" ? "confirm-modal__danger" : "fc-btn--primary"}`}
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
