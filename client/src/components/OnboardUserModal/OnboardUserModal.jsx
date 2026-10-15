import React, { useEffect, useState } from "react";
import { api, uploadFiles } from "../../api";
import CameraCapture from "../CameraCapture/CameraCapture";
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

const Upload = ({ label, onFile }) => (
  <label className="fc-onboard__upload">
    {label}
    <input
      type="file"
      hidden
      accept="image/*,application/pdf"
      onChange={async (e) => {
        if (!e.target.files?.length) return;
        const { urls } = await uploadFiles(e.target.files);
        onFile(urls[0], e.target.files[0].name);
      }}
    />
  </label>
);

const OnboardUserModal = ({ open, onClose, onComplete }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(empty);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!open) return;
    api("/api/companies")
      .then((rows) => {
        setCompanies(rows.filter((c) => c.status !== "inactive"));
        setForm((prev) => ({
          ...prev,
          company_id: prev.company_id || rows.find((c) => c.status !== "inactive")?.id || "",
        }));
      })
      .catch(() => setCompanies([]));
  }, [open]);

  if (!open) return null;

  const addDoc = (title, url) =>
    setForm((prev) => ({
      ...prev,
      documents: [...prev.documents.filter((d) => d.title !== title), { title, url, category: title }],
    }));

  const validate = () => {
    if (step === 0 && (!form.firstName || !form.lastName || !form.emailAddress || !form.idNumber)) {
      return "Name, email and ID number are required.";
    }
    if (step === 1 && !form.company_id) return "Select a company for this user.";
    if (step === 2 && !form.driversLicenseNumber) return "Driver licence number is required.";
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
      await api("/api/drivers", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onComplete?.();
      onClose?.();
      setForm(empty);
      setStep(0);
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
              <Field label="ID number" required>
                <input className="fc-onboard__input" value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} />
              </Field>
              <Field label="Physical address" full>
                <input className="fc-onboard__input" value={form.physicalAddress} onChange={(e) => set("physicalAddress", e.target.value)} />
              </Field>
              <Field label="ID document">
                <Upload label="Upload ID" onFile={(url) => addDoc("ID document", url)} />
              </Field>
              <Field label="Proof of banking">
                <Upload label="Upload proof" onFile={(url) => addDoc("Proof of banking", url)} />
              </Field>
            </div>
          ) : null}
          {step === 1 ? (
            <div className="fc-onboard__grid">
              <Field label="Company" required>
                <select
                  className="fc-onboard__select"
                  value={form.company_id}
                  onChange={(e) => set("company_id", e.target.value)}
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name} ({company.code})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Employee ID">
                <input className="fc-onboard__input" value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} />
              </Field>
              <Field label="Start date">
                <input className="fc-onboard__input" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </Field>
              <Field label="Role">
                <select className="fc-onboard__select" value={form.rolePosition} onChange={(e) => set("rolePosition", e.target.value)}>
                  <option value="driver">Driver</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </Field>
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
              <Field label="Licence number" required>
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
                <Upload label="Upload licence" onFile={(url) => addDoc("Driver licence", url)} />
              </Field>
              <Field label="PrDP document">
                <Upload label="Upload PrDP" onFile={(url) => addDoc("PrDP", url)} />
              </Field>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="fc-onboard__grid">
              <Field label="Temporary password" required>
                <input className="fc-onboard__input" value={form.temporaryPassword} onChange={(e) => set("temporaryPassword", e.target.value)} />
              </Field>
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
            {step === STEPS.length - 1 ? (saving ? "Saving" : "Create user") : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardUserModal;
