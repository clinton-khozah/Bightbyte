import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../constants/roles";
import OpsPage from "../../components/OpsPage/OpsPage";
import DataTable from "../../components/DataTable/DataTable";
import Modal from "../../components/Modal/Modal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import StatusChip from "../../components/StatusChip/StatusChip";
import ActionIcons from "../../components/ActionIcons/ActionIcons";
import Avatar from "../../components/Avatar/Avatar";
import ServiceCompleteModal from "../../components/ServiceCompleteModal/ServiceCompleteModal";
import { csvDownload, useOpsList } from "../../hooks/useOpsList";
import "./MaintenancePage.css";

const emptyForm = {
  vehicle_id: "",
  title: "Service",
  interval_km: "10000",
  interval_months: "2",
  last_service_odometer: "",
  last_service_at: "",
  due_date: "",
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(emptyForm);
  const isDriver = user?.role === "driver";
  const canManage = !isDriver && can(user, "maintenance", "edit");
  const canDelete = !isDriver && can(user, "maintenance", "delete");

  const vehicleFor = (id) => vehicles.find((v) => v.id === id);

  const load = () =>
    Promise.all([api("/api/maintenance"), api("/api/vehicles")])
      .then(([jobs, list]) => {
        setRows(jobs);
        setVehicles(list);
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, [user?.id]);

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
            <span className="fc-table__id">{vehicle?.registration || r.registration || "—"}</span>
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
            <div className="service-actions">
              {canManage && r.status !== "completed" ? (
                <button
                  type="button"
                  className="fc-btn fc-btn--primary"
                  onClick={() => {
                    setComplete(r);
                    setError("");
                  }}
                >
                  Load service
                </button>
              ) : null}
              <ActionIcons
                onView={() => {
                  setComplete(r);
                  setError("");
                }}
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
                          due_date: toDateInput(r.due_date || r.next_due_date),
                        });
                        setOpen(true);
                      }
                    : undefined
                }
                onDelete={canDelete && r.status === "completed" ? () => setPending(r) : undefined}
              />
            </div>
          ),
    },
  ];

  return (
    <>
      <OpsPage
        crumb={["Operations", "Service"]}
        title="Maintenance and service"
        subtitle="Every vehicle is scheduled automatically: service is due every 2 months or every 10 000 km, whichever comes first. Check-in odometer readings keep the next due point current. The driver is emailed and admins are notified."
        onExport={isDriver ? undefined : () => csvDownload("services.xlsx", columns, filtered)}
        stats={[
          { id: "all", label: "Total", value: rows.length, tone: "blue", icon: "🔧" },
          { id: "due", label: "Due now", value: rows.filter((r) => r.due && r.status !== "completed").length, tone: "red", icon: "!" },
          { id: "scheduled", label: "Scheduled", value: rows.filter((r) => r.status === "scheduled" && !r.due).length, tone: "amber", icon: "⏱" },
          { id: "completed", label: "Completed", value: rows.filter((r) => r.status === "completed").length, tone: "green", icon: "✓" },
        ]}
        activeStat={tab}
        onStat={setTab}
      >
        {error ? <p className="fc-error">{error}</p> : null}
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
          emptyText="Service is scheduled automatically when a vehicle is added."
        />
      </OpsPage>
      {open && editing ? (
        <Modal
          xl
          title="Edit service interval"
          subtitle="The next due date is calculated from last service odometer and date. Defaults stay 10 000 km or 2 months, whichever comes first."
          onClose={() => { setOpen(false); setEditing(null); }}
        >
          <form
            className="fc-form checkin-form"
            onSubmit={async (event) => {
              event.preventDefault();
              await api(`/api/maintenance/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
              setOpen(false);
              setEditing(null);
              setSuccess("Service interval was updated. The next due point is recalculated automatically.");
              load();
            }}
          >
            <label>
              Vehicle
              <input
                value={
                  vehicleFor(form.vehicle_id)
                    ? `${vehicleFor(form.vehicle_id).registration} — ${vehicleFor(form.vehicle_id).make} ${vehicleFor(form.vehicle_id).model}`
                    : "—"
                }
                readOnly
              />
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
            <label>
              Due date
              <input
                type="date"
                value={form.due_date || ""}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                required
              />
            </label>
            <p className="fc-form__hint">
              Set the due date directly, or leave the km and month intervals to calculate the next point. Check-in odometer readings still move a job to due when the km limit is reached.
            </p>
            <div className="fc-form__actions">
              <button className="fc-btn" type="button" onClick={() => { setOpen(false); setEditing(null); }}>
                Cancel
              </button>
              <button className="fc-btn fc-btn--primary" type="submit">
                Save changes
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      {complete ? (
        <ServiceCompleteModal
          job={complete}
          vehicle={vehicleFor(complete.vehicle_id)}
          canComplete={canManage && complete.status !== "completed"}
          onClose={() => setComplete(null)}
          onSave={async ({ slips, odometer, complete: markDone }) => {
            await api(`/api/maintenance/${complete.id}`, {
              method: "PATCH",
              body: JSON.stringify(
                markDone
                  ? { status: "completed", slips, completed_odometer: odometer }
                  : { slips },
              ),
            });
            setComplete(null);
            setSuccess(
              markDone
                ? "Service marked done. The next due point is 10 000 km or 2 months from this reading, whichever comes first."
                : "Service documents were saved.",
            );
            load();
          }}
        />
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
