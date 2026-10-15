import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import OpsPage from "../../components/OpsPage/OpsPage";
import DataTable from "../../components/DataTable/DataTable";
import Avatar from "../../components/Avatar/Avatar";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import "./CheckinSchedulePage.css";

const empty = {
  driver_id: "",
  vehicle_id: "",
  due_time: "18:00",
  late_fee: 100,
  expected_amount: "",
  notify: true,
};

const CheckinSchedulePage = () => {
  const [rows, setRows] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(empty);
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

  return (
    <>
      <OpsPage
        crumb={["Operations", "Check-in schedule"]}
        title="Check-in schedule"
        subtitle="Drivers are notified at this time. After it, the check-in amount increases by the late fee."
      >
        <p style={{ margin: "0 0 16px" }}>
          <Link to="/checkins">← Check-in</Link>
        </p>
        <form
          className="fc-form schedule-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            try {
              await api("/api/checkin-schedules", { method: "POST", body: JSON.stringify(form) });
              setForm(empty);
              setSuccess("Schedule saved. The driver will get a notification at the due time.");
              load();
            } catch (err) {
              setError(err.message);
            }
          }}
        >
          <h2>Create schedule</h2>
          <p>Set the daily check-in time and the extra amount if they miss it.</p>
          <div className="schedule-form__row">
            <label>
              Driver
              <select value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} required>
                <option value="">Select a driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Vehicle
              <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
                <option value="">Any assigned</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="schedule-form__row">
            <label>
              Due time
              <input type="time" value={form.due_time} onChange={(e) => setForm({ ...form, due_time: e.target.value })} required />
            </label>
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
          </div>
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
          <label>
            Notify driver
            <select
              value={form.notify ? "yes" : "no"}
              onChange={(e) => setForm({ ...form, notify: e.target.value === "yes" })}
            >
              <option value="yes">Yes, send a notification</option>
              <option value="no">No</option>
            </select>
          </label>
          {error ? <p className="fc-error">{error}</p> : null}
          <div className="fc-form__actions">
            <button className="fc-btn fc-btn--primary" type="submit">
              Save schedule
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
          ]}
        />
      </OpsPage>
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
    </>
  );
};

export default CheckinSchedulePage;
