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
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../constants/roles";
import "./RolesRightsPage.css";

const RolesRightsPage = () => {
  const { user, refreshUser } = useAuth();
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, mode: "add", role: null });
  const [pending, setPending] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canCreate = can(user, "roles-rights", "create");
  const canEdit = can(user, "roles-rights", "edit");
  const canDelete = can(user, "roles-rights", "delete");

  const load = () => {
    setLoading(true);
    return Promise.all([api("/api/roles"), api("/api/users").catch(() => [])])
      .then(([roleRows, userRows]) => {
        setRoles(Array.isArray(roleRows) ? roleRows : []);
        setUsers(userRows);
        setError("");
      })
      .catch((err) => setError(err.message || "Could not load roles."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const rows = roles.map((role) => {
    const RoleID = role.RoleID || role.roleid;
    const RoleName = role.RoleName || role.rolename;
    return {
      ...role,
      RoleID,
      RoleName,
      Permissions: role.Permissions || role.permissions,
      state: role.state || "active",
      users: users.filter(
        (person) =>
          person.role_id === RoleID ||
          person.role === role.key ||
          String(person.role || "").toLowerCase() === String(RoleName || "").toLowerCase(),
      ).length,
    };
  });

  const { query, setQuery, tab, setTab, filtered } = useOpsList(rows, {
    tabKey: "state",
    searchKeys: ["RoleID", "RoleName", "description", "Permissions"],
  });

  const columns = [
    { key: "RoleID", label: "ID", render: (r) => <span className="fc-table__id">{r.RoleID}</span> },
    {
      key: "RoleName",
      label: "Role Name",
      render: (r) => <strong>{r.RoleName}</strong>,
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
          onEdit={canEdit ? () => setModal({ open: true, mode: "edit", role: r }) : undefined}
          onDelete={canDelete ? () => setPending(r) : undefined}
        />
      ),
    },
  ];

  return (
    <>
      <OpsPage
        crumb={["Administration", "Roles"]}
        title="Roles & Rights"
        subtitle={user?.role_label || user?.role || "—"}
        primaryLabel={canCreate ? "Add Role" : undefined}
        onPrimary={canCreate ? () => setModal({ open: true, mode: "add", role: null }) : undefined}
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
        {error ? <p className="fc-error">{error}</p> : null}
        <DataTable
          rows={filtered}
          loading={loading}
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
          setError("");
          try {
            if (modal.mode === "edit" && modal.role?.id) {
              await api(`/api/roles/${modal.role.id}`, { method: "PATCH", body: JSON.stringify(record) });
              setSuccess("Role was updated.");
            } else {
              await api("/api/roles", { method: "POST", body: JSON.stringify(record) });
              setSuccess("Role was created.");
            }
            setModal({ open: false, mode: "add", role: null });
            await refreshUser();
            load();
          } catch (err) {
            setError(err.message);
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
          try {
            await api(`/api/roles/${pending.id}`, { method: "DELETE" });
            setPending(null);
            setSuccess("Role was deleted.");
            load();
          } catch (err) {
            setPending(null);
            setError(err.message);
          }
        }}
      />
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
    </>
  );
};

export default RolesRightsPage;
