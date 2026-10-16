import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import NotificationsModal from "../../components/NotificationsModal/NotificationsModal";
import "./TopNav.css";

const TopNav = ({ user }) => {
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState(false);
  const unread = notes.filter((n) => !n.read).length;

  const loadNotes = () => api("/api/notifications").then(setNotes).catch(() => setNotes([]));

  useEffect(() => {
    loadNotes();
  }, [user?.id]);

  return (
    <header className="fc-top-nav">
      <div className="fc-top-nav__org">
        <svg className="fc-top-nav__mark" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12 2.2 23.4 22H.6L12 2.2Z" />
        </svg>
        <span className="fc-top-nav__crumb">BrightByte</span>
        <span className="fc-top-nav__sep">/</span>
        <span className="fc-top-nav__crumb">{user?.company_name || "BrightByte"}</span>
        <span className="fc-top-nav__sep fc-top-nav__role">/</span>
        <span className="fc-top-nav__crumb fc-top-nav__role">{user?.role_label || user?.role || "—"}</span>
        <span className="fc-top-nav__sep fc-top-nav__role">/</span>
      </div>
      <div className="fc-top-nav__tools">
        <div className="fc-top-nav__bell-wrap">
          <button
            type="button"
            className="fc-top-nav__bell"
            aria-label="Notifications"
            onClick={() => {
              loadNotes();
              setOpen(true);
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M12 3a6 6 0 0 0-6 6v3.2L4 15h16l-2-2.8V9a6 6 0 0 0-6-6Zm0 18a2.4 2.4 0 0 0 2.4-2.4h-4.8A2.4 2.4 0 0 0 12 21Z" />
            </svg>
            {unread ? <em>{unread}</em> : null}
          </button>
        </div>
        <NotificationsModal
          open={open}
          notes={notes}
          onClose={() => setOpen(false)}
          onOpenNote={async (note) => {
            if (!note.read) {
              await api(`/api/notifications/${note.id}`, { method: "PATCH", body: JSON.stringify({ read: true }) });
              await loadNotes();
            }
          }}
        />
        {user?.id ? (
          <Link
            className="fc-top-nav__avatar"
            to={`/drivers/${user.id}`}
            title="My profile"
            aria-label="Open my profile"
          >
            {user.photo_url ? (
              <img src={user.photo_url} alt="" />
            ) : (
              (user.full_name || user.role || "U").slice(0, 1).toUpperCase()
            )}
          </Link>
        ) : null}
      </div>
    </header>
  );
};

export default TopNav;
