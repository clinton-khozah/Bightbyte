import React from "react";

const Icon = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    {children}
  </svg>
);

const NavIcon = ({ name }) => {
  if (name === "grid") {
    return (
      <Icon>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </Icon>
    );
  }
  if (name === "truck") {
    return (
      <Icon>
        <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7" />
        <circle cx="7" cy="18" r="1.4" />
        <circle cx="17" cy="18" r="1.4" />
      </Icon>
    );
  }
  if (name === "users") {
    return (
      <Icon>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19c1.5-3 4-4.5 6-4.5S13.5 16 15 19" />
        <circle cx="17" cy="9" r="2.2" />
      </Icon>
    );
  }
  if (name === "cash") {
    return (
      <Icon>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.4" />
      </Icon>
    );
  }
  if (name === "camera") {
    return (
      <Icon>
        <path d="M4 8h3l2-2h6l2 2h3v11H4z" />
        <circle cx="12" cy="13" r="3" />
      </Icon>
    );
  }
  if (name === "clipboard") {
    return (
      <Icon>
        <rect x="6" y="5" width="12" height="15" rx="2" />
        <path d="M9 5V4h6v1" />
      </Icon>
    );
  }
  if (name === "alert") {
    return (
      <Icon>
        <path d="M12 4l9 16H3z" />
        <path d="M12 10v4M12 16.5v.5" />
      </Icon>
    );
  }
  if (name === "wrench") {
    return (
      <Icon>
        <path d="M14 7a4 4 0 01-5 5L4 17l3 3 5-5a4 4 0 005-5l-3 2z" />
      </Icon>
    );
  }
  if (name === "folder") {
    return (
      <Icon>
        <path d="M3 7h6l2 2h10v10H3z" />
      </Icon>
    );
  }
  if (name === "sparkle") {
    return (
      <Icon>
        <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z" />
        <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />
      </Icon>
    );
  }
  if (name === "brighty") {
    return (
      <svg className="brighty-symbol" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path className="brighty-symbol__orbit" d="M4.5 14.8c0-4.1 3.1-7.3 7.4-7.3s7.6 3.2 7.6 7.3" />
        <path className="brighty-symbol__body" d="M5.3 13.6c0-3.8 2.8-6.1 6.7-6.1s6.7 2.3 6.7 6.1v3.2c0 1.2-.9 2.1-2.1 2.1H7.4c-1.2 0-2.1-.9-2.1-2.1v-3.2z" />
        <path className="brighty-symbol__face" d="M9 13.8v.1m6-.1v.1m-4.5 2c.8.6 1.8.6 2.6 0" />
        <path className="brighty-symbol__antenna" d="M12 7.5V5.2m-1.1 0h2.2" />
        <path className="brighty-symbol__spark" d="M20.3 5.2l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5.5-1.2z" />
      </svg>
    );
  }
  if (name === "shield") {
    return (
      <Icon>
        <path d="M12 3l8 3v6c0 5-3.4 7.6-8 9-4.6-1.4-8-4-8-9V6z" />
        <path d="M9 12l2 2 4-4" />
      </Icon>
    );
  }
  if (name === "building") {
    return (
      <Icon>
        <path d="M4 21V7l8-4 8 4v14" />
        <path d="M9 21v-6h6v6" />
        <path d="M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
      </Icon>
    );
  }
  if (name === "mechanic") {
    return (
      <Icon>
        <circle cx="12" cy="8" r="3" />
        <path d="M6 20c1.2-3 3.5-5 6-5s4.8 2 6 5" />
        <path d="M16 4l3 2-2 3" />
      </Icon>
    );
  }
  if (name === "signOut") {
    return (
      <Icon>
        <path d="M9 7V5h11v14H9v-2" />
        <path d="M13 12H3m0 0l3-3M3 12l3 3" />
      </Icon>
    );
  }
  if (name === "navOpen") {
    return (
      <Icon>
        <path d="M4 6h10M4 12h10M4 18h10" />
        <path d="M16 8l4 4-4 4" />
      </Icon>
    );
  }
  if (name === "navClose") {
    return (
      <Icon>
        <path d="M20 6H10M20 12H10M20 18H10" />
        <path d="M8 8L4 12l4 4" />
      </Icon>
    );
  }
  if (name === "fuel") {
    return (
      <Icon>
        <rect x="5" y="4" width="9" height="16" rx="1" />
        <path d="M14 8h3l2 3v7" />
      </Icon>
    );
  }
  return (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2 2" />
    </Icon>
  );
};

export default NavIcon;
