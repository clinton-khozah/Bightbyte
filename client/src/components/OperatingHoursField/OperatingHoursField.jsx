import React from "react";
import "./OperatingHoursField.css";

const padTime = (value) => {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
};

export const parseHours = (value) => {
  const text = String(value || "").trim();
  if (!text) return { open: "08:00", close: "17:00", allDay: false };
  if (/^24/i.test(text) || text === "00:00–23:59" || text === "00:00-23:59") {
    return { open: "00:00", close: "23:59", allDay: true };
  }
  const match = text.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
  if (match) return { open: padTime(match[1]), close: padTime(match[2]), allDay: false };
  return { open: "08:00", close: "17:00", allDay: false };
};

export const formatHours = ({ open, close, allDay }) =>
  allDay ? "24 hours" : `${open || "08:00"}–${close || "17:00"}`;

const OperatingHoursField = ({ value, onChange }) => {
  const hours = parseHours(value);

  const setHours = (patch) => onChange(formatHours({ ...hours, ...patch }));

  return (
    <div className="operating-hours">
      <span className="fc-line-select__label">Operating hours</span>
      <label className="operating-hours__all">
        <input
          type="checkbox"
          checked={hours.allDay}
          onChange={(e) => setHours({ allDay: e.target.checked, open: "00:00", close: "23:59" })}
        />
        Open 24 hours
      </label>
      {hours.allDay ? null : (
        <div className="operating-hours__times">
          <label>
            Opens
            <input
              type="time"
              lang="en-GB"
              step="60"
              value={hours.open}
              onChange={(e) => setHours({ open: e.target.value || "08:00" })}
              required
            />
          </label>
          <label>
            Closes
            <input
              type="time"
              lang="en-GB"
              step="60"
              value={hours.close}
              onChange={(e) => setHours({ close: e.target.value || "17:00" })}
              required
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default OperatingHoursField;
