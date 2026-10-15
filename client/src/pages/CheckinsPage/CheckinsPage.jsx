import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, uploadFiles } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import OpsPage from "../../components/OpsPage/OpsPage";
import DataTable from "../../components/DataTable/DataTable";
import { csvDownload, useOpsList } from "../../hooks/useOpsList";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import SuccessModal from "../../components/SuccessModal/SuccessModal";
import StatusChip from "../../components/StatusChip/StatusChip";
import ActionIcons from "../../components/ActionIcons/ActionIcons";
import Avatar from "../../components/Avatar/Avatar";
import ExpenseFormModal, { expenseNameLabel } from "../../components/ExpenseFormModal/ExpenseFormModal";
import CheckinFormModal from "../../components/CheckinFormModal/CheckinFormModal";
import "./CheckinsPage.css";

const money = (n) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(n || 0));

const emptyForm = {
  driver_id: "",
  vehicle_id: "",
  amount: "",
  odometer: "",
  note: "",
  proof_url: "",
  status: "submitted",
};

const emptyExpense = {
  driver_id: "",
  vehicle_id: "",
  name: "",
  amount: "",
  note: "",
  proof_url: "",
  frequency: "once_off",
  status: "submitted",
};

const CheckinsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [people, setPeople] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [lateFee, setLateFee] = useState(0);
  const [open, setOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [success, setSuccess] = useState("");
  const [checkins, setCheckins] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const vehicleForDriver = (list, driverId) =>
    list.find((v) => v.assigned_driver_id === driverId)?.id || "";

  const personFor = (id) => people.find((p) => p.id === id) || drivers.find((p) => p.id === id) || (user?.id === id ? user : null);
  const vehicleFor = (id) => vehicles.find((v) => v.id === id);

  const load = () => {
    const peopleReq =
      user?.role === "driver" ? api("/api/drivers").catch(() => []) : api("/api/users").catch(() => api("/api/drivers"));
    Promise.all([
      api("/api/checkins"),
      api("/api/expenses").catch(() => []),
      api("/api/vehicles"),
      peopleReq,
      api("/api/checkin-schedules").catch(() => []),
    ]).then(([checkinRows, expenseRows = [], list, driverRows = [], scheduleRows]) => {
      setCheckins(checkinRows);
      setExpenses(expenseRows);
      setVehicles(list);
      setDrivers(driverRows.filter((p) => p.role === "driver" || !p.role));
      setPeople(driverRows);
      setSchedules(scheduleRows);
      const driverId = user?.role === "driver" ? user.id : "";
      setLateFee(Number(scheduleRows.find((s) => s.driver_id === driverId)?.late_fee_now || 0));
    });
  };

  useEffect(load, [user?.role]);

  useEffect(() => {
    const merged = [
      ...checkins.map((row) => ({ ...row, record_type: "checkin" })),
      ...expenses.map((row) => ({ ...row, record_type: "expense" })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setRows(merged);
  }, [checkins, expenses]);

  const starterIds = () => {
    const driverId = user?.role === "driver" ? user.id : "";
    return {
      driver_id: driverId,
      vehicle_id: driverId ? vehicleForDriver(vehicles, driverId) : "",
    };
  };

  const openForm = (row) => {
    if (row?.record_type === "expense") {
      openExpense(row);
      return;
    }
    if (row) {
      setEditing(row);
      setForm({
        driver_id: row.driver_id || "",
        vehicle_id: row.vehicle_id || "",
        amount: row.amount ?? "",
        odometer: row.odometer ?? "",
        note: row.note || "",
        proof_url: row.proof_url || "",
        status: row.status || "submitted",
      });
    } else {
      setEditing(null);
      setForm({ ...emptyForm, ...starterIds() });
    }
    setError("");
    setOpen(true);
  };

  const openExpense = (row) => {
    if (row) {
      setEditing(row);
      setExpenseForm({
        driver_id: row.driver_id || "",
        vehicle_id: row.vehicle_id || "",
        name: row.name || "",
        amount: row.amount ?? "",
        note: row.note || "",
        proof_url: row.proof_url || "",
        frequency: row.frequency || "once_off",
        status: row.status || "submitted",
      });
    } else {
      setEditing(null);
      setExpenseForm({ ...emptyExpense, ...starterIds() });
    }
    setError("");
    setExpenseOpen(true);
  };

  const onDriverChange = (driverId) => {
    setForm((f) => ({
      ...f,
      driver_id: driverId,
      vehicle_id: vehicleForDriver(vehicles, driverId) || f.vehicle_id,
    }));
    setLateFee(Number(schedules.find((s) => s.driver_id === driverId)?.late_fee_now || 0));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (editing) {
        await api(`/api/checkins/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        setSuccess("Check-in was updated.");
      } else {
        await api("/api/checkins", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setSuccess("Check-in was submitted.");
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onProof = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;
    const { urls } = await uploadFiles(files);
    setForm((f) => ({ ...f, proof_url: urls[0] }));
  };

  const onExpenseProof = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;
    const { urls } = await uploadFiles(files);
    setExpenseForm((f) => ({ ...f, proof_url: urls[0] }));
  };

  const submitExpense = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (editing?.record_type === "expense") {
        await api(`/api/expenses/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(expenseForm),
        });
        setSuccess("Expense was updated.");
      } else {
        await api("/api/expenses", {
          method: "POST",
          body: JSON.stringify(expenseForm),
        });
        setSuccess("Expense was logged.");
      }
      setExpenseOpen(false);
      setEditing(null);
      setExpenseForm(emptyExpense);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const { query, setQuery, tab, setTab, filtered } = useOpsList(rows, {
    searchKeys: ["note", "status", "record_type", "frequency", "name"],
    matchTab: (row, current) =>
      current === "expense" ? row.record_type === "expense" : row.status === current,
  });
  const canManage = user?.role !== "driver";
  const columns = [
    {
      key: "driver",
      label: "Driver",
      render: (r) => {
        const person = personFor(r.driver_id);
        return (
          <div className="fc-table__name-cell">
            <Avatar src={person?.photo_url} name={person?.full_name || "U"} />
            <span>{person?.full_name || "—"}</span>
          </div>
        );
      },
    },
    {
      key: "created_at",
      label: "When",
      render: (r) => new Date(r.created_at).toLocaleString("en-ZA"),
    },
    {
      key: "vehicle",
      label: "Vehicle",
      render: (r) => {
        const vehicle = vehicleFor(r.vehicle_id);
        const src = vehicle?.photo_url || vehicle?.photos?.[0];
        return (
          <div className="fc-table__name-cell">
            <Avatar src={src} name={vehicle?.registration || "V"} />
            <span className="fc-table__id">{vehicle?.registration || "—"}</span>
          </div>
        );
      },
    },
    { key: "amount", label: "Amount", render: (r) => money(r.amount) },
    {
      key: "name",
      label: "Expense",
      render: (r) => (r.record_type === "expense" ? expenseNameLabel(r.name) : "—"),
    },
    {
      key: "record_type",
      label: "Type",
      render: (r) => <StatusChip value={r.record_type === "expense" ? "expense" : "check-in"} />,
    },
    {
      key: "frequency",
      label: "Frequency",
      render: (r) =>
        r.record_type === "expense" ? (
          <StatusChip value={r.frequency === "monthly" ? "monthly" : "once_off"} />
        ) : (
          "—"
        ),
    },
    {
      key: "proof_url",
      label: "Proof",
      render: (r) =>
        r.proof_url ? (
          <a href={r.proof_url} target="_blank" rel="noreferrer">
            Proof
          </a>
        ) : (
          "—"
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className="checkin-status">
          <StatusChip value={r.status || "submitted"} />
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="checkin-actions">
          <ActionIcons
            onView={
              r.record_type === "expense" ? () => openExpense(r) : () => navigate(`/checkins/${r.id}`)
            }
            onEdit={canManage ? () => openForm(r) : undefined}
            onDelete={canManage ? () => setPendingDelete(r) : undefined}
          />
        </div>
      ),
    },
  ];

  const assignedLabel = (() => {
    const vehicle = vehicles.find((v) => v.id === form.vehicle_id);
    if (!vehicle || !form.driver_id) return "";
    if (vehicle.assigned_driver_id === form.driver_id) return "Assigned to this driver";
    return "Not the assigned vehicle";
  })();

  return (
    <>
      <OpsPage
        crumb={["Operations", "Check-in"]}
        title="Driver check-in"
        subtitle="Cash check-ins and vehicle expenses"
        primaryLabel="New check-in"
        onPrimary={() => openForm()}
        extraLabel="Log expense"
        onExtra={() => openExpense()}
        secondaryLabel="Check-in schedule"
        onSecondary={canManage ? () => navigate("/checkins/schedules") : undefined}
        onExport={() => csvDownload("checkins.csv", columns, filtered)}
        stats={[
          { id: "all", label: "Total", value: rows.length, tone: "blue", icon: "R" },
          { id: "submitted", label: "Submitted", value: rows.filter((r) => r.status === "submitted").length, tone: "amber", icon: "↑" },
          { id: "approved", label: "Approved", value: rows.filter((r) => r.status === "approved").length, tone: "green", icon: "✓" },
          { id: "rejected", label: "Rejected", value: rows.filter((r) => r.status === "rejected").length, tone: "red", icon: "!" },
        ]}
        activeStat={tab}
        onStat={setTab}
      >
        <DataTable
          rows={filtered}
          columns={columns}
          noun="records"
          totalCount={rows.length}
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search check-ins and expenses..."
          tabs={[
            { id: "all", label: "All" },
            { id: "submitted", label: "Submitted" },
            { id: "approved", label: "Approved" },
            { id: "rejected", label: "Rejected" },
            { id: "expense", label: "Expenses" },
          ]}
          tab={tab}
          onTab={setTab}
        />
      </OpsPage>
      <CheckinFormModal
        open={open}
        editing={Boolean(editing) && editing?.record_type !== "expense"}
        form={form}
        onChange={setForm}
        onDriverChange={onDriverChange}
        onProof={onProof}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSubmit={submit}
        error={error}
        drivers={drivers}
        vehicles={vehicles}
        showDriver={user?.role !== "driver"}
        showStatus={Boolean(editing) && editing?.record_type !== "expense" && canManage}
        assignedLabel={assignedLabel}
        assignedOk={assignedLabel === "Assigned to this driver"}
        lateFeeText={
          lateFee && !editing
            ? `After schedule. ${money(lateFee)} late fee — total ${money(Number(form.amount || 0) + lateFee)}.`
            : ""
        }
      />
      <ExpenseFormModal
        open={expenseOpen}
        editing={editing?.record_type === "expense"}
        form={expenseForm}
        onChange={setExpenseForm}
        onDriverChange={(driverId) =>
          setExpenseForm((f) => ({
            ...f,
            driver_id: driverId,
            vehicle_id: vehicleForDriver(vehicles, driverId) || f.vehicle_id,
          }))
        }
        onProof={onExpenseProof}
        onClose={() => {
          setExpenseOpen(false);
          setEditing(null);
        }}
        onSubmit={submitExpense}
        error={error}
        drivers={drivers}
        vehicles={vehicles}
        showDriver={user?.role !== "driver"}
        showStatus={editing?.record_type === "expense" && canManage}
      />
      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={pendingDelete?.record_type === "expense" ? "Delete this expense?" : "Delete this check-in?"}
        message={
          pendingDelete
            ? `This will permanently remove the ${money(pendingDelete.amount)} ${
                pendingDelete.record_type === "expense" ? "expense" : "check-in"
              }.`
            : ""
        }
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const path =
            pendingDelete.record_type === "expense"
              ? `/api/expenses/${pendingDelete.id}`
              : `/api/checkins/${pendingDelete.id}`;
          await api(path, { method: "DELETE" });
          setPendingDelete(null);
          setSuccess(pendingDelete.record_type === "expense" ? "Expense was deleted." : "Check-in was deleted.");
          load();
        }}
      />
      <SuccessModal open={Boolean(success)} message={success} onClose={() => setSuccess("")} />
    </>
  );
};

export default CheckinsPage;
