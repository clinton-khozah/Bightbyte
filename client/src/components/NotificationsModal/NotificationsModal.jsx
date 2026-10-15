import React from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../Modal/Modal";
import "./NotificationsModal.css";

const stamp = (value) =>
  value
    ? new Date(value).toLocaleString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const NotificationsModal = ({ open, notes = [], onClose, onOpenNote }) => {
  const navigate = useNavigate();
  if (!open) return null;

  const unread = notes.filter((n) => !n.read).length;

  return (
    <Modal
      wide
      title="Notifications"
      subtitle={
        unread
          ? `${unread} unread. Open one to mark it read.`
          : notes.length
            ? "You are up to date."
            : "Nothing waiting for you."
      }
      onClose={onClose}
    >
      <div className="notes-modal">
        {notes.length ? (
          <ul className="notes-modal__list">
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  className={note.read ? "notes-modal__item" : "notes-modal__item is-unread"}
                  onClick={async () => {
                    await onOpenNote(note);
                    if (note.link) {
                      onClose();
                      navigate(note.link);
                    }
                  }}
                >
                  <span className="notes-modal__dot" aria-hidden="true" />
                  <span className="notes-modal__copy">
                    <strong>{note.title || "Notice"}</strong>
                    <em>{note.body}</em>
                    <small>
                      {note.type === "service" ? "Service" : "Alert"}
                      {stamp(note.created_at) ? ` · ${stamp(note.created_at)}` : ""}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="notes-modal__empty">No notifications yet.</p>
        )}
      </div>
    </Modal>
  );
};

export default NotificationsModal;
