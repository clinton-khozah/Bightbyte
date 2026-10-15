import React, { useEffect, useState } from "react";
import { api, uploadFiles } from "../../api";
import OpsPage from "../../components/OpsPage/OpsPage";
import DataTable from "../../components/DataTable/DataTable";
import Modal from "../../components/Modal/Modal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import ActionIcons from "../../components/ActionIcons/ActionIcons";
import StatusChip from "../../components/StatusChip/StatusChip";
import Avatar from "../../components/Avatar/Avatar";
import PhotoUploadField from "../../components/PhotoUploadField/PhotoUploadField";
import { csvDownload, useOpsList } from "../../hooks/useOpsList";
import "./CompaniesPage.css";

const emptyForm = {
  name: "",
  code: "",
  city: "",
  contact_email: "",
  photo_url: "",
  status: "active",
};

const CompaniesPage = () => {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [pending, setPending] = useState(null);
  const [success, setSuccess] = useState("");

  const load = () => api("/api/companies").then(setRows);
  useEffect(() => {
    load();
  }, []);

  const { query, setQuery, tab, setTab, filtered } = useOpsList(rows, {
    tabKey: "status",
    searchKeys: ["name", "code", "city", "contact_email"],
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || "",
      code: row.code || "",
      city: row.city || "",
      contact_email: row.contact_email || "",
      photo_url: row.photo_url || "",
      status: row.status || "active",
    });
    setOpen(true);
  };

  const columns = [
    { key: "code", label: "Code", render: (r) => <span className="fc-table__id">{r.code}</span> },
    {
      key: "name",
      label: "Company",
      render: (r) => (
        <div className="fc-table__name-cell">
          <Avatar src={r.photo_url} name={r.name} />
          <span>{r.name}</span>
        </div>
      ),
    },
    { key: "city", label: "City" },
    { key: "contact_email", label: "Contact" },
    { key: "user_count", label: "Users" },
    { key: "vehicle_count", label: "Vehicles" },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status || "active"} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <ActionIcons onEdit={() => openEdit(r)} onDelete={() => setPending(r)} />
      ),
    },
  ];

  return (
    <>
      <OpsPage
        crumb={["Administration", "Companies"]}
        title="Companies"
        subtitle="Tenants that users and vehicles belong to."
        primaryLabel="Add company"
        onPrimary={openCreate}
        onExport={() => csvDownload("companies.csv", columns, filtered)}
        stats={[
          { id: "all", label: "Companies", value: rows.length, tone: "blue", icon: "▣" },
          { id: "active", label: "Active", value: rows.filter((r) => r.status === "active").length, tone: "green", icon: "✓" },
          { id: "users", label: "Users", value: rows.reduce((sum, r) => sum + Number(r.user_count || 0), 0), tone: "blue", icon: "👤" },
          { id: "fleet", label: "Vehicles", value: rows.reduce((sum, r) => sum + Number(r.vehicle_count || 0), 0), tone: "amber", icon: "🚚" },
        ]}
        activeStat={tab}
        onStat={(id) => setTab(id === "active" ? "active" : "all")}
      >
        <DataTable
          rows={filtered}
          columns={columns}
          noun="companies"
          totalCount={rows.length}
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search companies..."
          tabs={[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
          ]}
          tab={tab}
          onTab={setTab}
          emptyText="No companies found."
        />
      </OpsPage>
      {open ? (
        <Modal
          title={editing ? "Edit company" : "Add company"}
          subtitle="Users onboarded to this company will inherit its fleet records."
          onClose={() => setOpen(false)}
        >
          <form
            className="fc-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (editing) {
                await api(`/api/companies/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
                setSuccess("Company was updated.");
              } else {
                await api("/api/companies", { method: "POST", body: JSON.stringify(form) });
                setSuccess("Company was created.");
              }
              setOpen(false);
              load();
            }}
          >
            <PhotoUploadField
              src={form.photo_url}
              name={form.name || "Company"}
              label="Change photo"
              onChange={async (ev) => {
                if (!ev.target.files?.length) return;
                const { urls } = await uploadFiles(ev.target.files);
                setForm((f) => ({ ...f, photo_url: urls[0] }));
              }}
            />
            <label>
              Company name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              Code
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="APX" />
            </label>
            <label>
              City
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </label>
            <label>
              Contact email
              <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
            <div className="fc-form__actions">
              <button className="fc-btn" type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="fc-btn fc-btn--primary" type="submit">
                {editing ? "Save changes" : "Create company"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      <ConfirmModal
        open={Boolean(pending)}
        title="Delete this company?"
        message={pending ? `${pending.name} will be removed from the tenant list.` : ""}
        confirmLabel="Delete"
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          await api(`/api/companies/${pending.id}`, { method: "DELETE" });
          setPending(null);
          setSuccess("Company was deleted.");
          load();
        }}
      />
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
    </>
  );
};

export default CompaniesPage;
