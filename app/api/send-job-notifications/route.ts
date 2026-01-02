import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateJobMatchEmail, generateAlertEmail, sendEmail } from "@/lib/email-service";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, jobTitle, companyName, jobType, category, location, matchReason } = body;

    if (!jobId || !jobTitle) {
      return NextResponse.json(
        { error: "Missing required fields: jobId, jobTitle" },
        { status: 400 }
      );
    }

    // Get job URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://brightbyt.com";
    const jobUrl = `${siteUrl}/jobs/${jobId}`;

    // Find subscribers who match this job
    const notifications: Array<{ email: string; name?: string; reason: string }> = [];

    // 1. Check students table for users with matching preferences
    const { data: students } = await supabase
      .from("students")
      .select("email, name, preferred_categories, preferred_job_types, notification_preferences")
      .eq("status", "active")
      .or("notification_preferences->>email_notifications.eq.true,notification_preferences->>job_matches.eq.true");

    if (students) {
      for (const student of students) {
        const prefs = student.notification_preferences || {};
        if (prefs.email_notifications !== true && prefs.job_matches !== true) continue;

        let matches = false;
        let reason = "";

        // Check category match
        if (category && student.preferred_categories) {
          const categories = Array.isArray(student.preferred_categories)
            ? student.preferred_categories
            : [];
          if (categories.includes(category)) {
            matches = true;
            reason = `Matches your preferred category: ${category}`;
          }
        }

        // Check job type match
        if (jobType && student.preferred_job_types) {
          const jobTypes = Array.isArray(student.preferred_job_types)
            ? student.preferred_job_types
            : [];
          if (jobTypes.includes(jobType)) {
            matches = true;
            reason = reason
              ? `${reason} and job type: ${jobType}`
              : `Matches your preferred job type: ${jobType}`;
          }
        }

        if (matches && student.email) {
          notifications.push({
            email: student.email,
            name: student.name,
            reason: reason || matchReason || "New job posting",
          });
        }
      }
    }

    // 2. Check job_notifications table for general subscribers
    const { data: jobSubscribers } = await supabase
      .from("job_notifications")
      .select("email, categories")
      .eq("is_active", true);

    if (jobSubscribers) {
      for (const subscriber of jobSubscribers) {
        // Skip if already in notifications list
        if (notifications.some((n) => n.email === subscriber.email)) continue;

        // Check if category matches
        if (category && subscriber.categories) {
          const categories = Array.isArray(subscriber.categories)
            ? subscriber.categories
            : [];
          if (categories.length === 0 || categories.includes(category)) {
            notifications.push({
              email: subscriber.email,
              reason: matchReason || `New ${category} job posted`,
            });
          }
        } else if (!category) {
          // If no category specified, notify all subscribers
          notifications.push({
            email: subscriber.email,
            reason: matchReason || "New job posting",
          });
        }
      }
    }

    // Send emails
    const results = await Promise.allSettled(
      notifications.map(async (notification) => {
        const emailHtml = notification.reason.includes("Matches")
          ? generateJobMatchEmail(
              notification.name || notification.email.split("@")[0],
              jobTitle,
              companyName || "Company",
              jobType || "Job",
              location || "Not specified",
              notification.reason,
              jobUrl
            )
          : generateAlertEmail(
              notification.name || notification.email.split("@")[0],
              "New Job Posted",
              `A new ${jobType || "job"} has been posted${category ? ` in ${category}` : ""}. Check it out!`,
              jobUrl,
              "View Job"
            );

        return sendEmail({
          to: notification.email,
          subject: `🎯 ${notification.reason.includes("Matches") ? "New Job Match" : "New Job Posted"} - ${jobTitle}`,
          html: emailHtml,
        });
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled" && r.value).length;
    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      sent: successful,
      failed: failed,
      total: notifications.length,
      message: `Sent ${successful} email${successful !== 1 ? "s" : ""}${failed > 0 ? `, ${failed} failed` : ""}`,
    });
  } catch (error: any) {
    console.error("Error sending job notifications:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send notifications" },
      { status: 500 }
    );
  }
}

