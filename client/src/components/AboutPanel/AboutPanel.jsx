import React from "react";
import { useAuth } from "../../auth/AuthContext";
import "./AboutPanel.css";

const AboutPanel = ({ kpis = {} }) => {
  const { user } = useAuth();
  return (
    <aside className="gh-about">
      <h3>About</h3>
      <p>Full-stack fleet operations for cash check-ins, condition reviews and vehicle evidence.</p>
      <div className="gh-about__row">
        <span>⌖</span>
        <span>Pretoria, Gauteng</span>
      </div>
      <div className="gh-about__row">
        <span>✉</span>
        <span>{user?.email}</span>
      </div>
      <div className="gh-about__row">
        <span>☎</span>
        <span>{user?.phone || "—"}</span>
      </div>
      <div className="gh-bars">
        <h3>Fleet mix</h3>
        <div className="gh-bar">
          <span>
            <b>In use</b>
            <em>{kpis.inUse || 0}</em>
          </span>
          <i>
            <b style={{ width: `${Math.min(100, (kpis.inUse / Math.max(1, kpis.vehicles)) * 100)}%`, background: "#f778ba" }} />
          </i>
        </div>
        <div className="gh-bar">
          <span>
            <b>Available</b>
            <em>{Math.max(0, (kpis.vehicles || 0) - (kpis.inUse || 0))}</em>
          </span>
          <i>
            <b style={{ width: "70%", background: "#2f81f7" }} />
          </i>
        </div>
        <div className="gh-bar">
          <span>
            <b>Check-ins</b>
            <em>{kpis.openIncidents ?? 0} open risks</em>
          </span>
          <i>
            <b style={{ width: "45%", background: "#3fb950" }} />
          </i>
        </div>
      </div>
      <div className="gh-certs">
        <h3>Compliance</h3>
        <ul>
          <li>Licence discs tracked on each vehicle</li>
          <li>Driver selfie required on first login</li>
          <li>Monthly photo reviews on file</li>
        </ul>
      </div>
    </aside>
  );
};

export default AboutPanel;
