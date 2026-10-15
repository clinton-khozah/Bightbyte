import React, { useEffect, useState } from "react";
import Modal from "../Modal/Modal";
import LineSelect from "../LineSelect/LineSelect";
import { ACCESS_TYPES, emptyMatrix, FLEET21_MODULES, mergeMatrix, ROLE_ACTIONS, summariseMatrix } from "../../constants/roles";
import "./RoleFormModal.css";

const RoleFormModal = ({ open, mode, role, onClose, onSave, busy }) => {
  const [form, setForm] = useState({
    RoleName: "",
    description: "",
    key: "admin",
    state: "active",
    permissionsMatrix: emptyMatrix(),
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      RoleName: role?.RoleName || "",
      description: role?.description || "",
      key: role?.key || "admin",
      state: role?.state || "active",
      permissionsMatrix: mergeMatrix(role?.permissionsMatrix || role?.permissionsmatrix || {}),
    });
  }, [open, role]);

  if (!open) return null;

  const toggle = (moduleId, action) => {
    setForm((prev) => ({
      ...prev,
      permissionsMatrix: {
        ...prev.permissionsMatrix,
        [moduleId]: {
          ...prev.permissionsMatrix[moduleId],
          [action]: !prev.permissionsMatrix[moduleId]?.[action],
        },
      },
    }));
  };

  const allOn = FLEET21_MODULES.every((mod) =>
    ROLE_ACTIONS.every((action) => form.permissionsMatrix[mod.id]?.[action.id]),
  );

  const toggleAll = () => {
    const next = !allOn;
    setForm((prev) => ({
      ...prev,
      permissionsMatrix: Object.fromEntries(
        FLEET21_MODULES.map((mod) => [
          mod.id,
          Object.fromEntries(ROLE_ACTIONS.map((action) => [action.id, next])),
        ]),
      ),
    }));
  };

  const mid = Math.ceil(FLEET21_MODULES.length / 2);
  const columns = [FLEET21_MODULES.slice(0, mid), FLEET21_MODULES.slice(mid)];

  return (
    <Modal
      title={mode === "edit" ? "Edit role" : "Add role"}
      subtitle="Name, status and module access in one view — no scrolling."
      xl
      compact
      onClose={onClose}
    >
      <form
        className="fc-form role-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            ...form,
            RoleID: role?.RoleID,
            Permissions: summariseMatrix(form.permissionsMatrix),
          });
        }}
      >
        <label>
          Role name
          <input
            value={form.RoleName}
            onChange={(e) => setForm({ ...form, RoleName: e.target.value })}
            required
          />
        </label>
        <label>
          Description
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <LineSelect
          label="Access type"
          required
          value={form.key}
          onChange={(id) => setForm({ ...form, key: id })}
          options={ACCESS_TYPES}
        />
        <LineSelect
          label="Status"
          value={form.state}
          onChange={(id) => setForm({ ...form, state: id })}
          options={[
            { id: "active", label: "Active" },
            { id: "inactive", label: "Inactive" },
          ]}
        />
        <div className="role-matrix">
          <p>
            Module access
            <label className="role-matrix__all">
              <input type="checkbox" checked={allOn} onChange={toggleAll} />
              Select all
            </label>
          </p>
          <div className="role-matrix__grid">
            {columns.map((mods, col) => (
              <table key={col}>
                <thead>
                  <tr>
                    <th>Module</th>
                    {ROLE_ACTIONS.map((action) => (
                      <th key={action.id}>{action.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mods.map((mod) => (
                    <tr key={mod.id}>
                      <td>{mod.label}</td>
                      {ROLE_ACTIONS.map((action) => (
                        <td key={action.id}>
                          <input
                            type="checkbox"
                            checked={Boolean(form.permissionsMatrix[mod.id]?.[action.id])}
                            onChange={() => toggle(mod.id, action.id)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </div>
        <div className="fc-form__actions">
          <button className="fc-btn" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="fc-btn fc-btn--primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save role"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RoleFormModal;
