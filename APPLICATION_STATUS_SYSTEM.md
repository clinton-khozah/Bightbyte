# Mentor Application Status System

## Overview
This system tracks mentor application progress and displays a non-closable status popup when `is_complete` is FALSE.

## Database Migration

Run the SQL migration file to create the `mentor_application_progress` table:
```sql
-- File: website/migrations/create_mentor_application_progress.sql
```

This table tracks:
- Current step (application_submitted, baseline_assessment, profile_review, onboarding)
- Status (pending, in_progress, completed, failed)
- Timestamps for each step
- Baseline assessment score and pass status

## Email Content Update Required

**Location:** `edu-spaceAI-API/mentors/email_service.py`
**Function:** `send_application_email()`

Update the email content to include:
```
"You are bit close to start tutoring and start earning! The next step is the baseline assessment. Pass mark is 75%."
```

The email should emphasize:
- They're close to starting tutoring and earning
- Next step is baseline assessment
- Pass mark is 75%

## Components Created

1. **MentorApplicationStatusPopup** (`website/components/dashboard/mentor-application-status-popup.tsx`)
   - Non-closable popup that shows application progress
   - Displays all 4 steps with status indicators
   - Shows current step and next actions
   - Automatically fetches progress from database

2. **Integration** (`website/app/dashboard/page.tsx`)
   - Shows status popup when `is_complete` is FALSE
   - Replaces profile completion modal for incomplete mentors

## Application Flow

1. **Application Submitted** - User submits tutor application form
   - Creates progress record with `current_step: "application_submitted"`
   - Sends email with baseline assessment link

2. **Baseline Assessment** - User completes assessment
   - API should update: `baseline_assessment_completed`, `baseline_assessment_score`, `baseline_assessment_passed`
   - If score >= 75%, set `baseline_assessment_passed: true` and move to next step

3. **Profile Review** - Admin reviews profile
   - API should update: `profile_reviewed`, `profile_approved`
   - Move to onboarding when approved

4. **Onboarding** - Final step
   - API should update: `onboarding_completed`
   - Set `is_complete: true` in mentors table

## API Endpoints Needed

1. **POST `/mentors/submit-application/`**
   - Accepts application data
   - Updates mentors table
   - Creates progress record
   - Returns success/error

2. **PATCH `/mentors/update-progress/`**
   - Updates application progress
   - Updates current_step and status
   - Updates step-specific fields (assessment score, etc.)

3. **GET `/mentors/progress/`**
   - Returns current progress for authenticated user
   - Used by status popup component

## Status Popup Behavior

- **Non-closable**: No close button, backdrop click disabled
- **Auto-shows**: Appears when mentor logs in with `is_complete: false`
- **Real-time**: Fetches latest progress on mount
- **Visual indicators**: 
  - ✅ Green for completed steps
  - 🔄 Blue for in-progress steps
  - ❌ Red for failed steps
  - ⏳ Gray for pending steps

## Next Steps

1. Run the SQL migration to create the progress table
2. Update the email content in `send_application_email()` function
3. Create/update API endpoints to handle progress updates
4. Test the flow end-to-end

