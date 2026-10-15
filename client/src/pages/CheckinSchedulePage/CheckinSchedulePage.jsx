import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import OpsPage from "../../components/OpsPage/OpsPage";
import DataTable from "../../components/DataTable/DataTable";
import Avatar from "../../components/Avatar/Avatar";
import LineSelect from "../../components/LineSelect/LineSelect";
import ActionIcons from "../../components/ActionIcons/ActionIcons";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../constants/roles";
import "./CheckinSchedulePage.css";

const WEEKDAYS = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
];

const weekdayLabel = (id) => WEEKDAYS.find((day) => day.id === id)?.label || id || "—";

const empty = {
  driver_id: "",
  vehicle_id: "",
  due_weekday: "monday",
  due_time: "18:00",
  late_fee: 100,
  expected_amount: "",
  notify: true,
};

const CheckinSchedulePage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = () =>
    Promise.all([
      api("/api/checkin-schedules").catch(() => []),
      api("/api/users").catch(() => api("/api/drivers")).then((rows) => rows.filter((p) => p.role === "driver" || !p.role)),
      api("/api/vehicles").catch(() => []),
    ]).then(([schedules, people, fleet]) => {
      setRows(schedules);
      setDrivers(people);
      setVehicles(fleet);
    });

  useEffect(() => {
    load();
  }, []);

  const person = (id) => drivers.find((d) => d.id === id);
  const vehicle = (id) => vehicles.find((v) => v.id === id);

  const fillForm = (row) => ({
    driver_id: row.driver_id || "",
    vehicle_id: row.vehicle_id || "",
    due_weekday: row.due_weekday || "monday",
    due_time: row.due_time || "18:00",
    late_fee: row.late_fee ?? 100,
    expected_amount: row.expected_amount || "",
    notify: row.notify !== false,
  });

  const openEdit = (row) => {
    setEditing(row);
    setForm(fillForm(row));
    setError("");
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(empty);
    setError("");
  };

  return (
    <>
      <OpsPage
        crumb={["Operations", "Check-in schedule"]}
        title="Check-in schedule"
        subtitle="Set a weekday and time. Pending check-in, late fees, and reminders use that day."
      >
        <p style={{ margin: "0 0 16px" }}>
          <Link to="/checkins">← Check-in</Link>
        </p>
        <form
          className="fc-form schedule-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (!form.driver_id) {
              setError("Select a driver");
              return;
            }
            if (!form.due_weekday) {
              setError("Select a day of the week");
              return;
            }
            try {
              if (editing) {
                await api(`/api/checkin-schedules/${editing.id}`, {
                  method: "PATCH",
                  body: JSON.stringify(form),
                });
                setSuccess("Schedule was updated.");
              } else {
                await api("/api/checkin-schedules", { method: "POST", body: JSON.stringify(form) });
                setSuccess("Schedule saved. The driver will get a notification at the due time.");
              }
              setEditing(null);
              setForm(empty);
              load();
            } catch (err) {
              setError(err.message);
            }
          }}
        >
          <h2>{editing ? "Edit schedule" : "Create schedule"}</h2>
          <p>Set the day of the week, check-in time, and the extra amount if they miss it.</p>
          <div className="schedule-form__row">
            <LineSelect
              label="Driver"
              required
              value={form.driver_id}
              onChange={(id) => {
                const assigned = vehicles.find((v) => v.assigned_driver_id === id);
                setForm({ ...form, driver_id: id, vehicle_id: assigned?.id || "" });
              }}
              placeholder="Select a driver"
              emptyText="No drivers to select"
              options={drivers.map((d) => ({
                id: d.id,
                label: d.full_name,
                sub: d.employee_id || d.email || "",
                photo: d.photo_url,
                name: d.full_name,
              }))}
            />
            <LineSelect
              label="Vehicle"
              value={form.vehicle_id || "any"}
              onChange={(id) => setForm({ ...form, vehicle_id: id === "any" ? "" : id })}
              placeholder="Any assigned"
              emptyText="No vehicle assigned"
              options={[
                { id: "any", label: "Any assigned" },
                ...vehicles
                  .filter((v) => v.assigned_driver_id === form.driver_id)
                  .map((v) => ({
                    id: v.id,
                    label: v.registration,
                    sub: `${v.make || ""} ${v.model || ""}`.trim(),
                    photo: v.photo_url || v.photos?.[0],
                    name: v.registration,
                  })),
              ]}
            />
          </div>
          <div className="schedule-form__row">
            <LineSelect
              label="Day of the week"
              required
              value={form.due_weekday}
              onChange={(id) => setForm({ ...form, due_weekday: id })}
              placeholder="Select a day"
              options={WEEKDAYS.map((day) => ({ id: day.id, label: day.label }))}
            />
            <label>
              Due time
              <input type="time" value={form.due_time} onChange={(e) => setForm({ ...form, due_time: e.target.value })} required />
            </label>
          </div>
          <div className="schedule-form__row">
            <label>
              Late fee (ZAR)
              <input
                type="number"
                min="0"
                step="1"
                value={form.late_fee}
                onChange={(e) => setForm({ ...form, late_fee: e.target.value })}
                required
              />
            </label>
            <label>
              Expected amount (optional)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.expected_amount}
                onChange={(e) => setForm({ ...form, expected_amount: e.target.value })}
              />
            </label>
          </div>
          <LineSelect
            label="Notify driver"
            value={form.notify ? "yes" : "no"}
            onChange={(id) => setForm({ ...form, notify: id === "yes" })}
            options={[
              { id: "yes", label: "Yes, send a notification" },
              { id: "no", label: "No" },
            ]}
          />
          {error ? <p className="fc-error">{error}</p> : null}
          <div className="fc-form__actions">
            {editing ? (
              <button className="fc-btn" type="button" onClick={cancelEdit}>
                Cancel
              </button>
            ) : null}
            <button className="fc-btn fc-btn--primary" type="submit">
              {editing ? "Save changes" : "Save schedule"}
            </button>
          </div>
        </form>
        <DataTable
          rows={rows}
          noun="schedules"
          totalCount={rows.length}
          columns={[
            {
              key: "driver",
              label: "Driver",
              render: (r) => {
                const d = person(r.driver_id);
                return (
                  <div className="fc-table__name-cell">
                    <Avatar src={d?.photo_url} name={d?.full_name || "U"} />
                    <span>{d?.full_name || "—"}</span>
                  </div>
                );
              },
            },
            { key: "due_weekday", label: "Day", render: (r) => weekdayLabel(r.due_weekday) },
            { key: "due_time", label: "Due time" },
            { key: "late_fee", label: "Late fee", render: (r) => `R${Number(r.late_fee || 0)}` },
            {
              key: "vehicle",
              label: "Vehicle",
              render: (r) => vehicle(r.vehicle_id)?.registration || "—",
            },
            {
              key: "late_fee_now",
              label: "Now",
              render: (r) => (r.late_fee_now ? `Late +R${r.late_fee_now}` : "On time"),
            },
            { key: "notify", label: "Notify", render: (r) => (r.notify === false ? "No" : "Yes") },
            {
              key: "actions",
              label: "Actions",
              render: (r) => (
                <ActionIcons
                  onEdit={can(user, "checkins", "edit") ? () => openEdit(r) : undefined}
                  onDelete={can(user, "checkins", "delete") ? () => setPendingDelete(r) : undefined}
                />
              ),
            },
          ]}
        />
      </OpsPage>
      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Delete this schedule?"
        message={
          pendingDelete
            ? `This will remove the ${weekdayLabel(pendingDelete.due_weekday)} ${pendingDelete.due_time || ""} check-in for ${
                person(pendingDelete.driver_id)?.full_name || "this driver"
              }.`
            : ""
        }
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          await api(`/api/checkin-schedules/${pendingDelete.id}`, { method: "DELETE" });
          if (editing?.id === pendingDelete.id) cancelEdit();
          setPendingDelete(null);
          setSuccess("Schedule was deleted.");
          load();
        }}
      />
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
    </>
  );
};

export default CheckinSchedulePage;
