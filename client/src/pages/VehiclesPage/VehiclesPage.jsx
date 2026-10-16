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
import { can } from "../../constants/roles";
import VehiclePhotoField from "../../components/VehiclePhotoField/VehiclePhotoField";
import LineSelect from "../../components/LineSelect/LineSelect";
import { csvDownload, useOpsList } from "../../hooks/useOpsList";
import "./VehiclesPage.css";

const VEHICLE_FIELDS = [
  { key: "registration", label: "Registration" },
  { key: "vin", label: "VIN" },
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
  company_id: "",
  status: "available",
};

const VEHICLE_COLOURS = [
  "White",
  "Black",
  "Silver",
  "Grey",
  "Red",
  "Blue",
  "Green",
  "Gold",
  "Brown",
  "Beige",
  "Orange",
  "Yellow",
  "Maroon",
  "Navy",
];

const VehiclesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [companies, setCompanies] = useState([]);
  const [formError, setFormError] = useState("");
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);

  const load = () => {
    setLoading(true);
    return Promise.all([
      api("/api/vehicles"),
      api("/api/companies").catch(() => []),
      api("/api/vehicle-makes").catch(() => []),
      api("/api/vehicle-years").catch(() => []),
    ])
      .then(([fleet, tenants, makeRows, yearRows]) => {
        setRows(fleet);
        setCompanies(tenants);
        setMakes(makeRows);
        setYears(yearRows);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!form.make) {
      setModels([]);
      return;
    }
    api(`/api/vehicle-models?make=${encodeURIComponent(form.make)}`)
      .then(setModels)
      .catch(() => setModels([]));
  }, [form.make]);

  const { query, setQuery, tab, setTab, filtered } = useOpsList(rows, {
    tabKey: "status",
    searchKeys: ["registration", "make", "model", "vin", "company_name"],
  });

  const openCreate = () => {
    setEditing(null);
    setFormError("");
    setForm({
      ...emptyForm,
      company_id: user?.company_id || companies[0]?.id || "",
    });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormError("");
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
    { key: "make", label: "Vehicle", wrap: true, render: (r) => `${r.make || ""} ${r.model || ""}`.trim() || "—", exportValue: (r) => `${r.make} ${r.model}` },
    { key: "company_name", label: "Company", wrap: true, render: (r) => r.company_name || "—" },
    { key: "year", label: "Year" },
    { key: "vin", label: "VIN", wrap: true, render: (r) => r.vin || "—" },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
    { key: "colour", label: "Colour" },
    ...(user?.role === "driver" || user?.role_key === "driver"
      ? []
      : [{ key: "value", label: "Value (ZAR)", type: "n" }]),
    { key: "odometer", label: "Odometer", type: "n" },
    {
      key: "actions",
      label: "Actions",
      render: (r) =>
          <ActionIcons
            onSupplies={() => navigate(`/vehicles/${r.id}#supplies`)}
            onEdit={can(user, "vehicles", "edit") ? () => openEdit(r) : undefined}
            onDelete={can(user, "vehicles", "delete") ? () => setPendingDelete(r) : undefined}
          />
    },
  ];

  return (
    <div className="vehicles-page">
      <OpsPage
        crumb={["Operations", "Assets"]}
        title="Asset Management"
        primaryLabel={can(user, "vehicles", "create") ? "Add vehicle" : undefined}
        onPrimary={can(user, "vehicles", "create") ? openCreate : undefined}
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
          loading={loading}
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
              setFormError("");
              if (!form.company_id && user?.role === "super_admin") {
                setFormError("Select the company this vehicle belongs to.");
                return;
              }
              if (!form.make || !form.model) {
                setFormError("Select make and model.");
                return;
              }
              if (!form.year) {
                setFormError("Select the vehicle year.");
                return;
              }
              if ((form.photos || []).length < 5) {
                setFormError("Upload at least five vehicle photos.");
                return;
              }
              setSaving(true);
              try {
                const photos = form.photos || [];
                const payload = {
                  company_id: form.company_id || user?.company_id,
                  registration: form.registration,
                  make: form.make,
                  model: form.model,
                  year: form.year,
                  vin: form.vin,
                  colour: form.colour,
                  fuel_type: form.fuel_type,
                  engine: form.engine,
                  odometer: form.odometer,
                  licence_expiry: form.licence_expiry,
                  value: form.value,
                  photos,
                  photo_url: photos[0] || form.photo_url || "",
                  status: form.status || "available",
                };
                if (editing) {
                  await api(`/api/vehicles/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
                  setOpen(false);
                  setSuccess("Submitted successfully.");
                } else {
                  await api("/api/vehicles", { method: "POST", body: JSON.stringify(payload) });
                  setOpen(false);
                  setSuccess("Submitted successfully.");
                }
                load();
              } catch (err) {
                setFormError(err.message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="fc-form__full">
              <LineSelect
                label="Company"
                required
                value={form.company_id}
                onChange={(id) => setForm({ ...form, company_id: id })}
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
            </div>
            <label>
              Make
              <select
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value, model: "" })}
                required
              >
                <option value="">Select make</option>
                {makes.map((make) => (
                  <option key={make.id || make.name} value={make.name}>
                    {make.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Model
              <select value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required>
                <option value="">{form.make ? "Select model" : "Select make first"}</option>
                {models.map((model) => (
                  <option key={model.id || model.name} value={model.name}>
                    {model.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Year
              <select value={String(form.year || "")} onChange={(e) => setForm({ ...form, year: e.target.value })} required>
                <option value="">Select year</option>
                {form.year && !years.some((row) => String(row.year) === String(form.year)) ? (
                  <option value={form.year}>{form.year}</option>
                ) : null}
                {years.map((row) => (
                  <option key={row.year} value={row.year}>
                    {row.year}
                  </option>
                ))}
              </select>
            </label>
            {VEHICLE_FIELDS.filter(
              (field) => field.key !== "value" || (user?.role !== "driver" && user?.role_key !== "driver"),
            ).map((field) => (
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
              Colour
              <select value={form.colour} onChange={(e) => setForm({ ...form, colour: e.target.value })}>
                <option value="">Select colour</option>
                {(VEHICLE_COLOURS.includes(form.colour) || !form.colour
                  ? VEHICLE_COLOURS
                  : [form.colour, ...VEHICLE_COLOURS]
                ).map((colour) => (
                  <option key={colour} value={colour}>
                    {colour}
                  </option>
                ))}
              </select>
            </label>
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
            {formError ? <p className="fc-error">{formError}</p> : null}
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
              <button className="fc-btn fc-btn--primary" type="submit" disabled={saving}>
                {saving ? "Submitting…" : editing ? "Save changes" : "Save"}
              </button>
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
      <SuccessModal
        open={Boolean(success)}
        title="Submitted successfully"
        subtitle="The vehicle was saved."
        message={success}
        onClose={() => setSuccess("")}
      />
    </div>
  );
};

export default VehiclesPage;
