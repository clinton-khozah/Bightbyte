import React from "react";
import "./PageHeader.css";

const PageHeader = ({ title, subtitle, action }) => (
  <div className="fc-page-header">
    <div>
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
    {action}
  </div>
);

export default PageHeader;
