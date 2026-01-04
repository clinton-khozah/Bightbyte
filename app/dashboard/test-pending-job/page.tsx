"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard/layout";

export default function TestPendingJobPage() {
  const [creating, setCreating] = useState(false);

  const createTestPendingJob = async () => {
    try {
      setCreating(true);
      
      const testJob = {
        title: "Test Software Developer - Automation Test",
        company_name: "Test Company",
        description: "This is a test job created to verify the pending jobs system is working correctly.",
        location: "Remote",
        job_type: "job",
        category: "IT",
        status: "pending",
        company_id: null,
        source: "automation",
        is_automated: true,
        application_link: "https://example.com/apply",
        application_method: "external",
      };

      const { data, error } = await supabase
        .from("jobs")
        .insert(testJob)
        .select()
        .single();

      if (error) {
        console.error("Error creating test job:", error);
        toast.error(`Failed to create test job: ${error.message}`);
        return;
      }

      toast.success("Test pending job created! Check /dashboard/pending-jobs");
      console.log("✅ Test job created:", data);
    } catch (error: any) {
      console.error("Error creating test job:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Test Pending Jobs System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Click the button below to create a test pending job. This will help verify that the pending jobs approval system is working correctly.
            </p>
            <Button
              onClick={createTestPendingJob}
              disabled={creating}
              className="w-full"
            >
              {creating ? "Creating..." : "Create Test Pending Job"}
            </Button>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>After creating:</strong> Go to{" "}
                <a
                  href="/dashboard/pending-jobs"
                  className="underline font-semibold"
                >
                  /dashboard/pending-jobs
                </a>{" "}
                to see the test job and approve/reject it.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

