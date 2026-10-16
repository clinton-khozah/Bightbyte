import React, { createContext, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ALL_NAV } from "../../constants/nav";
import { can, moduleFromPath } from "../../constants/roles";
import { useAuth } from "../../auth/AuthContext";
import SideNav from "../SideNav/SideNav";
import TopNav from "../TopNav/TopNav";
import WorkspaceNav from "../../components/WorkspaceNav/WorkspaceNav";
import FirstLoginSelfie from "../../components/FirstLoginSelfie/FirstLoginSelfie";
import PageLoader from "../../components/PageLoader/PageLoader";
import "./AppLayout.css";

export const SearchContext = createContext("");

const mobileNav = () => window.matchMedia("(max-width: 800px)").matches;

const AppLayout = () => {
  const { user, ready, logout } = useAuth();
  const [navCollapsed, setNavCollapsed] = useState(
    () => (mobileNav() ? true : localStorage.getItem("bb-nav-collapsed") === "1"),
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 800px)");
    const sync = () => {
      if (mq.matches) setNavCollapsed(true);
      else setNavCollapsed(localStorage.getItem("bb-nav-collapsed") === "1");
    };
    mq.addEventListener("change", sync);
    if (mq.matches) setNavCollapsed(true);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const navigate = useNavigate();
  const location = useLocation();
  const search = "";

  if (!ready) return <PageLoader screen />;
  if (!user) return <Navigate to="/login" replace />;

  const moduleId = moduleFromPath(location.pathname);
  const ownProfile = Boolean(user?.id && location.pathname === `/drivers/${user.id}`);
  if (moduleId && !ownProfile && !can(user, moduleId, "view")) {
    const next = ALL_NAV.find((item) => can(user, item.id, "view"));
    if (!next) {
      return <div className="fc-app-layout__content">No pages are assigned to this role.</div>;
    }
    if (next.path !== location.pathname) return <Navigate to={next.path} replace />;
  }

  return (
    <SearchContext.Provider value={search}>
      <div className={`fc-app-layout${navCollapsed ? " is-nav-collapsed" : ""}`}>
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
        {!navCollapsed ? (
          <button
            type="button"
            className="fc-app-layout__nav-backdrop"
            aria-label="Close menu"
            onClick={() => {
              setNavCollapsed(true);
              localStorage.setItem("bb-nav-collapsed", "1");
            }}
          />
        ) : null}
        <div className="fc-app-layout__main">
          <TopNav user={user} />
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
