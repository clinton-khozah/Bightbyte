import React from "react";
import "./StarRating.css";

const StarRating = ({ value = 0, max = 5, label, outOf }) => {
  const score = Math.max(0, Math.min(max, Number(value) || 0));
  const rounded = Math.round(score * 2) / 2;
  const text = Number.isInteger(rounded) ? `${rounded.toFixed(0)} / ${max}` : `${rounded.toFixed(1)} / ${max}`;
  return (
    <div className="star-rating" title={text}>
      <div className="star-rating__stars" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => {
          const fill = rounded - i;
          const cls = fill >= 1 ? "full" : fill >= 0.5 ? "half" : "empty";
          return (
            <span key={i} className={`star-rating__star star-rating__star--${cls}`}>
              ★
            </span>
          );
        })}
      </div>
      <strong>{outOf ? text : rounded.toFixed(1)}</strong>
      {label ? <span>{label}</span> : null}
    </div>
  );
};

export default StarRating;
