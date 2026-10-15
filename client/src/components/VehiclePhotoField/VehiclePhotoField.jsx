import React from "react";
import "./VehiclePhotoField.css";

const VehiclePhotoField = ({ photos = [], min = 5, onAdd, onRemove }) => {
  const slots = Math.max(min, photos.length);
  return (
    <div className="vehicle-photos">
      <div className="vehicle-photos__head">
        <strong>Vehicle photos</strong>
        <span>
          {photos.length} of {min} minimum — first photo is the profile picture
        </span>
      </div>
      <div className="vehicle-photos__grid">
        {Array.from({ length: slots }, (_, index) => {
          const src = photos[index];
          if (src) {
            return (
              <div key={src} className="vehicle-photos__slot">
                <img src={src} alt={`Vehicle photo ${index + 1}`} />
                {index === 0 ? <em>Cover</em> : null}
                <button type="button" onClick={() => onRemove(index)} aria-label="Remove photo">
                  ×
                </button>
              </div>
            );
          }
          return (
            <label key={`empty-${index}`} className="vehicle-photos__slot vehicle-photos__slot--empty">
              <span>+</span>
              <small>Add photo</small>
              <input type="file" accept="image/*" multiple hidden onChange={onAdd} />
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default VehiclePhotoField;
