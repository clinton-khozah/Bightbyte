import React from "react";
import Modal from "../Modal/Modal";
import ReviewLivePhotos from "../ReviewLivePhotos/ReviewLivePhotos";
import "./ReviewFormModal.css";

const ReviewFormModal = ({ vehicles, form, error, onChange, onPhoto, onClose, onSubmit }) => (
  <Modal
    wide
    title="Vehicle condition photos"
    subtitle="Take live photos of the front, rear and both sides. These sit on the monthly review."
    onClose={onClose}
  >
    <form className="fc-form review-form" onSubmit={onSubmit}>
      <div className="review-form__row">
        <label>
          Vehicle
          <select value={form.vehicle_id} onChange={(e) => onChange({ vehicle_id: e.target.value })}>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration} — {v.make} {v.model}
              </option>
            ))}
          </select>
        </label>
        <label>
          Review date
          <input
            type="date"
            value={form.review_month}
            onChange={(e) => onChange({ review_month: e.target.value })}
          />
        </label>
      </div>
      <label>
        Condition
        <select value={form.condition} onChange={(e) => onChange({ condition: e.target.value })}>
          <option value="excellent">Excellent</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </select>
      </label>
      <ReviewLivePhotos photos={form.photos} onCaptured={onPhoto} />
      <label>
        Notes
        <textarea
          value={form.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Scratches, tyre wear, lights, interior..."
        />
      </label>
      {error ? <p className="fc-error">{error}</p> : null}
      <div className="fc-form__actions">
        <button className="fc-btn" type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="fc-btn fc-btn--primary" type="submit">
          Submit review
        </button>
      </div>
    </form>
  </Modal>
);

export default ReviewFormModal;
