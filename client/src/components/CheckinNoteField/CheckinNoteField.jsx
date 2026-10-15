import React, { useEffect, useState } from "react";
import "./CheckinNoteField.css";

const CheckinNoteField = ({ value, onChange }) => {
  const [open, setOpen] = useState(() => Boolean(value));

  useEffect(() => {
    if (value) setOpen(true);
  }, [value]);

  if (!open) {
    return (
      <button type="button" className="checkin-note__enable" onClick={() => setOpen(true)}>
        + Note
      </button>
    );
  }

  return (
    <label className="checkin-note">
      Note
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={!value}
      />
    </label>
  );
};

export default CheckinNoteField;
