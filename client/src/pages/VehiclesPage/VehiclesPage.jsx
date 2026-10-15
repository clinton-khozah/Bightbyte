import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, uploadFiles } from "../../api";
import OpsPage from "../../components/OpsPage/OpsPage";
import DataTable from "../../components/DataTable/DataTable";
import Modal from "../../components/Modal/Modal";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import ActionIcons from "../../components/ActionIcons/ActionIcons";
import StatusChip from "../../components/StatusChip/StatusChip";
import { useAuth } from "../../auth/AuthContext";
import VehiclePhotoField from "../../components/VehiclePhotoField/VehiclePhotoField";
import { csvDownload, useOpsList } from "../../hooks/useOpsList";
import "./VehiclesPage.css";

const VEHICLE_FIELDS = [
  { key: "registration", label: "Registration" },
  { key: "make", label: "Make" },
  { key: "model", label: "Model" },
  { key: "year", label: "Year" },
  { key: "vin", label: "VIN" },
  { key: "colour", label: "Colour" },
  { key: "engine", label: "Engine" },
  { key: "odometer", label: "Odometer" },
  { key: "value", label: "Vehicle value (ZAR)" },
];

const emptyForm = {
  registration: "",
  make: "",
  model: "",
  year: "",
  vin: "",
  colour: "",
  fuel_type: "Diesel",
  engine: "",
  odometer: "",
  licence_expiry: "",
  value: "",
  photo_url: "",
  photos: [],
};

const VehiclesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");

  const load = () => api("/api/vehicles").then(setRows);
  useEffect(() => {
    load();
  }, []);

  const { query, setQuery, tab, setTab, filtered } = useOpsList(rows, {
    searchKeys: ["registration", "make", "model", "vin"],
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    const photos = Array.from(new Set([row.photo_url, ...(row.photos || [])].filter(Boolean)));
    setForm({
      ...emptyForm,
      ...row,
      year: row.year || "",
      odometer: row.odometer || "",
      photos,
      photo_url: photos[0] || "",
    });
    setOpen(true);
  };

  const columns = [
    {
      key: "photo",
      label: "",
      render: (r) =>
        r.photo_url ? <img className="fc-table__thumb" src={r.photo_url} alt="" /> : <span className="fc-table__thumb">VH</span>,
    },
    {
      key: "registration",
      label: "Asset ID",
      render: (r) => (
        <Link className="fc-table__id" to={`/vehicles/${r.id}`}>
          {r.registration}
        </Link>
      ),
    },
    { key: "make", label: "Vehicle", render: (r) => `${r.make} ${r.model}`, exportValue: (r) => `${r.make} ${r.model}` },
    { key: "year", label: "Year" },
    { key: "vin", label: "VIN" },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
    { key: "colour", label: "Colour" },
    { key: "value", label: "Value (ZAR)", type: "n" },
    { key: "odometer", label: "Odometer", type: "n" },
    {
      key: "actions",
      label: "Actions",
      render: (r) =>
        user?.role === "driver" ? (
          <ActionIcons onSupplies={() => navigate(`/vehicles/${r.id}#supplies`)} />
        ) : (
          <ActionIcons
            onSupplies={() => navigate(`/vehicles/${r.id}#supplies`)}
            onEdit={() => openEdit(r)}
            onDelete={() => setPendingDelete(r)}
          />
        ),
    },
  ];

  return (
    <>
      <OpsPage
        crumb={["Operations", "Assets"]}
        title="Asset Management"
        primaryLabel="Add vehicle"
        onPrimary={user?.role !== "driver" ? openCreate : undefined}
        onExport={() => csvDownload("fleet-assets.xlsx", columns, filtered)}
        stats={[
          { id: "all", label: "Total assets", value: rows.length, tone: "blue", icon: "🚚" },
          { id: "in_use", label: "In use", value: rows.filter((r) => r.status === "in_use").length, tone: "green", icon: "▶" },
          { id: "available", label: "Available", value: rows.filter((r) => r.status === "available").length, tone: "amber", icon: "○" },
          { id: "maintenance", label: "Maintenance", value: rows.filter((r) => r.status === "maintenance").length, tone: "red", icon: "🔧" },
        ]}
        activeStat={tab}
        onStat={setTab}
      >
        <DataTable
          rows={filtered}
          columns={columns}
          noun="assets"
          totalCount={rows.length}
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search assets..."
          tabs={[
            { id: "all", label: "All" },
            { id: "in_use", label: "In use" },
            { id: "available", label: "Available" },
            { id: "maintenance", label: "Maintenance" },
          ]}
          tab={tab}
          onTab={setTab}
        />
      </OpsPage>
      {open ? (
        <Modal
          title={editing ? "Edit vehicle" : "Register vehicle"}
          subtitle="Update identity, running figures and at least five vehicle photos."
          onClose={() => setOpen(false)}
          xl
        >
          <form
            className="fc-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const photos = form.photos || [];
              const payload = {
                ...form,
                photos,
                photo_url: photos[0] || form.photo_url || "",
              };
              if (editing) {
                await api(`/api/vehicles/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
                setOpen(false);
                setSuccess("Vehicle details were updated.");
              } else {
                await api("/api/vehicles", { method: "POST", body: JSON.stringify(payload) });
                setOpen(false);
                setSuccess("Vehicle was registered.");
              }
              load();
            }}
          >
            {VEHICLE_FIELDS.map((field) => (
              <label key={field.key}>
                {field.label}
                <input
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  required={field.key === "registration"}
                />
              </label>
            ))}
            <label>
              Fuel
              <select value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}>
                <option>Diesel</option>
                <option>Petrol</option>
                <option>Hybrid</option>
              </select>
            </label>
            <label>
              Licence expiry
              <input type="date" value={form.licence_expiry || ""} onChange={(e) => setForm({ ...form, licence_expiry: e.target.value })} />
            </label>
            <VehiclePhotoField
              photos={form.photos || []}
              min={5}
              onAdd={async (e) => {
                if (!e.target.files?.length) return;
                const input = e.target;
                const { urls } = await uploadFiles(input.files);
                setForm((f) => {
                  const photos = Array.from(new Set([...(f.photos || []), ...urls]));
                  return { ...f, photos, photo_url: photos[0] || "" };
                });
                input.value = "";
              }}
              onRemove={(index) =>
                setForm((f) => {
                  const photos = (f.photos || []).filter((_, i) => i !== index);
                  return { ...f, photos, photo_url: photos[0] || "" };
                })
              }
            />
            <div className="fc-form__actions">
              <button className="fc-btn" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="fc-btn fc-btn--primary" type="submit">{editing ? "Save changes" : "Save"}</button>
            </div>
          </form>
        </Modal>
      ) : null}
      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Delete this vehicle?"
        message={
          pendingDelete
            ? `This will permanently remove ${pendingDelete.registration} from the fleet.`
            : ""
        }
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await api(`/api/vehicles/${pendingDelete.id}`, { method: "DELETE" });
            setPendingDelete(null);
            setSuccess("Vehicle was deleted.");
            load();
          } finally {
            setBusy(false);
          }
        }}
      />
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
    </>
  );
};

export default VehiclesPage;
