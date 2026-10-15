import React, { useMemo, useState } from "react";
import Modal from "../Modal/Modal";
import StatusChip from "../StatusChip/StatusChip";
import "./VehicleReportModal.css";

const money = (n) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(n || 0));

const monthLabel = (date) =>
  date.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });

const inPeriod = (iso, period, anchor) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  if (period === "year") return date.getFullYear() === anchor.getFullYear();
  return date.getFullYear() === anchor.getFullYear() && date.getMonth() === anchor.getMonth();
};

const VehicleReportModal = ({
  vehicle,
  driver,
  checkins = [],
  reviews = [],
  period: initialPeriod = "month",
  anchorDate,
  onClose,
}) => {
  const [period, setPeriod] = useState(initialPeriod);
  const anchor = useMemo(() => new Date(anchorDate || Date.now()), [anchorDate]);

  const periodCheckins = checkins.filter((row) => inPeriod(row.created_at, period, anchor));
  const periodReviews = reviews.filter((row) => inPeriod(row.review_month || row.created_at, period, anchor));
  const total = periodCheckins.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const odoValues = periodCheckins.map((row) => Number(row.odometer)).filter((n) => Number.isFinite(n) && n > 0);
  const kmDelta = odoValues.length ? Math.max(...odoValues) - Math.min(...odoValues) : 0;

  const months = useMemo(() => {
    if (period !== "year") return [];
    return Array.from({ length: 12 }, (_, month) => {
      const rows = checkins.filter((row) => {
        const date = new Date(row.created_at);
        return date.getFullYear() === anchor.getFullYear() && date.getMonth() === month;
      });
      return {
        label: new Date(anchor.getFullYear(), month, 1).toLocaleDateString("en-ZA", { month: "short" }),
        total: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
        count: rows.length,
      };
    });
  }, [period, checkins, anchor]);

  const titlePeriod =
    period === "year" ? String(anchor.getFullYear()) : monthLabel(anchor);

  return (
    <Modal
      xl
      title="Vehicle report"
      subtitle={`${vehicle?.registration || "Vehicle"} · ${titlePeriod} ${period === "year" ? "year" : "month"}`}
      onClose={onClose}
    >
      <div className="vehicle-report">
        <div className="vehicle-report__tabs">
          <button
            type="button"
            className="fc-btn"
            aria-pressed={period === "month"}
            onClick={() => setPeriod("month")}
          >
            Monthly
          </button>
          <button
            type="button"
            className="fc-btn"
            aria-pressed={period === "year"}
            onClick={() => setPeriod("year")}
          >
            Yearly
          </button>
        </div>

        <div className="vehicle-report__hero">
          {vehicle?.photo_url ? (
            <img src={vehicle.photo_url} alt="" />
          ) : (
            <div className="vehicle-report__hero-fallback">No photo</div>
          )}
          <div>
            <h4>
              {vehicle?.registration}
              <StatusChip value={vehicle?.status} />
            </h4>
            <p>
              {vehicle?.make} {vehicle?.model} · {vehicle?.year}
              {driver?.full_name ? ` · ${driver.full_name}` : ""}
            </p>
            <dl className="vehicle-report__facts">
              <div>
                <dt>VIN</dt>
                <dd>{vehicle?.vin || "—"}</dd>
              </div>
              <div>
                <dt>Odometer</dt>
                <dd>{Number(vehicle?.odometer || 0).toLocaleString()} km</dd>
              </div>
              <div>
                <dt>Fuel</dt>
                <dd>{vehicle?.fuel_type || "—"}</dd>
              </div>
              <div>
                <dt>Licence disc</dt>
                <dd>{vehicle?.licence_expiry || "—"}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="vehicle-report__kpis">
          <div className="vehicle-report__kpi">
            <span>Check-ins</span>
            <strong>{periodCheckins.length}</strong>
          </div>
          <div className="vehicle-report__kpi">
            <span>Cash in</span>
            <strong>{money(total)}</strong>
          </div>
          <div className="vehicle-report__kpi">
            <span>Reviews</span>
            <strong>{periodReviews.length}</strong>
          </div>
          <div className="vehicle-report__kpi">
            <span>Km in period</span>
            <strong>{kmDelta.toLocaleString()} km</strong>
          </div>
        </div>

        {period === "year" ? (
          <section>
            <h5>Monthly cash-in</h5>
            <div className="vehicle-report__months">
              {months.map((row) => (
                <div key={row.label} className="vehicle-report__month">
                  <span>
                    {row.label} · {row.count}
                  </span>
                  <strong>{money(row.total)}</strong>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h5>Check-ins</h5>
          {periodCheckins.length ? (
            <div className="vehicle-report__list">
              {periodCheckins.map((row) => (
                <div key={row.id} className="vehicle-report__row">
                  <div>
                    {new Date(row.created_at).toLocaleDateString("en-ZA", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    <br />
                    <small>{row.note || "No note"}</small>
                  </div>
                  <StatusChip value={row.status} />
                  <strong>{money(row.amount)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="vehicle-report__empty">No check-ins in this period.</div>
          )}
        </section>

        <section>
          <h5>Condition reviews</h5>
          {periodReviews.length ? (
            <div className="vehicle-report__list">
              {periodReviews.map((row) => (
                <div key={row.id}>
                  <div className="vehicle-report__row">
                    <div>
                      {new Date(row.review_month || row.created_at).toLocaleDateString("en-ZA", {
                        month: "long",
                        year: "numeric",
                      })}
                      <br />
                      <small>{row.notes || "No notes"}</small>
                    </div>
                    <StatusChip value={row.condition} />
                    <StatusChip value={row.status} />
                  </div>
                  {row.photos?.length ? (
                    <div className="vehicle-report__photos">
                      {row.photos.map((src) => (
                        <img key={src} src={src} alt="" />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="vehicle-report__empty">No reviews in this period.</div>
          )}
        </section>

        <section>
          <h5>Vehicle documents</h5>
          {(vehicle?.documents || []).length ? (
            <div className="vehicle-report__list vehicle-report__docs">
              {(vehicle.documents || []).map((doc) =>
                doc.url ? (
                  <a key={doc.title} href={doc.url} target="_blank" rel="noreferrer">
                    <span>{doc.title}</span>
                    <span>{doc.category}</span>
                  </a>
                ) : (
                  <div key={doc.title}>
                    <span>{doc.title}</span>
                    <span>{doc.category}</span>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="vehicle-report__empty">No vehicle documents on file.</div>
          )}
        </section>
      </div>
    </Modal>
  );
};

export default VehicleReportModal;
