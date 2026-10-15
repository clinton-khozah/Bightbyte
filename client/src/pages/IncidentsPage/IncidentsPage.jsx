import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, uploadFiles } from "../../api";
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
import FileDrop from "../../components/FileDrop/FileDrop";
import LineSelect from "../../components/LineSelect/LineSelect";
import { csvDownload, useOpsList } from "../../hooks/useOpsList";
import "./IncidentsPage.css";

const localDateTime = (value) => {
  const date = value ? new Date(value) : new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const money = (n) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(n || 0));

const emptyForm = (userId) => ({
  kind: "incident",
  logged_by: userId || "",
  vehicle_id: "",
  title: "",
  amount: "",
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [people, setPeople] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(emptyForm(user?.id));
  const canManage = can(user, "incidents", "edit");
  const canCreate = can(user, "incidents", "create");
  const canDelete = can(user, "incidents", "delete");

  const vehicleFor = (id) => vehicles.find((v) => v.id === id);
  const personFor = (id) => people.find((p) => p.id === id);

  const load = () =>
    Promise.all([
      api("/api/incidents"),
      api("/api/vehicles"),
      api("/api/users").catch(() => api("/api/drivers")),
    ]).then(([incidents, list, users = []]) => {
      setRows(
        user?.role === "driver"
          ? incidents.filter((row) => row.driver_id === user.id || row.logged_by === user.id)
          : incidents,
      );
      setVehicles(list);
      setPeople(user?.role === "driver" ? users.filter((row) => row.id === user.id) : users);
    });

  useEffect(() => {
    load();
  }, [user?.role, user?.id]);

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
        amount: row.amount ?? "",
        severity: row.severity || "medium",
        description: row.description || "",
        occurred_at: localDateTime(row.occurred_at || row.created_at),
        photos: row.photos || [],
        status: row.status || "open",
      });
    } else {
      setEditing(null);
      const assigned =
        user?.role === "driver"
          ? vehicles.find((row) => row.assigned_driver_id === user.id)?.id || ""
          : "";
      setForm({ ...emptyForm(user?.id), vehicle_id: assigned });
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
    searchKeys: ["title", "description", "kind", "severity", "status", "amount"],
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
    { key: "amount", label: "Amount", render: (r) => money(r.amount) },
    { key: "description", label: "Notes" },
    { key: "severity", label: "Priority", render: (r) => <StatusChip value={r.severity} /> },
    { key: "status", label: "Status", render: (r) => <StatusChip value={statusLabel(r.status)} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <ActionIcons
          onView={() => navigate(`/incidents/${r.id}`)}
          onEdit={canManage ? () => openForm(r) : undefined}
          onDelete={canDelete ? () => setPending(r) : undefined}
        />
      ),
    },
  ];

  return (
    <div className="incidents-page">
      <OpsPage
        crumb={["Operations", "Incidents"]}
        title="Incidents & Claims"
        subtitle="Log an incident or an insurance claim against a vehicle."
        primaryLabel={canCreate ? "Log incident or claim" : undefined}
        onPrimary={canCreate ? () => openForm() : undefined}
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
          compact
          title={editing ? "Edit incident or claim" : "Log incident or claim"}
          subtitle="Record who logged it, which vehicle, when it happened, and the notes."
          onClose={() => { setOpen(false); setEditing(null); }}
        >
          <form className="fc-form" onSubmit={submit}>
            <LineSelect
              label="Record type"
              value={form.kind}
              onChange={(id) => setForm({ ...form, kind: id })}
              options={[
                { id: "incident", label: "Incident" },
                { id: "claim", label: "Claim" },
              ]}
            />
            {user?.role !== "driver" ? (
              <LineSelect
                label="Logged by"
                required
                value={form.logged_by}
                onChange={(id) => {
                  const assigned = vehicles.find((row) => row.assigned_driver_id === id);
                  setForm({ ...form, logged_by: id, vehicle_id: assigned?.id || "" });
                }}
                placeholder="Select a person"
                emptyText="No people to select"
                options={people.map((p) => ({
                  id: p.id,
                  label: p.full_name,
                  sub: p.employee_id || p.email || "",
                  photo: p.photo_url,
                  name: p.full_name,
                }))}
              />
            ) : null}
            <LineSelect
              label="Vehicle"
              required
              value={form.vehicle_id}
              onChange={(id) => setForm({ ...form, vehicle_id: id })}
              placeholder="Select a vehicle"
              emptyText="No vehicle assigned"
              options={vehicles
                .filter(
                  (v) =>
                    v.assigned_driver_id === form.logged_by ||
                    people.find((p) => p.id === form.logged_by)?.assigned_vehicle_id === v.id,
                )
                .map((v) => ({
                  id: v.id,
                  label: v.registration,
                  sub: `${v.make || ""} ${v.model || ""}`.trim(),
                  photo: v.photo_url || v.photos?.[0],
                  name: v.registration,
                }))}
            />
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
              Amount (ZAR)
              <input
                type="number"
                lang="en"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </label>
            <LineSelect
              label="Priority"
              value={form.severity}
              onChange={(id) => setForm({ ...form, severity: id })}
              options={[
                { id: "low", label: "Low" },
                { id: "medium", label: "Medium" },
                { id: "high", label: "High" },
              ]}
            />
            {editing ? (
              <LineSelect
                label="Status"
                value={form.status || "open"}
                onChange={(id) => setForm({ ...form, status: id })}
                options={[
                  { id: "open", label: "Pending" },
                  { id: "review", label: "Under review" },
                  { id: "closed", label: "Closed" },
                ]}
              />
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
    </div>
  );
};

export default IncidentsPage;
