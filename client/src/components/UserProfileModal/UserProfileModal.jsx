import React, { useState } from "react";
import { api, uploadFiles } from "../../api";
import Modal from "../Modal/Modal";
import StatusChip from "../StatusChip/StatusChip";
import "./UserProfileModal.css";

const isImage = (url = "") => !/\.pdf(\?|$)/i.test(url);

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

const Fact = ({ label, children }) => (
  <div>
    <dt>{label}</dt>
    <dd>{children || "—"}</dd>
  </div>
);

const UserProfileModal = ({ user, vehicleLabel, companyName, onClose, onChange }) => {
  const [profile, setProfile] = useState(user);
  const initials = String(profile.full_name || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const addDoc = async (event) => {
    if (!event.target.files?.length) return;
    const file = event.target.files[0];
    const { urls } = await uploadFiles([file]);
    const documents = [...(profile.documents || []), { title: file.name, category: "file", url: urls[0] }];
    const updated = await api(`/api/users/${profile.id}`, {
      method: "PATCH",
      body: JSON.stringify({ documents }),
    });
    setProfile({ ...profile, ...updated, documents });
    onChange?.();
    event.target.value = "";
  };

  return (
    <Modal
      xl
      title="User profile"
      subtitle="Personal details, licence records and uploaded documents."
      onClose={onClose}
    >
      <div className="user-dossier">
        <div className="user-dossier__hero">
          {profile.photo_url ? (
            <img className="user-dossier__photo" src={profile.photo_url} alt="" />
          ) : (
            <div className="user-dossier__photo-fallback">{initials}</div>
          )}
          <div>
            <h4>
              {profile.full_name}
              <StatusChip value={profile.status || "active"} />
            </h4>
            <p className="user-dossier__email">{profile.email}</p>
            <dl className="user-dossier__facts">
              <Fact label="Role">{profile.role}</Fact>
              <Fact label="Company">{companyName}</Fact>
              <Fact label="Employee ID">{profile.employee_id}</Fact>
              <Fact label="Phone">{profile.phone}</Fact>
              <Fact label="ID number">{profile.id_number}</Fact>
              <Fact label="Address">{profile.address}</Fact>
              <Fact label="Start date">{profile.start_date}</Fact>
              <Fact label="Last login">{formatLogin(profile.last_login)}</Fact>
              <Fact label="Assigned vehicle">{vehicleLabel}</Fact>
              <Fact label="Emergency contact">{profile.emergency_contact_name}</Fact>
              <Fact label="Emergency number">{profile.emergency_contact_number}</Fact>
            </dl>
          </div>
        </div>
        <section className="user-dossier__section">
          <h5>Driver information</h5>
          <dl className="user-dossier__facts">
            <Fact label="Licence number">{profile.license_no}</Fact>
            <Fact label="Licence expiry">{profile.license_expiry}</Fact>
            <Fact label="Licence codes">{profile.license_codes}</Fact>
            <Fact label="PrDP">{profile.prdp ? String(profile.prdp).replaceAll("_", " ") : "—"}</Fact>
          </dl>
        </section>
        <section className="user-dossier__section">
          <h5>Documents</h5>
          {(profile.documents || []).length ? (
            <div className="user-dossier__docs">
              {(profile.documents || []).map((doc) => {
                const body = (
                  <>
                    {doc.url && isImage(doc.url) ? (
                      <img className="user-dossier__thumb" src={doc.url} alt="" />
                    ) : (
                      <span className="user-dossier__thumb-icon">DOC</span>
                    )}
                    <div>
                      <strong>{doc.title}</strong>
                      <span>{doc.category || "file"}</span>
                    </div>
                    {doc.url ? <span className="user-dossier__open">Open</span> : null}
                  </>
                );
                return doc.url ? (
                  <a key={doc.title} className="user-dossier__doc" href={doc.url} target="_blank" rel="noreferrer">
                    {body}
                  </a>
                ) : (
                  <div key={doc.title} className="user-dossier__doc">
                    {body}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="user-dossier__empty">No documents on file for this user.</div>
          )}
          <label className="fc-btn user-dossier__upload">
            Upload document
            <input type="file" hidden accept="image/*,application/pdf" onChange={addDoc} />
          </label>
        </section>
      </div>
    </Modal>
  );
};

export default UserProfileModal;
