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
import "./IncidentsPage.css";

const localDateTime = (value) => {
  const date = value ? new Date(value) : new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const emptyForm = (userId) => ({
  kind: "incident",
  logged_by: userId || "",
  vehicle_id: "",
  title: "",
  severity: "medium",
  description: "",
  occurred_at: localDateTime(),
  photos: [],
});

const statusLabel = (status) => {
  if (status === "open") return "pending";
  if (status === "review") return "under review";
  return status || "pending";
};

const IncidentsPage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [people, setPeople] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(emptyForm(user?.id));
  const canManage = user?.role === "admin" || user?.role === "fleet_manager";

  const vehicleFor = (id) => vehicles.find((v) => v.id === id);
  const personFor = (id) => people.find((p) => p.id === id);

  const load = () =>
    Promise.all([
      api("/api/incidents"),
      api("/api/vehicles"),
      api("/api/users").catch(() => api("/api/drivers")),
    ]).then(([incidents, list, users = []]) => {
      setRows(incidents);
      setVehicles(list);
      setPeople(users);
    });

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (user?.id) setForm((f) => ({ ...f, logged_by: f.logged_by || user.id }));
  }, [user?.id]);

  const openForm = (row) => {
    setError("");
    if (row) {
      setEditing(row);
      setForm({
        kind: row.kind || "incident",
        logged_by: row.logged_by || row.driver_id || "",
        vehicle_id: row.vehicle_id || "",
        title: row.title || "",
        severity: row.severity || "medium",
        description: row.description || "",
        occurred_at: localDateTime(row.occurred_at || row.created_at),
        photos: row.photos || [],
        status: row.status || "open",
      });
    } else {
      setEditing(null);
      setForm(emptyForm(user?.id));
    }
    setOpen(true);
  };

  const onPhoto = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;
    const { urls } = await uploadFiles(files);
    setForm((f) => ({ ...f, photos: [...(f.photos || []), ...urls] }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const payload = {
        ...form,
        occurred_at: form.occurred_at ? new Date(form.occurred_at).toISOString() : new Date().toISOString(),
      };
      if (editing) {
        await api(`/api/incidents/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setSuccess(form.kind === "claim" ? "Claim was updated." : "Incident was updated.");
      } else {
        await api("/api/incidents", { method: "POST", body: JSON.stringify(payload) });
        setSuccess(form.kind === "claim" ? "Claim was logged." : "Incident was logged.");
      }
      setOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const { query, setQuery, tab, setTab, filtered } = useOpsList(rows, {
    searchKeys: ["title", "description", "kind", "severity", "status"],
  });

  const columns = [
    {
      key: "logged_by",
      label: "Logged by",
      render: (r) => {
        const person = personFor(r.logged_by || r.driver_id);
        return (
          <div className="fc-table__name-cell">
            <Avatar src={person?.photo_url} name={person?.full_name || "U"} />
            <span>{person?.full_name || "—"}</span>
          </div>
        );
      },
    },
    {
      key: "occurred_at",
      label: "When",
      render: (r) => new Date(r.occurred_at || r.created_at).toLocaleString("en-ZA"),
    },
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
    { key: "kind", label: "Record", render: (r) => <StatusChip value={r.kind || "incident"} /> },
    { key: "title", label: "Title" },
    { key: "description", label: "Notes" },
    { key: "severity", label: "Priority", render: (r) => <StatusChip value={r.severity} /> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={statusLabel(r.status)} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <ActionIcons
          onView={() => setViewing(r)}
          onEdit={canManage ? () => openForm(r) : undefined}
          onDelete={canManage ? () => setPending(r) : undefined}
        />
      ),
    },
  ];

  const viewedVehicle = viewing ? vehicleFor(viewing.vehicle_id) : null;
  const viewedPerson = viewing ? personFor(viewing.logged_by || viewing.driver_id) : null;

  return (
    <>
      <OpsPage
        crumb={["Operations", "Incidents"]}
        title="Incidents & Claims"
        subtitle="Log an incident or an insurance claim against a vehicle."
        primaryLabel="Log incident or claim"
        onPrimary={() => openForm()}
        onExport={() => csvDownload("incidents.xlsx", columns, filtered)}
        stats={[
          { id: "all", label: "Total", value: rows.length, tone: "blue", icon: "⚠" },
          { id: "open", label: "Pending", value: rows.filter((r) => r.status === "open").length, tone: "red", icon: "⏱" },
          { id: "review", label: "Under Review", value: rows.filter((r) => r.status === "review").length, tone: "amber", icon: "◐" },
          { id: "closed", label: "Closed", value: rows.filter((r) => r.status === "closed").length, tone: "green", icon: "✓" },
        ]}
        activeStat={tab}
        onStat={setTab}
      >
        <DataTable
          rows={filtered}
          columns={columns}
          noun="records"
          totalCount={rows.length}
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search incidents and claims..."
          tabs={[
            { id: "all", label: "All" },
            { id: "open", label: "Pending" },
            { id: "review", label: "Under Review" },
            { id: "closed", label: "Closed" },
          ]}
          tab={tab}
          onTab={setTab}
          emptyText="No incidents or claims have been logged yet."
        />
      </OpsPage>
      {open ? (
        <Modal
          wide
          title={editing ? "Edit incident or claim" : "Log incident or claim"}
          subtitle="Record who logged it, which vehicle, when it happened, and the notes."
          onClose={() => { setOpen(false); setEditing(null); }}
        >
          <form className="fc-form" onSubmit={submit}>
            <label>
              Record type
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="incident">Incident</option>
                <option value="claim">Claim</option>
              </select>
            </label>
            {user?.role !== "driver" ? (
              <label>
                Logged by
                <select
                  value={form.logged_by}
                  onChange={(e) => setForm({ ...form, logged_by: e.target.value })}
                  required
                >
                  <option value="">Select a person</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label>
              Vehicle
              <select
                value={form.vehicle_id}
                onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                required
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration} — {v.make} {v.model}
                  </option>
                ))}
              </select>
            </label>
            <label>
              When
              <input
                type="datetime-local"
                value={form.occurred_at}
                onChange={(e) => setForm({ ...form, occurred_at: e.target.value })}
                required
              />
            </label>
            <label>
              Title
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </label>
            <label>
              Priority
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            {editing ? (
              <label>
                Status
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="open">Pending</option>
                  <option value="review">Under review</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
            ) : null}
            <label className="fc-form__full">
              Notes
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <FileDrop
              label="Photos or documents"
              multiple
              onChange={onPhoto}
              previews={form.photos || []}
            />
            {error ? <p className="fc-error">{error}</p> : null}
            <div className="fc-form__actions">
              <button className="fc-btn" type="button" onClick={() => { setOpen(false); setEditing(null); }}>
                Cancel
              </button>
              <button className="fc-btn fc-btn--primary" type="submit">
                {editing ? "Save changes" : `Save ${form.kind === "claim" ? "claim" : "incident"}`}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      {viewing ? (
        <Modal
          wide
          title={viewing.title || "Record"}
          subtitle={`${(viewing.kind || "incident").replace(/^./, (c) => c.toUpperCase())} logged against this vehicle.`}
          onClose={() => setViewing(null)}
        >
          <div className="incident-view">
            <div className="incident-view__people">
              <div>
                <Avatar
                  src={viewedVehicle?.photo_url || viewedVehicle?.photos?.[0]}
                  name={viewedVehicle?.registration || "V"}
                  size="lg"
                />
                <span>{viewedVehicle?.registration || "—"}</span>
              </div>
              <div>
                <Avatar src={viewedPerson?.photo_url} name={viewedPerson?.full_name || "U"} size="lg" />
                <span>{viewedPerson?.full_name || "—"}</span>
              </div>
            </div>
            <dl className="incident-view__facts">
              <div>
                <dt>Logged by</dt>
                <dd>{viewedPerson?.full_name || "—"}</dd>
              </div>
              <div>
                <dt>When</dt>
                <dd>{new Date(viewing.occurred_at || viewing.created_at).toLocaleString("en-ZA")}</dd>
              </div>
              <div>
                <dt>Vehicle</dt>
                <dd>
                  {viewedVehicle
                    ? `${viewedVehicle.registration} — ${viewedVehicle.make} ${viewedVehicle.model}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Record</dt>
                <dd>
                  <StatusChip value={viewing.kind || "incident"} />
                </dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>
                  <StatusChip value={viewing.severity} />
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusChip value={statusLabel(viewing.status)} />
                </dd>
              </div>
            </dl>
            <p className="incident-view__notes">{viewing.description || "No notes."}</p>
            {(viewing.photos || []).length ? (
              <div className="incident-view__photos">
                {viewing.photos.map((src) => (
                  <img key={src} src={src} alt="" />
                ))}
              </div>
            ) : null}
            <div className="fc-form__actions">
              <button className="fc-btn fc-btn--primary" type="button" onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
      <ConfirmModal
        open={Boolean(pending)}
        title="Delete this record?"
        message={`Remove ${pending?.title || "this record"}? This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          await api(`/api/incidents/${pending.id}`, { method: "DELETE" });
          setPending(null);
          setSuccess("Record was deleted.");
          load();
        }}
      />
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
    </>
  );
};

export default IncidentsPage;
