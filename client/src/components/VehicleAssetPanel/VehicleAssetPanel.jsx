import React from "react";
import "./VehicleAssetPanel.css";

const VehicleAssetPanel = ({ title, description, action, empty, children }) => (
  <section className="vehicle-asset-panel">
    <header className="vehicle-asset-panel__head">
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </header>
    {children ? <div className="vehicle-asset-panel__body">{children}</div> : <p className="vehicle-asset-panel__empty">{empty}</p>}
  </section>
);

export const VehicleAssetRow = ({ href, kicker, title, detail, status, action }) => {
  const inner = (
    <>
      <div className="vehicle-asset-row__mark" aria-hidden="true">
        {String(title || "?").trim()[0]?.toUpperCase() || "•"}
      </div>
      <div className="vehicle-asset-row__copy">
        {kicker ? <span className="vehicle-asset-row__kicker">{kicker}</span> : null}
        <strong>{title}</strong>
        {detail ? <span className="vehicle-asset-row__detail">{detail}</span> : null}
      </div>
      {status ? <span className={`vehicle-asset-row__status vehicle-asset-row__status--${status.tone || "muted"}`}>{status.label}</span> : null}
      {action ? <span className="vehicle-asset-row__action">{action}</span> : null}
    </>
  );

  if (href) {
    return (
      <a className="vehicle-asset-row" href={href} target="_blank" rel="noreferrer">
        {inner}
      </a>
    );
  }

  return <div className="vehicle-asset-row">{inner}</div>;
};

export default VehicleAssetPanel;
