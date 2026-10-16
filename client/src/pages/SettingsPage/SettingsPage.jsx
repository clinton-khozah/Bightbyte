import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, uploadFiles } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../constants/roles";
import OpsPage from "../../components/OpsPage/OpsPage";
import PhotoUploadField from "../../components/PhotoUploadField/PhotoUploadField";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import "./SettingsPage.css";

const SettingsPage = () => {
  const { user, refreshUser } = useAuth();
  const [company, setCompany] = useState({
    name: "",
    code: "",
    city: "",
    contact_email: "",
    photo_url: "",
  });
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    email: "",
    photo_url: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const canManage = can(user, "settings", "edit");

  useEffect(() => {
    api("/api/company")
      .then(setCompany)
      .catch(() => setCompany((c) => ({ ...c, name: user?.company_name || "" })));
    setProfile({
      full_name: user?.full_name || "",
      phone: user?.phone || "",
      email: user?.email || "",
      photo_url: user?.photo_url || "",
    });
  }, [user]);

  const onCompanyPhoto = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;
    setError("");
    try {
      const { urls } = await uploadFiles(files);
      if (!urls?.[0]) throw new Error("The photo did not upload. Try again.");
      setCompany((c) => ({ ...c, photo_url: urls[0] }));
    } catch (err) {
      setError(err.message || "Could not upload the company photo.");
    }
  };

  const onProfilePhoto = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;
    const { urls } = await uploadFiles(files);
    setProfile((p) => ({ ...p, photo_url: urls[0] }));
  };

  return (
    <>
      <OpsPage
        crumb={["Administration", "Settings"]}
        title="Settings"
        subtitle="Company profile, your account and where files are kept."
      >
        <div className="settings-grid">
          <section className="settings-card">
            <header>
              <h2>Company</h2>
              <p>Shown in the top bar with your company and role.</p>
            </header>
            <form
              className="fc-form"
              onSubmit={async (event) => {
                event.preventDefault();
                setError("");
                if (!canManage) return;
                try {
                  const companyId = company.id || user.company_id;
                  if (!companyId) throw new Error("Company not found.");
                  const saved = await api(`/api/companies/${companyId}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      name: company.name,
                      code: company.code,
                      city: company.city,
                      contact_email: company.contact_email,
                      photo_url: company.photo_url,
                    }),
                  });
                  setCompany(saved);
                  await refreshUser();
                  setSuccess("Company profile was saved.");
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              <div className="settings-card__photo">
                <PhotoUploadField
                  src={company.photo_url}
                  name={company.name || "Company"}
                  label="Company photo"
                  onChange={onCompanyPhoto}
                />
              </div>
              <label>
                Company name
                <input
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  disabled={!canManage}
                  required
                />
              </label>
              <label>
                Code
                <input
                  value={company.code}
                  onChange={(e) => setCompany({ ...company, code: e.target.value.toUpperCase() })}
                  disabled={!canManage}
                />
              </label>
              <label>
                City
                <input
                  value={company.city || ""}
                  onChange={(e) => setCompany({ ...company, city: e.target.value })}
                  disabled={!canManage}
                />
              </label>
              <label>
                Contact email
                <input
                  type="email"
                  value={company.contact_email || ""}
                  onChange={(e) => setCompany({ ...company, contact_email: e.target.value })}
                  disabled={!canManage}
                />
              </label>
              {canManage ? (
                <div className="fc-form__actions">
                  <button className="fc-btn fc-btn--primary" type="submit">
                    Save company
                  </button>
                </div>
              ) : (
                <p className="settings-card__note">Only an administrator can change the company profile.</p>
              )}
            </form>
          </section>

          <section className="settings-card">
            <header>
              <h2>Your account</h2>
              <p>{user?.role_label || user?.role || "—"}</p>
            </header>
            <form
              className="fc-form"
              onSubmit={async (event) => {
                event.preventDefault();
                setError("");
                try {
                  await api("/api/me", {
                    method: "PATCH",
                    body: JSON.stringify({
                      full_name: profile.full_name,
                      phone: profile.phone,
                      photo_url: profile.photo_url,
                    }),
                  });
                  await refreshUser();
                  setSuccess("Your account was saved.");
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              <div className="settings-card__photo">
                <PhotoUploadField
                  src={profile.photo_url}
                  name={profile.full_name || "You"}
                  onChange={onProfilePhoto}
                />
              </div>
              <label>
                Full name
                <input
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  required
                />
              </label>
              <label>
                Phone
                <input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </label>
              <label className="fc-form__full">
                Email
                <input value={profile.email} disabled />
              </label>
              <div className="fc-form__actions">
                <button className="fc-btn fc-btn--primary" type="submit">
                  Save account
                </button>
              </div>
            </form>
          </section>

          <section className="settings-card">
            <header>
              <h2>Workspace</h2>
              <p>Roles, rights and file storage for this company.</p>
            </header>
            <dl className="settings-dl">
              <div>
                <dt>Roles & rights</dt>
                <dd>
                  <Link to="/roles-rights">Open Roles & Rights</Link>
                </dd>
              </div>
              <div>
                <dt>Storage</dt>
                <dd>Slips, photos and documents are stored on this server.</dd>
              </div>
            </dl>
          </section>
        </div>
        {error ? <p className="fc-error">{error}</p> : null}
      </OpsPage>
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
    </>
  );
};

export default SettingsPage;
