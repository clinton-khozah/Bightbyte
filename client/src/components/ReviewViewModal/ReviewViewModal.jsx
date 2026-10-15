import React from "react";
import Modal from "../Modal/Modal";
import StatusChip from "../StatusChip/StatusChip";
import "./ReviewViewModal.css";

const ANGLES = ["Front", "Rear", "Left side", "Right side"];

const ReviewViewModal = ({ review, vehicle, onClose }) => {
  const month = new Date(review.review_month || review.created_at).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });
  const photos = review.photos || [];

  return (
    <Modal
      wide
      title="Car review"
      subtitle={`${vehicle?.registration || "Vehicle"} · ${month}`}
      onClose={onClose}
    >
      <div className="review-view">
        <dl className="review-view__facts">
          <div>
            <dt>Vehicle</dt>
            <dd>
              {vehicle ? `${vehicle.registration} — ${vehicle.make} ${vehicle.model}` : "—"}
            </dd>
          </div>
          <div>
            <dt>Month</dt>
            <dd>{month}</dd>
          </div>
          <div>
            <dt>Condition</dt>
            <dd>
              <StatusChip value={review.condition} />
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <StatusChip value={review.status} />
            </dd>
          </div>
        </dl>
        <p className="review-view__notes">{review.notes || "No notes."}</p>
        {photos.length ? (
          <div className="review-view__photos">
            {photos.map((src, index) => (
              <figure key={src} className="review-view__photo">
                <a href={src} target="_blank" rel="noreferrer">
                  <img src={src} alt={ANGLES[index] || `Photo ${index + 1}`} />
                </a>
                <figcaption>{ANGLES[index] || `Photo ${index + 1}`}</figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="review-view__empty">No photos on this review.</div>
        )}
      </div>
    </Modal>
  );
};

export default ReviewViewModal;
