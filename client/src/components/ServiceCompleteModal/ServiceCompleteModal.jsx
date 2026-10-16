import React, { useState } from "react";
import Modal from "../Modal/Modal";
import FileDrop from "../FileDrop/FileDrop";
import StatusChip from "../StatusChip/StatusChip";
import { uploadFiles } from "../../api";
import "./ServiceCompleteModal.css";

const slipItems = (slips) =>
  (slips || []).map((item, index) =>
    typeof item === "string"
      ? { url: item, title: `Document ${index + 1}`, category: "Service document" }
      : {
          url: item.url || item.file_url || "",
          title: item.title || `Document ${index + 1}`,
          category: item.category || "Service document",
        },
  );

const isPdf = (url) => /\.pdf(\?|$)/i.test(url || "");

const ServiceCompleteModal = ({ job, vehicle, onClose, onSave, canComplete = false }) => {
  const done = job?.status === "completed";
  const viewOnly = done || !canComplete;
  const [slips, setSlips] = useState(job?.slips || []);
  const [odometer, setOdometer] = useState(
    String(job?.completed_odometer ?? job?.odometer ?? vehicle?.odometer ?? ""),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const items = slipItems(slips);

  const onFiles = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;
    setError("");
    setBusy(true);
    try {
      const { urls } = await uploadFiles(files);
      setSlips((current) => [...(current || []), ...urls]);
    } catch (err) {
      setError(err.message || "Could not upload the service document.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const intervalMonths = Number(job?.interval_months || 2);
  const nextKm = Number(odometer || 0) + Number(job?.interval_km || 10000);
  const nextDate = (() => {
    const date = new Date();
    date.setMonth(date.getMonth() + intervalMonths);
    return date.toLocaleDateString("en-ZA");
  })();

  return (
    <Modal
      xl
      title={viewOnly ? "Service" : "Mark service done"}
      subtitle={
        viewOnly
          ? `Service record for ${vehicle?.registration || "this vehicle"}.`
          : `Upload workshop documents for ${vehicle?.registration || "this vehicle"}. You can add more than one.`
      }
      onClose={onClose}
    >
      <form
        className={`fc-form checkin-form service-complete${busy ? " is-busy" : ""}`}
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          if (viewOnly) {
            onClose();
            return;
          }
          if (!slips.length) {
            setError("Upload at least one service document before marking it done.");
            return;
          }
          setBusy(true);
          try {
            await onSave({
              slips,
              odometer: Number(odometer) || 0,
              complete: true,
            });
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <div className="service-complete__loading" role="status">
            <span className="service-complete__spinner" aria-hidden="true" />
            Saving service…
          </div>
        ) : null}
        <dl className="service-complete__facts">
          <div>
            <dt>Vehicle</dt>
            <dd>
              {vehicle ? `${vehicle.registration} — ${vehicle.make} ${vehicle.model}` : "—"}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <StatusChip value={job.status} />
            </dd>
          </div>
          <div>
            <dt>Due at km</dt>
            <dd>{Number(job.next_due_km || 0).toLocaleString()} km</dd>
          </div>
          <div>
            <dt>Due by date</dt>
            <dd>
              {job.next_due_date ? new Date(job.next_due_date).toLocaleDateString("en-ZA") : "—"}
            </dd>
          </div>
        </dl>
        {items.length ? (
          <div className="service-complete__docs">
            {items.map((doc) => (
              <a
                key={doc.url}
                className="service-complete__doc"
                href={doc.url}
                target="_blank"
                rel="noreferrer"
              >
                {doc.url && !isPdf(doc.url) ? (
                  <img className="service-complete__thumb" src={doc.url} alt="" />
                ) : (
                  <span className="service-complete__thumb-icon">DOC</span>
                )}
                <div>
                  <strong>{doc.title}</strong>
                  <div style={{ fontSize: 12, color: "#707070" }}>{doc.category}</div>
                </div>
                <span style={{ color: "#006239", fontWeight: 600, fontSize: 12 }}>Open</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="service-complete__empty">No documents uploaded yet.</div>
        )}
        {!viewOnly ? (
          <label>
            Odometer at service (km)
            <input
              type="number"
              min="0"
              step="1"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              required
            />
          </label>
        ) : null}
        {viewOnly ? null : (
          <FileDrop
            label="Service documents"
            multiple
            onChange={onFiles}
            previews={items.map((doc) => doc.url).filter(Boolean)}
          />
        )}
        {!viewOnly ? (
          <p className="fc-form__hint">
            Next service will be due at {nextKm.toLocaleString()} km or by {nextDate}, whichever
            comes first.
          </p>
        ) : null}
        {error ? <p className="fc-error">{error}</p> : null}
        <div className="fc-form__actions">
          <button className="fc-btn" type="button" onClick={onClose}>
            Close
          </button>
          {viewOnly ? null : (
            <button className="fc-btn fc-btn--primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Mark done"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default ServiceCompleteModal;
