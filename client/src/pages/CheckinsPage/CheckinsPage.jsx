import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, uploadFiles } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { can } from "../../constants/roles";
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

const zaDay = (value) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));

const isDriverUser = (user) => user?.role === "driver" || user?.role_key === "driver";

const isDriverProfile = (person) => {
  const role = String(person?.role || person?.role_key || "").toLowerCase();
  return role !== "super_admin";
};

const samePerson = (a, b) => String(a || "") === String(b || "");

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const zaWeekdayIndex = (now = new Date()) => {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
  })
    .format(now)
    .toLowerCase();
  return WEEKDAYS.indexOf(name);
};

const addZaDays = (dayYmd, days) => {
  const start = Date.parse(`${dayYmd}T12:00:00+02:00`);
  return zaDay(new Date(start + days * 86400000));
};

const dueClockZa = (dayYmd, dueTime) => {
  const [h, m] = String(dueTime || "18:00").split(":");
  const hour = String(Number.isFinite(Number(h)) ? Number(h) : 18).padStart(2, "0");
  const minute = String(Number.isFinite(Number(m)) ? Number(m) : 0).padStart(2, "0");
  return new Date(`${dayYmd}T${hour}:${minute}:00+02:00`);
};

const scheduleWeekday = (schedule) => WEEKDAYS.indexOf(String(schedule?.due_weekday || "").toLowerCase());

const dueFromSchedule = (schedule, now = new Date()) => {
  const target = scheduleWeekday(schedule);
  if (target < 0) return null;
  const today = zaDay(now);
  const delta = (target - zaWeekdayIndex(now) + 7) % 7;
  return dueClockZa(addZaDays(today, delta), schedule.due_time);
};

const roundMoney = (n) => Math.round(Number(n || 0) * 100) / 100;

const checkinCash = (row) => {
  const cash = Number(row?.cash_amount);
  if (Number.isFinite(cash) && cash > 0) return cash;
  return Math.max(0, Number(row?.amount || 0) - Number(row?.late_fee_applied || 0));
};

const countsTowardPay = (row) => String(row?.status || "").toLowerCase() !== "rejected";

const lastDueFromSchedule = (schedule, now = new Date()) => {
  const next = dueFromSchedule(schedule, now);
  if (!next) return null;
  if (now >= next) return next;
  return dueClockZa(addZaDays(zaDay(next), -7), schedule.due_time);
};

const scheduleBalance = (schedule, checkins = [], due = dueFromSchedule(schedule)) => {
  const expected = roundMoney(schedule?.expected_amount);
  const dueDay = zaDay(due);
  const paid = roundMoney(
    checkins
      .filter((row) => countsTowardPay(row) && zaDay(row.created_at) === dueDay)
      .reduce((sum, row) => sum + checkinCash(row), 0),
  );
  const remaining = expected > 0 ? roundMoney(Math.max(0, expected - paid)) : 0;
  const settled = expected > 0 ? remaining <= 0 : paid > 0;
  return { expected, paid, remaining, settled };
};

const checkedInForDue = (checkins, due, next) => {
  const windowEnd = next && next.getTime() !== due.getTime() ? next.getTime() : due.getTime() + 7 * 86400000;
  return checkins.some((row) => {
    if (String(row.status || "").toLowerCase() === "rejected") return false;
    const at = new Date(row.created_at).getTime();
    return at >= due.getTime() && at < windowEnd;
  });
};

const openDriverDue = (schedule, checkins = []) => {
  const due = lastDueFromSchedule(schedule);
  if (!due) return null;
  const next = dueFromSchedule(schedule);
  if (checkedInForDue(checkins, due, next)) return null;
  const balance = scheduleBalance(schedule, checkins, due);
  if (balance.settled) return null;
  return { due, balance };
};

const pendingFromSchedule = (schedule, checkins = []) => {
  const last = lastDueFromSchedule(schedule);
  if (!last) return null;
  const lastBalance = scheduleBalance(schedule, checkins, last);
  if (!lastBalance.settled) return { due: last, balance: lastBalance };
  const next = dueFromSchedule(schedule);
  if (!next || zaDay(next) === zaDay(last)) return null;
  const nextBalance = scheduleBalance(schedule, checkins, next);
  if (!nextBalance.settled) return { due: next, balance: nextBalance };
  return null;
};

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
  const [loading, setLoading] = useState(true);
  const [fetched, setFetched] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [people, setPeople] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [lateFee, setLateFee] = useState(0);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [expenseForm, setExpenseForm] = useState(emptyExpense);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [success, setSuccess] = useState("");
  const [checkins, setCheckins] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const vehicleForDriver = (list, driverId) => {
    const linked = list.find((v) => v.assigned_driver_id === driverId)?.id;
    if (linked) return linked;
    const person = drivers.find((row) => row.id === driverId) || people.find((row) => row.id === driverId);
    return person?.assigned_vehicle_id || "";
  };

  const personFor = (id) => people.find((p) => p.id === id) || drivers.find((p) => p.id === id) || (user?.id === id ? user : null);
  const vehicleFor = (id) => vehicles.find((v) => v.id === id);

  const load = () => {
    setLoading(true);
    setFetched(false);
    const driverView = isDriverUser(user);
    const peopleReq = driverView
      ? api("/api/drivers").catch(() => [])
      : api("/api/users").catch(() => api("/api/drivers").catch(() => []));
    Promise.all([
      api("/api/checkins").catch(() => []),
      driverView ? Promise.resolve([]) : api("/api/expenses").catch(() => []),
      api("/api/vehicles").catch(() => []),
      peopleReq,
      api("/api/checkin-schedules").catch(() => []),
    ]).then(([checkinRows, expenseRows = [], list, driverRows = [], scheduleRows]) => {
      const peopleRows = Array.isArray(driverRows) ? driverRows : [];
      const fleetRows = Array.isArray(list) ? list : [];
      setCheckins(driverView ? checkinRows.filter((row) => samePerson(row.driver_id, user.id)) : checkinRows);
      setExpenses(driverView ? [] : expenseRows);
      setVehicles(fleetRows);
      setDrivers(
        driverView
          ? peopleRows.filter((p) => samePerson(p.id, user.id))
          : peopleRows.filter(isDriverProfile),
      );
      setPeople(driverView ? peopleRows.filter((p) => samePerson(p.id, user.id)) : peopleRows);
      setSchedules(scheduleRows);
      const mine = scheduleRows.find((s) => samePerson(s.driver_id, user?.id));
      setLateFee(Number(mine?.late_fee_now || 0));
      setFetched(true);
    }).catch(() => setFetched(true));
  };

  useEffect(load, [user?.id, user?.role, user?.role_key]);

  useEffect(() => {
    if (isDriverUser(user)) {
      const mine = schedules.filter(
        (row) =>
          samePerson(row.driver_id, user.id) &&
          row.active !== false &&
          scheduleWeekday(row) >= 0 &&
          roundMoney(row.expected_amount) > 0,
      );
      const pendingRows = mine.flatMap((schedule) => {
        const open = openDriverDue(schedule, checkins);
        if (!open) return [];
        const { due, balance } = open;
        return [
          {
            id: `due-${schedule.id}`,
            record_type: "pending",
            driver_id: user.id,
            vehicle_id: schedule.vehicle_id || vehicleForDriver(vehicles, user.id),
            created_at: due.toISOString(),
            due_at: due.toISOString(),
            due_weekday: schedule.due_weekday || "",
            due_time: schedule.due_time || "18:00",
            amount: balance.remaining,
            expected_amount: balance.expected,
            paid_amount: balance.paid,
            remaining: balance.remaining,
            status: "pending",
          },
        ];
      });
      setRows(pendingRows);
    } else {
      const merged = [
        ...checkins.map((row) => ({ ...row, record_type: "checkin" })),
        ...expenses.map((row) => ({ ...row, record_type: "expense" })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRows(merged);
    }
    if (fetched) setLoading(false);
  }, [checkins, expenses, schedules, vehicles, user, fetched]);

  const lastOdometerFor = (vehicleId) => Number(vehicles.find((v) => v.id === vehicleId)?.odometer || 0);

  const starterIds = () => {
    const driverId = isDriverUser(user) ? user.id : "";
    const vehicle_id = driverId ? vehicleForDriver(vehicles, driverId) : "";
    const lastKm = lastOdometerFor(vehicle_id);
    return {
      driver_id: driverId,
      vehicle_id,
      odometer: lastKm || "",
    };
  };

  const openForm = (row) => {
    if (row?.record_type === "expense") {
      openExpense(row);
      return;
    }
    if (row?.record_type === "pending") {
      setEditing(null);
      const vehicle_id = row.vehicle_id || starterIds().vehicle_id;
      const pay = roundMoney(row.remaining > 0 ? row.remaining : row.expected_amount || row.amount);
      setForm({
        ...emptyForm,
        ...starterIds(),
        vehicle_id,
        amount: pay > 0 ? String(pay) : "",
        odometer: lastOdometerFor(vehicle_id) || "",
      });
      setError("");
      setOpen(true);
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
      const start = starterIds();
      const pending = schedules
        .filter(
          (s) =>
            samePerson(s.driver_id, user?.id) &&
            s.active !== false &&
            scheduleWeekday(s) >= 0 &&
            roundMoney(s.expected_amount) > 0,
        )
        .map((s) => pendingFromSchedule(s, checkins))
        .find(Boolean);
      const pay = roundMoney(pending?.balance?.remaining || pending?.balance?.expected);
      setForm({
        ...emptyForm,
        ...start,
        amount: pay > 0 ? String(pay) : "",
      });
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
    setForm((f) => {
      const vehicle_id = vehicleForDriver(vehicles, driverId) || f.vehicle_id;
      return {
        ...f,
        driver_id: driverId,
        vehicle_id,
      };
    });
    setLateFee(Number(schedules.find((s) => s.driver_id === driverId)?.late_fee_now || 0));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;
    setError("");
    if (user?.role !== "driver" && !form.driver_id) {
      setError("Select a driver");
      return;
    }
    if (!form.vehicle_id) {
      setError("Select a vehicle");
      return;
    }
    const km = Number(form.odometer);
    if (!Number.isFinite(km) || km < 0) {
      setError("Enter the odometer reading");
      return;
    }
    savingRef.current = true;
    setSaving(true);
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
        const leftover =
          isDriver && driverBalance?.expected > 0
            ? roundMoney(Math.max(0, driverBalance.remaining - Number(form.amount || 0)))
            : 0;
        setSuccess(
          leftover > 0
            ? `Check-in was submitted. Remaining ${money(leftover)} still due.`
            : "Check-in was submitted.",
        );
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      savingRef.current = false;
      setSaving(false);
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
    if (user?.role !== "driver" && !expenseForm.driver_id) {
      setError("Select a driver");
      return;
    }
    if (!expenseForm.vehicle_id) {
      setError("Select a vehicle");
      return;
    }
    if (!expenseForm.name) {
      setError("Select an expense name");
      return;
    }
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
    matchTab: (row, current) => {
      if (current === "expense") return row.record_type === "expense";
      if (current === "pending") return row.record_type === "pending";
      return row.record_type === "checkin" && row.status === current;
    },
  });
  const canManage = can(user, "checkins", "edit");
  const canCreate = can(user, "checkins", "create");
  const canDelete = can(user, "checkins", "delete");
  const isDriver = isDriverUser(user);
  const canLogExpense = canCreate && !isDriver;
  const driverSchedule = schedules.find(
    (row) =>
      samePerson(row.driver_id, user?.id) &&
      row.active !== false &&
      scheduleWeekday(row) >= 0 &&
      roundMoney(row.expected_amount) > 0,
  );
  const driverPending = driverSchedule ? openDriverDue(driverSchedule, checkins) : null;
  const driverBalance = driverPending?.balance || null;
  const dueStamp = driverPending
    ? driverPending.due.toLocaleString("en-ZA", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const columns = isDriver
    ? [
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
          key: "due_at",
          label: "Due",
          render: (r) => {
            const when = r.record_type === "checkin" ? r.created_at : r.due_at;
            if (!when) return r.due_time || "—";
            const stamp = new Date(when).toLocaleString("en-ZA", {
              weekday: "short",
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            return r.record_type === "checkin" ? stamp : `${stamp}${r.due_time ? ` (${r.due_time})` : ""}`;
          },
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
        {
          key: "amount",
          label: "Due amount",
          render: (r) => money(r.expected_amount ?? r.amount),
        },
        {
          key: "remaining",
          label: "Remaining",
          render: (r) => (r.record_type === "checkin" ? "—" : money(r.remaining ?? r.expected_amount ?? r.amount)),
        },
        {
          key: "status",
          label: "Status",
          render: (r) => <StatusChip value={r.status || "pending"} />,
        },
        {
          key: "actions",
          label: "Actions",
          render: (r) =>
            r.record_type === "pending" ? (
              <button type="button" className="fc-btn fc-btn--primary" onClick={() => openForm(r)}>
                Check in
              </button>
            ) : null,
        },
      ]
    : [
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
            onDelete={canDelete ? () => setPendingDelete(r) : undefined}
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
    <div className="checkins-page">
      <OpsPage
        crumb={["Operations", "Check-in"]}
        title="Driver check-in"
        subtitle={
          isDriver
            ? dueStamp
              ? `Pending check-in due ${dueStamp}.`
              : "No check-in is due."
            : "Cash check-ins and vehicle expenses"
        }
        primaryLabel={canCreate ? "New check-in" : undefined}
        onPrimary={canCreate ? () => openForm() : undefined}
        extraLabel={canLogExpense ? "Log expense" : undefined}
        onExtra={canLogExpense ? () => openExpense() : undefined}
        secondaryLabel="Check-in schedule"
        onSecondary={canManage ? () => navigate("/checkins/schedules") : undefined}
        onExport={isDriver ? undefined : () => csvDownload("checkins.csv", columns, filtered)}
        stats={
          isDriver
            ? [
                { id: "all", label: "Pending", value: rows.filter((r) => r.record_type === "pending").length, tone: "amber", icon: "⏱" },
              ]
            : [
                { id: "all", label: "Total", value: rows.length, tone: "blue", icon: "R" },
                { id: "submitted", label: "Submitted", value: rows.filter((r) => r.status === "submitted").length, tone: "amber", icon: "↑" },
                { id: "approved", label: "Approved", value: rows.filter((r) => r.status === "approved").length, tone: "green", icon: "✓" },
                { id: "rejected", label: "Rejected", value: rows.filter((r) => r.status === "rejected").length, tone: "red", icon: "!" },
              ]
        }
        activeStat={isDriver ? "all" : tab}
        onStat={isDriver ? undefined : setTab}
      >
        <DataTable
          rows={filtered}
          loading={loading}
          columns={columns}
          noun="records"
          totalCount={rows.length}
          search={query}
          onSearch={setQuery}
          searchPlaceholder="Search check-ins and expenses..."
          hideToolbar={isDriver}
          tabs={
            isDriver
              ? []
              : [
                  { id: "all", label: "All" },
                  { id: "submitted", label: "Submitted" },
                  { id: "approved", label: "Approved" },
                  { id: "rejected", label: "Rejected" },
                  { id: "expense", label: "Expenses" },
                ]
          }
          tab={tab}
          onTab={setTab}
          emptyText={
            isDriver
              ? driverSchedule
                ? "You have already checked in for this due."
                : "No check-in schedule is set for you."
              : undefined
          }
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
        busy={saving}
        error={error}
        drivers={drivers}
        vehicles={vehicles}
        showDriver={!isDriver}
        showStatus={Boolean(editing) && editing?.record_type !== "expense" && canManage}
        assignedLabel={assignedLabel}
        assignedOk={assignedLabel === "Assigned to this driver"}
        lateFeeText={
          [
            isDriver && driverBalance
              ? `Due ${money(driverBalance.expected)}. Remaining ${money(driverBalance.remaining)}.`
              : "",
            lateFee && !editing
              ? `After schedule. ${money(lateFee)} late fee — total ${money(Number(form.amount || 0) + lateFee)}.`
              : "",
          ]
            .filter(Boolean)
            .join(" ")
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
        showDriver={!isDriver}
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
    </div>
  );
};

export default CheckinsPage;
