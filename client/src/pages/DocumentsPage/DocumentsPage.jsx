import React, { useEffect, useState } from "react";
import { api, getToken, uploadFiles } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../constants/roles";
import OpsPage from "../../components/OpsPage/OpsPage";
import Modal from "../../components/Modal/Modal";
import FileDrop from "../../components/FileDrop/FileDrop";
import FilesSheet from "../../components/FilesSheet/FilesSheet";
import LineSelect from "../../components/LineSelect/LineSelect";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import { csvDownload, useOpsList } from "../../hooks/useOpsList";
import "./DocumentsPage.css";

const STACK = {
  licence: "vehicle",
  user: "user",
  incident: "incident",
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
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ title: "", description: "", category: "licence", type: "licence", file_url: "" });
  const { query, setQuery, tab, setTab, filtered } = useOpsList(rows, {
    tabKey: "category",
    searchKeys: ["title", "description", "category", "type", "uploaded_by_name"],
  });

  const load = () =>
    api("/api/documents")
      .then(setRows)
      .catch((err) => setError(err.message));

  const canCreate = can(user, "documents", "create");
  const canDelete = can(user, "documents", "delete");

  useEffect(() => {
    if (can(user, "documents", "view")) load();
  }, [user?.id, user?.role]);

  if (user && !can(user, "documents", "view")) {
    return <p className="fc-error">This role cannot open document management.</p>;
  }

  const columns = [
    { key: "title", label: "Document Name" },
    { key: "description", label: "Description" },
    { key: "category", label: "Category" },
    { key: "uploaded_by_name", label: "Uploaded by" },
    { key: "created_at", label: "Date", render: (r) => whenStamp(r.created_at) },
  ];

  const openFile = async (row) => {
    const res = await fetch(`/api/documents/${row.id}/file`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) {
      setError("This file is only available to a super admin.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const oldCopy = [
    "Vehicle licence and registration files.",
    "Identity and onboarding documents for people.",
    "Photos and evidence from incident reports.",
    "Uploaded document.",
  ];
  const posterName = (row) => {
    const name = row.uploaded_by_name || "";
    if (!name || ["Thabo Mokoena", "Lerato Dlamini"].includes(name)) {
      return user?.company_name || "BrightByte";
    }
    return name;
  };
  const sheetRows = filtered.map((row) => ({
    id: row.id,
    name: row.title,
    description:
      row.description && !oldCopy.includes(row.description)
        ? row.description
        : `Posted by ${posterName(row)} on ${whenStamp(row.created_at)}`,
    stack: STACK[row.category] || row.type || "file",
    onOpen: () => openFile(row),
    onDelete: canDelete ? () => setPending(row) : undefined,
  }));

  return (
    <>
      <OpsPage
        crumb={["Administration", "Documents"]}
        title="Document Management"
        primaryLabel={canCreate ? "Upload Document" : undefined}
        onPrimary={canCreate ? () => { setError(""); setOpen(true); } : undefined}
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
        {error ? <p className="fc-error">{error}</p> : null}
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
        <Modal title="Upload document" subtitle="Only a super admin can open these files." onClose={() => setOpen(false)}>
          <form
            className="fc-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              try {
                await api("/api/documents", { method: "POST", body: JSON.stringify(form) });
                setOpen(false);
                setForm({ title: "", description: "", category: "licence", type: "licence", file_url: "" });
                setSuccess("Document was uploaded.");
                load();
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            <label>
              Document name
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </label>
            <label>
              Description
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short note about this file"
              />
            </label>
            <LineSelect
              label="Category"
              value={form.category}
              onChange={(id) => setForm({ ...form, category: id, type: id })}
              options={[
                { id: "licence", label: "Vehicle document" },
                { id: "user", label: "User document" },
                { id: "incident", label: "Incident evidence" },
              ]}
            />
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
            {error ? <p className="fc-error">{error}</p> : null}
            <div className="fc-form__actions">
              <button className="fc-btn" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="fc-btn fc-btn--primary" type="submit">Upload</button>
            </div>
          </form>
        </Modal>
      ) : null}
      <ConfirmModal
        open={Boolean(pending)}
        title="Delete this document?"
        message={`Remove ${pending?.title || "this document"}? This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          await api(`/api/documents/${pending.id}`, { method: "DELETE" });
          setPending(null);
          setSuccess("Document was deleted.");
          load();
        }}
      />
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
    </>
  );
};

export default DocumentsPage;
