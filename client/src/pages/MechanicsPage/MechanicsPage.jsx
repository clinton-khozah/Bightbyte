import React, { useEffect, useState } from "react";
import { api } from "../../api";
import OpsPage from "../../components/OpsPage/OpsPage";
import DataTable from "../../components/DataTable/DataTable";
import Modal from "../../components/Modal/Modal";
import Avatar from "../../components/Avatar/Avatar";
import ActionIcons from "../../components/ActionIcons/ActionIcons";
import LineSelect from "../../components/LineSelect/LineSelect";
import OperatingHoursField from "../../components/OperatingHoursField/OperatingHoursField";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../constants/roles";
import { useOpsList } from "../../hooks/useOpsList";
import "./MechanicsPage.css";

const empty = {
  full_name: "",
  trade: "",
  phone: "",
  workshop: "",
  hours: "08:00–17:00",
  photo_url: "",
  company_id: "",
};

const MechanicsPage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManage = can(user, "mechanics", "edit");
  const canCreate = can(user, "mechanics", "create");
  const canDelete = can(user, "mechanics", "delete");

  const load = () => {
    setLoading(true);
    return Promise.all([
      api("/api/mechanics"),
      user?.role === "super_admin" ? api("/api/companies").catch(() => []) : Promise.resolve([]),
    ])
      .then(([list, companyRows]) => {
        setRows(list);
        setCompanies((companyRows || []).filter((row) => row.status !== "pending"));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const { query, setQuery, filtered } = useOpsList(rows, {
    searchKeys: ["full_name", "trade", "phone", "workshop"],
  });

  const openForm = (row) => {
    setError("");
    setEditing(row || null);
    setForm(
      row
        ? {
            full_name: row.full_name || "",
            trade: row.trade || "",
            phone: row.phone || "",
            workshop: row.workshop || "",
            hours: row.hours || "08:00–17:00",
            photo_url: row.photo_url || "",
            company_id: row.company_id || "",
          }
        : { ...empty, company_id: companies[0]?.id || "" },
    );
    setOpen(true);
  };

  return (
    <>
      <OpsPage
        crumb={["Operations", "Mechanics"]}
        title="Mechanics"
        subtitle="Call a mechanic when a vehicle has a problem."
        primaryLabel={canCreate ? "Add mechanic" : undefined}
        onPrimary={canCreate ? () => openForm() : undefined}
        stats={[
          { id: "all", label: "Mechanics", value: rows.length, tone: "blue", icon: "🔧" },
        ]}
      >
        {error ? <p className="fc-error">{error}</p> : null}
        <DataTable
          rows={filtered}
          loading={loading}
          columns={[
            {
              key: "full_name",
              label: "Mechanic",
              render: (r) => (
                <div className="fc-table__name-cell">
                  <Avatar src={r.photo_url} name={r.full_name} />
                  <span>{r.full_name}</span>
                </div>
              ),
            },
            { key: "trade", label: "Trade" },
            { key: "workshop", label: "Workshop" },
            { key: "hours", label: "Operating hours" },
            {
              key: "phone",
              label: "Phone",
              render: (r) =>
                r.phone ? (
                  <a href={`tel:${r.phone.replace(/\s/g, "")}`}>{r.phone}</a>
                ) : (
                  "—"
                ),
            },
            {
              key: "call",
              label: "Call",
              render: (r) =>
                r.phone ? (
                  <a className="fc-btn fc-btn--primary" href={`tel:${r.phone.replace(/\s/g, "")}`}>
                    Call
                  </a>
                ) : (
                  "—"
                ),
            },
            {
              key: "actions",
              label: "Actions",
              render: (r) =>
                <ActionIcons
                  onEdit={canManage ? () => openForm(r) : undefined}
                  onDelete={canDelete ? () => setPending(r) : undefined}
                />
            },
          ]}
          noun="mechanics"
          totalCount={rows.length}
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search mechanics..."
          emptyText="No mechanics have been logged yet."
        />
      </OpsPage>
      {open ? (
        <Modal
          title={editing ? "Edit mechanic" : "Add mechanic"}
          subtitle="These details are used when a vehicle breaks down."
          onClose={() => { setOpen(false); setEditing(null); }}
        >
          <form
            className="fc-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              try {
                if (editing) {
                  await api(`/api/mechanics/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
                } else {
                  await api("/api/mechanics", { method: "POST", body: JSON.stringify(form) });
                }
                setOpen(false);
                setEditing(null);
                setForm(empty);
                setSuccess(editing ? "Mechanic was updated." : "Mechanic was added.");
                load();
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            {user?.role === "super_admin" && !editing ? (
              <LineSelect
                label="Company"
                required
                value={form.company_id}
                onChange={(id) => setForm({ ...form, company_id: id })}
                placeholder="Select a company"
                emptyText="No companies"
                options={companies.map((c) => ({ id: c.id, label: c.name, sub: c.code || "" }))}
              />
            ) : null}
            <label>
              Name
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </label>
            <label>
              Trade
              <input value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} />
            </label>
            <label>
              Phone
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </label>
            <label>
              Workshop
              <input value={form.workshop} onChange={(e) => setForm({ ...form, workshop: e.target.value })} />
            </label>
            <OperatingHoursField
              value={form.hours}
              onChange={(hours) => setForm({ ...form, hours })}
            />
            {error ? <p className="fc-error">{error}</p> : null}
            <div className="fc-form__actions">
              <button className="fc-btn" type="button" onClick={() => { setOpen(false); setEditing(null); }}>
                Cancel
              </button>
              <button className="fc-btn fc-btn--primary" type="submit">
                {editing ? "Save changes" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      <ConfirmModal
        open={Boolean(pending)}
        title="Delete this mechanic?"
        message={`Remove ${pending?.full_name || "this mechanic"}? This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          await api(`/api/mechanics/${pending.id}`, { method: "DELETE" });
          setPending(null);
          setSuccess("Mechanic was deleted.");
          load();
        }}
      />
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
    </>
  );
};

export default MechanicsPage;
