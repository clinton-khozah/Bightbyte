import React from "react";
import { Link } from "react-router-dom";
import Avatar from "../Avatar/Avatar";
import "../../pages/DashboardPage/DashboardPage.css";
import "./DriverDashboard.css";

const dueStamp = (iso) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short" });
};

const DriverDashboard = ({ data }) => {
  const kpis = data?.kpis || {};
  const vehicle = data?.assignedVehicle;
  const servicesDue = data?.servicesDue || [];
  return (
    <div className="sb-page driver-dash">
      <header className="sb-page__header">
        <div>
          <h1>Command centre</h1>
          <p>Your assigned vehicle, reviews and open risk.</p>
        </div>
      </header>

      <dl className="sb-kpis">
        <Link to={vehicle ? `/vehicles/${vehicle.id}` : "/vehicles"}>
          <dt>My vehicle</dt>
          <dd className="sb-kpis__vehicle">
            <Avatar
              src={vehicle?.photo_url || vehicle?.photos?.[0]}
              name={vehicle?.registration || "Vehicle"}
            />
            <span>{vehicle?.registration || "None"}</span>
          </dd>
        </Link>
        <Link to="/reviews">
          <dt>Reviews</dt>
          <dd>{kpis.reviews ?? 0}</dd>
        </Link>
        <Link to="/incidents">
          <dt>Open incidents</dt>
          <dd>{kpis.openIncidents ?? 0}</dd>
        </Link>
        <Link to="/maintenance">
          <dt>Service due</dt>
          <dd>{kpis.servicesDue ?? 0}</dd>
        </Link>
      </dl>

      <section className="sb-section">
        <div className="sb-section__head">
          <div>
            <h2>Assigned vehicle</h2>
            <p>The car you drive. Open it to see photos, odometer and documents.</p>
          </div>
          <Link className="sb-link-btn" to={vehicle ? `/vehicles/${vehicle.id}` : "/vehicles"}>
            {vehicle ? "Open vehicle" : "Vehicles"}
          </Link>
        </div>
        <div className="sb-card">
          <div className="sb-keys">
            {vehicle ? (
              <Link className="sb-keys__row" to={`/vehicles/${vehicle.id}`}>
                <div className="sb-keys__who">
                  <Avatar
                    src={vehicle.photo_url || vehicle.photos?.[0]}
                    name={vehicle.registration}
                    size="lg"
                  />
                  <div>
                    <strong>{vehicle.registration}</strong>
                    <small>
                      {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" ") || "Vehicle"}
                      {vehicle.odometer ? ` · ${Number(vehicle.odometer).toLocaleString("en-ZA")} km` : ""}
                    </small>
                  </div>
                </div>
                <code>{vehicle.status || "assigned"}</code>
              </Link>
            ) : (
              <div className="sb-keys__row">
                <div>
                  <strong>No vehicle assigned</strong>
                  <small>Ask your fleet manager to assign a car to you.</small>
                </div>
                <code>0</code>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="sb-section">
        <div className="sb-section__head">
          <div>
            <h2>Service</h2>
            <p>Due on your vehicle from odometer or months.</p>
          </div>
          <Link className="sb-link-btn" to="/maintenance">
            Open Service
          </Link>
        </div>
        <div className="sb-card">
          <div className="sb-keys">
            <div className="sb-keys__row sb-keys__row--head">
              <span>Vehicle</span>
              <span>Why it is due</span>
            </div>
            {servicesDue.length ? (
              servicesDue.map((row) => (
                <Link className="sb-keys__row" key={row.id} to="/maintenance">
                  <div className="sb-keys__who">
                    <Avatar src={row.photo_url} name={row.registration || "Vehicle"} />
                    <div>
                      <strong>{row.registration || "Vehicle"}</strong>
                      <small>
                        Due at {Number(row.next_due_km || 0).toLocaleString("en-ZA")} km or {dueStamp(row.next_due_date)}
                      </small>
                    </div>
                  </div>
                  <code>{row.kmDue ? "Odometer" : "2 months"}</code>
                </Link>
              ))
            ) : (
              <div className="sb-keys__row">
                <div>
                  <strong>No service due</strong>
                  <small>Your vehicle is still inside its km and month interval.</small>
                </div>
                <code>0</code>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="driver-dash__actions">
        <Link className="sb-link-btn" to="/reviews">
          New review
        </Link>
        <Link className="sb-link-btn" to="/incidents">
          Log incident
        </Link>
      </div>
    </div>
  );
};

export default DriverDashboard;
