import React from "react";
import Modal from "../Modal/Modal";
import FileDrop from "../FileDrop/FileDrop";
import "./CheckinFormModal.css";

const CheckinFormModal = ({
  open,
  editing,
  form,
  onChange,
  onDriverChange,
  onProof,
  onClose,
  onSubmit,
  error,
  drivers = [],
  vehicles = [],
  showDriver,
  showStatus,
  assignedLabel,
  assignedOk,
  lateFeeText,
}) => {
  if (!open) return null;

  const set = (patch) => onChange({ ...form, ...patch });

  return (
    <Modal
      wide
      title={editing ? "Edit check-in" : "Check in amount"}
      subtitle={
        editing
          ? "Update the cash, odometer and payment status."
          : "Cash received, odometer and a photo of the slip."
      }
      onClose={onClose}
    >
      <form className="fc-form checkin-form" onSubmit={onSubmit}>
        {showDriver ? (
          <label>
            Driver
            <select value={form.driver_id} onChange={(e) => onDriverChange(e.target.value)} required>
              <option value="">Select a driver</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className={showDriver ? "" : "fc-form__full"}>
          Vehicle
          <select
            value={form.vehicle_id}
            onChange={(e) => set({ vehicle_id: e.target.value })}
            required
          >
            <option value="">Select a vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration} — {v.make} {v.model}
                {v.assigned_driver_id === form.driver_id ? " (assigned)" : ""}
              </option>
            ))}
          </select>
          {assignedLabel ? (
            <span className={`checkin-form__flag${assignedOk ? " is-ok" : " is-warn"}`}>{assignedLabel}</span>
          ) : null}
        </label>
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
          {lateFeeText ? <span className="checkin-form__flag is-warn">{lateFeeText}</span> : null}
        </label>
        <label>
          Odometer (km)
          <input
            type="number"
            min="0"
            value={form.odometer}
            onChange={(e) => set({ odometer: e.target.value })}
          />
        </label>
        {showStatus ? (
          <label>
            Payment status
            <select value={form.status} onChange={(e) => set({ status: e.target.value })}>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        ) : null}
        <label className={showStatus ? "" : "fc-form__full"}>
          Note
          <input
            value={form.note}
            onChange={(e) => set({ note: e.target.value })}
            placeholder="Optional"
          />
        </label>
        <FileDrop
          compact
          label="Proof of payment"
          onChange={onProof}
          previews={form.proof_url ? [form.proof_url] : []}
        />
        {error ? <p className="fc-error">{error}</p> : null}
        <div className="fc-form__actions">
          <button className="fc-btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="fc-btn fc-btn--primary" type="submit">
            {editing ? "Save changes" : "Submit check-in"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CheckinFormModal;
