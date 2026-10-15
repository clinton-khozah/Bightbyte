import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import StatusChip from "../../components/StatusChip/StatusChip";
import Avatar from "../../components/Avatar/Avatar";
import PhotoViewer from "../../components/PhotoViewer/PhotoViewer";
import "../VehiclesPage/VehiclesPage.css";
import "./IncidentDetailPage.css";

const money = (n) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(n || 0));

const statusLabel = (status) => {
  if (status === "open") return "pending";
  if (status === "review") return "under review";
  return status || "pending";
};

const IncidentDetailPage = () => {
  const { id } = useParams();
  const [row, setRow] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [person, setPerson] = useState(null);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    Promise.all([
      api(`/api/incidents/${id}`),
      api("/api/vehicles"),
      api("/api/users").catch(() => api("/api/drivers")),
    ])
      .then(([incident, vehicles, people]) => {
        setRow(incident);
        setVehicle(vehicles.find((v) => v.id === incident.vehicle_id) || null);
        setPerson(people.find((p) => p.id === (incident.logged_by || incident.driver_id)) || null);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="fc-error">{error}</p>;
  if (!row) return <p>Loading</p>;

  const photos = row.photos || [];
  const kind = row.kind || "incident";

  return (
    <div className="incident-detail">
      <Link className="incident-detail__back" to="/incidents">
        ← Incidents
      </Link>
      <div className="gh-vehicle-hero">
        <div className="incident-detail__portraits">
          <div>
            <Avatar
              src={vehicle?.photo_url || vehicle?.photos?.[0]}
              name={vehicle?.registration || "V"}
              size="xl"
            />
            <span>{vehicle?.registration || "Vehicle"}</span>
          </div>
          <div>
            <Avatar src={person?.photo_url} name={person?.full_name || "U"} size="xl" />
            <span>{person?.full_name || "Logged by"}</span>
          </div>
        </div>
        <div>
          <h2>
            {row.title || vehicle?.registration || "Record"} <StatusChip value={statusLabel(row.status)} />
          </h2>
          <p>{`${kind.replace(/^./, (c) => c.toUpperCase())} logged against this vehicle.`}</p>
          <div className="gh-facts">
            <div>
              <span>Logged by</span>
              <span className="incident-detail__by">
                <Avatar src={person?.photo_url} name={person?.full_name || "U"} />
                {person?.full_name || "—"}
              </span>
            </div>
            <div>
              <span>When</span>
              {row.occurred_at || row.created_at
                ? new Date(row.occurred_at || row.created_at).toLocaleString("en-ZA")
                : "—"}
            </div>
            <div>
              <span>Vehicle</span>
              {vehicle ? `${vehicle.registration} — ${vehicle.make} ${vehicle.model}` : "—"}
            </div>
            <div>
              <span>Record</span>
              <StatusChip value={kind} />
            </div>
            <div>
              <span>Amount</span>
              {money(row.amount)}
            </div>
            <div>
              <span>Priority</span>
              <StatusChip value={row.severity} />
            </div>
            <div>
              <span>Status</span>
              <StatusChip value={statusLabel(row.status)} />
            </div>
          </div>
        </div>
      </div>
      <p className="incident-detail__notes">{row.description || "No notes."}</p>
      <h3>Photos or documents</h3>
      {photos.length ? (
        <div className="incident-detail__photos">
          {photos.map((src, index) => (
            <figure key={src} className="incident-detail__photo">
              <button type="button" onClick={() => setViewer(index)}>
                <img src={src} alt={`Attachment ${index + 1}`} />
              </button>
            </figure>
          ))}
        </div>
      ) : (
        <div className="incident-detail__empty">No photos or documents on this record.</div>
      )}
      {viewer != null ? (
        <PhotoViewer photos={photos} index={viewer} alt="Incident file" onClose={() => setViewer(null)} onIndex={setViewer} />
      ) : null}
    </div>
  );
};

export default IncidentDetailPage;
