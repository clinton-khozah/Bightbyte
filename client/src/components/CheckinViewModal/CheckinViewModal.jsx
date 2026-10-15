import React from "react";
import Modal from "../Modal/Modal";
import StatusChip from "../StatusChip/StatusChip";
import "./CheckinViewModal.css";

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

const Fact = ({ label, children }) => (
  <div>
    <dt>{label}</dt>
    <dd>{children || "—"}</dd>
  </div>
);

const DocRow = ({ title, category, url }) => {
  const body = (
    <>
      {url && !/\.pdf(\?|$)/i.test(url) ? (
        <img className="checkin-view__thumb" src={url} alt="" />
      ) : (
        <span className="checkin-view__thumb-icon">DOC</span>
      )}
      <div>
        <strong>{title}</strong>
        <span>{category}</span>
      </div>
      {url ? <span className="checkin-view__open">Open</span> : null}
    </>
  );
  return url ? (
    <a className="checkin-view__doc" href={url} target="_blank" rel="noreferrer">
      {body}
    </a>
  ) : (
    <div className="checkin-view__doc">{body}</div>
  );
};

const CheckinViewModal = ({
  checkin,
  driver,
  vehicle,
  onClose,
  onMonthlyReport,
  onYearlyReport,
}) => {
  const initials = String(driver?.full_name || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const docs = [
    checkin.proof_url
      ? { title: "Proof of payment", category: "Check-in", url: checkin.proof_url }
      : null,
    ...(driver?.documents || []),
  ].filter(Boolean);

  return (
    <Modal
      xl
      title="Check-in"
      subtitle="Driver profile, payment proof and vehicle reports."
      onClose={onClose}
    >
      <div className="checkin-view">
        <div className="checkin-view__kpis">
          <div className="checkin-view__kpi">
            <span>Amount</span>
            <strong>{money(checkin.amount)}</strong>
          </div>
          <div className="checkin-view__kpi">
            <span>Status</span>
            <strong>
              <StatusChip value={checkin.status} />
            </strong>
          </div>
          <div className="checkin-view__kpi">
            <span>Odometer</span>
            <strong>{checkin.odometer ? `${Number(checkin.odometer).toLocaleString()} km` : "—"}</strong>
          </div>
          <div className="checkin-view__kpi">
            <span>When</span>
            <strong>{when(checkin.created_at)}</strong>
          </div>
        </div>
        {checkin.note ? <p className="checkin-view__email">{checkin.note}</p> : null}

        <section>
          <h5>Driver profile</h5>
          <div className="checkin-view__hero">
            {driver?.photo_url ? (
              <img className="checkin-view__photo" src={driver.photo_url} alt="" />
            ) : (
              <div className="checkin-view__photo-fallback">{initials}</div>
            )}
            <div>
              <h4>
                {driver?.full_name || "Unknown driver"}
                <StatusChip value={driver?.status || "active"} />
              </h4>
              <p className="checkin-view__email">{driver?.email || "—"}</p>
              <dl className="checkin-view__facts">
                <Fact label="Phone">{driver?.phone}</Fact>
                <Fact label="Employee ID">{driver?.employee_id}</Fact>
                <Fact label="Licence">{driver?.license_no}</Fact>
                <Fact label="Licence expiry">{driver?.license_expiry}</Fact>
                <Fact label="Vehicle">
                  {vehicle ? `${vehicle.registration} — ${vehicle.make} ${vehicle.model}` : "—"}
                </Fact>
                <Fact label="VIN">{vehicle?.vin}</Fact>
              </dl>
            </div>
          </div>
        </section>

        <section>
          <h5>Documents</h5>
          {docs.length ? (
            <div className="checkin-view__docs">
              {docs.map((doc) => (
                <DocRow key={`${doc.title}-${doc.url}`} title={doc.title} category={doc.category} url={doc.url} />
              ))}
            </div>
          ) : (
            <div className="checkin-view__empty">No documents attached to this check-in or driver.</div>
          )}
        </section>

        <div className="checkin-view__reports">
          <button className="fc-btn fc-btn--primary" type="button" onClick={onMonthlyReport}>
            Monthly vehicle report
          </button>
          <button className="fc-btn" type="button" onClick={onYearlyReport}>
            Yearly vehicle report
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CheckinViewModal;
