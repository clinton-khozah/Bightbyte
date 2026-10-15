import React, { useEffect, useState } from "react";
import { api } from "../../api";
import OpsPage from "../../components/OpsPage/OpsPage";
import DataTable from "../../components/DataTable/DataTable";
import StatusChip from "../../components/StatusChip/StatusChip";
import ActionIcons from "../../components/ActionIcons/ActionIcons";
import RoleFormModal from "../../components/RoleFormModal/RoleFormModal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import { csvDownload, useOpsList } from "../../hooks/useOpsList";
import "./RolesRightsPage.css";

const RolesRightsPage = () => {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState({ open: false, mode: "add", role: null });
  const [pending, setPending] = useState(null);
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    Promise.all([api("/api/roles"), api("/api/users")]).then(([roleRows, userRows]) => {
      setRoles(roleRows);
      setUsers(userRows);
    });

  useEffect(() => {
    load();
  }, []);

  const counts = users.reduce((acc, user) => {
    const key = String(user.role || "").toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const rows = roles.map((role) => ({
    ...role,
    users:
      counts[role.RoleName?.toLowerCase()] ||
      counts[role.RoleID === "R001" ? "admin" : role.RoleID === "R003" ? "driver" : ""] ||
      0,
  }));

  const { query, setQuery, tab, setTab, filtered } = useOpsList(rows, {
    tabKey: "state",
    searchKeys: ["RoleID", "RoleName", "description", "Permissions"],
  });

  const columns = [
    { key: "RoleID", label: "ID", render: (r) => <span className="fc-table__id">{r.RoleID}</span> },
    {
      key: "RoleName",
      label: "Role Name",
      render: (r) => (
        <span>
          <strong>{r.RoleName}</strong>
          {r.isSystem ? <em className="roles-page__tag">System</em> : null}
        </span>
      ),
    },
    { key: "description", label: "Description" },
    { key: "users", label: "Users" },
    { key: "Permissions", label: "Permissions" },
    { key: "state", label: "Status", render: (r) => <StatusChip value={r.state} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <ActionIcons
          onEdit={() => setModal({ open: true, mode: "edit", role: r })}
          onDelete={r.isSystem ? undefined : () => setPending(r)}
        />
      ),
    },
  ];

  return (
    <>
      <OpsPage
        crumb={["Administration", "Roles"]}
        title="Roles & Rights"
        subtitle="Signed in as admin"
        primaryLabel="Add Role"
        onPrimary={() => setModal({ open: true, mode: "add", role: null })}
        onExport={() => csvDownload("roles.csv", columns, filtered)}
        stats={[
          { id: "all", label: "Total roles", value: roles.length, tone: "blue", icon: "▣" },
          { id: "active", label: "Active", value: roles.filter((r) => r.state === "active").length, tone: "green", icon: "✓" },
          { id: "inactive", label: "Inactive", value: roles.filter((r) => r.state === "inactive").length, tone: "amber", icon: "○" },
          { id: "users", label: "Users", value: users.length, tone: "blue", icon: "👤" },
        ]}
        activeStat={tab}
        onStat={setTab}
      >
        <DataTable
          rows={filtered}
          columns={columns}
          noun="roles"
          totalCount={rows.length}
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search roles..."
          tabs={[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "inactive", label: "Inactive" },
          ]}
          tab={tab}
          onTab={setTab}
          emptyText="No roles found."
        />
      </OpsPage>
      <RoleFormModal
        open={modal.open}
        mode={modal.mode}
        role={modal.role}
        busy={busy}
        onClose={() => setModal({ open: false, mode: "add", role: null })}
        onSave={async (record) => {
          setBusy(true);
          try {
            if (modal.mode === "edit" && modal.role?.id) {
              await api(`/api/roles/${modal.role.id}`, { method: "PATCH", body: JSON.stringify(record) });
              setSuccess("Role was updated.");
            } else {
              await api("/api/roles", { method: "POST", body: JSON.stringify(record) });
              setSuccess("Role was created.");
            }
            setModal({ open: false, mode: "add", role: null });
            load();
          } finally {
            setBusy(false);
          }
        }}
      />
      <ConfirmModal
        open={Boolean(pending)}
        title="Delete this role?"
        message={pending ? `Users assigned to ${pending.RoleName} will need a new role.` : ""}
        confirmLabel="Delete"
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          await api(`/api/roles/${pending.id}`, { method: "DELETE" });
          setPending(null);
          setSuccess("Role was deleted.");
          load();
        }}
      />
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
    </>
  );
};

export default RolesRightsPage;
