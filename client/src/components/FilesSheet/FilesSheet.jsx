import React from "react";
import "./FilesSheet.css";

const FolderIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.31 5.55 1 5 1H1.75ZM1.5 2.75a.25.25 0 0 1 .25-.25h3.15l.9 1.2a1.75 1.75 0 0 0 1.4.7h6.05a.25.25 0 0 1 .25.25v8.5a.25.25 0 0 1-.25.25H1.75a.25.25 0 0 1-.25-.25Z" />
  </svg>
);

const FilesSheet = ({ rows = [], emptyText = "Nothing here yet." }) => (
  <div className="files-sheet">
    <div className="files-sheet__head">
      <span>Name</span>
      <span>Stack</span>
      <span>Actions</span>
    </div>
    {!rows.length ? (
      <div className="files-sheet__empty">{emptyText}</div>
    ) : (
      rows.map((row) => (
        <div
          key={row.id}
          className="files-sheet__row"
          role="button"
          tabIndex={0}
          onClick={() => row.onOpen?.()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              row.onOpen?.();
            }
          }}
        >
          <span className="files-sheet__icon">
            <FolderIcon />
          </span>
          <span className="files-sheet__name">{row.name?.endsWith("/") ? row.name : `${row.name}/`}</span>
          <span className="files-sheet__desc">{row.description}</span>
          <span className="files-sheet__stack">{row.stack}</span>
          <span className="files-sheet__more">
            {row.onDelete ? (
              <button
                type="button"
                className="files-sheet__delete"
                onClick={(e) => {
                  e.stopPropagation();
                  row.onDelete();
                }}
              >
                Delete
              </button>
            ) : null}
          </span>
        </div>
      ))
    )}
  </div>
);

export default FilesSheet;
