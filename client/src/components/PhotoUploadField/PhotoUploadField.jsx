import React from "react";
import Avatar from "../Avatar/Avatar";
import "./PhotoUploadField.css";

const PhotoUploadField = ({ src, name, label = "Change photo", onChange }) => (
  <div className="photo-upload">
    <Avatar src={src} name={name} size="lg" />
    <label className="photo-upload__btn">
      {src ? label : "Add photo"}
      <input type="file" accept="image/*" onChange={onChange} />
    </label>
  </div>
);

export default PhotoUploadField;
