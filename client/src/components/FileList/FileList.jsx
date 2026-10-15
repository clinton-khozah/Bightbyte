import React from "react";
import { Link } from "react-router-dom";
import "./FileList.css";

const FileList = ({ title, action, rows }) => (
  <div className="gh-list">
    <div className="gh-list__head">
      <span>{title}</span>
      {action}
    </div>
    {!rows?.length ? (
      <div className="gh-empty">Nothing here yet.</div>
    ) : (
      rows.map((row) => {
        const inner = (
          <>
            {row.image ? (
              <img className="gh-list__thumb" src={row.image} alt="" />
            ) : (
              <span className="gh-list__icon">{row.icon || "▣"}</span>
            )}
            <div>
              <div className="gh-list__name">{row.name}</div>
              {row.description ? <div className="gh-list__desc">{row.description}</div> : null}
            </div>
            <div>{row.badge}</div>
            <div className="gh-list__meta">{row.meta}</div>
          </>
        );
        return row.to ? (
          <Link key={row.id} className="gh-list__row" to={row.to}>
            {inner}
          </Link>
        ) : (
          <div key={row.id} className="gh-list__row">
            {inner}
          </div>
        );
      })
    )}
  </div>
);

export default FileList;
