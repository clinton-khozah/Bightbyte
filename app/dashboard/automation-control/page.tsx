"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Play, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function AutomationControlPage() {
  const [running, setRunning] = useState(false);
  const [keywords, setKeywords] = useState("software developer, data scientist, engineer");
  const [location, setLocation] = useState("South Africa");
  const [maxJobs, setMaxJobs] = useState(10);
  const [results, setResults] = useState<any>(null);

  const runAutomation = async () => {
    try {
      setRunning(true);
      setResults(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
      
      const keywordsList = keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const response = await fetch(`${apiUrl}/job-automation/automate/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keywords: keywordsList,
          location: location,
          platforms: ["website"], // Only post to website for now
          max_jobs: parseInt(maxJobs.toString()),
          auto_post: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to run automation");
      }

      const data = await response.json();
      setResults(data);
      
      toast.success(`Automation completed! ${data.results?.posted_jobs?.length || 0} jobs posted. Check pending jobs page to review them.`);
    } catch (error: any) {
      console.error("Error running automation:", error);
      toast.error(`Error: ${error.message || "Failed to run automation"}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Job Automation Control
          </h1>
          <p className="text-gray-600">
            Manually trigger job scraping and posting from the internet
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Run Automation</CardTitle>
            <CardDescription>
              Scrape jobs from LinkedIn, Indeed, and other sources, then post them to your website (pending approval)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="keywords">Job Keywords (comma-separated)</Label>
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="software developer, data scientist, engineer"
                disabled={running}
              />
              <p className="text-sm text-gray-500 mt-1">
                Separate multiple keywords with commas
              </p>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="South Africa"
                disabled={running}
              />
            </div>

            <div>
              <Label htmlFor="maxJobs">Maximum Jobs</Label>
              <Input
                id="maxJobs"
                type="number"
                value={maxJobs}
                onChange={(e) => setMaxJobs(parseInt(e.target.value) || 10)}
                min={1}
                max={50}
                disabled={running}
              />
              <p className="text-sm text-gray-500 mt-1">
                Number of jobs to scrape and post (1-50)
              </p>
            </div>

            <Button
              onClick={runAutomation}
              disabled={running}
              className="w-full"
              size="lg"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Automation...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Automation Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {results.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-semibold">
                    {results.success ? "Success" : "Failed"}
                  </span>
                </div>
                
                {results.results && (
                  <div className="mt-4 space-y-2 text-sm">
                    <p>
                      <strong>Scraped Jobs:</strong>{" "}
                      {results.results.scraped_jobs?.length || 0}
                    </p>
                    <p>
                      <strong>Posted Jobs:</strong>{" "}
                      {results.results.posted_jobs?.length || 0}
                    </p>
                    <p>
                      <strong>Failed Jobs:</strong>{" "}
                      {results.results.failed_jobs?.length || 0}
                    </p>
                    
                    {results.results.posted_jobs && results.results.posted_jobs.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="font-semibold mb-2">Posted Jobs:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {results.results.posted_jobs.map((job: any, index: number) => (
                            <li key={index}>
                              {job.job?.title || job.job_data?.title || "Unknown"} - Status:{" "}
                              {job.job?.status || job.job_data?.status || "pending"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Click "Run Automation Now" to scrape and post jobs</li>
              <li>Jobs will be posted with status "pending" for your review</li>
              <li>Go to{" "}
                <a
                  href="/dashboard/pending-jobs"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Pending Jobs
                </a>{" "}
                to review and approve them
              </li>
              <li>Approved jobs will go live on your website</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

