import { db } from "./store.js";

export const addMonths = (iso, months) => {
  const date = new Date(iso || Date.now());
  date.setMonth(date.getMonth() + Number(months || 2));
  return date;
};

export const decorateService = (row, vehicle) => {
  const intervalKm = Number(row.interval_km || 10000);
  const intervalMonths = Number(row.interval_months || 2);
  const lastKm = Number(row.last_service_odometer ?? 0);
  const lastAt = row.last_service_at || row.created_at;
  const nextDueKm = lastKm + intervalKm;
  const nextDueDate = addMonths(lastAt, intervalMonths).toISOString();
  const odo = Number(vehicle?.odometer || 0);
  const kmDue = odo >= nextDueKm;
  const timeDue = Date.now() >= new Date(nextDueDate).getTime();
  const open = row.status !== "completed";
  return {
    ...row,
    interval_km: intervalKm,
    interval_months: intervalMonths,
    next_due_km: nextDueKm,
    next_due_date: nextDueDate,
    kmDue,
    timeDue,
    due: open && (kmDue || timeDue),
    km_left: Math.max(0, nextDueKm - odo),
    odometer: odo,
    registration: vehicle?.registration || row.registration || "",
  };
};

const notifyOnce = async ({ companyId, userId, key, title, body }) => {
  const existing = (await db.fetchAll("notifications", companyId)).find(
    (row) => row.user_id === userId && row.key === key,
  );
  if (existing) return;
  await db.insert("notifications", {
    company_id: companyId,
    user_id: userId,
    key,
    title,
    body,
    link: "/maintenance",
    type: "service",
    read: false,
  });
};

const mailOnce = async ({ companyId, key, to, subject, body }) => {
  if (!to) return;
  const existing = (await db.fetchAll("emails", companyId)).find((row) => row.key === key);
  if (existing) return;
  await db.insert("emails", { company_id: companyId, key, to, subject, body });
  console.log(`[mail] to=${to} ${subject}`);
};

export const evaluateCompanyServices = async (companyId) => {
  const [jobs, vehicles, people] = await Promise.all([
    db.fetchAll("maintenance", companyId),
    db.fetchAll("vehicles", companyId),
    db.fetchAll("profiles", companyId),
  ]);
  const open = jobs.filter((row) => row.status !== "completed");
  for (const vehicle of vehicles) {
    let job = open.find((row) => row.vehicle_id === vehicle.id);
    if (!job) {
      if (vehicle.service_paused) continue;
      const lastDone = jobs
        .filter((row) => row.vehicle_id === vehicle.id && row.status === "completed")
        .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0))[0];
      job = await db.insert("maintenance", {
        company_id: companyId,
        vehicle_id: vehicle.id,
        title: "Service",
        interval_km: 10000,
        interval_months: 2,
        last_service_odometer: Number(lastDone?.completed_odometer ?? vehicle.odometer ?? 0),
        last_service_at: lastDone?.completed_at || vehicle.created_at || new Date().toISOString(),
        status: "scheduled",
        slips: [],
      });
      open.push(job);
    }
    const decorated = decorateService(job, vehicle);
    if (!decorated.due) continue;
    if (job.status === "scheduled" || job.status === "in_progress") {
      await db.update("maintenance", job.id, { status: "due" });
    }
    const reason = decorated.kmDue
      ? `${vehicle.registration} is due for service at ${decorated.odometer.toLocaleString()} km (every ${decorated.interval_km.toLocaleString()} km).`
      : `${vehicle.registration} is due for service (every ${decorated.interval_months} months).`;
    const cycle = `service-${job.id}-${decorated.next_due_km}-${String(decorated.next_due_date).slice(0, 10)}`;
    const driver = people.find((p) => p.id === vehicle.assigned_driver_id);
    const staff = people.filter((p) => p.role === "admin" || p.role === "fleet_manager");
    const targets = [...staff];
    if (driver && !targets.some((p) => p.id === driver.id)) targets.push(driver);
    for (const user of targets) {
      await notifyOnce({
        companyId,
        userId: user.id,
        key: `${cycle}-${user.id}`,
        title: "Service due",
        body: reason,
      });
      await mailOnce({
        companyId,
        key: `mail-${cycle}-${user.id}`,
        to: user.email,
        subject: `Service due: ${vehicle.registration}`,
        body: `${reason} Please take the vehicle in and upload the service slip when it is done.`,
      });
    }
  }
};

export const syncVehicleOdometer = async (vehicleId, reading) => {
  const km = Number(reading);
  if (!vehicleId || !Number.isFinite(km) || km <= 0) return null;
  const vehicle = await db.getById("vehicles", vehicleId);
  if (!vehicle) return null;
  if (km > Number(vehicle.odometer || 0)) {
    return db.update("vehicles", vehicleId, { odometer: km });
  }
  return vehicle;
};
