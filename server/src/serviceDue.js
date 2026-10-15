import { db } from "./store.js";
import { notifyAndMail } from "./mail.js";
import { calendarDaysUntil } from "./zaTime.js";

const DEMO_VEHICLE_IDS = new Set(["v-1", "v-2", "v-3"]);
const skipVehicle = (row) => !row || row.demo || DEMO_VEHICLE_IDS.has(row.id);
const skipJob = (row) => !row || row.demo || row.id === "m-1";

export const addMonths = (iso, months) => {
  const date = new Date(iso || Date.now());
  date.setMonth(date.getMonth() + Number(months || 2));
  return date;
};

export const nextServiceSeed = (done, vehicle) => {
  const intervalKm = Number(done?.interval_km || 10000);
  const intervalMonths = Number(done?.interval_months || 2);
  const lastKm = Number(
    done?.completed_odometer ?? done?.last_service_odometer ?? vehicle?.odometer ?? 0,
  );
  const lastAt =
    done?.completed_at || done?.last_service_at || vehicle?.created_at || new Date().toISOString();
  return {
    title: done?.title || "Service",
    interval_km: intervalKm,
    interval_months: intervalMonths,
    last_service_odometer: lastKm,
    last_service_at: lastAt,
  };
};

export const decorateService = (row, vehicle) => {
  const intervalKm = Number(row.interval_km || 10000);
  const intervalMonths = Number(row.interval_months || 2);
  const lastKm = Number(row.last_service_odometer ?? 0);
  const lastAt = row.last_service_at || row.created_at;
  const odo = Number(vehicle?.odometer || 0);
  if (row.status === "completed") {
    const doneKm = Number(row.completed_odometer ?? lastKm);
    const doneAt = row.completed_at || lastAt;
    return {
      ...row,
      interval_km: intervalKm,
      interval_months: intervalMonths,
      next_due_km: doneKm,
      next_due_date: doneAt,
      kmDue: false,
      timeDue: false,
      due: false,
      km_left: 0,
      odometer: odo,
      registration: vehicle?.registration || row.registration || "",
      photo_url: vehicle?.photo_url || vehicle?.photos?.[0] || "",
    };
  }
  const calcDueKm = lastKm + intervalKm;
  const calcDueDate = addMonths(lastAt, intervalMonths).toISOString();
  const manualDue = row.due_date
    ? new Date(`${String(row.due_date).slice(0, 10)}T12:00:00`).toISOString()
    : null;
  const nextDueKm = calcDueKm;
  const nextDueDate =
    manualDue && new Date(manualDue).getTime() < new Date(calcDueDate).getTime()
      ? manualDue
      : calcDueDate;
  const kmDue = odo >= nextDueKm;
  const timeDue = Date.now() >= new Date(nextDueDate).getTime();
  return {
    ...row,
    interval_km: intervalKm,
    interval_months: intervalMonths,
    next_due_km: nextDueKm,
    next_due_date: nextDueDate,
    kmDue,
    timeDue,
    due: kmDue || timeDue,
    km_left: Math.max(0, nextDueKm - odo),
    odometer: odo,
    registration: vehicle?.registration || row.registration || "",
    photo_url: vehicle?.photo_url || vehicle?.photos?.[0] || "",
  };
};

const serviceTargets = (people, vehicle) => {
  const staff = people.filter((p) => p.role === "admin" || p.role === "fleet_manager");
  const driver = people.find((p) => p.id === vehicle.assigned_driver_id);
  const targets = [...staff];
  if (driver && !targets.some((p) => p.id === driver.id)) targets.push(driver);
  return targets.filter((row) => row?.email && !row.demo && !["u-admin", "u-driver"].includes(row.id));
};

const sendServiceNotice = async ({ company, vehicle, job, decorated, people, kind }) => {
  const plate = vehicle.registration || "Vehicle";
  const dateLabel = String(decorated.next_due_date || "").slice(0, 10);
  let title = "Service due";
  let headline = "Service is due";
  let message = `${plate} is due for service.`;
  if (kind === "week") {
    title = "Service in 7 days";
    headline = "Service is in 7 days";
    message = `${plate} is due for service on ${dateLabel} (7 days). Please book it in.`;
  } else if (kind === "day") {
    title = "Service due today";
    headline = "Service is due today";
    message = `${plate} is due for service today (${dateLabel}). Take it in and upload the slip when it is done.`;
  } else if (decorated.kmDue) {
    message = `${plate} is due for service at ${decorated.odometer.toLocaleString("en-ZA")} km (every ${decorated.interval_km.toLocaleString("en-ZA")} km).`;
  } else {
    message = `${plate} is due for service (every ${decorated.interval_months} months).`;
  }
  const cycle = `service-${kind}-${job.id}-${decorated.next_due_km}-${dateLabel}`;
  for (const user of serviceTargets(people, vehicle)) {
    await notifyAndMail({
      companyId: company.id,
      userId: user.id,
      key: `${cycle}-${user.id}`,
      to: user.email,
      toName: user.full_name,
      title,
      subject: `${title}: ${plate}`,
      headline,
      message,
      companyName: company.name,
      link: "/maintenance",
      type: "service",
    });
  }
};

export const companyIdsForUser = async (user) => {
  if (!user) return [];
  if (user.role === "super_admin") {
    return (await db.fetchAll("companies")).filter((company) => !company.demo).map((company) => company.id);
  }
  return user.company_id ? [user.company_id] : [];
};

export const evaluateWorkspaceServices = async (user) => {
  for (const id of await companyIdsForUser(user)) {
    await evaluateCompanyServices(id);
  }
};

export const listDecoratedServices = async (user) => {
  const companyIds = await companyIdsForUser(user);
  const packs = await Promise.all(
    companyIds.map(async (id) => {
      const [jobs, vehicles] = await Promise.all([
        db.fetchAll("maintenance", id),
        db.fetchAll("vehicles", id),
      ]);
      const fleet = vehicles.filter((row) => !skipVehicle(row));
      return jobs
        .filter((row) => !skipJob(row))
        .map((row) => decorateService(row, fleet.find((v) => v.id === row.vehicle_id)))
        .filter((row) => fleet.some((v) => v.id === row.vehicle_id));
    }),
  );
  return packs.flat();
};

export const evaluateCompanyServices = async (companyId) => {
  if (!companyId) return;
  try {
  const company = await db.getById("companies", companyId);
  if (!company || company.demo) return;
  const [jobs, vehicles, people] = await Promise.all([
    db.fetchAll("maintenance", companyId),
    db.fetchAll("vehicles", companyId),
    db.fetchAll("profiles", companyId),
  ]);
  const open = jobs.filter((row) => row.status !== "completed" && !skipJob(row));
  for (const vehicle of vehicles) {
    if (skipVehicle(vehicle)) continue;
    const opens = open.filter((row) => row.vehicle_id === vehicle.id);
    const lastDone = jobs
      .filter((row) => row.vehicle_id === vehicle.id && row.status === "completed")
      .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0))[0];
    const seed = nextServiceSeed(lastDone, vehicle);
    let job = opens.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0] || null;
    for (const extra of opens.filter((row) => job && row.id !== job.id)) {
      await db.remove("maintenance", extra.id);
    }
    if (!job) {
      if (vehicle.service_paused) continue;
      job = await db.insert("maintenance", {
        company_id: companyId,
        vehicle_id: vehicle.id,
        ...seed,
        status: "scheduled",
        slips: [],
      });
      open.push(job);
    } else if (lastDone) {
      const doneAt = new Date(lastDone.completed_at || 0).getTime();
      const jobAt = new Date(job.last_service_at || 0).getTime();
      if (
        Number(job.last_service_odometer) !== Number(seed.last_service_odometer) ||
        jobAt < doneAt
      ) {
        job = await db.update("maintenance", job.id, {
          last_service_odometer: seed.last_service_odometer,
          last_service_at: seed.last_service_at,
          interval_km: seed.interval_km,
          interval_months: seed.interval_months,
          title: seed.title,
          due_date: null,
          status: "scheduled",
        });
      }
    }
    const decorated = decorateService(job, vehicle);
    const days = calendarDaysUntil(decorated.next_due_date);
    if (days === 7) {
      await sendServiceNotice({ company, vehicle, job, decorated, people, kind: "week" });
    }
    if (days === 0) {
      await sendServiceNotice({ company, vehicle, job, decorated, people, kind: "day" });
    }
    if (!decorated.due) continue;
    if (job.status === "scheduled" || job.status === "in_progress") {
      await db.update("maintenance", job.id, { status: "due" });
    }
    if (days !== 0 && days !== 7) {
      await sendServiceNotice({ company, vehicle, job, decorated, people, kind: "due" });
    }
  }
  } catch (error) {
    console.error("[service] evaluate", error.message);
  }
};

export const evaluateAllCompanyServices = async () => {
  const companies = (await db.fetchAll("companies")).filter((company) => !company.demo);
  for (const company of companies) {
    await evaluateCompanyServices(company.id);
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
