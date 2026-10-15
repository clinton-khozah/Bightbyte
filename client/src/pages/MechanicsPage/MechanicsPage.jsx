import React, { useEffect, useState } from "react";
import { api } from "../../api";
import OpsPage from "../../components/OpsPage/OpsPage";
import DataTable from "../../components/DataTable/DataTable";
import Modal from "../../components/Modal/Modal";
import Avatar from "../../components/Avatar/Avatar";
import { useAuth } from "../../auth/AuthContext";
import { useOpsList } from "../../hooks/useOpsList";
import "./MechanicsPage.css";

const empty = {
  full_name: "",
  trade: "Diesel mechanic",
  phone: "",
  workshop: "",
  hours: "",
  after_hours: false,
  photo_url: "",
};

const MechanicsPage = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = () => api("/api/mechanics").then(setRows);
  useEffect(() => {
    load();
  }, []);

  const { query, setQuery, filtered } = useOpsList(rows, {
    searchKeys: ["full_name", "trade", "phone", "workshop"],
  });

  return (
    <>
      <OpsPage
        crumb={["Operations", "Mechanics"]}
        title="Mechanics"
        subtitle="Call a mechanic when a vehicle has a problem."
        primaryLabel={user?.role !== "driver" ? "Add mechanic" : undefined}
        onPrimary={user?.role !== "driver" ? () => setOpen(true) : undefined}
        stats={[
          { id: "all", label: "Mechanics", value: rows.length, tone: "blue", icon: "🔧" },
          { id: "after", label: "After hours", value: rows.filter((r) => r.after_hours).length, tone: "amber", icon: "☎" },
        ]}
      >
        <DataTable
          rows={filtered}
          columns={[
            {
              key: "full_name",
              label: "Mechanic",
              render: (r) => (
                <div className="fc-table__name-cell">
                  <Avatar src={r.photo_url} name={r.full_name} />
                  <span>{r.full_name}</span>
                </div>
              ),
            },
            { key: "trade", label: "Trade" },
            { key: "workshop", label: "Workshop" },
            { key: "hours", label: "Hours" },
            {
              key: "phone",
              label: "Phone",
              render: (r) =>
                r.phone ? (
                  <a href={`tel:${r.phone.replace(/\s/g, "")}`}>{r.phone}</a>
                ) : (
                  "—"
                ),
            },
            {
              key: "after_hours",
              label: "After hours",
              render: (r) => (r.after_hours ? "Yes" : "No"),
            },
            {
              key: "call",
              label: "Call",
              render: (r) =>
                r.phone ? (
                  <a className="fc-btn fc-btn--primary" href={`tel:${r.phone.replace(/\s/g, "")}`}>
                    Call
                  </a>
                ) : (
                  "—"
                ),
            },
          ]}
          noun="mechanics"
          totalCount={rows.length}
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search mechanics..."
        />
      </OpsPage>
      {open ? (
        <Modal title="Add mechanic" subtitle="These details are used when a vehicle breaks down." onClose={() => setOpen(false)}>
          <form
            className="fc-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await api("/api/mechanics", { method: "POST", body: JSON.stringify(form) });
              setOpen(false);
              setForm(empty);
              load();
            }}
          >
            <label>
              Name
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </label>
            <label>
              Trade
              <input value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} />
            </label>
            <label>
              Phone
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </label>
            <label>
              Workshop
              <input value={form.workshop} onChange={(e) => setForm({ ...form, workshop: e.target.value })} />
            </label>
            <label>
              Hours
              <input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
            </label>
            <label>
              After hours
              <select
                value={form.after_hours ? "yes" : "no"}
                onChange={(e) => setForm({ ...form, after_hours: e.target.value === "yes" })}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
            <div className="fc-form__actions">
              <button className="fc-btn" type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="fc-btn fc-btn--primary" type="submit">
                Save
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
};

export default MechanicsPage;
