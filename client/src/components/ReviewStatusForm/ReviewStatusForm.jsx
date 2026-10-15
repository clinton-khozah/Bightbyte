import React from "react";
import LineSelect from "../LineSelect/LineSelect";
import "../Modal/Modal.css";
import "./ReviewStatusForm.css";

const ReviewStatusForm = ({
  vehicleStatus,
  reviewStatus,
  note,
  onVehicleStatus,
  onReviewStatus,
  onNote,
  onSave,
  onCancel,
  saving,
  error,
}) => (
  <form className="fc-form review-status" onSubmit={onSave}>
    <LineSelect
      label="Vehicle status"
      value={vehicleStatus}
      onChange={onVehicleStatus}
      options={[
        { id: "in_use", label: "In use" },
        { id: "available", label: "Available" },
        { id: "maintenance", label: "Maintenance" },
      ]}
    />
    <LineSelect
      label="Review status"
      value={reviewStatus}
      onChange={onReviewStatus}
      options={[
        { id: "submitted", label: "Submitted" },
        { id: "reviewed", label: "Reviewed" },
      ]}
    />
    <label className="fc-form__full">
      Note
      <textarea
        value={note}
        onChange={(e) => onNote(e.target.value)}
        placeholder="Write a note for this status update"
      />
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
