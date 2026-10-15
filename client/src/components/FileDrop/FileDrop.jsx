import React from "react";
import "./FileDrop.css";

const FileDrop = ({ label, multiple, accept, onChange, previews = [], compact }) => (
  <label className={`fc-filedrop${compact ? " fc-filedrop--compact" : ""}`}>
    <span>{label}</span>
    <em>{previews.length ? "Replace file" : "Choose file"}</em>
    <input type="file" accept={accept || "image/*,application/pdf"} multiple={multiple} onChange={onChange} />
    {previews.length ? (
      <div className="fc-filedrop__previews">
        {previews.map((src) => (
          <img key={src} src={src} alt="" />
        ))}
      </div>
    ) : null}
  </label>
);

export default FileDrop;
