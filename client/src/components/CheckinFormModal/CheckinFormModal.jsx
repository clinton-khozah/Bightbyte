import React from "react";
import Modal from "../Modal/Modal";
import FileDrop from "../FileDrop/FileDrop";
import LineSelect from "../LineSelect/LineSelect";
import CheckinNoteField from "../CheckinNoteField/CheckinNoteField";
import PageLoader from "../PageLoader/PageLoader";
import "./CheckinFormModal.css";

const STATUS_OPTIONS = [
  { id: "submitted", label: "Submitted" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const CheckinFormModal = ({
  open,
  editing,
  form,
  onChange,
  onDriverChange,
  onProof,
  onClose,
  onSubmit,
  busy,
  error,
  drivers = [],
  vehicles = [],
  showDriver,
  showStatus,
  showDate,
  assignedLabel,
  assignedOk,
  lateFeeText,
}) => {
  if (!open) return null;

  const set = (patch) => onChange({ ...form, ...patch });
  const driver = drivers.find((row) => row.id === form.driver_id);
  const assigned = form.driver_id
    ? vehicles.filter(
        (row) => row.assigned_driver_id === form.driver_id || driver?.assigned_vehicle_id === row.id,
      )
    : [];
  const fleet = form.driver_id
    ? [...assigned, ...vehicles.filter((row) => !assigned.some((item) => item.id === row.id))]
    : vehicles;

  return (
    <Modal
      wide
      compact
      title={editing ? "Edit check-in" : "Check in amount"}
      subtitle={
        editing
          ? "Update the cash, odometer and payment status."
          : "Cash received, odometer and a photo of the slip."
      }
      onClose={onClose}
    >
      <form className={`fc-form checkin-form${busy ? " is-busy" : ""}`} onSubmit={onSubmit}>
        {busy ? (
          <div className="checkin-form__loading" role="status">
            <PageLoader compact />
            Submitting check-in…
          </div>
        ) : null}
        <div className={`checkin-form__pickers${showDriver ? "" : " checkin-form__pickers--solo"}`}>
          {showDriver ? (
            <LineSelect
              label="Driver"
              required
              value={form.driver_id}
              onChange={onDriverChange}
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
          <div>
            <LineSelect
              label="Vehicle"
              required
              value={form.vehicle_id}
              onChange={(id) => set({ vehicle_id: id })}
            placeholder="Select a vehicle"
            emptyText="No vehicles to select"
              options={fleet.map((row) => ({
                id: row.id,
                label: row.registration,
                sub: `${row.make || ""} ${row.model || ""}`.trim() +
                  (row.assigned_driver_id === form.driver_id ? " · assigned" : ""),
                photo: row.photo_url || row.photos?.[0],
                name: row.registration,
              }))}
            />
            <span className={`checkin-form__flag${assignedOk ? " is-ok" : assignedLabel ? " is-warn" : ""}`}>
              {assignedLabel || "\u00a0"}
            </span>
          </div>
        </div>
        {showDate ? (
          <label>
            Check-in date
            <input
              type="datetime-local"
              value={form.checkin_date || ""}
              max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
              onChange={(e) => set({ checkin_date: e.target.value })}
            />
            <span className="checkin-form__flag">Leave empty to use the current time.</span>
          </label>
        ) : null}
        <label>
          Amount (ZAR)
          <input
            type="number"
            lang="en"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value })}
            required
          />
          <span className="checkin-form__flag is-warn">{lateFeeText || "\u00a0"}</span>
        </label>
        <label>
          Odometer (km)
          <input
            type="number"
            min="0"
            value={form.odometer}
            onChange={(e) => set({ odometer: e.target.value })}
            required
          />
          <span className="checkin-form__flag">{"\u00a0"}</span>
        </label>
        {showStatus ? (
          <LineSelect
            label="Payment status"
            value={form.status}
            onChange={(id) => set({ status: id })}
            options={STATUS_OPTIONS}
          />
        ) : null}
        <FileDrop
          compact
          label="Proof of payment"
          onChange={onProof}
          previews={form.proof_url ? [form.proof_url] : []}
        />
        <CheckinNoteField value={form.note} onChange={(note) => set({ note })} />
        {error ? <p className="fc-error">{error}</p> : null}
        <div className="fc-form__actions">
          <button className="fc-btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="fc-btn fc-btn--primary" type="submit" disabled={busy}>
            {busy ? "Submitting…" : editing ? "Save changes" : "Submit check-in"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CheckinFormModal;
