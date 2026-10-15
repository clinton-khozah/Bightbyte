import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, uploadFiles } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../constants/roles";
import StatusChip from "../../components/StatusChip/StatusChip";
import DriverRatings from "../../components/DriverRatings/DriverRatings";
import DriverCheckinHistory from "../../components/DriverCheckinHistory/DriverCheckinHistory";
import StarRating from "../../components/StarRating/StarRating";
import { computeDriverScore } from "../../lib/driverScore";
import "../VehiclesPage/VehiclesPage.css";
import "./UserDetailPage.css";

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

const UserDetailPage = () => {
  const { id } = useParams();
  const { user: session } = useAuth();
  const [profile, setProfile] = useState(null);
  const [companyName, setCompanyName] = useState("—");
  const [vehicleLabel, setVehicleLabel] = useState("Unassigned");
  const [reviews, setReviews] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    Promise.all([
      api(`/api/users/${id}`),
      api("/api/companies").catch(() => []),
      api("/api/vehicles").catch(() => []),
      api("/api/reviews").catch(() => []),
      api("/api/incidents").catch(() => []),
      api("/api/checkins").catch(() => []),
      api("/api/checkin-schedules").catch(() => []),
    ])
      .then(([row, companies, vehicles, reviewRows, incidentRows, checkinRows, schedules]) => {
        setProfile(row);
        setCompanyName(companies.find((c) => c.id === row.company_id)?.name || "—");
        const vehicle = vehicles.find((v) => v.id === row.assigned_vehicle_id);
        setVehicleLabel(vehicle ? `${vehicle.registration} — ${vehicle.make} ${vehicle.model}` : "Unassigned");
        setReviews(reviewRows.filter((item) => item.driver_id === row.id));
        setIncidents(incidentRows.filter((item) => item.driver_id === row.id));
        setCheckins(checkinRows.filter((item) => item.driver_id === row.id));
        setSchedule(schedules.find((item) => item.driver_id === row.id && item.active !== false) || null);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [id]);

  if (error) return <p className="fc-error">{error}</p>;
  if (!profile) return <p>Loading</p>;

  const letter = (String(profile.full_name).trim().split(/\s+/)[0]?.[0] || "U").toUpperCase();
  const score = computeDriverScore({
    reviews,
    incidents,
    checkins,
    ratings: profile.ratings || [],
    schedule,
  });

  const addDoc = async (event) => {
    if (!event.target.files?.length) return;
    const file = event.target.files[0];
    const { urls } = await uploadFiles([file]);
    await api(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        documents: [...(profile.documents || []), { title: file.name, category: "file", url: urls[0] }],
      }),
    });
    load();
  };

  const addRating = async ({ score, comment }) => {
    await api(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ratings: [
          {
            score,
            comment,
            rater_id: session?.id,
            rater_name: session?.full_name || session?.email,
            created_at: new Date().toISOString(),
          },
          ...(profile.ratings || []),
        ],
      }),
    });
    await load();
  };

  return (
    <div className="user-detail">
      <Link className="user-detail__back" to="/drivers">
        ← {session?.role === "driver" ? "My Profile" : "User Management"}
      </Link>
      <div className="user-detail__hero">
        {profile.photo_url ? (
          <img className="user-detail__photo" src={profile.photo_url} alt="" />
        ) : (
          <div className="user-detail__photo-fallback">{letter}</div>
        )}
        <div>
          <h2>
            {profile.full_name} <StatusChip value={profile.status || "active"} />
          </h2>
          <p>{profile.email}</p>
          {profile.role === "driver" ? (
            <StarRating
              value={score.overall}
              outOf
              label={
                schedule
                  ? `Check-in due ${
                      schedule.due_weekday
                        ? `${schedule.due_weekday[0].toUpperCase()}${schedule.due_weekday.slice(1)} `
                        : ""
                    }${schedule.due_time}`
                  : "No schedule yet"
              }
            />
          ) : null}
          <div className="gh-facts">
            <div>
              <span>Role</span>
              {profile.role || "—"}
            </div>
            <div>
              <span>Company</span>
              {companyName}
            </div>
            <div>
              <span>Employee ID</span>
              {profile.employee_id || "—"}
            </div>
            <div>
              <span>Phone</span>
              {profile.phone || "—"}
            </div>
            <div>
              <span>ID number</span>
              {profile.id_number || "—"}
            </div>
            <div>
              <span>Address</span>
              {profile.address || "—"}
            </div>
            <div>
              <span>Start date</span>
              {profile.start_date || "—"}
            </div>
            <div>
              <span>Last login</span>
              {formatLogin(profile.last_login)}
            </div>
            <div>
              <span>Assigned vehicle</span>
              {vehicleLabel}
            </div>
            <div>
              <span>Emergency contact</span>
              {profile.emergency_contact_name || "—"}
            </div>
            <div>
              <span>Emergency number</span>
              {profile.emergency_contact_number || "—"}
            </div>
          </div>
        </div>
      </div>
      <h3>Driver information</h3>
      <div className="gh-facts" style={{ marginBottom: 24 }}>
        <div>
          <span>Licence number</span>
          {profile.license_no || "—"}
        </div>
        <div>
          <span>Licence expiry</span>
          {profile.license_expiry || "—"}
        </div>
        <div>
          <span>Licence codes</span>
          {profile.license_codes || "—"}
        </div>
        <div>
          <span>PrDP</span>
          {profile.prdp ? String(profile.prdp).replaceAll("_", " ") : "—"}
        </div>
      </div>
      {profile.role === "driver" ? (
        <>
          <DriverCheckinHistory score={score} />
          <DriverRatings
            score={score}
            ratings={profile.ratings || []}
            canRate={can(session, "drivers", "edit")}
            onRate={addRating}
          />
        </>
      ) : null}
      <h3>Documents</h3>
      {(profile.documents || []).length ? (
        <div className="user-detail__docs">
          {(profile.documents || []).map((doc) => {
            const body = (
              <>
                {doc.url && !/\.pdf(\?|$)/i.test(doc.url) ? (
                  <img className="user-detail__thumb" src={doc.url} alt="" />
                ) : (
                  <span className="user-detail__thumb-icon">DOC</span>
                )}
                <div>
                  <strong>{doc.title}</strong>
                  <div style={{ fontSize: 12, color: "#707070" }}>{doc.category || "file"}</div>
                </div>
                {doc.url ? <span style={{ color: "#006239", fontWeight: 600, fontSize: 12 }}>Open</span> : null}
              </>
            );
            return doc.url ? (
              <a key={doc.title} className="user-detail__doc" href={doc.url} target="_blank" rel="noreferrer">
                {body}
              </a>
            ) : (
              <div key={doc.title} className="user-detail__doc">
                {body}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="user-detail__empty">No documents on file for this user.</div>
      )}
      {can(session, "drivers", "edit") ? (
        <label className="fc-btn">
          Upload document
          <input type="file" hidden accept="image/*,application/pdf" onChange={addDoc} />
        </label>
      ) : null}
    </div>
  );
};

export default UserDetailPage;
