import React, { useEffect, useState } from "react";
import Avatar from "../Avatar/Avatar";
import "./PhotoUploadField.css";

const PhotoUploadField = ({ src, name, label = "Change photo", onChange }) => {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    setPreview("");
  }, [src]);

  return (
    <div className="photo-upload">
      <Avatar src={preview || src} name={name} size="lg" />
      <label className="photo-upload__btn">
        {preview || src ? label : "Add photo"}
        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setPreview(URL.createObjectURL(file));
            onChange?.(event);
          }}
        />
      </label>
    </div>
  );
};

export default PhotoUploadField;
