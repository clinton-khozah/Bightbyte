const avg = (values) =>
  values.reduce((sum, n) => sum + n, 0) / values.length;

const dayKey = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const dueOnDay = (schedule, day) => {
  const [h, m] = String(schedule?.due_time || "18:00").split(":").map(Number);
  const due = new Date(day);
  due.setHours(Number.isFinite(h) ? h : 18, Number.isFinite(m) ? m : 0, 0, 0);
  return due;
};

export const starsFromCondition = (condition) => {
  if (condition === "good") return 5;
  if (condition === "fair") return 3.5;
  if (condition === "poor") return 2;
  return 0;
};

const incidentPenalty = (severity) => {
  if (severity === "critical") return 2.5;
  if (severity === "high") return 2;
  if (severity === "medium") return 1;
  return 0.4;
};

export const checkinAgainstSchedule = (checkin, schedule) => {
  if (!checkin) return "missed";
  if (Number(checkin.late_fee_applied) > 0) return "late";
  if (!schedule) {
    if (checkin.status === "rejected") return "late";
    return "on_time";
  }
  return new Date(checkin.created_at) <= dueOnDay(schedule, checkin.created_at) ? "on_time" : "late";
};

const starsForState = (state) => {
  if (state === "on_time") return 5;
  if (state === "late") return 3;
  if (state === "pending") return null;
  return 1;
};

export const buildCheckinHistory = (checkins = [], schedule) => {
  const byDay = {};
  [...checkins]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .forEach((row) => {
      const key = dayKey(row.created_at);
      if (!byDay[key]) byDay[key] = row;
    });

  const out = Object.values(byDay).map((row) => ({
    date: new Date(row.created_at),
    key: dayKey(row.created_at),
    state: checkinAgainstSchedule(row, schedule),
    amount: Number(row.amount || 0),
    row,
  }));

  if (schedule && schedule.active !== false) {
    const now = new Date();
    const today = dayKey(now);
    const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dueWeekday = String(schedule.due_weekday || "").toLowerCase();
    const isDueDay = dueWeekday ? names[now.getDay()] === dueWeekday : now.getDay() !== 0 && now.getDay() !== 6;
    if (isDueDay && !byDay[today]) {
      out.push({
        date: now,
        key: today,
        state: now <= dueOnDay(schedule, now) ? "pending" : "missed",
        amount: 0,
        row: null,
      });
    }
  }

  return out;
};

export const computeDriverScore = ({
  reviews = [],
  incidents = [],
  checkins = [],
  ratings = [],
  schedule = null,
}) => {
  const reviewScores = reviews.map((r) => starsFromCondition(r.condition)).filter(Boolean);
  const vehicleCare = reviewScores.length ? avg(reviewScores) : null;

  const safety = incidents.length
    ? Math.max(1, 5 - incidents.reduce((sum, row) => sum + incidentPenalty(row.severity), 0))
    : null;

  const history = buildCheckinHistory(checkins, schedule);
  const scheduleScores = history.map((day) => starsForState(day.state)).filter((n) => n != null);
  const reliability = scheduleScores.length ? avg(scheduleScores) : null;

  const systemParts = [vehicleCare, safety, reliability].filter((n) => n != null);
  const system = systemParts.length ? avg(systemParts) : 0;

  const managerScores = ratings.map((row) => Number(row.score)).filter((n) => n > 0);
  const manager = managerScores.length ? avg(managerScores) : null;

  const overallParts = [...(system ? [system] : []), ...(manager != null ? [manager] : [])];
  const overall = overallParts.length ? avg(overallParts) : 0;
  const sampleCount = reviewScores.length + incidents.length + scheduleScores.length + managerScores.length;
  const onTime = history.filter((d) => d.state === "on_time").length;
  const late = history.filter((d) => d.state === "late").length;
  const missed = history.filter((d) => d.state === "missed").length;

  return {
    overall,
    system,
    manager,
    vehicleCare,
    safety,
    reliability,
    sampleCount,
    managerCount: managerScores.length,
    history,
    onTime,
    late,
    missed,
    dueTime: schedule?.due_time || "18:00",
  };
};
