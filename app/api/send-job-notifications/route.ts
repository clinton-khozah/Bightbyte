import { NextRequest, NextResponse } from "next/server";

// This endpoint proxies to Django backend
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
    
    // Forward to Django backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
    const response = await fetch(`${apiUrl}/ai/email/job-notifications/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job_id: jobId,
        job_title: jobTitle,
        company_name: companyName,
        job_type: jobType,
        category: category,
        location: location,
        match_reason: matchReason,
        job_url: jobUrl,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      const error = await response.text();
      return NextResponse.json(
        { error: error || "Failed to send notifications" },
        { status: response.status }
      );
    }
  } catch (error: any) {
    console.error("Error sending job notifications:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send notifications" },
      { status: 500 }
    );
  }
}
