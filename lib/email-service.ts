// Email service for Brightbyt notifications
// Uses Django backend API for sending emails

interface EmailOptions {
  to: string;
  subject?: string;
  html?: string;
  from?: string;
  name?: string;
  type?: "welcome" | "job_match" | "alert";
  // For job_match type
  job_title?: string;
  company_name?: string;
  job_type?: string;
  location?: string;
  match_reason?: string;
  job_url?: string;
  // For alert type
  title?: string;
  message?: string;
  action_url?: string;
  action_text?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

/**
 * Send email using Django backend API
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const emailType = options.type || "welcome";
    
    // Prepare request body based on email type
    let requestBody: any = {
      type: emailType,
      to: options.to,
    };
    
    if (options.name) {
      requestBody.name = options.name;
    }
    
    if (emailType === "welcome") {
      // Welcome email - no additional fields needed
    } else if (emailType === "job_match") {
      requestBody.job_title = options.job_title || "New Job";
      requestBody.company_name = options.company_name || "Company";
      requestBody.job_type = options.job_type || "Job";
      requestBody.location = options.location || "Not specified";
      requestBody.match_reason = options.match_reason || "New job posting";
      requestBody.job_url = options.job_url || `${window.location.origin}/jobs`;
    } else if (emailType === "alert") {
      requestBody.title = options.title || "Notification";
      requestBody.message = options.message || "";
      if (options.action_url) requestBody.action_url = options.action_url;
      if (options.action_text) requestBody.action_text = options.action_text;
    }
    
    // If custom HTML/subject provided, include them (though Django will generate if not provided)
    if (options.html) {
      requestBody.html = options.html;
    }
    if (options.subject) {
      requestBody.subject = options.subject;
    }
    
    const response = await fetch(`${API_BASE_URL}/ai/email/send/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Email sent successfully to ${options.to}:`, data);
      return true;
    } else {
      const error = await response.text();
      console.error("Django API error:", error);
      return false;
    }
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

/**
 * Generate welcome email HTML (for preview/testing)
 * Note: Django backend generates emails automatically, this is just for preview
 */
export function generateWelcomeEmail(name: string, email: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Brightbyt</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Welcome to Brightbyt! 🎉</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hi ${name || "there"},</p>
    
    <p style="font-size: 16px;">Thank you for subscribing to <strong>Brightbyt</strong>! We're excited to have you on board.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h2 style="color: #667eea; margin-top: 0;">What's Next?</h2>
      <ul style="padding-left: 20px;">
        <li>📧 You'll receive email notifications about new job postings</li>
        <li>🎯 We'll match you with opportunities based on your preferences</li>
        <li>💼 Get alerts when jobs matching your profile are posted</li>
        <li>🚀 Stay updated with the latest career opportunities</li>
      </ul>
    </div>
    
    <p style="font-size: 16px;">We'll keep you informed about:</p>
    <ul style="font-size: 16px;">
      <li>New job postings in your preferred categories</li>
      <li>Opportunities matching your skills and experience</li>
      <li>Important updates and announcements</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://brightbyt.com"}" 
         style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Visit Brightbyt
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>The Brightbyt Team</strong>
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
      You're receiving this email because you subscribed to Brightbyt notifications.<br>
      If you no longer wish to receive these emails, you can unsubscribe at any time.
    </p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate job match notification email HTML
 */
export function generateJobMatchEmail(
  recipientName: string,
  jobTitle: string,
  companyName: string,
  jobType: string,
  location: string,
  matchReason: string,
  jobUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Job Match - Brightbyt</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">🎯 New Job Match!</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hi ${recipientName || "there"},</p>
    
    <p style="font-size: 16px;">Great news! We found a job that matches your profile:</p>
    
    <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #667eea; margin-top: 0; font-size: 24px;">${jobTitle}</h2>
      
      <div style="margin: 15px 0;">
        <p style="margin: 8px 0; font-size: 16px;"><strong>Company:</strong> ${companyName || "Not specified"}</p>
        <p style="margin: 8px 0; font-size: 16px;"><strong>Type:</strong> ${jobType}</p>
        <p style="margin: 8px 0; font-size: 16px;"><strong>Location:</strong> ${location}</p>
      </div>
      
      ${matchReason ? `
      <div style="background: #e8f4f8; padding: 15px; border-radius: 5px; margin-top: 15px;">
        <p style="margin: 0; color: #2c5282;"><strong>Why this matches:</strong> ${matchReason}</p>
      </div>
      ` : ""}
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${jobUrl}" 
         style="background: #667eea; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
        View Job Details
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      Don't miss out on this opportunity! Apply now to take the next step in your career.
    </p>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>The Brightbyt Team</strong>
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
      You're receiving this email because you subscribed to job notifications on Brightbyt.<br>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://brightbyt.com"}/unsubscribe" style="color: #667eea;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate general alert email HTML
 */
export function generateAlertEmail(
  recipientName: string,
  title: string,
  message: string,
  actionUrl?: string,
  actionText?: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Brightbyt</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">${title}</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hi ${recipientName || "there"},</p>
    
    <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <p style="font-size: 16px; margin: 0;">${message}</p>
    </div>
    
    ${actionUrl && actionText ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionUrl}" 
         style="background: #667eea; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
        ${actionText}
      </a>
    </div>
    ` : ""}
    
    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>The Brightbyt Team</strong>
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
      You're receiving this email from Brightbyt.<br>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://brightbyt.com"}/unsubscribe" style="color: #667eea;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>
  `;
}

