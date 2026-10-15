import React, { useEffect, useState } from "react";
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
import { csvDownload, useOpsList } from "../../hooks/useOpsList";
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
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [assigning, setAssigning] = useState(null);
  const [vehicleId, setVehicleId] = useState("");
  const [pending, setPending] = useState(null);
  const [success, setSuccess] = useState("");

  const load = () =>
    Promise.all([api("/api/users"), api("/api/vehicles"), api("/api/companies").catch(() => [])]).then(
      ([users, list, tenants]) => {
        setRows(users);
        setVehicles(list);
        setCompanies(tenants);
      },
    );

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
          onEdit={() => {
            setEditing(d);
            setEditForm({
              full_name: d.full_name || "",
              email: d.email || "",
              phone: d.phone || "",
              role: d.role || "driver",
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
            });
          }}
          onAssign={
            d.role === "driver"
              ? () => {
                  setAssigning(d);
                  setVehicleId(d.assigned_vehicle_id || "");
                }
              : undefined
          }
        />
      ),
    },
  ];

  return (
    <>
      <OpsPage
        crumb={["Administration", "Users"]}
        title="User Management"
        subtitle="Signed in as admin"
        primaryLabel="Onboard User"
        onPrimary={() => setOpen(true)}
        onExport={() => csvDownload("users.csv", columns, filtered)}
        activeStat={tab === "all" ? "all" : tab}
        onStat={(id) => setTab(id === "all" ? "all" : id)}
        stats={[
          { id: "all", label: "Total Users", value: rows.length, tone: "blue", icon: "👤" },
          { id: "active", label: "Active", value: rows.filter((r) => r.status === "active").length, tone: "green", icon: "✓" },
          { id: "in_progress", label: "In Progress", value: rows.filter((r) => !r.photo_url).length, tone: "blue", icon: "👤" },
          { id: "incomplete", label: "Incomplete", value: 0, tone: "amber", icon: "!" },
        ]}
      >
        <DataTable
          rows={filtered}
          columns={columns}
          noun="users"
          totalCount={rows.length}
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search users..."
          tabs={[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "in_progress", label: "In Progress" },
            { id: "incomplete", label: "Incomplete" },
          ]}
          tab={tab}
          onTab={setTab}
          emptyText="No users found."
        />
      </OpsPage>
      <OnboardUserModal open={open} onClose={() => setOpen(false)} onComplete={load} />
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
              await api(`/api/users/${editing.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                  ...editForm,
                  assigned_vehicle_id: editForm.assigned_vehicle_id || null,
                }),
              });
              setEditing(null);
              setSuccess("User profile was updated.");
              load();
            }}
          >
            <PhotoUploadField
              src={editForm.photo_url}
              name={editForm.full_name}
              onChange={async (ev) => {
                if (!ev.target.files?.length) return;
                const { urls } = await uploadFiles(ev.target.files);
                setEditForm((f) => ({ ...f, photo_url: urls[0] }));
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
            <label>
              Role
              <select value={editForm.role || "driver"} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                <option value="admin">admin</option>
                <option value="fleet_manager">fleet_manager</option>
                <option value="driver">driver</option>
                <option value="finance">finance</option>
              </select>
            </label>
            <label>
              Status
              <select value={editForm.status || "active"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
            <label>
              Company
              <select value={editForm.company_id || ""} onChange={(e) => setEditForm({ ...editForm, company_id: e.target.value })}>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
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
            <label>
              Assigned vehicle
              <select
                value={editForm.assigned_vehicle_id || ""}
                onChange={(e) => setEditForm({ ...editForm, assigned_vehicle_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration} — {v.make} {v.model}
                  </option>
                ))}
              </select>
            </label>
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
            <label>
              PrDP
              <select value={editForm.prdp || "not_required"} onChange={(e) => setEditForm({ ...editForm, prdp: e.target.value })}>
                <option value="not_required">Not required</option>
                <option value="required">Required</option>
                <option value="pending">Pending</option>
              </select>
            </label>
            <div className="fc-form__actions">
              <button className="fc-btn" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="fc-btn fc-btn--primary" type="submit">
                Save changes
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
            <label>
              Vehicle
              <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                <option value="">Unassigned</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration} — {v.make} {v.model}
                    {v.assigned_driver_id && v.assigned_driver_id !== assigning.id ? " (in use)" : ""}
                  </option>
                ))}
              </select>
            </label>
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
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
    </>
  );
};

export default DriversPage;
