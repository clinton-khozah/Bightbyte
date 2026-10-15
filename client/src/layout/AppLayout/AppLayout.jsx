import React, { createContext, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import SideNav from "../SideNav/SideNav";
import TopNav from "../TopNav/TopNav";
import WorkspaceNav from "../../components/WorkspaceNav/WorkspaceNav";
import FirstLoginSelfie from "../../components/FirstLoginSelfie/FirstLoginSelfie";
import "./AppLayout.css";

export const SearchContext = createContext("");

const AppLayout = () => {
  const { user, ready, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [navCollapsed, setNavCollapsed] = useState(
    () => localStorage.getItem("bb-nav-collapsed") === "1",
  );
  const navigate = useNavigate();
  const location = useLocation();
  const search = useMemo(() => query.trim().toLowerCase(), [query]);

  if (!ready) return <div className="fc-app-layout__content">Loading</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <SearchContext.Provider value={search}>
      <div className="fc-app-layout">
        <SideNav
          collapsed={navCollapsed}
          onToggle={() => {
            setNavCollapsed((on) => {
              const next = !on;
              localStorage.setItem("bb-nav-collapsed", next ? "1" : "0");
              return next;
            });
          }}
          onLogout={() => {
            logout();
            navigate("/login");
          }}
        />
        <div className="fc-app-layout__main">
          <TopNav user={user} query={query} onQuery={setQuery} />
          <div className="fc-app-layout__content">
            <div key={location.pathname} className="fc-page-fade">
              <Outlet />
            </div>
          </div>
        </div>
        {navCollapsed ? <WorkspaceNav /> : null}
        {user.role === "driver" && !user.photo_url ? <FirstLoginSelfie /> : null}
      </div>
    </SearchContext.Provider>
  );
};

export default AppLayout;
