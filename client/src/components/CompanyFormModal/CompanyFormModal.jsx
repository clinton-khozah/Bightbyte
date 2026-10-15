import React from "react";
import Modal from "../Modal/Modal";
import PhotoUploadField from "../PhotoUploadField/PhotoUploadField";
import { uploadFiles } from "../../api";
import "./CompanyFormModal.css";

const CompanyFormModal = ({ open, editing, form, onChange, onClose, onSubmit }) => {
  if (!open) return null;

  const set = (patch) => onChange({ ...form, ...patch });

  return (
    <Modal
      wide
      title={editing ? "Edit company" : "Add company"}
      subtitle="Registered particulars for this workspace. Status controls whether staff may sign in."
      onClose={onClose}
    >
      <form className="fc-form company-form" onSubmit={onSubmit}>
        <div className="company-form__identity">
          <PhotoUploadField
            src={form.photo_url}
            name={form.name || "Company"}
            label={form.photo_url ? "Replace photograph" : "Attach photograph"}
            onChange={async (ev) => {
              if (!ev.target.files?.length) return;
              const { urls } = await uploadFiles(ev.target.files);
              set({ photo_url: urls[0] });
            }}
          />
          <div className="company-form__identity-copy">
            <p className="company-form__eyebrow">Workspace</p>
            <span className="company-form__rule" aria-hidden="true" />
            <strong>{form.name || "New company"}</strong>
            <p>
              {form.code || "Code pending"}
              {form.contact_email ? ` · ${form.contact_email}` : ""}
            </p>
          </div>
        </div>
        <label className="fc-form__span-2">
          Company name
          <input
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            required
            autoComplete="organization"
          />
        </label>
        <label>
          Company code
          <input
            value={form.code}
            onChange={(e) => set({ code: e.target.value.toUpperCase() })}
            placeholder="e.g. FLE"
            maxLength={8}
          />
        </label>
        <label>
          Status
          <select value={form.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="pending">Pending approval</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label>
          City
          <input value={form.city} onChange={(e) => set({ city: e.target.value })} />
        </label>
        <label>
          Contact email
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => set({ contact_email: e.target.value })}
            autoComplete="email"
          />
        </label>
        <label className="fc-form__span-2">
          Registered address
          <input
            value={form.address}
            onChange={(e) => set({ address: e.target.value })}
            autoComplete="street-address"
          />
        </label>
        <div className="fc-form__actions">
          <button className="fc-btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="fc-btn fc-btn--primary" type="submit">
            {editing ? "Save changes" : "Create company"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CompanyFormModal;
