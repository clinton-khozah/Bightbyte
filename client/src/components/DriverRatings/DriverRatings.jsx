import React, { useState } from "react";
import StarRating from "../StarRating/StarRating";
import { computeDriverScore } from "../../lib/driverScore";
import "./DriverRatings.css";

const formatWhen = (value) =>
  value
    ? new Date(value).toLocaleString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

const metricLabel = (value, empty) => (value == null ? empty : value.toFixed(1));

const DriverRatings = ({ reviews, incidents, checkins, ratings = [], schedule, score: given, canRate, onRate }) => {
  const score =
    given || computeDriverScore({ reviews, incidents, checkins, ratings, schedule });
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onRate({ score: stars, comment: comment.trim() });
      setComment("");
      setStars(5);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="driver-ratings">
      <h3>How this score is built</h3>
      <div className="driver-ratings__metrics">
        <div>
          <span>System score</span>
          <strong>{metricLabel(score.system, "—")}</strong>
        </div>
        <div>
          <span>Vehicle care</span>
          <strong>{metricLabel(score.vehicleCare, "No reviews")}</strong>
        </div>
        <div>
          <span>Safety</span>
          <strong>{metricLabel(score.safety, "No incidents")}</strong>
        </div>
        <div>
          <span>Check-in schedule</span>
          <strong>{metricLabel(score.reliability, "None yet")}</strong>
        </div>
        <div>
          <span>Staff ratings</span>
          <strong>
            {score.manager == null ? "None yet" : `${score.manager.toFixed(1)} (${score.managerCount})`}
          </strong>
        </div>
      </div>
      {ratings.length ? (
        <ul className="driver-ratings__list">
          {ratings.map((row, index) => (
            <li key={`${row.created_at}-${index}`}>
              <StarRating value={row.score} label={row.rater_name || "Staff"} />
              {row.comment ? <p>{row.comment}</p> : null}
              <small>{formatWhen(row.created_at)}</small>
            </li>
          ))}
        </ul>
      ) : (
        <div className="driver-ratings__empty">No staff ratings yet. The score above is from live operations.</div>
      )}
      {canRate ? (
        <form className="fc-form driver-ratings__form" onSubmit={submit}>
          <p>Rate this driver. The system score already includes the check-in schedule, vehicle reviews and incidents.</p>
          <div className="driver-ratings__picker" role="group" aria-label="Score">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`driver-ratings__star${stars >= n ? " is-on" : ""}`}
                onClick={() => setStars(n)}
                aria-pressed={stars >= n}
              >
                ★
              </button>
            ))}
            <strong>{stars} / 5</strong>
          </div>
          <label className="fc-form__full">
            Comment
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What stood out on the road or at check-in?"
            />
          </label>
          {error ? <p className="fc-error">{error}</p> : null}
          <div className="fc-form__actions">
            <button className="fc-btn fc-btn--primary" type="submit" disabled={busy}>
              Save rating
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
};

export default DriverRatings;
