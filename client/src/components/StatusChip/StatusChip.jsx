import React from "react";
import "./StatusChip.css";

const StatusChip = ({ value }) => (
  <span className={`fc-chip fc-chip--${String(value || "submitted").replace(/\s/g, "_")}`}>
    {String(value || "").replaceAll("_", " ")}
  </span>
);

export default StatusChip;
