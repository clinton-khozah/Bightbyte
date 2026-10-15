import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../../api";
import NavIcon from "../NavIcon/NavIcon";
import CompanyPortrait from "../CompanyPortrait/CompanyPortrait";
import { useAuth } from "../../auth/AuthContext";
import { can, moduleFromPath } from "../../constants/roles";
import "./WorkspaceNav.css";

const LINKS = [
  { to: "/vehicles", icon: "truck", label: "Vehicles" },
  { to: "/checkins", icon: "cash", label: "Check-in" },
  { to: "/maintenance", icon: "wrench", label: "Service" },
  { to: "/incidents", icon: "alert", label: "Incidents" },
  { to: "/documents", icon: "folder", label: "Documents" },
];

const WorkspaceNav = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api("/api/dashboard").then(setData).catch(() => setData(null));
  }, []);

  return (
    <aside className="ws-nav">
      <header className="ws-nav__head">
        <p>Workspace</p>
        <strong>{user?.company_name || "BrightByte"}</strong>
        <span>{user?.role_label || user?.role || "—"}</span>
      </header>
      <CompanyPortrait name={user?.company_name || "BrightByte"} />
      <ul className="ws-nav__stats">
        <li>
          <span>Services due</span>
          <b>{data?.kpis?.servicesDue ?? "—"}</b>
        </li>
        <li>
          <span>Open incidents</span>
          <b>{data?.kpis?.openIncidents ?? "—"}</b>
        </li>
        <li>
          <span>{user?.role === "driver" ? "Check-ins" : "In use"}</span>
          <b>{user?.role === "driver" ? data?.kpis?.checkins ?? "—" : data?.kpis?.inUse ?? "—"}</b>
        </li>
      </ul>
      <nav>
        <p className="ws-nav__label">Jump to</p>
        {LINKS.filter((link) => can(user, moduleFromPath(link.to), "view")).map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `ws-nav__link${isActive ? " is-on" : ""}`}
          >
            <NavIcon name={link.icon} />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default WorkspaceNav;
