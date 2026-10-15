import React from "react";
import Modal from "../Modal/Modal";
import FileDrop from "../FileDrop/FileDrop";
import "./ExpenseFormModal.css";

export const EXPENSE_NAMES = [
  { value: "tracker", label: "Tracker" },
  { value: "insurance", label: "Insurance" },
  { value: "service", label: "Service" },
  { value: "fuel", label: "Fuel" },
  { value: "tolls", label: "Tolls" },
  { value: "parking", label: "Parking" },
  { value: "licence", label: "Licence" },
  { value: "other", label: "Other" },
];

export const expenseNameLabel = (value) =>
  EXPENSE_NAMES.find((item) => item.value === value)?.label || value || "—";

const ExpenseFormModal = ({
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
}) => {
  if (!open) return null;

  const set = (patch) => onChange({ ...form, ...patch });

  return (
    <Modal
      wide
      title={editing ? "Edit expense" : "Log expense"}
      subtitle="Once-off or monthly vehicle cost, with a slip if you have one."
      onClose={onClose}
    >
      <form className="fc-form expense-form" onSubmit={onSubmit}>
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
        <label>
          Vehicle
          <select value={form.vehicle_id} onChange={(e) => set({ vehicle_id: e.target.value })} required>
            <option value="">Select a vehicle</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration} — {v.make} {v.model}
                {v.assigned_driver_id === form.driver_id ? " (assigned)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Expense name
          <select value={form.name} onChange={(e) => set({ name: e.target.value })} required>
            <option value="">Select a name</option>
            {EXPENSE_NAMES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
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
        </label>
        <label>
          Frequency
          <select value={form.frequency} onChange={(e) => set({ frequency: e.target.value })}>
            <option value="once_off">Once-off</option>
            <option value="monthly">Monthly (ongoing)</option>
          </select>
        </label>
        {showStatus ? (
          <label>
            Status
            <select value={form.status} onChange={(e) => set({ status: e.target.value })}>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
        ) : null}
        <label className="fc-form__full">
          Note
          <input value={form.note} onChange={(e) => set({ note: e.target.value })} />
        </label>
        <FileDrop
          compact
          label="Proof"
          onChange={onProof}
          previews={form.proof_url ? [form.proof_url] : []}
        />
        {error ? <p className="fc-error">{error}</p> : null}
        <div className="fc-form__actions">
          <button className="fc-btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="fc-btn fc-btn--primary" type="submit">
            {editing ? "Save expense" : "Log expense"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ExpenseFormModal;
