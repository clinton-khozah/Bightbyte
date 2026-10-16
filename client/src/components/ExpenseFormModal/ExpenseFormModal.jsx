import React from "react";
import Modal from "../Modal/Modal";
import FileDrop from "../FileDrop/FileDrop";
import LineSelect from "../LineSelect/LineSelect";
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

const FREQUENCY_OPTIONS = [
  { id: "once_off", label: "Once-off" },
  { id: "monthly", label: "Monthly (ongoing)" },
];

const STATUS_OPTIONS = [
  { id: "submitted", label: "Submitted" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

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
  showDate,
}) => {
  if (!open) return null;

  const set = (patch) => onChange({ ...form, ...patch });
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
      title={editing ? "Edit expense" : "Log expense"}
      subtitle="Once-off or monthly vehicle cost, with a slip if you have one."
      onClose={onClose}
    >
      <form className="fc-form expense-form" onSubmit={onSubmit}>
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
        <LineSelect
          label="Vehicle"
          required
          value={form.vehicle_id}
          onChange={(id) => set({ vehicle_id: id })}
          placeholder="Select a vehicle"
          emptyText="No vehicle assigned"
          options={fleet.map((row) => ({
            id: row.id,
            label: row.registration,
            sub: `${row.make || ""} ${row.model || ""}`.trim() +
              (row.assigned_driver_id === form.driver_id ? " · assigned" : ""),
            photo: row.photo_url || row.photos?.[0],
            name: row.registration,
          }))}
        />
        <LineSelect
          label="Expense name"
          required
          value={form.name}
          onChange={(id) => set({ name: id })}
          placeholder="Select a name"
          options={EXPENSE_NAMES.map((item) => ({ id: item.value, label: item.label }))}
        />
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
        {showDate ? (
          <label>
            Expense date
            <input
              type="datetime-local"
              value={form.expense_date || ""}
              max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
              onChange={(e) => set({ expense_date: e.target.value })}
            />
          </label>
        ) : null}
        <LineSelect
          label="Frequency"
          value={form.frequency}
          onChange={(id) => set({ frequency: id })}
          options={FREQUENCY_OPTIONS}
        />
        {showStatus ? (
          <LineSelect
            label="Status"
            value={form.status}
            onChange={(id) => set({ status: id })}
            options={STATUS_OPTIONS}
          />
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
