# Baseline Assessment Feature Implementation

## Overview
This document describes the implementation of the Baseline Assessment feature for the EduSpace AI frontend dashboard. This feature allows administrators to create, manage, and test baseline assessments that are used in the tutor application process.

## Frontend Implementation

### 1. Sidebar Menu Item
- **Location**: `eduspaceAI-frontend/src/layout/AppSidebar.tsx`
- Added "Baseline Assessment" menu item with DocsIcon
- Path: `/baseline-assessment`

### 2. Baseline Assessment Page
- **Location**: `eduspaceAI-frontend/src/pages/BaselineAssessment/BaselineAssessment.tsx`
- **Features**:
  - List all assessments
  - Create new assessments with questions
  - Test assessments
  - Delete assessments
  - Copy assessment links
  - Search functionality

### 3. Route Configuration
- **Location**: `eduspaceAI-frontend/src/App.tsx`
- Added route: `/baseline-assessment` → `<BaselineAssessment />`

## Backend Implementation

### 1. Django App: `baseline_assessments`
Created a new Django app with the following structure:

#### Models (`baseline_assessments/models.py`)
- **BaselineAssessment**: Main assessment model
  - title, description, passing_score, time_limit_minutes, total_points
  - created_by, created_at, updated_at, is_active
  
- **AssessmentQuestion**: Questions for assessments
  - question_text, question_type (multiple_choice, true_false, short_answer)
  - options (JSON), correct_answer, points, explanation, order
  
- **AssessmentAttempt**: Tracks assessment attempts
  - user_id, mentor_id, answers (JSON), score, percentage, passed
  - started_at, completed_at

#### API Endpoints (`baseline_assessments/views.py`)
1. **GET `/api/v1/baseline-assessments/`** - List all assessments
2. **POST `/api/v1/baseline-assessments/create/`** - Create new assessment
3. **GET `/api/v1/baseline-assessments/<id>/`** - Get specific assessment
4. **DELETE `/api/v1/baseline-assessments/<id>/delete/`** - Delete assessment
5. **POST `/api/v1/baseline-assessments/<id>/generate-link/`** - Generate assessment link
6. **POST `/api/v1/baseline-assessments/<id>/submit/`** - Submit assessment answers

#### URL Configuration
- **Location**: `eduspace_backend/urls.py`
- Added: `path('api/v1/baseline-assessments/', include('baseline_assessments.urls'))`

#### Settings
- **Location**: `eduspace_backend/settings.py`
- Added `'baseline_assessments'` to `INSTALLED_APPS`

## Database Migration

Run the following command to apply migrations:
```bash
cd edu-spaceAI-API
python manage.py migrate baseline_assessments
```

## Integration with Tutor Application Progress

The baseline assessment link is stored in the `mentor_application_progress` table:
- Field: `baseline_assessment_link` (TEXT)
- Updated when generating assessment links
- Used in the tutor application status popup to display the assessment link

### Flow:
1. Admin creates a baseline assessment
2. Admin generates/copies the assessment link
3. Link is stored in `mentor_application_progress.baseline_assessment_link`
4. Tutor sees the link in their application progress popup when on the "Baseline Assessment" step
5. Tutor clicks the link to take the assessment
6. Assessment submission updates the progress table with score and pass/fail status

## Usage

### Creating an Assessment:
1. Navigate to "Baseline Assessment" in the sidebar
2. Click "Create Assessment"
3. Fill in:
   - Title (required)
   - Description (optional)
   - Passing Score % (default: 75%)
   - Time Limit in minutes (default: 60)
4. Add questions:
   - Question Text
   - Question Type (Multiple Choice, True/False, Short Answer)
   - Options (for multiple choice)
   - Correct Answer
   - Points
   - Explanation (optional)
5. Click "Create Assessment"

### Testing an Assessment:
1. Click the "Play" icon on any assessment card
2. Answer all questions
3. Click "Submit Test"
4. View results with score, pass/fail status, and explanations

### Copying Assessment Link:
1. Click the "Copy" icon on any assessment card
2. Link is copied to clipboard
3. This link can be assigned to tutor applicants

## API Response Format

### Create Assessment Response:
```json
{
  "success": true,
  "assessment": {
    "id": 1,
    "title": "Baseline Assessment",
    "description": "...",
    "passing_score": 75,
    "time_limit_minutes": 60,
    "total_points": 100,
    "questions": [...],
    "assessment_link": "http://localhost:3000/baseline-assessment/1/take"
  },
  "assessment_link": "http://localhost:3000/baseline-assessment/1/take"
}
```

### Submit Assessment Response:
```json
{
  "success": true,
  "score": 85,
  "total": 100,
  "percentage": 85.0,
  "passed": true,
  "answers": {
    "1": {
      "correct": true,
      "user_answer": "A",
      "correct_answer": "A",
      "explanation": "..."
    }
  },
  "attempt_id": 1
}
```

## Next Steps

1. **Run Migrations**: Execute `python manage.py migrate baseline_assessments`
2. **Create Assessment**: Use the frontend to create your first baseline assessment
3. **Test Assessment**: Use the test feature to verify assessment functionality
4. **Assign to Applicants**: Copy assessment links and assign them to tutor applicants
5. **Monitor Progress**: Check tutor application progress to see assessment completion

## Notes

- Assessment links are generated based on `FRONTEND_URL` setting (defaults to request base URL)
- Assessment submission automatically updates `mentor_application_progress` table
- Passing score is 75% by default (configurable per assessment)
- Failed assessments set status to "failed" in progress table
- Passed assessments move to "profile_review" step

