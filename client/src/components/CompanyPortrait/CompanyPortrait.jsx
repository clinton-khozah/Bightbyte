import React, { useEffect, useState } from "react";
import { api } from "../../api";
import "./CompanyPortrait.css";

const ProfileMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5.2 19.2c1.5-3.6 4-5.4 6.8-5.4s5.3 1.8 6.8 5.4" />
  </svg>
);

const CompanyPortrait = ({ name = "Company" }) => {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    api("/api/company")
      .then((company) => setSrc(company?.photo_url || ""))
      .catch(() => setSrc(""));
  }, []);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showPhoto = Boolean(src) && !failed;

  return (
    <div className="company-portrait">
      {showPhoto ? (
        <img src={src} alt={name} onError={() => setFailed(true)} />
      ) : (
        <ProfileMark />
      )}
    </div>
  );
};

export default CompanyPortrait;
