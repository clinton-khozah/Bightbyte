import React from "react";
import "./FileDrop.css";

const FileDrop = ({ label, multiple, accept, onChange, previews = [], compact }) => (
  <label className={`fc-filedrop${compact ? " fc-filedrop--compact" : ""}`}>
    <span>{label}</span>
    <em>
      {multiple
        ? previews.length
          ? "Add more files"
          : "Choose files"
        : previews.length
          ? "Replace file"
          : "Choose file"}
    </em>
    <input type="file" accept={accept || "image/*,application/pdf"} multiple={multiple} onChange={onChange} />
    {previews.length ? (
      <div className="fc-filedrop__previews">
        {previews.map((src) =>
          /\.pdf(\?|$)/i.test(src) ? (
            <a key={src} className="fc-filedrop__doc" href={src} target="_blank" rel="noreferrer">
              PDF
            </a>
          ) : (
            <img key={src} src={src} alt="" />
          ),
        )}
      </div>
    ) : null}
  </label>
);

export default FileDrop;
