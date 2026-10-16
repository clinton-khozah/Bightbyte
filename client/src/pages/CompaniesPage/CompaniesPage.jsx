import React, { useEffect, useState } from "react";
import { api } from "../../api";
import OpsPage from "../../components/OpsPage/OpsPage";
import DataTable from "../../components/DataTable/DataTable";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import CompanyFormModal from "../../components/CompanyFormModal/CompanyFormModal";
import ActionIcons from "../../components/ActionIcons/ActionIcons";
import StatusChip from "../../components/StatusChip/StatusChip";
import Avatar from "../../components/Avatar/Avatar";
import { csvDownload, useOpsList } from "../../hooks/useOpsList";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../constants/roles";
import "./CompaniesPage.css";

const emptyForm = {
  name: "",
  code: "",
  city: "",
  address: "",
  contact_email: "",
  photo_url: "",
  status: "active",
};

const CompaniesPage = () => {
  const { user } = useAuth();
  const isSuper = user?.role === "super_admin";
  const canCreate = can(user, "companies", "create");
  const canEdit = can(user, "companies", "edit");
  const canDelete = can(user, "companies", "delete");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [pending, setPending] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [success, setSuccess] = useState("");

  const load = () => {
    setLoading(true);
    return api("/api/companies")
      .then(setRows)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const { query, setQuery, tab, setTab, filtered } = useOpsList(rows, {
    tabKey: "status",
    searchKeys: ["name", "code", "city", "address", "contact_email"],
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
      address: row.address || "",
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
      wrap: true,
      render: (r) => (
        <div className="fc-table__name-cell">
          <Avatar src={r.photo_url} name={r.name} />
          <span>{r.name}</span>
        </div>
      ),
    },
    { key: "city", label: "City", render: (r) => r.city || "—" },
    { key: "address", label: "Address", wrap: true, render: (r) => r.address || "—" },
    { key: "contact_email", label: "Contact", wrap: true, render: (r) => r.contact_email || "—" },
    { key: "user_count", label: "Users" },
    { key: "vehicle_count", label: "Vehicles" },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status || "active"} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="companies-page__actions">
          {isSuper && r.status === "pending" ? (
            <button
              className="fc-btn fc-btn--primary"
              type="button"
              onClick={() => setApproveTarget(r)}
            >
              Approve
            </button>
          ) : null}
          <ActionIcons
            onEdit={canEdit ? () => openEdit(r) : undefined}
            onDelete={canDelete ? () => setPending(r) : undefined}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <OpsPage
        crumb={["Administration", "Companies"]}
        title="Companies"
        subtitle="Workspaces that registered. Approve a pending company before its staff can sign in."
        primaryLabel={canCreate ? "Add company" : undefined}
        onPrimary={canCreate ? openCreate : undefined}
        onExport={() => csvDownload("companies.csv", columns, filtered)}
        stats={[
          { id: "all", label: "Companies", value: rows.length, tone: "blue", icon: "▣" },
          { id: "active", label: "Active", value: rows.filter((r) => r.status === "active").length, tone: "green", icon: "✓" },
          { id: "pending", label: "Pending", value: rows.filter((r) => r.status === "pending").length, tone: "amber", icon: "⏱" },
          { id: "users", label: "Users", value: rows.reduce((sum, r) => sum + Number(r.user_count || 0), 0), tone: "blue", icon: "👤" },
          { id: "fleet", label: "Vehicles", value: rows.reduce((sum, r) => sum + Number(r.vehicle_count || 0), 0), tone: "amber", icon: "🚚" },
        ]}
        activeStat={tab}
        onStat={(id) => setTab(id === "all" ? "all" : id)}
      >
        <DataTable
          rows={filtered}
          loading={loading}
          columns={columns}
          noun="companies"
          totalCount={rows.length}
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search companies..."
          tabs={[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "pending", label: "Pending" },
          ]}
          tab={tab}
          onTab={setTab}
          emptyText="No companies found."
        />
      </OpsPage>
      <CompanyFormModal
        open={open}
        editing={editing}
        form={form}
        onChange={setForm}
        onClose={() => setOpen(false)}
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
      />
      <ConfirmModal
        open={Boolean(approveTarget)}
        title="Are you sure?"
        message={
          approveTarget
            ? `Approve ${approveTarget.name}? They will be able to sign in after this.`
            : ""
        }
        confirmLabel="Approve"
        tone="primary"
        onCancel={() => setApproveTarget(null)}
        onConfirm={async () => {
          const name = approveTarget.name;
          await api(`/api/companies/${approveTarget.id}/approve`, { method: "POST" });
          setApproveTarget(null);
          setSuccess(`${name} was successfully approved.`);
          load();
        }}
      />
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
      <SuccessModal
        open={Boolean(success)}
        title="Completed successfully"
        message={success}
        onClose={() => setSuccess("")}
      />
    </>
  );
};

export default CompaniesPage;
