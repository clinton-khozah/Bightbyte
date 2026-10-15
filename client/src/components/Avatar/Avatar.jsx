import React, { useState } from "react";
import "./Avatar.css";

const initials = (name = "") =>
  (String(name).trim().split(/\s+/)[0]?.[0] || "U").toUpperCase();

const Avatar = ({ src, name, size = "md" }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <span className={`fc-avatar fc-avatar--${size} fc-avatar--fallback`}>{initials(name)}</span>;
  }
  return (
    <img
      className={`fc-avatar fc-avatar--${size}`}
      src={src}
      alt=""
      onError={() => setFailed(true)}
    />
  );
};

export default Avatar;
