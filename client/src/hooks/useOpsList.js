import { useMemo, useState } from "react";
import { exportExcel } from "../lib/exportExcel";

export const useOpsList = (rows = [], { tabKey = "status", searchKeys = [], matchTab } = {}) => {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows || []).filter((row) => {
      if (tab !== "all") {
        if (matchTab) {
          if (!matchTab(row, tab)) return false;
        } else {
          const value = String(row?.[tabKey] || "").toLowerCase();
          if (value !== tab) return false;
        }
      }
      if (!q) return true;
      return searchKeys.some((key) => String(row?.[key] || "").toLowerCase().includes(q));
    });
    // searchKeys is a stable list per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, tab, tabKey, matchTab]);

  return { query, setQuery, tab, setTab, filtered };
};

export const csvDownload = (filename, columns, rows) => {
  const name = String(filename || "export").replace(/\.csv$/i, ".xlsx");
  return exportExcel({
    filename: name,
    sheetName: name.replace(/\.xlsx$/i, "").slice(0, 31),
    title: name.replace(/\.xlsx$/i, "").replace(/[-_]/g, " "),
    columns,
    rows,
  });
};
