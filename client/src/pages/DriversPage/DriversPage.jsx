import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, uploadFiles } from "../../api";
import OpsPage from "../../components/OpsPage/OpsPage";
import DataTable from "../../components/DataTable/DataTable";
import StatusChip from "../../components/StatusChip/StatusChip";
import OnboardUserModal from "../../components/OnboardUserModal/OnboardUserModal";
import Modal from "../../components/Modal/Modal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import ActionIcons from "../../components/ActionIcons/ActionIcons";
import Avatar from "../../components/Avatar/Avatar";
import PhotoUploadField from "../../components/PhotoUploadField/PhotoUploadField";
import LineSelect from "../../components/LineSelect/LineSelect";
import { csvDownload, useOpsList } from "../../hooks/useOpsList";
import { can, canManagePeople } from "../../constants/roles";
import { useAuth } from "../../auth/AuthContext";
import "./DriversPage.css";

const formatLogin = (value) =>
  value
    ? new Date(value).toLocaleString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Never";

const DriversPage = () => {
  const { user } = useAuth();
  const managePeople = canManagePeople(user);
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoRef = useRef("");
  const [editForm, setEditForm] = useState({});
  const [assigning, setAssigning] = useState(null);
  const [vehicleId, setVehicleId] = useState("");
  const [pending, setPending] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [success, setSuccess] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const load = () => {
    setLoading(true);
    return Promise.all([
      api("/api/users"),
      api("/api/vehicles"),
      api("/api/companies").catch(() => []),
      api("/api/roles").catch(() => []),
    ])
      .then(([users, list, tenants, roleRows]) => {
        setRows(users);
        setVehicles(list);
        setCompanies(tenants);
        setRoles(roleRows);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const vehicleFor = (id) => vehicles.find((v) => v.id === id);

  const vehicleLabel = (id) => {
    const vehicle = vehicleFor(id);
    return vehicle ? `${vehicle.registration} — ${vehicle.make} ${vehicle.model}` : "Unassigned";
  };

  const plateFor = (d) => vehicleFor(d.assigned_vehicle_id)?.registration || "—";

  const { query, setQuery, tab, setTab, filtered } = useOpsList(rows, {
    tabKey: "status",
    searchKeys: ["full_name", "email", "role", "license_no", "employee_id", "assigned_vehicle_id"],
  });

  const columns = [
    {
      key: "employee_id",
      label: "Employee ID",
      render: (d) => <span className="fc-table__id">{d.employee_id || "—"}</span>,
    },
    {
      key: "full_name",
      label: "Name",
      render: (d) => (
        <div className="fc-table__name-cell">
          <Avatar src={d.photo_url} name={d.full_name} />
          <span>{d.full_name}</span>
        </div>
      ),
    },
    { key: "email", label: "Email" },
    {
      key: "vehicle",
      label: "Vehicle",
      render: (d) => (d.assigned_vehicle_id ? plateFor(d) : "—"),
    },
    { key: "role", label: "Role" },
    {
      key: "rating",
      label: "Rating",
      render: (d) => {
        if (d.role !== "driver") return "—";
        const scores = (d.ratings || []).map((row) => Number(row.score)).filter((n) => n > 0);
        if (!scores.length) return "—";
        return (scores.reduce((sum, n) => sum + n, 0) / scores.length).toFixed(1);
      },
    },
    { key: "status", label: "Status", render: (d) => <StatusChip value={d.status || "active"} /> },
    { key: "last_login", label: "Last Login", render: (d) => formatLogin(d.last_login) },
    {
      key: "actions",
      label: "Actions",
      render: (d) => (
        <ActionIcons
          onView={() => navigate(`/drivers/${d.id}`)}
          onEdit={
            can(user, "drivers", "edit") && (managePeople || d.id === user?.id)
              ? () => {
            setEditing(d);
            setEditError("");
            photoRef.current = d.photo_url || "";
            setEditForm({
              full_name: d.full_name || "",
              email: d.email || "",
              phone: d.phone || "",
              role: d.role || "driver",
              role_id: d.role_id || "",
              status: d.status || "active",
              photo_url: d.photo_url || "",
              company_id: d.company_id || "",
              employee_id: d.employee_id || "",
              id_number: d.id_number || "",
              address: d.address || "",
              start_date: d.start_date || "",
              assigned_vehicle_id: d.assigned_vehicle_id || "",
              emergency_contact_name: d.emergency_contact_name || "",
              emergency_contact_number: d.emergency_contact_number || "",
              license_no: d.license_no || "",
              license_expiry: d.license_expiry || "",
              license_codes: d.license_codes || "",
              prdp: d.prdp || "not_required",
              password: "",
              confirmPassword: "",
            });
          } : undefined
          }
          onAssign={
            d.role === "driver" && managePeople && can(user, "drivers", "edit")
              ? () => {
                  setAssigning(d);
                  setVehicleId(d.assigned_vehicle_id || "");
                }
              : undefined
          }
          onDelete={
            managePeople && can(user, "drivers", "delete") && d.id !== user?.id
              ? () => setPendingDelete(d)
              : undefined
          }
        />
      ),
    },
  ];

  return (
    <>
      {deleteError ? <p className="fc-error">{deleteError}</p> : null}
      <OpsPage
        crumb={managePeople ? ["Administration", "Users"] : ["Account", "My Profile"]}
        title={managePeople ? "User Management" : "My Profile"}
        subtitle={user?.role_label || user?.role || "—"}
        primaryLabel={managePeople && can(user, "drivers", "create") ? "Onboard User" : undefined}
        onPrimary={managePeople && can(user, "drivers", "create") ? () => setOpen(true) : undefined}
        onExport={managePeople ? () => csvDownload("users.csv", columns, filtered) : undefined}
        activeStat={tab === "all" ? "all" : tab}
        onStat={managePeople ? (id) => setTab(id === "all" ? "all" : id) : undefined}
        stats={
          managePeople
            ? [
                { id: "all", label: "Total Users", value: rows.length, tone: "blue", icon: "👤" },
                { id: "active", label: "Active", value: rows.filter((r) => r.status === "active").length, tone: "green", icon: "✓" },
                { id: "in_progress", label: "In Progress", value: rows.filter((r) => !r.photo_url).length, tone: "blue", icon: "👤" },
                { id: "incomplete", label: "Incomplete", value: 0, tone: "amber", icon: "!" },
              ]
            : []
        }
      >
        <DataTable
          rows={filtered}
          loading={loading}
          columns={columns}
          noun="users"
          totalCount={rows.length}
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search users..."
          hideToolbar={!managePeople}
          tabs={
            managePeople
              ? [
                  { id: "all", label: "All" },
                  { id: "active", label: "Active" },
                  { id: "in_progress", label: "In Progress" },
                  { id: "incomplete", label: "Incomplete" },
                ]
              : []
          }
          tab={tab}
          onTab={setTab}
          emptyText="No users found."
        />
      </OpsPage>
      <OnboardUserModal
        open={open}
        onClose={() => setOpen(false)}
        onComplete={load}
      />
      {editing ? (
        <Modal
          title="Edit user"
          subtitle="Update every profile field that appears on the user page."
          onClose={() => setEditing(null)}
          xl
        >
          <form
            className="fc-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (editForm.password || editForm.confirmPassword) {
                if (editForm.password !== editForm.confirmPassword) {
                  setEditError("New password and confirmation do not match.");
                  return;
                }
                if (String(editForm.password).length < 6) {
                  setEditError("Password must be at least 6 characters.");
                  return;
                }
              }
              setEditError("");
              if (photoBusy) {
                setEditError("Wait for the photo to finish uploading.");
                return;
              }
              const { confirmPassword, password, ...rest } = editForm;
              try {
                await api(`/api/users/${editing.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({
                    ...rest,
                    photo_url: photoRef.current || editForm.photo_url || "",
                    assigned_vehicle_id: editForm.assigned_vehicle_id || null,
                    ...(password ? { password } : {}),
                  }),
                });
              } catch (err) {
                setEditError(err.message || "Could not save this user.");
                return;
              }
              setEditing(null);
              setSuccess("Submitted successfully.");
              load();
            }}
          >
            <PhotoUploadField
              src={editForm.photo_url}
              name={editForm.full_name}
              onChange={async (ev) => {
                if (!ev.target.files?.length) return;
                setPhotoBusy(true);
                setEditError("");
                try {
                  const { urls } = await uploadFiles(ev.target.files);
                  if (!urls?.[0]) throw new Error("The photo did not upload. Try again.");
                  photoRef.current = urls[0];
                  setEditForm((f) => ({ ...f, photo_url: urls[0] }));
                } catch (err) {
                  setEditError(err.message || "Could not upload the photo.");
                } finally {
                  setPhotoBusy(false);
                }
              }}
            />
            <label>
              Full name
              <input value={editForm.full_name || ""} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} required />
            </label>
            <label>
              Email
              <input value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
            </label>
            <label>
              Phone
              <input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </label>
            <LineSelect
              label="Role"
              value={editForm.role_id || editForm.role || "driver"}
              onChange={(id) => {
                const picked = roles.find((role) => role.RoleID === id || role.id === id);
                setEditForm({
                  ...editForm,
                  role_id: picked?.RoleID || id,
                  role: picked?.key || id,
                });
              }}
              options={roles
                .filter((role) => role.state !== "inactive")
                .map((role) => ({
                  id: role.RoleID,
                  label: role.RoleName,
                  sub: role.RoleID,
                }))}
              emptyText="Add roles under Roles & Rights first"
            />
            <LineSelect
              label="Status"
              value={editForm.status || "active"}
              onChange={(id) => setEditForm({ ...editForm, status: id })}
              options={[
                { id: "active", label: "Active" },
                { id: "inactive", label: "Inactive" },
                { id: "in_progress", label: "In progress" },
                { id: "incomplete", label: "Incomplete" },
              ]}
            />
            <LineSelect
              label="Company"
              value={editForm.company_id || ""}
              onChange={(id) => setEditForm({ ...editForm, company_id: id, assigned_vehicle_id: "" })}
              placeholder="Select a company"
              emptyText="No companies to select"
              options={companies.map((company) => ({
                id: company.id,
                label: company.name,
                sub: company.code || "",
                photo: company.photo_url,
                name: company.name,
              }))}
            />
            <label>
              Employee ID
              <input value={editForm.employee_id || ""} onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })} />
            </label>
            <label>
              ID number
              <input value={editForm.id_number || ""} onChange={(e) => setEditForm({ ...editForm, id_number: e.target.value })} />
            </label>
            <label>
              Address
              <input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </label>
            <label>
              Start date
              <input type="date" value={editForm.start_date || ""} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} />
            </label>
            <LineSelect
              label="Assigned vehicle"
              value={editForm.assigned_vehicle_id || "none"}
              onChange={(id) => setEditForm({ ...editForm, assigned_vehicle_id: id === "none" ? "" : id })}
              placeholder="Unassigned"
              emptyText="No vehicles to select"
              options={[
                { id: "none", label: "Unassigned" },
                ...vehicles
                  .filter((v) => !editForm.company_id || v.company_id === editForm.company_id)
                  .map((v) => ({
                    id: v.id,
                    label: v.registration,
                    sub: `${v.make || ""} ${v.model || ""}`.trim(),
                    photo: v.photo_url || v.photos?.[0],
                    name: v.registration,
                  })),
              ]}
            />
            <label>
              Emergency contact
              <input
                value={editForm.emergency_contact_name || ""}
                onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
              />
            </label>
            <label>
              Emergency number
              <input
                value={editForm.emergency_contact_number || ""}
                onChange={(e) => setEditForm({ ...editForm, emergency_contact_number: e.target.value })}
              />
            </label>
            <label>
              Licence number
              <input value={editForm.license_no || ""} onChange={(e) => setEditForm({ ...editForm, license_no: e.target.value })} />
            </label>
            <label>
              Licence expiry
              <input type="date" value={editForm.license_expiry || ""} onChange={(e) => setEditForm({ ...editForm, license_expiry: e.target.value })} />
            </label>
            <label>
              Licence codes
              <input value={editForm.license_codes || ""} onChange={(e) => setEditForm({ ...editForm, license_codes: e.target.value })} />
            </label>
            <LineSelect
              label="PrDP"
              value={editForm.prdp || "not_required"}
              onChange={(id) => setEditForm({ ...editForm, prdp: id })}
              options={[
                { id: "not_required", label: "Not required" },
                { id: "required", label: "Required" },
                { id: "pending", label: "Pending" },
              ]}
            />
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={editForm.password || ""}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Leave blank to keep current"
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                value={editForm.confirmPassword || ""}
                onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                placeholder="Repeat new password"
              />
            </label>
            {editError ? <p className="fc-error">{editError}</p> : null}
            <div className="fc-form__actions">
              <button className="fc-btn" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="fc-btn fc-btn--primary" type="submit" disabled={photoBusy}>
                {photoBusy ? "Uploading photo…" : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      {assigning ? (
        <Modal
          title="Assign vehicle"
          subtitle={`Link a fleet vehicle to ${assigning.full_name}.`}
          onClose={() => setAssigning(null)}
        >
          <form
            className="fc-form"
            onSubmit={(e) => {
              e.preventDefault();
              setPending({ driver: assigning, vehicleId });
              setAssigning(null);
            }}
          >
            <LineSelect
              label="Vehicle"
              value={vehicleId || "none"}
              onChange={(id) => setVehicleId(id === "none" ? "" : id)}
              placeholder="Unassigned"
              emptyText="No vehicles to select"
              options={[
                { id: "none", label: "Unassigned" },
                ...vehicles
                  .filter((v) => !assigning.company_id || v.company_id === assigning.company_id)
                  .map((v) => ({
                    id: v.id,
                    label: v.registration,
                    sub:
                      `${v.make || ""} ${v.model || ""}`.trim() +
                      (v.assigned_driver_id && v.assigned_driver_id !== assigning.id ? " · in use" : ""),
                    photo: v.photo_url || v.photos?.[0],
                    name: v.registration,
                  })),
              ]}
            />
            <div className="fc-form__actions">
              <button className="fc-btn" type="button" onClick={() => setAssigning(null)}>
                Cancel
              </button>
              <button className="fc-btn fc-btn--primary" type="submit">
                Continue
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      <ConfirmModal
        open={Boolean(pending)}
        title="Confirm assignment?"
        message={
          pending
            ? pending.vehicleId
              ? `Assign ${vehicleLabel(pending.vehicleId)} to ${pending.driver.full_name}?`
              : `Remove the assigned vehicle from ${pending.driver.full_name}?`
            : ""
        }
        confirmLabel="Assign"
        tone="primary"
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          await api(`/api/drivers/${pending.driver.id}`, {
            method: "PATCH",
            body: JSON.stringify({ assigned_vehicle_id: pending.vehicleId || null }),
          });
          setPending(null);
          setSuccess("Vehicle assignment was updated.");
          load();
        }}
      />
      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Delete this user?"
        message={
          pendingDelete
            ? `This will permanently remove ${pendingDelete.full_name || pendingDelete.email} from User Management.`
            : ""
        }
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          setDeleteError("");
          try {
            await api(`/api/users/${pendingDelete.id}`, { method: "DELETE" });
            setPendingDelete(null);
            setSuccess("User was deleted.");
            load();
          } catch (err) {
            setPendingDelete(null);
            setDeleteError(err.message || "Could not delete this user.");
          }
        }}
      />
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
    </>
  );
};

export default DriversPage;
