# Email Notification System Setup

## Overview

Brightbyt now sends automated email notifications to users when they subscribe and when new jobs matching their profile are posted.

## Features

1. **Welcome Email** - Sent automatically when users subscribe to job notifications
2. **Job Match Notifications** - Sent when jobs matching user preferences are posted
3. **General Alerts** - Sent for important updates and announcements

## Email Configuration

### Option 1: Using Resend (Recommended)

1. Sign up for a free account at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add to your environment variables:
   ```
   RESEND_API_KEY=re_your_api_key_here
   ```

### Option 2: Using SMTP (Alternative)

If you prefer to use SMTP directly, you can modify `app/api/send-email/route.ts` to use nodemailer or another SMTP service.

## Email Sender Configuration

- **From Email**: `clintonkhozah@gmail.com`
- **From Name**: `Brightbyt`
- **Reply To**: `clintonkhozah@gmail.com`

## Testing Emails

### Test Page

Visit `/test-email` to preview and test email templates:

1. Go to `http://localhost:3000/test-email` (or your domain)
2. Select email type (Welcome, Job Match, or Alert)
3. Enter recipient email and name
4. Click "Preview Email" to see the template
5. Click "Send Test Email" to send a test email

### Email Templates

1. **Welcome Email** (`generateWelcomeEmail`)
   - Sent when users subscribe
   - Includes welcome message and what to expect

2. **Job Match Email** (`generateJobMatchEmail`)
   - Sent when jobs match user preferences
   - Includes job details and match reason

3. **Alert Email** (`generateAlertEmail`)
   - General purpose notifications
   - Customizable title and message

## How It Works

### Subscription Flow

1. User subscribes via `JobNotificationPopup` component
2. Email is saved to `job_notifications` table
3. Welcome email is automatically sent
4. User receives notifications for matching jobs

### Job Posting Flow

1. Job is posted via `CreateJobModal`
2. System checks for matching subscribers:
   - Students with matching preferences
   - General job notification subscribers
3. Email notifications are sent automatically
4. Users receive personalized job match emails

## API Endpoints

### POST `/api/send-email`
Send a single email.

**Body:**
```json
{
  "to": "user@example.com",
  "subject": "Email Subject",
  "html": "<html>...</html>",
  "from": "clintonkhozah@gmail.com"
}
```

### POST `/api/send-job-notifications`
Send notifications to all matching subscribers for a new job.

**Body:**
```json
{
  "jobId": "uuid",
  "jobTitle": "Job Title",
  "companyName": "Company Name",
  "jobType": "job",
  "category": "IT",
  "location": "Remote",
  "matchReason": "Matches your preferences"
}
```

## Environment Variables

Add these to your `.env.local`:

```env
RESEND_API_KEY=re_your_api_key_here
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## Development Mode

In development mode (without RESEND_API_KEY), emails are logged to the console instead of being sent. This allows you to test the system without actually sending emails.

## Production Setup

1. Get Resend API key
2. Add `RESEND_API_KEY` to environment variables
3. Verify your domain in Resend (optional, for better deliverability)
4. Test using `/test-email` page
5. Monitor email delivery in Resend dashboard

## Troubleshooting

- **Emails not sending**: Check RESEND_API_KEY is set correctly
- **Emails going to spam**: Verify your domain in Resend
- **Preview not working**: Check browser console for errors
- **Notifications not triggering**: Check job posting logs for errors

## Files Created

- `lib/email-service.ts` - Email service and template generators
- `app/api/send-email/route.ts` - Email sending API endpoint
- `app/api/send-job-notifications/route.ts` - Job notification endpoint
- `app/test-email/page.tsx` - Email testing/preview page

## Next Steps

1. Set up Resend account and get API key
2. Add RESEND_API_KEY to environment variables
3. Test using `/test-email` page
4. Verify welcome emails are sent on subscription
5. Test job notifications by posting a job

