import { config } from "./config.js";
import { db } from "./store.js";
import { dueAtToday, isPastDueTime, isPeriodSettled, zaDay } from "./zaTime.js";

const skipDemo = (row) => Boolean(row?.demo) || ["u-admin", "u-driver"].includes(row?.id);

const sendEmailJs = async (params) => {
  if (!config.emailjs.serviceId || !config.emailjs.templateId || !config.emailjs.publicKey) {
    return { ok: false, error: "EmailJS is not configured" };
  }
  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: config.emailjs.serviceId,
      template_id: config.emailjs.templateId,
      user_id: config.emailjs.publicKey,
      accessToken: config.emailjs.privateKey || undefined,
      template_params: params,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `EmailJS ${res.status}`);
  return { ok: true };
};

export const sendFleetEmail = async ({ companyId, key, to, toName, subject, headline, message, companyName }) => {
  const address = String(to || "").trim();
  if (!address || !key) return;
  const existing = (await db.fetchAll("emails", companyId)).find((row) => row.key === key);
  if (existing) return;
  await db.insert("emails", {
    company_id: companyId,
    key,
    to: address,
    subject,
    body: message,
  });
  try {
    await sendEmailJs({
      to_email: address,
      to_name: toName || "",
      subject,
      headline: headline || subject,
      message,
      company_name: companyName || "Fleet21",
      action_label: "Sign in",
      login_url: config.appLoginUrl,
    });
  } catch (error) {
    console.error(`[mail] ${key}: ${error.message}`);
  }
};

export const notifyAndMail = async ({
  companyId,
  userId,
  key,
  to,
  toName,
  title,
  subject,
  headline,
  message,
  companyName,
  link = "",
  type = "ops",
}) => {
  if (userId) {
    const notes = await db.fetchAll("notifications", companyId);
    if (!notes.some((row) => row.user_id === userId && row.key === key)) {
      await db.insert("notifications", {
        company_id: companyId,
        user_id: userId,
        key,
        title,
        body: message,
        link,
        type,
        read: false,
      });
    }
  }
  await sendFleetEmail({
    companyId,
    key: `mail-${key}`,
    to,
    toName,
    subject: subject || title,
    headline: headline || title,
    message,
    companyName,
  });
};

export const notifyCompanySubmitted = async ({ company, applicant }) => {
  const supers = (await db.listByRole("super_admin")).filter((row) => !skipDemo(row));
  const extra = String(config.superAdminNotifyEmail || "")
    .split(",")
    .map((row) => row.trim())
    .filter(Boolean);
  const message = `${company.name} at ${company.address || "no address"} was submitted by ${applicant.full_name} (${applicant.email}). Approve it on Companies.`;
  await Promise.all(
    supers.map((admin) =>
      notifyAndMail({
        companyId: admin.company_id || company.id,
        userId: admin.id,
        key: `company-submitted-${company.id}-${admin.id}`,
        to: admin.email,
        toName: admin.full_name,
        title: "Company waiting for approval",
        subject: `Company submitted: ${company.name}`,
        headline: "A company is waiting for approval",
        message,
        companyName: "BrightByte",
        link: "/companies",
        type: "company",
      }),
    ),
  );
  await Promise.all(
    extra
      .filter((email) => !supers.some((admin) => admin.email === email))
      .map((email) =>
        sendFleetEmail({
          companyId: company.id,
          key: `company-submitted-${company.id}-${email}`,
          to: email,
          toName: "Super admin",
          subject: `Company submitted: ${company.name}`,
          headline: "A company is waiting for approval",
          message,
          companyName: "BrightByte",
        }),
      ),
  );
};

export const notifyCompanyApproved = async ({ company, people }) => {
  await Promise.all(
    (people || [])
      .filter((person) => !skipDemo(person))
      .map((person) =>
        notifyAndMail({
          companyId: company.id,
          userId: person.id,
          key: `company-approved-${company.id}-${person.id}`,
          to: person.email,
          toName: person.full_name,
          title: "Workspace approved",
          subject: `${company.name} is approved`,
          headline: "Your workspace is active",
          message: `${company.name} has been approved. You can sign in to Fleet21 now.`,
          companyName: company.name,
          link: "/dashboard",
          type: "company",
        }),
      ),
  );
};

export const notifyInvite = async ({ company, person, username, password, inviterName }) => {
  if (!person?.email) return;
  const login = config.appLoginUrl;
  await notifyAndMail({
    companyId: company.id,
    userId: person.id,
    key: `invite-${person.id}`,
    to: person.email,
    toName: person.full_name,
    title: "You're invited to Fleet21",
    subject: `You're invited to ${company.name} on Fleet21`,
    headline: "You're invited",
    message: `${inviterName ? `${inviterName} invited you` : "You have been invited"} to join ${company.name} on Fleet21. Username: ${username}. Temporary password: ${password}. Sign in at ${login} and start using the app.`,
    companyName: company.name,
    link: "/login",
    type: "invite",
  });
};

const rand = (n) => `R${Number(n || 0).toFixed(2)}`;

export const notifyCheckinSuccess = async ({ company, driver, vehicle, checkin, lateFee }) => {
  if (!driver || skipDemo(driver)) return;
  const plate = vehicle?.registration || "your vehicle";
  const received = Number(checkin.cash_amount || 0) || Math.max(0, Number(checkin.amount || 0) - Number(lateFee || 0));
  await notifyAndMail({
    companyId: company.id,
    userId: driver.id,
    key: `checkin-ok-${checkin.id}`,
    to: driver.email,
    toName: driver.full_name,
    title: "Check-in received",
    subject: `Check-in received for ${plate}`,
    headline: "Your check-in was received",
    message: `We received your cash check-in of ${rand(received)} for ${plate}.`,
    companyName: company.name,
    link: "/checkins",
    type: "checkin",
  });
};

export const runMissedCheckinMails = async () => {
  const companies = (await db.fetchAll("companies")).filter((company) => !company.demo);
  for (const company of companies) {
    const [schedules, checkins, people] = await Promise.all([
      db.fetchAll("checkin_schedules", company.id),
      db.fetchAll("checkins", company.id),
      db.fetchAll("profiles", company.id),
    ]);
    const today = zaDay(new Date());
    for (const schedule of schedules) {
      if (schedule.demo || schedule.id === "sch-1" || schedule.active === false || schedule.notify === false) {
        continue;
      }
      if (!isPastDueTime(schedule)) continue;
      if (isPeriodSettled(schedule, checkins, dueAtToday(schedule))) continue;
      const driver = people.find((row) => row.id === schedule.driver_id);
      if (!driver || skipDemo(driver) || !driver.email) continue;
      const due = dueAtToday(schedule);
      const dueLabel = due.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false });
      await notifyAndMail({
        companyId: company.id,
        userId: driver.id,
        key: `checkin-missed-${schedule.id}-${today}`,
        to: driver.email,
        toName: driver.full_name,
        title: "Missed check-in",
        subject: "You missed today's cash check-in",
        headline: "Check-in was not received",
        message: `Hi ${driver.full_name}, today's check-in was due at ${dueLabel} and we have not received it. Please submit it on Check-in as soon as you can.`,
        companyName: company.name,
        link: "/checkins",
        type: "checkin",
      });
    }
  }
};
