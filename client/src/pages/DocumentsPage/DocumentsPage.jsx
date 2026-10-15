import React, { useEffect, useState } from "react";
import { api, uploadFiles } from "../../api";
import OpsPage from "../../components/OpsPage/OpsPage";
import Modal from "../../components/Modal/Modal";
import FileDrop from "../../components/FileDrop/FileDrop";
import FilesSheet from "../../components/FilesSheet/FilesSheet";
import { csvDownload, useOpsList } from "../../hooks/useOpsList";
import "./DocumentsPage.css";

const STACK = {
  licence: "vehicle",
  user: "user",
  incident: "incident",
};

const STACK_COPY = {
  licence: "Vehicle licence and registration files.",
  user: "Identity and onboarding documents for people.",
  incident: "Photos and evidence from incident reports.",
};

const whenStamp = (value) =>
  value
    ? new Date(value).toLocaleString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

const DocumentsPage = () => {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", category: "licence", type: "licence", file_url: "" });
  const { query, setQuery, tab, setTab, filtered } = useOpsList(rows, {
    tabKey: "category",
    searchKeys: ["title", "category", "type", "uploaded_by_name"],
  });

  const load = () => api("/api/documents").then(setRows);
  useEffect(() => {
    load();
  }, []);

  const columns = [
    { key: "title", label: "Document Name" },
    { key: "category", label: "Category" },
    { key: "uploaded_by_name", label: "Uploaded by" },
    { key: "created_at", label: "Date", render: (r) => whenStamp(r.created_at) },
  ];

  const openFile = (row) => {
    if (row.file_url) window.open(row.file_url, "_blank", "noopener,noreferrer");
  };

  const sheetRows = filtered.map((row) => ({
    id: row.id,
    name: row.title,
    description: STACK_COPY[row.category] || "Uploaded document.",
    stack: STACK[row.category] || row.type || "file",
    onOpen: () => openFile(row),
    actions: [
      { label: "Open", onClick: () => openFile(row) },
    ],
  }));

  return (
    <>
      <OpsPage
        crumb={["Administration", "Documents"]}
        title="Document Management"
        primaryLabel="Upload Document"
        onPrimary={() => setOpen(true)}
        onExport={() => csvDownload("documents.csv", columns, filtered)}
        stats={[
          { id: "all", label: "Total Documents", value: rows.length, tone: "blue", icon: "📄" },
          { id: "licence", label: "Vehicle Docs", value: rows.filter((r) => r.category === "licence").length, tone: "green", icon: "📁" },
          { id: "user", label: "User Docs", value: rows.filter((r) => r.category === "user").length, tone: "amber", icon: "📑" },
          { id: "incident", label: "Incident Docs", value: rows.filter((r) => r.category === "incident").length, tone: "red", icon: "⏱" },
        ]}
        activeStat={tab}
        onStat={setTab}
      >
        <div className="docs-page__toolbar">
          <label className="docs-page__search">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents..."
            />
          </label>
          <div className="docs-page__tabs">
            {[
              { id: "all", label: "All" },
              { id: "licence", label: "Vehicle Documents" },
              { id: "user", label: "User Documents" },
              { id: "incident", label: "Incident Evidence" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`docs-page__tab${tab === item.id ? " is-on" : ""}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <FilesSheet rows={sheetRows} emptyText="No documents uploaded yet." />
      </OpsPage>
      {open ? (
        <Modal title="Upload document" subtitle="The file is stamped with the time and the person who uploaded it." onClose={() => setOpen(false)}>
          <form
            className="fc-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await api("/api/documents", { method: "POST", body: JSON.stringify(form) });
              setOpen(false);
              setForm({ title: "", category: "licence", type: "licence", file_url: "" });
              load();
            }}
          >
            <label>
              Document name
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </label>
            <label>
              Category
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value, type: e.target.value })}
              >
                <option value="licence">Vehicle document</option>
                <option value="user">User document</option>
                <option value="incident">Incident evidence</option>
              </select>
            </label>
            <FileDrop
              label="File"
              accept="image/*,application/pdf"
              previews={form.file_url ? [form.file_url] : []}
              onChange={async (ev) => {
                if (!ev.target.files?.length) return;
                const file = ev.target.files[0];
                const { urls } = await uploadFiles([file]);
                setForm((f) => ({
                  ...f,
                  file_url: urls[0],
                  title: f.title || file.name.replace(/\.[^.]+$/, ""),
                  type: file.type.includes("pdf") ? "pdf" : f.type,
                }));
              }}
            />
            <div className="fc-form__actions">
              <button className="fc-btn" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="fc-btn fc-btn--primary" type="submit">Upload</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
};

export default DocumentsPage;
