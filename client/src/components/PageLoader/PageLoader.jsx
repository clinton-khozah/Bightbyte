import React from "react";
import "./PageLoader.css";

const PageLoader = ({ screen = false, compact = false }) => (
  <div
    className={`page-loader${screen ? " page-loader--screen" : ""}${compact ? " page-loader--compact" : ""}`}
    role="status"
    aria-label="Loading"
  >
    {compact ? null : (
      <img className="page-loader__logo" src="/Brightbyte%20Fleet%20Management%20Logo.png" alt="" />
    )}
    <span className="page-loader__track" aria-hidden="true">
      <span className="page-loader__bar" />
    </span>
  </div>
);

export default PageLoader;
