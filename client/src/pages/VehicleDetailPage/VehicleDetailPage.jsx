import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, uploadFiles } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../constants/roles";
import StatusChip from "../../components/StatusChip/StatusChip";
import Modal from "../../components/Modal/Modal";
import MechanicCard from "../../components/MechanicCard/MechanicCard";
import OperatingHoursField from "../../components/OperatingHoursField/OperatingHoursField";
import VehicleAssetPanel, { VehicleAssetRow } from "../../components/VehicleAssetPanel/VehicleAssetPanel";
import StarRating from "../../components/StarRating/StarRating";
import PhotoViewer from "../../components/PhotoViewer/PhotoViewer";
import PageLoader from "../../components/PageLoader/PageLoader";
import "../VehiclesPage/VehiclesPage.css";
import "../UserDetailPage/UserDetailPage.css";
import "./VehicleDetailPage.css";

const money = (n) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(Number(n || 0));

const starsFromCondition = (condition) => {
  if (condition === "good") return 5;
  if (condition === "fair") return 3.5;
  if (condition === "poor") return 2;
  return 0;
};

const VehicleDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [supplies, setSupplies] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState(null);
  const [openSupply, setOpenSupply] = useState(false);
  const [openMechanic, setOpenMechanic] = useState(false);
  const [supplyForm, setSupplyForm] = useState({ name: "", qty: "", unit: "ea", location: "" });
  const [mechanicForm, setMechanicForm] = useState({
    full_name: "",
    trade: "",
    phone: "",
    workshop: "",
    hours: "08:00–17:00",
  });

  const load = () =>
    api(`/api/vehicles/${id}`)
      .then((row) => {
        const q = row.company_id ? `?company_id=${encodeURIComponent(row.company_id)}` : "";
        return Promise.all([
          row,
          api(`/api/supplies${q}`).catch(() => []),
          api(`/api/mechanics${q}`).catch(() => []),
          api(`/api/reviews${q}`).catch(() => []),
        ]);
      })
      .then(([row, stock, people, reviewRows]) => {
        setVehicle(row);
        setSupplies(stock.filter((item) => item.vehicle_id === id));
        setMechanics(people);
        setReviews(reviewRows.filter((item) => item.vehicle_id === id));
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (window.location.hash === "#supplies") {
      document.getElementById("supplies")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [vehicle]);

  if (error) return <p className="fc-error">{error}</p>;
  if (!vehicle) return <PageLoader />;

  const scored = reviews.map((r) => starsFromCondition(r.condition)).filter(Boolean);
  const rating = scored.length ? scored.reduce((sum, n) => sum + n, 0) / scored.length : 0;
  const letter = String(vehicle.registration || "V").replace(/\s+/g, "").slice(-1).toUpperCase();
  const photos = Array.from(
    new Set([vehicle.photo_url, ...(vehicle.photos || [])].filter(Boolean)),
  );

  const addPhoto = async (event) => {
    if (!event.target.files?.length) return;
    const { urls } = await uploadFiles(event.target.files);
    await api(`/api/vehicles/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        photos: [...(vehicle.photos || []), ...urls],
        photo_url: vehicle.photo_url || urls[0],
      }),
    });
    load();
  };

  const addDoc = async (event) => {
    if (!event.target.files?.length) return;
    const file = event.target.files[0];
    const { urls } = await uploadFiles([file]);
    await api(`/api/vehicles/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        documents: [...(vehicle.documents || []), { title: file.name, category: "file", url: urls[0] }],
      }),
    });
    load();
  };

  return (
    <div className="gh-vehicle-detail">
      <Link className="user-detail__back" to="/vehicles">
        ← Vehicles
      </Link>
      <div className="user-detail__hero">
        {vehicle.photo_url ? (
          <button type="button" className="vehicle-profile__portrait" onClick={() => setViewer(0)}>
            <img className="user-detail__photo" src={vehicle.photo_url} alt={vehicle.registration} />
          </button>
        ) : (
          <div className="user-detail__photo-fallback">{letter}</div>
        )}
        <div>
          <h2>
            {vehicle.registration} <StatusChip value={vehicle.status} />
          </h2>
          <p>
            {vehicle.make} {vehicle.model} · {vehicle.year}
          </p>
          <StarRating value={rating} label={scored.length ? `${scored.length} reviews` : "No reviews yet"} />
          {user?.role === "driver" || user?.role_key === "driver" ? null : (
            <div className="vehicle-profile__value">
              <span>Vehicle value</span>
              <strong>{vehicle.value ? money(vehicle.value) : "—"}</strong>
            </div>
          )}
          <div className="gh-facts">
            <div>
              <span>VIN</span>
              {vehicle.vin || "—"}
            </div>
            <div>
              <span>Colour</span>
              {vehicle.colour || "—"}
            </div>
            <div>
              <span>Fuel</span>
              {vehicle.fuel_type || "—"}
            </div>
            <div>
              <span>Engine</span>
              {vehicle.engine || "—"}
            </div>
            <div>
              <span>Odometer</span>
              {Number(vehicle.odometer || 0).toLocaleString()} km
            </div>
            <div>
              <span>Licence disc</span>
              {vehicle.licence_expiry || "—"}
            </div>
          </div>
        </div>
      </div>
      <h3 style={{ marginBottom: 8 }}>Photos</h3>
      <div className="gh-gallery">
        {photos.map((src, index) => (
          <button key={src} type="button" onClick={() => setViewer(index)}>
            <img src={src} alt={`${vehicle.registration} photo ${index + 1}`} />
          </button>
        ))}
      </div>
      {can(user, "vehicles", "edit") ? (
        <label className="fc-btn" style={{ marginBottom: 20 }}>
          Add photos
          <input type="file" accept="image/*" multiple hidden onChange={addPhoto} />
        </label>
      ) : null}
      <VehicleAssetPanel
        title="Documents"
        description="Statutory and insurance files for this vehicle. Each record shows its type and whether a file is on record."
        action={
          can(user, "vehicles", "edit") ? (
            <label className="fc-btn">
              Upload document
              <input type="file" hidden onChange={addDoc} />
            </label>
          ) : null
        }
        empty="No documents have been filed for this vehicle."
      >
        {(vehicle.documents || []).length
          ? (vehicle.documents || []).map((doc) => (
              <VehicleAssetRow
                key={doc.title}
                href={doc.url || undefined}
                kicker={doc.category ? String(doc.category).replaceAll("_", " ") : "Document"}
                title={doc.title}
                detail={doc.url ? "Filed against this vehicle" : "File not yet uploaded"}
                status={
                  doc.url
                    ? { label: "On file", tone: "ok" }
                    : { label: "Awaiting upload", tone: "warn" }
                }
                action={doc.url ? "Open" : null}
              />
            ))
          : null}
      </VehicleAssetPanel>

      <div id="supplies">
        <VehicleAssetPanel
          title="Supplies"
          description="Consumables and spare parts allocated to this vehicle, with quantity and store location."
          action={
            can(user, "vehicles", "edit") ? (
              <button className="fc-btn fc-btn--primary" type="button" onClick={() => setOpenSupply(true)}>
                Add supply
              </button>
            ) : null
          }
          empty="No supplies have been allocated to this vehicle."
        >
          {supplies.length
            ? supplies.map((item) => (
                <VehicleAssetRow
                  key={item.id}
                  kicker="Stock item"
                  title={item.name}
                  detail={`${item.qty} ${item.unit}${item.location ? ` · Stored at ${item.location}` : ""}`}
                  status={{ label: item.location || "Unlocated", tone: "muted" }}
                />
              ))
            : null}
        </VehicleAssetPanel>
      </div>

      <section className="vehicle-mechanics">
        <div className="vehicle-mechanics__head">
          <div>
            <h3>Mechanics</h3>
            <p className="vehicle-supplies__empty">Workshop contacts for this company. None are listed until you add them.</p>
          </div>
          {can(user, "mechanics", "create") ? (
            <button className="fc-btn fc-btn--primary" type="button" onClick={() => setOpenMechanic(true)}>
              Add mechanic
            </button>
          ) : null}
        </div>
        {mechanics.length ? (
          <div className="vehicle-mechanics__list">
            {mechanics.map((mechanic) => (
              <MechanicCard key={mechanic.id} mechanic={mechanic} />
            ))}
          </div>
        ) : (
          <p className="vehicle-supplies__empty">No mechanics have been added for this company.</p>
        )}
      </section>

      {openSupply ? (
        <Modal title="Add supply" subtitle={`Stock for ${vehicle.registration}.`} onClose={() => setOpenSupply(false)}>
          <form
            className="fc-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await api("/api/supplies", {
                method: "POST",
                body: JSON.stringify({ ...supplyForm, vehicle_id: id, company_id: vehicle.company_id }),
              });
              setOpenSupply(false);
              setSupplyForm({ name: "", qty: "", unit: "ea", location: "" });
              load();
            }}
          >
            <label>
              Item
              <input value={supplyForm.name} onChange={(e) => setSupplyForm({ ...supplyForm, name: e.target.value })} required />
            </label>
            <label>
              Quantity
              <input type="number" value={supplyForm.qty} onChange={(e) => setSupplyForm({ ...supplyForm, qty: e.target.value })} required />
            </label>
            <label>
              Unit
              <input value={supplyForm.unit} onChange={(e) => setSupplyForm({ ...supplyForm, unit: e.target.value })} />
            </label>
            <label>
              Location
              <input value={supplyForm.location} onChange={(e) => setSupplyForm({ ...supplyForm, location: e.target.value })} />
            </label>
            <div className="fc-form__actions">
              <button className="fc-btn" type="button" onClick={() => setOpenSupply(false)}>
                Cancel
              </button>
              <button className="fc-btn fc-btn--primary" type="submit">
                Save
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      {openMechanic ? (
        <Modal title="Add mechanic" subtitle={`Available to ${vehicle.registration}'s company.`} onClose={() => setOpenMechanic(false)}>
          <form
            className="fc-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await api("/api/mechanics", {
                method: "POST",
                body: JSON.stringify({ ...mechanicForm, company_id: vehicle.company_id }),
              });
              setOpenMechanic(false);
              setMechanicForm({
                full_name: "",
                trade: "",
                phone: "",
                workshop: "",
                hours: "08:00–17:00",
              });
              load();
            }}
          >
            <label>
              Name
              <input
                value={mechanicForm.full_name}
                onChange={(e) => setMechanicForm({ ...mechanicForm, full_name: e.target.value })}
                required
              />
            </label>
            <label>
              Trade
              <input
                value={mechanicForm.trade}
                onChange={(e) => setMechanicForm({ ...mechanicForm, trade: e.target.value })}
              />
            </label>
            <label>
              Phone
              <input
                value={mechanicForm.phone}
                onChange={(e) => setMechanicForm({ ...mechanicForm, phone: e.target.value })}
              />
            </label>
            <label>
              Workshop
              <input
                value={mechanicForm.workshop}
                onChange={(e) => setMechanicForm({ ...mechanicForm, workshop: e.target.value })}
              />
            </label>
            <OperatingHoursField
              value={mechanicForm.hours}
              onChange={(hours) => setMechanicForm({ ...mechanicForm, hours })}
            />
            <div className="fc-form__actions">
              <button className="fc-btn" type="button" onClick={() => setOpenMechanic(false)}>
                Cancel
              </button>
              <button className="fc-btn fc-btn--primary" type="submit">
                Save
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      {viewer != null ? (
        <PhotoViewer
          photos={photos}
          index={viewer}
          alt={vehicle.registration}
          onClose={() => setViewer(null)}
          onIndex={setViewer}
        />
      ) : null}
    </div>
  );
};

export default VehicleDetailPage;
