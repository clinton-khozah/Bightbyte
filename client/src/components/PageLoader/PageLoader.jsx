import React from "react";
import "./PageLoader.css";

const PageLoader = ({ screen = false }) => (
  <div className={`page-loader${screen ? " page-loader--screen" : ""}`} role="status" aria-label="Loading">
    <span className="page-loader__spinner" aria-hidden="true" />
  </div>
);

export default PageLoader;
