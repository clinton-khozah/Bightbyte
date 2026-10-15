export const TZ = "Africa/Johannesburg";

export const zaNowParts = (now = new Date()) => {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((part) => [part.type, part.value]));
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
};

export const zaDay = (value) => zaNowParts(new Date(value || Date.now())).day;

export const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const parseDueWeekday = (value) => {
  const key = String(value || "").trim().toLowerCase();
  return WEEKDAYS.includes(key) ? key : "";
};

export const zaWeekdayIndex = (now = new Date()) => {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long" })
    .format(now)
    .toLowerCase();
  const index = WEEKDAYS.indexOf(name);
  return index >= 0 ? index : new Date(now).getUTCDay();
};

export const addZaDays = (dayYmd, days) => {
  const start = Date.parse(`${dayYmd}T12:00:00+02:00`);
  return zaDay(new Date(start + days * 86400000));
};

const dueClock = (dayYmd, schedule) => {
  const [h, m] = String(schedule?.due_time || "18:00").split(":");
  const hour = String(Number.isFinite(Number(h)) ? Number(h) : 18).padStart(2, "0");
  const minute = String(Number.isFinite(Number(m)) ? Number(m) : 0).padStart(2, "0");
  return new Date(`${dayYmd}T${hour}:${minute}:00+02:00`);
};

export const dueAtToday = (schedule, now = new Date()) => {
  const { day } = zaNowParts(now);
  const target = WEEKDAYS.indexOf(parseDueWeekday(schedule?.due_weekday));
  if (target < 0) return dueClock(day, schedule);
  const delta = (target - zaWeekdayIndex(now) + 7) % 7;
  return dueClock(addZaDays(day, delta), schedule);
};

const cashToward = (row) => {
  const cash = Number(row?.cash_amount);
  if (Number.isFinite(cash) && cash > 0) return cash;
  return Math.max(0, Number(row?.amount || 0) - Number(row?.late_fee_applied || 0));
};

export const isPeriodSettled = (schedule, checkins = [], due = dueAtToday(schedule)) => {
  const expected = Number(schedule?.expected_amount || 0);
  const dueDay = zaDay(due);
  const paid = (checkins || [])
    .filter(
      (row) =>
        !row?.demo &&
        String(row.driver_id) === String(schedule?.driver_id) &&
        zaDay(row.created_at) === dueDay,
    )
    .reduce((sum, row) => sum + cashToward(row), 0);
  if (expected > 0) return paid + 0.009 >= expected;
  return paid > 0;
};

export const dueAtForSchedule = (schedule, checkins = [], now = new Date()) => {
  const due = dueAtToday(schedule, now);
  if (!isPeriodSettled(schedule, checkins, due)) return due;
  const weekly = WEEKDAYS.indexOf(parseDueWeekday(schedule?.due_weekday)) >= 0;
  return dueClock(addZaDays(zaDay(due), weekly ? 7 : 1), schedule);
};

export const isPastDueTime = (schedule, now = new Date()) => now > dueAtToday(schedule, now);

export const calendarDaysUntil = (iso, now = new Date()) => {
  const today = zaDay(now);
  const due = zaDay(iso);
  const start = Date.parse(`${today}T00:00:00+02:00`);
  const end = Date.parse(`${due}T00:00:00+02:00`);
  return Math.round((end - start) / 86400000);
};
