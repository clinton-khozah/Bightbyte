import React from "react";
import Modal from "../Modal/Modal";
import LineSelect from "../LineSelect/LineSelect";
import ReviewLivePhotos from "../ReviewLivePhotos/ReviewLivePhotos";
import "./ReviewFormModal.css";

const ReviewFormModal = ({
  vehicles = [],
  drivers = [],
  showDriver,
  form,
  error,
  onChange,
  onPhoto,
  onClose,
  onSubmit,
}) => {
  const driver = drivers.find((row) => row.id === form.driver_id);
  const fleet = form.driver_id
    ? vehicles.filter(
        (row) =>
          row.assigned_driver_id === form.driver_id || driver?.assigned_vehicle_id === row.id,
      )
    : [];

  return (
    <Modal
      wide
      compact
      title="Vehicle condition photos"
      subtitle="Take live photos of the front, rear and both sides. These sit on the monthly review."
      onClose={onClose}
    >
      <form className="fc-form review-form" onSubmit={onSubmit}>
        <div className="review-form__row">
          {showDriver ? (
            <LineSelect
              label="Driver"
              required
              value={form.driver_id}
              onChange={(id) => {
                const person = drivers.find((row) => row.id === id);
                const assigned = vehicles.find(
                  (row) =>
                    row.assigned_driver_id === id &&
                    (!person?.company_id || row.company_id === person.company_id),
                );
                onChange({ driver_id: id, vehicle_id: assigned?.id || "" });
              }}
              placeholder="Select a driver"
              emptyText="No drivers to select"
              options={drivers.map((row) => ({
                id: row.id,
                label: row.full_name,
                sub: row.employee_id || row.email || "",
                photo: row.photo_url,
                name: row.full_name,
              }))}
            />
          ) : null}
          <LineSelect
            label="Vehicle"
            required
            value={form.vehicle_id}
            onChange={(id) => onChange({ vehicle_id: id })}
            placeholder="Select a vehicle"
            emptyText="No vehicle assigned"
            options={fleet.map((row) => ({
              id: row.id,
              label: row.registration,
              sub: `${row.make || ""} ${row.model || ""}`.trim(),
              photo: row.photo_url || row.photos?.[0],
              name: row.registration,
            }))}
          />
        </div>
        <div className="review-form__row">
          <label>
            Review date
            <input
              type="date"
              value={form.review_month}
              onChange={(e) => onChange({ review_month: e.target.value })}
            />
          </label>
          <LineSelect
            label="Condition"
            value={form.condition}
            onChange={(id) => onChange({ condition: id })}
            options={[
              { id: "excellent", label: "Excellent" },
              { id: "good", label: "Good" },
              { id: "fair", label: "Fair" },
              { id: "poor", label: "Poor" },
            ]}
          />
        </div>
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
};

export default ReviewFormModal;
