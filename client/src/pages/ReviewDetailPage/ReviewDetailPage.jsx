import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import StatusChip from "../../components/StatusChip/StatusChip";
import Avatar from "../../components/Avatar/Avatar";
import PhotoViewer from "../../components/PhotoViewer/PhotoViewer";
import ReviewStatusForm from "../../components/ReviewStatusForm/ReviewStatusForm";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import "../VehiclesPage/VehiclesPage.css";
import "./ReviewDetailPage.css";

const ANGLES = ["Front", "Rear", "Left side", "Right side"];

const monthLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })
    : "—";

const ReviewDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [review, setReview] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [driver, setDriver] = useState(null);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState(null);
  const [vehicleStatus, setVehicleStatus] = useState("available");
  const [reviewStatus, setReviewStatus] = useState("submitted");
  const [saveError, setSaveError] = useState("");
  const [success, setSuccess] = useState("");
  const canManage = user?.role === "admin" || user?.role === "fleet_manager";

  useEffect(() => {
    Promise.all([
      api(`/api/reviews/${id}`),
      api("/api/vehicles"),
      api("/api/users").catch(() => api("/api/drivers")),
    ])
      .then(([row, vehicles, people]) => {
        const found = vehicles.find((v) => v.id === row.vehicle_id) || null;
        setReview(row);
        setVehicle(found);
        setDriver(people.find((p) => p.id === row.driver_id) || null);
        setVehicleStatus(found?.status || "available");
        setReviewStatus(row.status || "submitted");
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="fc-error">{error}</p>;
  if (!review) return <p>Loading</p>;

  const photos = review.photos || [];
  const month = monthLabel(review.review_month || review.created_at);

  return (
    <div className="review-detail">
      <Link className="review-detail__back" to="/reviews">
        ← Car reviews
      </Link>
      <div className="gh-vehicle-hero">
        <div className="review-detail__portraits">
          <div>
            <Avatar
              src={vehicle?.photo_url || vehicle?.photos?.[0]}
              name={vehicle?.registration || "V"}
              size="xl"
            />
            <span>{vehicle?.registration || "Vehicle"}</span>
          </div>
          <div>
            <Avatar src={driver?.photo_url} name={driver?.full_name || "D"} size="xl" />
            <span>{driver?.full_name || "Driver"}</span>
          </div>
        </div>
        <div>
          <h2>
            {vehicle?.registration || "Vehicle"} <StatusChip value={review.status} />
          </h2>
          <p>
            {vehicle ? `${vehicle.make} ${vehicle.model}` : "—"} · {month}
          </p>
          <div className="gh-facts">
            <div>
              <span>Vehicle</span>
              {vehicle ? `${vehicle.registration} — ${vehicle.make} ${vehicle.model}` : "—"}
            </div>
            <div>
              <span>Month</span>
              {month}
            </div>
            <div>
              <span>Condition</span>
              <StatusChip value={review.condition} />
            </div>
            <div>
              <span>Status</span>
              <StatusChip value={review.status} />
            </div>
            <div>
              <span>Reviewed by</span>
              <span className="review-detail__by">
                <Avatar src={driver?.photo_url} name={driver?.full_name || "D"} />
                {driver?.full_name || "—"}
              </span>
            </div>
            <div>
              <span>Submitted</span>
              {review.created_at
                ? new Date(review.created_at).toLocaleString("en-ZA", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </div>
          </div>
        </div>
      </div>
      <p className="review-detail__notes">{review.notes || "No notes."}</p>
      {canManage ? (
        <div className="review-detail__status">
          <ReviewStatusForm
            vehicleStatus={vehicleStatus}
            reviewStatus={reviewStatus}
            onVehicleStatus={setVehicleStatus}
            onReviewStatus={setReviewStatus}
            error={saveError}
            onSave={async (event) => {
              event.preventDefault();
              setSaveError("");
              try {
                const [nextReview, nextVehicle] = await Promise.all([
                  api(`/api/reviews/${review.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: reviewStatus }),
                  }),
                  api(`/api/vehicles/${review.vehicle_id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: vehicleStatus }),
                  }),
                ]);
                setReview(nextReview);
                setVehicle(nextVehicle);
                setSuccess("Vehicle and review status were saved.");
              } catch (err) {
                setSaveError(err.message);
              }
            }}
          />
        </div>
      ) : null}
      <h3>Condition photos</h3>      {photos.length ? (
        <div className="review-detail__photos">
          {photos.map((src, index) => (
            <figure key={src} className="review-detail__photo">
              <button type="button" onClick={() => setViewer(index)}>
                <img src={src} alt={ANGLES[index] || `Photo ${index + 1}`} />
              </button>
              <figcaption>{ANGLES[index] || `Photo ${index + 1}`}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="review-detail__empty">No photos on this review.</div>
      )}
      {viewer != null ? (
        <PhotoViewer photos={photos} index={viewer} alt="Condition photo" onClose={() => setViewer(null)} onIndex={setViewer} />
      ) : null}
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
    </div>
  );
};

export default ReviewDetailPage;
