import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import OperatingPosition from "../../components/OperatingPosition/OperatingPosition";
import "./DashboardPage.css";

const money = (n) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(n || 0));

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/dashboard").then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="fc-error">{error}</p>;
  if (!data) return <p>Loading</p>;

  const totals = data.finance?.totals || { expense: 0, total: 0, profit: 0 };

  return (
    <div className="sb-page">
      <header className="sb-page__header">
        <div>
          <h1>Command centre</h1>
          <p>Live vehicles, cash check-ins, condition reviews and open risk.</p>
        </div>
      </header>

      <dl className="sb-kpis">
        <div>
          <dt>Vehicles</dt>
          <dd>{data.kpis.vehicles}</dd>
        </div>
        <div>
          <dt>In use</dt>
          <dd>{data.kpis.inUse}</dd>
        </div>
        <div>
          <dt>Check-in total</dt>
          <dd>{money(data.kpis.checkinTotal)}</dd>
        </div>
        <div>
          <dt>Open incidents</dt>
          <dd>{data.kpis.openIncidents}</dd>
        </div>
        <div>
          <dt>Services due</dt>
          <dd>{data.kpis.servicesDue}</dd>
        </div>
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
            {(data.servicesDue || []).length ? (
              data.servicesDue.map((row) => (
                <div className="sb-keys__row" key={row.id}>
                  <div>
                    <strong>{row.registration || row.vehicle_id}</strong>
                    <small>
                      Due at {Number(row.next_due_km || 0).toLocaleString()} km or{" "}
                      {row.next_due_date
                        ? new Date(row.next_due_date).toLocaleDateString("en-ZA", {
                            day: "2-digit",
                            month: "short",
                          })
                        : "—"}
                    </small>
                  </div>
                  <code>{row.kmDue ? "Odometer" : "2 months"}</code>
                </div>
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

      <OperatingPosition months={data.finance?.months || []} totals={totals} />
    </div>
  );
};

export default DashboardPage;
