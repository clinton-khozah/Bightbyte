import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import StatusChip from "../../components/StatusChip/StatusChip";
import PaymentChart from "../../components/PaymentChart/PaymentChart";
import VehicleReportModal from "../../components/VehicleReportModal/VehicleReportModal";
import "../UserDetailPage/UserDetailPage.css";
import "../VehiclesPage/VehiclesPage.css";
import "./CheckinDetailPage.css";

const money = (n) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(n || 0));

const when = (value) =>
  value
    ? new Date(value).toLocaleString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const CheckinDetailPage = () => {
  const { id } = useParams();
  const [checkin, setCheckin] = useState(null);
  const [driver, setDriver] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [history, setHistory] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api(`/api/checkins/${id}`),
      api("/api/checkins"),
      api("/api/vehicles"),
      api("/api/users").catch(() => api("/api/drivers")),
      api("/api/reviews").catch(() => []),
    ])
      .then(([row, checkins, vehicles, people, reviewRows]) => {
        setCheckin(row);
        setHistory(checkins.filter((c) => c.driver_id === row.driver_id));
        setVehicle(vehicles.find((v) => v.id === row.vehicle_id) || null);
        setDriver(people.find((p) => p.id === row.driver_id) || null);
        setReviews(reviewRows.filter((r) => r.vehicle_id === row.vehicle_id));
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="fc-error">{error}</p>;
  if (!checkin) return <p>Loading</p>;

  const letter = (String(driver?.full_name || "U").trim().split(/\s+/)[0]?.[0] || "U").toUpperCase();

  return (
    <div className="checkin-detail">
      <Link className="checkin-detail__back" to="/checkins">
        ← Check-in
      </Link>
      <div className="checkin-detail__kpis">
        <div className="checkin-detail__kpi">
          <span>Amount</span>
          <strong>{money(checkin.amount)}</strong>
        </div>
        <div className="checkin-detail__kpi">
          <span>Status</span>
          <strong>
            <StatusChip value={checkin.status} />
          </strong>
        </div>
        <div className="checkin-detail__kpi">
          <span>Odometer</span>
          <strong>{checkin.odometer ? `${Number(checkin.odometer).toLocaleString()} km` : "—"}</strong>
        </div>
        <div className="checkin-detail__kpi">
          <span>When</span>
          <strong>{when(checkin.created_at)}</strong>
        </div>
      </div>
      {checkin.late_fee_applied ? (
        <p className="checkin-detail__note">
          Includes a late fee of {money(checkin.late_fee_applied)} because this check-in was after the scheduled time.
        </p>
      ) : null}
      {checkin.note ? <p className="checkin-detail__note">{checkin.note}</p> : null}

      <PaymentChart rows={history} />

      <section className="checkin-detail__section">
        <h3>Proof of payment</h3>
        {checkin.proof_url ? (
          <a className="user-detail__doc" href={checkin.proof_url} target="_blank" rel="noreferrer">
            <img className="user-detail__thumb" src={checkin.proof_url} alt="" />
            <div>
              <strong>Proof of payment</strong>
              <div style={{ fontSize: 12, color: "#707070" }}>This check-in only</div>
            </div>
            <span style={{ color: "#006239", fontWeight: 600, fontSize: 12 }}>Open</span>
          </a>
        ) : (
          <div className="user-detail__empty">No proof uploaded for this check-in.</div>
        )}
      </section>

      <section className="checkin-detail__section">
        <h3>Driver profile</h3>
        <div className="user-detail__hero">
          {driver?.photo_url ? (
            <img className="user-detail__photo" src={driver.photo_url} alt="" />
          ) : (
            <div className="user-detail__photo-fallback">{letter}</div>
          )}
          <div>
            <h2>
              {driver?.full_name || "Unknown driver"} <StatusChip value={driver?.status || "active"} />
            </h2>
            <p>{driver?.email || "—"}</p>
            <div className="gh-facts">
              <div>
                <span>Phone</span>
                {driver?.phone || "—"}
              </div>
              <div>
                <span>Employee ID</span>
                {driver?.employee_id || "—"}
              </div>
              <div>
                <span>Licence</span>
                {driver?.license_no || "—"}
              </div>
              <div>
                <span>Vehicle</span>
                {vehicle ? `${vehicle.registration} — ${vehicle.make} ${vehicle.model}` : "—"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="checkin-detail__reports">
        <button className="fc-btn fc-btn--primary" type="button" onClick={() => setReport("month")}>
          Monthly vehicle report
        </button>
        <button className="fc-btn" type="button" onClick={() => setReport("year")}>
          Yearly vehicle report
        </button>
      </div>

      {report ? (
        <VehicleReportModal
          vehicle={vehicle}
          driver={driver}
          checkins={history.filter((r) => r.vehicle_id === checkin.vehicle_id)}
          reviews={reviews}
          period={report}
          anchorDate={checkin.created_at}
          onClose={() => setReport(null)}
        />
      ) : null}
    </div>
  );
};

export default CheckinDetailPage;
