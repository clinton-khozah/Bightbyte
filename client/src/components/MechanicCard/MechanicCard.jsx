import React from "react";
import "./MechanicCard.css";

const MechanicCard = ({ mechanic }) => {
  const letter = (String(mechanic.full_name).trim().split(/\s+/)[0]?.[0] || "M").toUpperCase();
  return (
    <div className="mechanic-card">
      {mechanic.photo_url ? (
        <img className="mechanic-card__photo" src={mechanic.photo_url} alt="" />
      ) : (
        <span className="mechanic-card__fallback">{letter}</span>
      )}
      <div>
        <strong>{mechanic.full_name}</strong>
        <p>
          {mechanic.trade}
          {mechanic.after_hours ? " · after hours" : ""}
        </p>
        <p>
          {mechanic.workshop}
          {mechanic.hours ? ` · ${mechanic.hours}` : ""}
        </p>
      </div>
      {mechanic.phone ? (
        <a href={`tel:${mechanic.phone.replace(/\s/g, "")}`}>Call {mechanic.phone}</a>
      ) : (
        <span>—</span>
      )}
    </div>
  );
};

export default MechanicCard;
