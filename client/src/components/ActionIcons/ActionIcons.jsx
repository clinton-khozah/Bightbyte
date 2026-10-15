import React from "react";
import "./ActionIcons.css";

const ActionIcons = ({ onEdit, onDelete, onAssign, onView, onSupplies }) => (
  <div className="action-icons">
    {onView ? (
      <button type="button" className="action-icons__btn" title="View" onClick={onView}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" />
        </svg>
      </button>
    ) : null}
    {onSupplies ? (
      <button type="button" className="action-icons__btn" title="Supplies" onClick={onSupplies}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 8h16l-1.2 11.2A2 2 0 0 1 16.8 21H7.2a2 2 0 0 1-2-1.8L4 8Zm3-3h10l1 3H6l1-3Z" />
        </svg>
      </button>
    ) : null}
    {onAssign ? (
      <button type="button" className="action-icons__btn" title="Assign vehicle" onClick={onAssign}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 17h13V6H3v11Zm15 0h3v-4h-3v4ZM5 9h9v6H5V9Z" />
        </svg>
      </button>
    ) : null}
    {onEdit ? (
      <button type="button" className="action-icons__btn" title="Edit" onClick={onEdit}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 17.3V20h2.7l8-8-2.7-2.7-8 8ZM18.4 7.1a.8.8 0 0 0 0-1.1l-1.4-1.4a.8.8 0 0 0-1.1 0l-1.1 1.1 2.5 2.5 1.1-1.1Z" />
        </svg>
      </button>
    ) : null}
    {onDelete ? (
      <button type="button" className="action-icons__btn action-icons__btn--danger" title="Delete" onClick={onDelete}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 4h6l1 2h5v2H3V6h5l1-2Zm1 6h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 10h2v8H7v-8Z" />
        </svg>
      </button>
    ) : null}
  </div>
);

export default ActionIcons;
