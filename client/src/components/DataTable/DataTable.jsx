import React, { useEffect, useState } from "react";
import "./DataTable.css";

const PAGE_SIZE = 15;

const DataTable = ({
  columns,
  rows,
  rowKey = "id",
  noun = "records",
  totalCount,
  searchPlaceholder = "Search...",
  search = "",
  onSearch,
  tabs = [],
  tab,
  onTab,
  emptyText,
  hideToolbar = false,
}) => {
  const list = Array.isArray(rows) ? rows : [];
  const total = totalCount ?? list.length;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  const visible = list.slice(start, start + PAGE_SIZE);
  const from = list.length ? start + 1 : 0;
  const to = Math.min(start + PAGE_SIZE, list.length);

  useEffect(() => {
    setPage(1);
  }, [search, tab, list.length]);

  return (
    <div className="fc-table-wrap">
      {hideToolbar ? null : (
      <div className="fc-table-controls">
        <div className="fc-table-toolbar">
          <label className="fc-table-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(e) => onSearch?.(e.target.value)}
              placeholder={searchPlaceholder}
            />
          </label>
          {tabs.length ? (
            <div className="fc-table-tabs">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`fc-table-tab${tab === item.id ? " fc-table-tab--active" : ""}`}
                  onClick={() => onTab?.(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <p className="fc-table-count">
          Showing {from}–{to} of {total} {noun}
        </p>
      </div>
      )}
      {!list.length ? (
        <div className="fc-empty">{emptyText || `No ${noun} have been logged yet.`}</div>
      ) : (
        <>
          <div className="fc-table-scroll">
            <table className="fc-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row[rowKey]}>
                    {columns.map((col) => (
                      <td key={col.key}>{col.render ? col.render(row) : row[col.key] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 ? (
            <div className="fc-table-pager">
              <button type="button" disabled={current <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {current} of {pageCount}
              </span>
              <button type="button" disabled={current >= pageCount} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default DataTable;
