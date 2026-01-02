-- Create testimonials table
CREATE TABLE IF NOT EXISTS "public"."testimonials" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "student_name" VARCHAR(255) NOT NULL,
    "student_role" VARCHAR(255),
    "student_company" VARCHAR(255),
    "content" TEXT NOT NULL,
    "avatar_url" TEXT,
    "rating" INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    "mentor_id" INTEGER,
    "mentor_name" VARCHAR(255),
    "is_featured" BOOLEAN DEFAULT false,
    "is_approved" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on mentor_id for faster lookups
CREATE INDEX IF NOT EXISTS "idx_testimonials_mentor_id" ON "public"."testimonials"("mentor_id");

-- Create index on is_approved and is_featured for filtering
CREATE INDEX IF NOT EXISTS "idx_testimonials_approved_featured" ON "public"."testimonials"("is_approved", "is_featured");

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_testimonials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_testimonials_updated_at
    BEFORE UPDATE ON "public"."testimonials"
    FOR EACH ROW
    EXECUTE FUNCTION update_testimonials_updated_at();

-- Add comment to table
COMMENT ON TABLE "public"."testimonials" IS 'Stores testimonials from students about mentors';




















