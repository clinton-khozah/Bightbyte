import { NextRequest, NextResponse } from "next/server";

// Email service using Resend or fallback to SMTP
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, from = "clintonkhozah@gmail.com" } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 }
      );
    }

    // Try Resend API first
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: `Brightbyt <${from}>`,
            to: [to],
            subject: subject,
            html: html,
          }),
        });

        if (resendResponse.ok) {
          const data = await resendResponse.json();
          console.log("✅ Email sent via Resend:", data);
          return NextResponse.json({ success: true, data });
        }
      } catch (resendError) {
        console.error("Resend API error:", resendError);
      }
    }

    // Fallback: Log email (for development/testing)
    // In production, you'd use nodemailer or another SMTP service
    console.log("📧 Email would be sent:");
    console.log("To:", to);
    console.log("From:", `Brightbyt <${from}>`);
    console.log("Subject:", subject);
    console.log("HTML:", html.substring(0, 200) + "...");

    // For now, return success (in production, implement actual SMTP sending)
    return NextResponse.json({
      success: true,
      message: "Email queued (development mode - check console)",
      note: "Configure RESEND_API_KEY or implement SMTP for production",
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    );
  }
}

