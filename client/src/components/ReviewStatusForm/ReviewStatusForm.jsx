import React from "react";
import "../Modal/Modal.css";
import "./ReviewStatusForm.css";

const ReviewStatusForm = ({
  vehicleStatus,
  reviewStatus,
  onVehicleStatus,
  onReviewStatus,
  onSave,
  onCancel,
  saving,
  error,
}) => (
  <form className="fc-form review-status" onSubmit={onSave}>
    <label>
      Vehicle status
      <select value={vehicleStatus} onChange={(e) => onVehicleStatus(e.target.value)}>
        <option value="in_use">In use</option>
        <option value="available">Available</option>
        <option value="maintenance">Maintenance</option>
      </select>
    </label>
    <label>
      Review status
      <select value={reviewStatus} onChange={(e) => onReviewStatus(e.target.value)}>
        <option value="submitted">Submitted</option>
        <option value="reviewed">Reviewed</option>
      </select>
    </label>
    <p className="fc-form__hint">
      Set the vehicle status from this driver review, for example maintenance if the car is not roadworthy.
    </p>
    {error ? <p className="fc-error">{error}</p> : null}
    <div className="fc-form__actions">
      {onCancel ? (
        <button className="fc-btn" type="button" onClick={onCancel}>
          Cancel
        </button>
      ) : null}
      <button className="fc-btn fc-btn--primary" type="submit" disabled={saving}>
        Save status
      </button>
    </div>
  </form>
);

export default ReviewStatusForm;
