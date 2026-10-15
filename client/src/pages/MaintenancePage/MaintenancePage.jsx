import React, { useEffect, useState } from "react";
import { api, uploadFiles } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import OpsPage from "../../components/OpsPage/OpsPage";
import DataTable from "../../components/DataTable/DataTable";
import Modal from "../../components/Modal/Modal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import StatusChip from "../../components/StatusChip/StatusChip";
import ActionIcons from "../../components/ActionIcons/ActionIcons";
import Avatar from "../../components/Avatar/Avatar";
import FileDrop from "../../components/FileDrop/FileDrop";
import { csvDownload, useOpsList } from "../../hooks/useOpsList";
import "./MaintenancePage.css";

const emptyForm = {
  vehicle_id: "",
  title: "Service",
  interval_km: "10000",
  interval_months: "2",
  last_service_odometer: "",
  last_service_at: "",
};

const toDateInput = (iso) => (iso ? String(iso).slice(0, 10) : "");

const MaintenancePage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState(null);
  const [complete, setComplete] = useState(null);
  const [slips, setSlips] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(emptyForm);
  const canManage = user?.role === "admin" || user?.role === "fleet_manager";

  const vehicleFor = (id) => vehicles.find((v) => v.id === id);

  const load = () =>
    Promise.all([api("/api/maintenance"), api("/api/vehicles")]).then(([jobs, list]) => {
      setRows(jobs);
      setVehicles(list);
    });

  useEffect(() => {
    load();
  }, []);

  const onSlip = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;
    const { urls } = await uploadFiles(files);
    setSlips((current) => [...current, ...urls]);
  };

  const { query, setQuery, tab, setTab, filtered } = useOpsList(rows, {
    searchKeys: ["title", "status", "registration"],
    matchTab: (row, current) => {
      if (current === "due") return row.due || row.status === "due";
      return row.status === current;
    },
  });

  const columns = [
    {
      key: "vehicle",
      label: "Vehicle",
      render: (r) => {
        const vehicle = vehicleFor(r.vehicle_id);
        const src = vehicle?.photo_url || vehicle?.photos?.[0];
        return (
          <div className="fc-table__name-cell">
            <Avatar src={src} name={vehicle?.registration || "V"} />
            <span className="fc-table__id">{vehicle?.registration || "—"}</span>
          </div>
        );
      },
    },
    { key: "title", label: "Service" },
    {
      key: "odometer",
      label: "Odometer",
      render: (r) => `${Number(r.odometer || 0).toLocaleString()} km`,
    },
    {
      key: "next_due_km",
      label: "Due at km",
      render: (r) => `${Number(r.next_due_km || 0).toLocaleString()} km`,
    },
    {
      key: "next_due_date",
      label: "Due by date",
      render: (r) =>
        r.next_due_date
          ? new Date(r.next_due_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })
          : "—",
    },
    {
      key: "interval",
      label: "Interval",
      render: (r) => `Every ${Number(r.interval_months || 2)} mo / ${Number(r.interval_km || 10000).toLocaleString()} km`,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusChip value={r.due && r.status !== "completed" ? "due" : r.status} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <ActionIcons
          onView={
            r.status !== "completed"
              ? () => {
                  setComplete(r);
                  setSlips(r.slips || []);
                  setError("");
                }
              : undefined
          }
          onEdit={
            canManage
              ? () => {
                  setEditing(r);
                  setForm({
                    vehicle_id: r.vehicle_id,
                    title: r.title || "Service",
                    interval_km: String(r.interval_km || 10000),
                    interval_months: String(r.interval_months || 2),
                    last_service_odometer: String(r.last_service_odometer ?? ""),
                    last_service_at: toDateInput(r.last_service_at),
                  });
                  setOpen(true);
                }
              : r.status !== "completed"
                ? () => {
                    setComplete(r);
                    setSlips(r.slips || []);
                    setError("");
                  }
                : undefined
          }
          onDelete={canManage ? () => setPending(r) : undefined}
        />
      ),
    },
  ];

  return (
    <>
      <OpsPage
        crumb={["Operations", "Service"]}
        title="Maintenance and service"
        subtitle="Service is due every 2 months or every 10 000 km, whichever comes first. The driver is emailed and admins are notified."
        primaryLabel={canManage ? "Schedule service" : undefined}
        onPrimary={canManage ? () => { setEditing(null); setForm(emptyForm); setOpen(true); } : undefined}
        onExport={() => csvDownload("services.xlsx", columns, filtered)}
        stats={[
          { id: "all", label: "Total", value: rows.length, tone: "blue", icon: "🔧" },
          { id: "due", label: "Due now", value: rows.filter((r) => r.due && r.status !== "completed").length, tone: "red", icon: "!" },
          { id: "scheduled", label: "Scheduled", value: rows.filter((r) => r.status === "scheduled" && !r.due).length, tone: "amber", icon: "⏱" },
          { id: "completed", label: "Completed", value: rows.filter((r) => r.status === "completed").length, tone: "green", icon: "✓" },
        ]}
        activeStat={tab}
        onStat={setTab}
      >
        <DataTable
          rows={filtered}
          columns={columns}
          noun="services"
          totalCount={rows.length}
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search services..."
          tabs={[
            { id: "all", label: "All" },
            { id: "due", label: "Due" },
            { id: "scheduled", label: "Scheduled" },
            { id: "completed", label: "Completed" },
          ]}
          tab={tab}
          onTab={setTab}
          emptyText="No service schedules yet."
        />
      </OpsPage>
      {open ? (
        <Modal
          xl
          title={editing ? "Edit service" : "Schedule service"}
          subtitle="The next due date is calculated from last service odometer and date, using your km and month interval."
          onClose={() => { setOpen(false); setEditing(null); }}
        >
          <form
            className="fc-form checkin-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (editing) {
                await api(`/api/maintenance/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
              } else {
                await api("/api/maintenance", { method: "POST", body: JSON.stringify(form) });
              }
              setOpen(false);
              setEditing(null);
              setSuccess(editing ? "Service schedule was updated." : "Service schedule was saved. Due jobs notify the driver and company admins.");
              load();
            }}
          >
            <label>
              Vehicle
              <select
                value={form.vehicle_id}
                onChange={(e) => {
                  const id = e.target.value;
                  const vehicle = vehicles.find((v) => v.id === id);
                  setForm((f) => ({
                    ...f,
                    vehicle_id: id,
                    last_service_odometer: f.last_service_odometer || vehicle?.odometer || "",
                  }));
                }}
                required
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration} — {v.make} {v.model} ({Number(v.odometer || 0).toLocaleString()} km)
                  </option>
                ))}
              </select>
            </label>
            <label>
              Service name
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </label>
            <label>
              Every (km)
              <input
                type="number"
                value={form.interval_km}
                onChange={(e) => setForm({ ...form, interval_km: e.target.value })}
                required
              />
            </label>
            <label>
              Every (months)
              <input
                type="number"
                value={form.interval_months}
                onChange={(e) => setForm({ ...form, interval_months: e.target.value })}
                required
              />
            </label>
            <label>
              Last service odometer
              <input
                type="number"
                value={form.last_service_odometer}
                onChange={(e) => setForm({ ...form, last_service_odometer: e.target.value })}
              />
            </label>
            <label>
              Last service date
              <input
                type="date"
                value={form.last_service_at}
                onChange={(e) => setForm({ ...form, last_service_at: e.target.value })}
              />
            </label>
            <p className="fc-form__hint">
              Default is every 10 000 km or every 2 months, whichever comes first. Check-in odometer readings update this automatically.
            </p>
            <div className="fc-form__actions">
              <button className="fc-btn" type="button" onClick={() => { setOpen(false); setEditing(null); }}>
                Cancel
              </button>
              <button className="fc-btn fc-btn--primary" type="submit">
                {editing ? "Save changes" : "Save schedule"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      {complete ? (
        <Modal
          xl
          title="Mark service done"
          subtitle={`Upload the workshop slip for ${vehicleFor(complete.vehicle_id)?.registration || "this vehicle"}.`}
          onClose={() => setComplete(null)}
        >
          <form
            className="fc-form checkin-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              try {
                await api(`/api/maintenance/${complete.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({
                    status: "completed",
                    slips,
                    completed_odometer: complete.odometer,
                  }),
                });
                setComplete(null);
                setSlips([]);
                setSuccess("Service marked done. The next interval starts from this odometer and date.");
                load();
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            <p className="fc-form__hint">
              Due at {Number(complete.next_due_km || 0).toLocaleString()} km or{" "}
              {complete.next_due_date
                ? new Date(complete.next_due_date).toLocaleDateString("en-ZA")
                : "—"}
              . Current reading {Number(complete.odometer || 0).toLocaleString()} km.
            </p>
            <FileDrop label="Service slip / invoice" multiple onChange={onSlip} previews={slips} />
            {error ? <p className="fc-error">{error}</p> : null}
            <div className="fc-form__actions">
              <button className="fc-btn" type="button" onClick={() => setComplete(null)}>
                Cancel
              </button>
              <button className="fc-btn fc-btn--primary" type="submit">
                Mark done
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      <ConfirmModal
        open={Boolean(pending)}
        title="Delete this service?"
        message={`Remove ${pending?.title || "this service"} for ${vehicleFor(pending?.vehicle_id)?.registration || "the vehicle"}? This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          await api(`/api/maintenance/${pending.id}`, { method: "DELETE" });
          setPending(null);
          setSuccess("Service record was deleted.");
          load();
        }}
      />
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
    </>
  );
};

export default MaintenancePage;
