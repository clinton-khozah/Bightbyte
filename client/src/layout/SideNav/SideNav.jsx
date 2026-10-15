import React from "react";
import { NavLink } from "react-router-dom";
import NavIcon from "../../components/NavIcon/NavIcon";
import { ADMIN_NAV, OPERATIONS_NAV } from "../../constants/nav";
import { useAuth } from "../../auth/AuthContext";
import "./SideNav.css";

const SideNavLink = ({ item, collapsed }) => (
  <li>
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `fc-side-nav__link${isActive ? " fc-side-nav__link--active" : ""}`
      }
    >
      <NavIcon name={item.icon} />
      <span>{item.label}</span>
      {item.badge ? <em className={`fc-side-nav__badge fc-side-nav__badge--${item.badgeTone || "green"}`}>{item.badge}</em> : null}
    </NavLink>
  </li>
);

const SideNav = ({ onLogout, collapsed, onToggle }) => {
  const { user } = useAuth();
  const isDriver = user?.role === "driver";
  const ops = isDriver
    ? OPERATIONS_NAV.filter((item) =>
        ["dashboard", "checkins", "reviews", "incidents", "mechanics"].includes(
          item.id,
        ),
      )
    : OPERATIONS_NAV;

  return (
    <aside className={`fc-side-nav${collapsed ? " is-collapsed" : ""}`}>
      <div className="fc-side-nav__top">
        <button
          type="button"
          className="fc-side-nav__toggle"
          onClick={onToggle}
          aria-label={collapsed ? "Open menu" : "Close menu"}
          title={collapsed ? "Open menu" : "Close menu"}
        >
          <NavIcon name={collapsed ? "navOpen" : "navClose"} />
        </button>
      </div>
      <nav className="fc-side-nav__body">
        <ul className="fc-side-nav__list">
          {ops.map((item) => (
            <SideNavLink key={item.id} item={item} collapsed={collapsed} />
          ))}
        </ul>
        {!isDriver ? (
          <ul className="fc-side-nav__list fc-side-nav__list--footer">
            {ADMIN_NAV.map((item) => (
              <SideNavLink key={item.id} item={item} collapsed={collapsed} />
            ))}
          </ul>
        ) : null}
      </nav>
      <div className="fc-side-nav__signout">
        <button type="button" onClick={onLogout} title="Sign out">
          <NavIcon name="signOut" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
};

export default SideNav;
