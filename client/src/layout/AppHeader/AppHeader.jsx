import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ADMIN_NAV, navItemForUser, OPERATIONS_NAV } from "../../constants/nav";
import { can } from "../../constants/roles";
import { useAuth } from "../../auth/AuthContext";
import "./AppHeader.css";

const TABS = [
  { label: "Overview", path: "/dashboard", module: "dashboard" },
  { label: "Vehicles", path: "/vehicles", module: "vehicles" },
  { label: "People", path: "/drivers", module: "drivers" },
  { label: "Activity", path: "/checkins", module: "checkins" },
];

const AppHeader = ({ query, onQuery }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const pills = [...OPERATIONS_NAV, ...ADMIN_NAV]
    .filter((item) => can(user, item.id, "view"))
    .map((item) => navItemForUser(item, user));

  const initials = String(user?.full_name || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  return (
    <div>
      <header className="gh-header">
        <div className="gh-header__brand">
          <span className="gh-header__wordmark">Fleet21</span>
          <span className="gh-header__sub">Operations workspace</span>
        </div>
        <div className="gh-search">
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search vehicles, drivers, documents"
          />
        </div>
        <div className="gh-header__user">
          {user?.photo_url ? (
            <img className="gh-avatar" src={user.photo_url} alt="" />
          ) : (
            <div className="gh-avatar" style={{ display: "grid", placeItems: "center", fontWeight: 600 }}>
              {initials}
            </div>
          )}
          <div className="gh-header__meta">
            <strong>{user?.full_name}</strong>
            <span>{user?.role}</span>
          </div>
          <button
            type="button"
            className="gh-signout"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <nav className="gh-pills" aria-label="Modules">
        {pills.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `gh-pill${isActive ? " gh-pill--active" : ""}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <nav className="gh-tabs" aria-label="Sections">
        {TABS.filter((tab) => can(user, tab.module, "view")).map((tab) => {
          const label =
            tab.module === "drivers" && user?.role === "driver" ? "My Profile" : tab.label;
          return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={() =>
              `gh-tab${location.pathname.startsWith(tab.path) ? " gh-tab--active" : ""}`
            }
          >
            {label}
          </NavLink>
        );
        })}
      </nav>
    </div>
  );
};

export default AppHeader;
