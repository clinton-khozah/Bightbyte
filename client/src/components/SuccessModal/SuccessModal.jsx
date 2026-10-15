import React from "react";
import Modal from "../Modal/Modal";
import "./SuccessModal.css";

const SuccessModal = ({
  open,
  title = "Completed successfully",
  message = "The change was saved.",
  onClose,
}) => {
  if (!open) return null;
  return (
    <Modal title={title} subtitle="The request finished without errors." onClose={onClose}>
      <div className="success-modal">
        <span className="success-modal__icon" aria-hidden="true">
          ✓
        </span>
        <p>{message}</p>
        <div className="fc-form__actions">
          <button className="fc-btn fc-btn--primary" type="button" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SuccessModal;
