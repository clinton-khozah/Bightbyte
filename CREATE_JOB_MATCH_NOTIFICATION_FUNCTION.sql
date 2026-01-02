-- Create function to match jobs with applicants and create notifications
-- This function is called when a new job is posted
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION match_jobs_with_applicants(new_job_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  matched_count INTEGER := 0;
  applicant_record RECORD;
  job_record RECORD;
  match_reasons TEXT[];
  match_reason TEXT;
  notification_id UUID;
BEGIN
  -- Get the job details
  SELECT id, title, company_name, job_type, category, location, salary_min, salary_max, salary_currency, is_salary_disclosed
  INTO job_record
  FROM jobs
  WHERE id = new_job_id AND status = 'open' AND is_active = true;

  -- If job not found or not active, return 0
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Loop through all applicants with notification preferences enabled
  FOR applicant_record IN
    SELECT 
      id,
      email,
      preferred_job_types,
      preferred_categories,
      preferred_locations,
      salary_expectation_min,
      salary_expectation_max,
      salary_currency,
      notification_preferences
    FROM students
    WHERE notification_preferences->>'email_notifications' = 'true'
      AND notification_preferences->>'job_matches' = 'true'
      AND email IS NOT NULL
  LOOP
    match_reasons := ARRAY[]::TEXT[];
    match_reason := '';

    -- Check if job type matches
    IF applicant_record.preferred_job_types IS NOT NULL 
       AND jsonb_array_length(applicant_record.preferred_job_types) > 0
       AND (applicant_record.preferred_job_types ? job_record.job_type) THEN
      match_reasons := array_append(match_reasons, format('Matches your preferred job type: %s', job_record.job_type));
    END IF;

    -- Check if category matches
    IF applicant_record.preferred_categories IS NOT NULL 
       AND jsonb_array_length(applicant_record.preferred_categories) > 0
       AND (applicant_record.preferred_categories ? job_record.category) THEN
      match_reasons := array_append(match_reasons, format('Matches your preferred category: %s', job_record.category));
    END IF;

    -- Check if location matches (case-insensitive partial match)
    IF applicant_record.preferred_locations IS NOT NULL 
       AND jsonb_array_length(applicant_record.preferred_locations) > 0 THEN
      FOR i IN 0..jsonb_array_length(applicant_record.preferred_locations) - 1 LOOP
        IF LOWER(job_record.location) LIKE '%' || LOWER(applicant_record.preferred_locations->>i) || '%' THEN
          match_reasons := array_append(match_reasons, format('Matches your preferred location: %s', applicant_record.preferred_locations->>i));
          EXIT;
        END IF;
      END LOOP;
    END IF;

    -- Check if salary matches (if both are disclosed)
    IF job_record.is_salary_disclosed = true 
       AND job_record.salary_min IS NOT NULL 
       AND applicant_record.salary_expectation_max IS NOT NULL
       AND applicant_record.salary_currency = job_record.salary_currency THEN
      IF job_record.salary_min <= applicant_record.salary_expectation_max THEN
        match_reasons := array_append(match_reasons, 'Salary matches your expectations');
      END IF;
    END IF;

    -- If at least one match reason exists, create notification
    IF array_length(match_reasons, 1) > 0 THEN
      match_reason := array_to_string(match_reasons, '; ');

      -- Insert notification
      INSERT INTO job_match_notifications (
        applicant_id,
        applicant_email,
        job_id,
        job_title,
        company_name,
        match_reason,
        notification_sent,
        email_sent,
        created_at,
        expires_at
      ) VALUES (
        applicant_record.id,
        applicant_record.email,
        new_job_id,
        job_record.title,
        job_record.company_name,
        match_reason,
        FALSE,
        FALSE,
        NOW(),
        NOW() + INTERVAL '7 days'
      );

      matched_count := matched_count + 1;
    END IF;
  END LOOP;

  RETURN matched_count;
END;
$$;

-- Create trigger to automatically match jobs when they are created
CREATE OR REPLACE FUNCTION trigger_match_jobs_with_applicants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only match if job is active and open
  IF NEW.status = 'open' AND NEW.is_active = true THEN
    PERFORM match_jobs_with_applicants(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_job_created_match_applicants ON jobs;

-- Create trigger
CREATE TRIGGER on_job_created_match_applicants
  AFTER INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_match_jobs_with_applicants();

-- Also trigger on update if job becomes active/open
CREATE OR REPLACE FUNCTION trigger_match_jobs_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If job status changed to open and active, match it
  IF (NEW.status = 'open' AND NEW.is_active = true) 
     AND (OLD.status != 'open' OR OLD.is_active != true) THEN
    PERFORM match_jobs_with_applicants(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_job_updated_match_applicants ON jobs;

-- Create trigger
CREATE TRIGGER on_job_updated_match_applicants
  AFTER UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_match_jobs_on_update();

-- Add comments
COMMENT ON FUNCTION match_jobs_with_applicants IS 'Matches a new job with applicants based on their preferences and creates notifications';
COMMENT ON FUNCTION trigger_match_jobs_with_applicants IS 'Trigger function that calls match_jobs_with_applicants when a job is created';
COMMENT ON FUNCTION trigger_match_jobs_on_update IS 'Trigger function that calls match_jobs_with_applicants when a job status changes to open/active';


