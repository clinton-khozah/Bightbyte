import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import OperatingPosition from "../../components/OperatingPosition/OperatingPosition";
import CompanyApprovals from "../../components/CompanyApprovals/CompanyApprovals";
import DriverDashboard from "../../components/DriverDashboard/DriverDashboard";
import Avatar from "../../components/Avatar/Avatar";
import "./DashboardPage.css";

const money = (n) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(n || 0));

const dueStamp = (iso) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short" });
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    setError("");
    return api("/api/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  const kpis = data?.kpis || {};
  const totals = data?.finance?.totals || { expense: 0, total: 0, profit: 0 };
  const servicesDue = data?.servicesDue || [];

  if (data && user?.role === "driver") {
    return (
      <>
        {error ? (
          <p className="fc-error">
            {error}{" "}
            <button className="sb-link-btn" type="button" onClick={load}>
              Try again
            </button>
          </p>
        ) : null}
        <DriverDashboard data={data} />
      </>
    );
  }

  return (
    <div className="sb-page">
      <header className="sb-page__header">
        <div>
          <h1>Command centre</h1>
          <p>Live vehicles, cash check-ins, condition reviews and open risk.</p>
        </div>
      </header>

      {error ? (
        <p className="fc-error">
          {error}{" "}
          <button className="sb-link-btn" type="button" onClick={load}>
            Try again
          </button>
        </p>
      ) : null}

      {!data && !error ? <p>Loading</p> : null}

      {data ? (
        <>
          <CompanyApprovals rows={data.pendingCompanies || []} onChange={load} />

          <dl className="sb-kpis">
            <Link to="/vehicles">
              <dt>Vehicles</dt>
              <dd>{kpis.vehicles ?? 0}</dd>
            </Link>
            <Link to="/vehicles">
              <dt>In use</dt>
              <dd>{kpis.inUse ?? 0}</dd>
            </Link>
            <Link to="/checkins">
              <dt>Revenue</dt>
              <dd className="sb-kpis__revenue">{money(kpis.revenue ?? kpis.profitTotal ?? 0)}</dd>
            </Link>
            <Link to="/incidents">
              <dt>Open incidents</dt>
              <dd>{kpis.openIncidents ?? 0}</dd>
            </Link>
            <Link to="/maintenance">
              <dt>Services due</dt>
              <dd>{kpis.servicesDue ?? 0}</dd>
            </Link>
          </dl>

          <section className="sb-section">
            <div className="sb-section__head">
              <div>
                <h2>Maintenance and service</h2>
                <p>Due now from odometer or months. Open Service to upload the slip and close the job.</p>
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
                          <strong>{row.registration || row.vehicle_id || "Vehicle"}</strong>
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
                      <strong>No services due</strong>
                      <small>Every vehicle is still inside its km and month interval.</small>
                    </div>
                    <code>0</code>
                  </div>
                )}
              </div>
            </div>
          </section>

          {Number(kpis.pendingReviews) > 0 ? (
            <section className="sb-section">
              <div className="sb-section__head">
                <div>
                  <h2>Car reviews</h2>
                  <p>Submitted reviews waiting for a status.</p>
                </div>
                <Link className="sb-link-btn" to="/reviews">
                  Open reviews
                </Link>
              </div>
              <div className="sb-card">
                <div className="sb-keys">
                  <div className="sb-keys__row">
                    <div>
                      <strong>{kpis.pendingReviews} waiting</strong>
                      <small>Open Car reviews to accept or reject them.</small>
                    </div>
                    <code>{kpis.pendingReviews}</code>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <OperatingPosition months={data.finance?.months || []} totals={totals} />
        </>
      ) : null}
    </div>
  );
};

export default DashboardPage;
