import React, { useEffect, useState } from "react";
import { api, uploadFiles } from "../../api";
import CameraCapture from "../CameraCapture/CameraCapture";
import LineSelect from "../LineSelect/LineSelect";
import SuccessModal from "../SuccessModal/SuccessModal";
import "./OnboardUserModal.css";

const STEPS = [
  { key: "personal", title: "Personal information" },
  { key: "employment", title: "Employment & role" },
  { key: "driver", title: "Driver information" },
  { key: "access", title: "System access" },
];

const empty = {
  firstName: "",
  lastName: "",
  emailAddress: "",
  contactNumber: "",
  idNumber: "",
  physicalAddress: "",
  employeeId: "",
  startDate: "",
  rolePosition: "driver",
  driversLicenseNumber: "",
  licenseExpiryDate: "",
  licenseCodes: "",
  prdp: "required",
  emergencyContactName: "",
  emergencyContactNumber: "",
  temporaryPassword: "fleet21",
  company_id: "",
  assigned_vehicle_id: "",
  photo_url: "",
  documents: [],
};

const Field = ({ label, required, children, full }) => (
  <label className={`fc-onboard__field${full ? " fc-onboard__grid--full" : ""}`}>
    <span className="fc-onboard__label">
      {label}
      {required ? <span className="fc-onboard__required"> *</span> : null}
    </span>
    {children}
  </label>
);

const Upload = ({ label, file, onFile }) => {
  const url = file?.url || "";
  const isPdf = /\.pdf($|\?)/i.test(url) || /\.pdf$/i.test(file?.name || "");
  return (
    <label className={`fc-onboard__upload${url ? " has-file" : ""}`}>
      {url ? (
        <span className="fc-onboard__upload-preview">
          {isPdf ? (
            <em>PDF</em>
          ) : (
            <img src={url} alt="" />
          )}
          <span>
            <strong>{file.name || "Uploaded"}</strong>
            {label}
          </span>
        </span>
      ) : (
        label
      )}
      <input
        type="file"
        hidden
        accept="image/*,application/pdf"
        onChange={async (e) => {
          if (!e.target.files?.length) return;
          const picked = e.target.files[0];
          const { urls } = await uploadFiles(e.target.files);
          onFile(urls[0], picked.name);
        }}
      />
    </label>
  );
};

const OnboardUserModal = ({ open, onClose, onComplete }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(empty);
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const employeeIdFor = (company) => {
    if (!company) return "";
    const prefix =
      String(company.code || company.name || "EMP")
        .replace(/[^A-Za-z0-9]/g, "")
        .toUpperCase()
        .slice(0, 8) || "EMP";
    return `${prefix}-${String(Number(company.user_count || 0) + 1).padStart(3, "0")}`;
  };
  const pickCompany = (id) => {
    const company = companies.find((row) => row.id === id);
    setForm((prev) => ({
      ...prev,
      company_id: id,
      employeeId: employeeIdFor(company),
      assigned_vehicle_id: "",
    }));
  };

  useEffect(() => {
    if (!open) return;
    setForm(empty);
    setStep(0);
    setError("");
    setCreated(null);
    api("/api/companies")
      .then((rows) => setCompanies(rows.filter((c) => c.status !== "inactive")))
      .catch(() => setCompanies([]));
    api("/api/roles")
      .then((rows) => {
        setRoles(rows);
        const driverId = rows.find((role) => role.key === "driver")?.RoleID || rows[0]?.RoleID || "driver";
        setForm((prev) => ({ ...prev, rolePosition: driverId }));
      })
      .catch(() => setRoles([]));
  }, [open]);

  useEffect(() => {
    if (!open || !form.company_id) {
      setVehicles([]);
      return;
    }
    api(`/api/vehicles?company_id=${encodeURIComponent(form.company_id)}`)
      .then(setVehicles)
      .catch(() => setVehicles([]));
  }, [open, form.company_id]);

  if (!open) return null;

  if (created) {
    return (
      <SuccessModal
        open
        title="Submitted successfully"
        subtitle="The user was created."
        message={`${created.full_name || "The user"} was onboarded${created.employee_id ? ` as ${created.employee_id}` : ""}.`}
        onClose={() => {
          setCreated(null);
          setForm(empty);
          setStep(0);
          onClose?.();
        }}
      />
    );
  }

  const addDoc = (title, url, name) =>
    setForm((prev) => ({
      ...prev,
      documents: [
        ...prev.documents.filter((d) => d.title !== title),
        { title, url, category: title, name },
      ],
    }));
  const docFor = (title) => form.documents.find((d) => d.title === title);

  const validate = () => {
    if (step === 0 && !form.company_id) return "Select the company this user belongs to.";
    if (step === 0 && (!form.firstName || !form.lastName || !form.emailAddress)) {
      return "Name and email are required.";
    }
    if (step === 1 && !form.company_id) return "Select a company for this user.";
    if (step === 1 && !roles.some((role) => role.RoleID === form.rolePosition)) {
      return "Select a role from Roles & Rights.";
    }
    const roleKey = roles.find((role) => role.RoleID === form.rolePosition || role.key === form.rolePosition)?.key || form.rolePosition;
    if (step === 2 && roleKey === "driver" && !form.driversLicenseNumber) {
      return "Driver licence number is required.";
    }
    if (step === 2 && roleKey === "driver" && !form.assigned_vehicle_id) {
      return vehicles.length
        ? "Assign this driver to a vehicle."
        : "This company has no vehicle. Add a vehicle first, then onboard the driver.";
    }
    if (step === 3 && String(form.temporaryPassword || "").trim().length < 6) {
      return "Login password must be at least 6 characters.";
    }
    return "";
  };

  const next = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    setSaving(true);
    try {
      const picked = roles.find((role) => role.RoleID === form.rolePosition || role.key === form.rolePosition);
      const row = await api("/api/drivers", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          role: picked?.key || form.rolePosition,
          role_id: picked?.RoleID || form.rolePosition,
        }),
      });
      setSaving(false);
      onComplete?.(row);
      setCreated(row);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const pct = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="fc-onboard__overlay">
      <div className="fc-onboard__dialog" role="dialog" aria-modal="true">
        <div className="fc-onboard__header">
          <div className="fc-onboard__header-top">
            <div>
              <h2 className="fc-onboard__title">Onboard user</h2>
              <p className="fc-onboard__step-label">
                Step {step + 1} of {STEPS.length} · {STEPS[step].title}
              </p>
            </div>
            <button type="button" className="fc-onboard__close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
          <div className="fc-onboard__progress">
            <div className="fc-onboard__progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="fc-onboard__body">
          {step === 0 ? (
            <div className="fc-onboard__grid">
              <div className="fc-onboard__grid--full">
                <LineSelect
                  label="Company"
                  required
                  value={form.company_id}
                  onChange={pickCompany}
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
              <Field label="First name" required>
                <input className="fc-onboard__input" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
              </Field>
              <Field label="Last name" required>
                <input className="fc-onboard__input" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
              </Field>
              <Field label="Email" required>
                <input className="fc-onboard__input" type="email" value={form.emailAddress} onChange={(e) => set("emailAddress", e.target.value)} />
              </Field>
              <Field label="Contact number">
                <input className="fc-onboard__input" value={form.contactNumber} onChange={(e) => set("contactNumber", e.target.value)} />
              </Field>
              <Field label="ID number">
                <input className="fc-onboard__input" value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} />
              </Field>
              <Field label="Physical address" full>
                <input className="fc-onboard__input" value={form.physicalAddress} onChange={(e) => set("physicalAddress", e.target.value)} />
              </Field>
              <Field label="ID document">
                <Upload
                  label="Upload ID"
                  file={docFor("ID document")}
                  onFile={(url, name) => addDoc("ID document", url, name)}
                />
              </Field>
              <Field label="Proof of address">
                <Upload
                  label="Upload proof"
                  file={docFor("Proof of address")}
                  onFile={(url, name) => addDoc("Proof of address", url, name)}
                />
              </Field>
            </div>
          ) : null}
          {step === 1 ? (
            <div className="fc-onboard__grid">
              <div className="fc-onboard__grid--full">
                <LineSelect
                  label="Company"
                  required
                  value={form.company_id}
                  onChange={pickCompany}
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
              <Field label="Employee ID">
                <input
                  className="fc-onboard__input"
                  value={form.employeeId || employeeIdFor(companies.find((row) => row.id === form.company_id))}
                  readOnly
                />
              </Field>
              <Field label="Start date">
                <input className="fc-onboard__input" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </Field>
              <LineSelect
                label="Role"
                required
                value={form.rolePosition}
                onChange={(id) => set("rolePosition", id)}
                placeholder="Select a role"
                emptyText="Add roles under Roles & Rights first"
                options={roles
                  .filter((role) => role.state !== "inactive")
                  .map((role) => ({
                    id: role.RoleID,
                    label: role.RoleName,
                    sub: role.RoleID,
                  }))}
              />
              <Field label="Emergency contact">
                <input className="fc-onboard__input" value={form.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} />
              </Field>
              <Field label="Emergency number">
                <input className="fc-onboard__input" value={form.emergencyContactNumber} onChange={(e) => set("emergencyContactNumber", e.target.value)} />
              </Field>
            </div>
          ) : null}
          {step === 2 ? (
            <div className="fc-onboard__grid">
              <div className="fc-onboard__grid--full">
                <LineSelect
                  label="Vehicle"
                  required={(roles.find((role) => role.RoleID === form.rolePosition)?.key || form.rolePosition) === "driver"}
                  value={form.assigned_vehicle_id}
                  onChange={(id) => set("assigned_vehicle_id", id)}
                  placeholder="Assign a vehicle"
                  emptyText="No vehicles in this company"
                  options={vehicles.map((vehicle) => ({
                    id: vehicle.id,
                    label: vehicle.registration,
                    sub: [vehicle.make, vehicle.model, vehicle.assigned_driver_id ? "Assigned" : "Available"]
                      .filter(Boolean)
                      .join(" · "),
                    photo: vehicle.photo_url,
                    name: vehicle.registration,
                  }))}
                />
              </div>
              <Field label="Licence number" required={(roles.find((role) => role.RoleID === form.rolePosition)?.key || form.rolePosition) === "driver"}>
                <input className="fc-onboard__input" value={form.driversLicenseNumber} onChange={(e) => set("driversLicenseNumber", e.target.value)} />
              </Field>
              <Field label="Licence expiry">
                <input className="fc-onboard__input" type="date" value={form.licenseExpiryDate} onChange={(e) => set("licenseExpiryDate", e.target.value)} />
              </Field>
              <Field label="Codes">
                <input className="fc-onboard__input" value={form.licenseCodes} onChange={(e) => set("licenseCodes", e.target.value)} />
              </Field>
              <Field label="PrDP">
                <select className="fc-onboard__select" value={form.prdp} onChange={(e) => set("prdp", e.target.value)}>
                  <option value="not_required">Not required</option>
                  <option value="required">Required</option>
                  <option value="pending">Pending</option>
                </select>
              </Field>
              <Field label="Licence scan">
                <Upload
                  label="Upload licence"
                  file={docFor("Driver licence")}
                  onFile={(url, name) => addDoc("Driver licence", url, name)}
                />
              </Field>
              <Field label="PrDP document">
                <Upload
                  label="Upload PrDP"
                  file={docFor("PrDP")}
                  onFile={(url, name) => addDoc("PrDP", url, name)}
                />
              </Field>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="fc-onboard__grid">
              <Field label="Login password" required>
                <input
                  className="fc-onboard__input"
                  type="text"
                  autoComplete="new-password"
                  minLength={6}
                  value={form.temporaryPassword}
                  onChange={(e) => set("temporaryPassword", e.target.value)}
                />
              </Field>
              <p className="fc-onboard__hint">They sign in with this password. It does not expire or change after the invite.</p>
              <Field label="Profile photo" full>
                <CameraCapture
                  label="Take a photo now — drivers also recapture on first login"
                  onCaptured={(url) => set("photo_url", url)}
                />
              </Field>
            </div>
          ) : null}
          {error ? <p className="fc-error" style={{ marginTop: 12 }}>{error}</p> : null}
        </div>
        <div className="fc-onboard__footer">
          <button type="button" className="fc-btn" onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}>
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <button type="button" className="fc-btn fc-btn--primary" disabled={saving} onClick={next}>
            {step === STEPS.length - 1 ? (saving ? "Submitting…" : "Create user") : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardUserModal;
