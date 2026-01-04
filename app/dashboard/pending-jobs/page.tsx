"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/layout";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  MapPin,
  Briefcase,
  Building2,
  ExternalLink,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function PendingJobsPage() {
  const router = useRouter();
  const [pendingJobs, setPendingJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingJobs();
  }, []);

  const fetchPendingJobs = async () => {
    try {
      setLoading(true);
      
      // First, check ALL jobs to see what statuses exist
      const { data: allJobs, error: allError } = await supabase
        .from("jobs")
        .select("id, title, status, company_id, is_automated, source, application_link")
        .order("created_at", { ascending: false })
        .limit(50);

      console.log("🔍 Total jobs in database:", allJobs?.length || 0);
      console.log("🔍 Job statuses:", allJobs?.map((j: any) => j.status) || []);
      console.log("🔍 Jobs with status 'pending':", allJobs?.filter((j: any) => j.status === "pending").length || 0);
      console.log("🔍 Sample jobs:", allJobs?.slice(0, 5).map((j: any) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        company_id: j.company_id,
        is_automated: j.is_automated,
        source: j.source
      })) || []);

      // Fetch ALL jobs with status 'pending' (no filtering initially)
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching pending jobs:", error);
        toast.error(`Failed to load pending jobs: ${error.message}`);
        console.log("Full error details:", JSON.stringify(error, null, 2));
        return;
      }

      console.log("📋 All pending jobs fetched:", data?.length || 0);
      console.log("📋 Pending jobs details:", data?.map((j: any) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        company_id: j.company_id,
        is_automated: j.is_automated,
        source: j.source,
        application_link: j.application_link
      })) || []);

      // Show ALL pending jobs (very lenient - no filtering)
      // This ensures we see everything that needs review
      const pendingJobsList = (data || []).filter((job: any) => {
        // Only exclude jobs that are explicitly NOT automated (manual user posts)
        // Include everything else
        if (job.is_automated === false && job.source === "manual") {
          return false; // Skip manual user posts
        }
        return true; // Include everything else
      });

      console.log("✅ Final pending jobs to show:", pendingJobsList.length);
      console.log("📋 Final jobs:", pendingJobsList.map((j: any) => ({
        id: j.id,
        title: j.title,
        status: j.status
      })));

      setPendingJobs(pendingJobsList);
    } catch (error: any) {
      console.error("❌ Error fetching pending jobs:", error);
      toast.error(`Error: ${error.message || "Failed to load pending jobs"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (jobId: string) => {
    try {
      setApproving(jobId);
      
      const { error } = await supabase
        .from("jobs")
        .update({ status: "open" })
        .eq("id", jobId);

      if (error) {
        console.error("Error approving job:", error);
        toast.error("Failed to approve job");
        return;
      }

      toast.success("Job approved and published!");
      setPendingJobs((prev) => prev.filter((job) => job.id !== jobId));
      
      if (selectedJob?.id === jobId) {
        setIsDetailsOpen(false);
        setSelectedJob(null);
      }
    } catch (error) {
      console.error("Error approving job:", error);
      toast.error("Failed to approve job");
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (jobId: string) => {
    try {
      setRejecting(jobId);
      
      const { error } = await supabase
        .from("jobs")
        .update({ status: "cancelled" })
        .eq("id", jobId);

      if (error) {
        console.error("Error rejecting job:", error);
        toast.error("Failed to reject job");
        return;
      }

      toast.success("Job rejected");
      setPendingJobs((prev) => prev.filter((job) => job.id !== jobId));
      
      if (selectedJob?.id === jobId) {
        setIsDetailsOpen(false);
        setSelectedJob(null);
      }
    } catch (error) {
      console.error("Error rejecting job:", error);
      toast.error("Failed to reject job");
    } finally {
      setRejecting(null);
    }
  };

  const openJobDetails = (job: any) => {
    setSelectedJob(job);
    setIsDetailsOpen(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Pending Job Approvals
          </h1>
          <p className="text-gray-600">
            Review and approve automated job postings before they go live
          </p>
        </div>

        {pendingJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Pending Jobs
              </h3>
              <p className="text-gray-600 mb-4">
                No jobs with status "pending" found. This could mean:
              </p>
              <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1 text-left max-w-md mx-auto">
                <li>Automation hasn't run yet</li>
                <li>All pending jobs have been reviewed</li>
                <li>Jobs are being posted with status "open" instead of "pending"</li>
              </ul>
              <div className="mt-4 space-y-2">
                <a
                  href="/dashboard/test-pending-job"
                  className="inline-block text-blue-600 hover:underline text-sm font-semibold"
                >
                  → Create Test Job to Verify System
                </a>
                <p className="text-xs text-gray-500 mt-2">
                  Check browser console (F12) for debugging information about jobs in database
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pendingJobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg line-clamp-2">
                        {job.title}
                      </CardTitle>
                      <Badge variant="outline" className="ml-2">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                    <CardDescription>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {job.company_name && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            <span>{job.company_name}</span>
                          </div>
                        )}
                        {job.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{job.location}</span>
                          </div>
                        )}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-2 mb-4">
                      {job.job_type && (
                        <Badge variant="secondary" className="capitalize">
                          <Briefcase className="h-3 w-3 mr-1" />
                          {job.job_type}
                        </Badge>
                      )}
                      {job.category && (
                        <Badge variant="secondary">{job.category}</Badge>
                      )}
                      {job.source && (
                        <Badge variant="outline" className="text-xs">
                          Source: {job.source}
                        </Badge>
                      )}
                    </div>
                    {job.description && (
                      <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                        {job.description}
                      </p>
                    )}
                    {job.application_link && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 mb-4">
                        <ExternalLink className="h-4 w-4" />
                        <a
                          href={job.application_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline truncate"
                        >
                          External Application Link
                        </a>
                      </div>
                    )}
                  </CardContent>
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openJobDetails(job)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(job.id)}
                        disabled={approving === job.id}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {approving === job.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(job.id)}
                        disabled={rejecting === job.id}
                        className="flex-1"
                      >
                        {rejecting === job.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Job Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedJob && (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <DialogTitle className="text-2xl mb-2">
                        {selectedJob.title}
                      </DialogTitle>
                      <DialogDescription>
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                          {selectedJob.company_name && (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              <span>{selectedJob.company_name}</span>
                            </div>
                          )}
                          {selectedJob.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{selectedJob.location}</span>
                            </div>
                          )}
                          {selectedJob.job_type && (
                            <Badge variant="secondary" className="capitalize">
                              {selectedJob.job_type}
                            </Badge>
                          )}
                          {selectedJob.category && (
                            <Badge variant="secondary">{selectedJob.category}</Badge>
                          )}
                        </div>
                      </DialogDescription>
                    </div>
                    <Badge variant="outline" className="ml-4">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending Review
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {selectedJob.source && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Source:</span>
                        <span>{selectedJob.source}</span>
                      </div>
                    </div>
                  )}

                  {selectedJob.description && (
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {selectedJob.description}
                      </p>
                    </div>
                  )}

                  {selectedJob.requirements && (
                    <div>
                      <h3 className="font-semibold mb-2">Requirements</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {selectedJob.requirements}
                      </p>
                    </div>
                  )}

                  {selectedJob.qualifications && (
                    <div>
                      <h3 className="font-semibold mb-2">Qualifications</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {selectedJob.qualifications}
                      </p>
                    </div>
                  )}

                  {selectedJob.salary_min && selectedJob.salary_max && (
                    <div>
                      <h3 className="font-semibold mb-2">Salary</h3>
                      <p className="text-gray-700">
                        {selectedJob.salary_currency || "USD"} {selectedJob.salary_min} - {selectedJob.salary_max}
                      </p>
                    </div>
                  )}

                  {selectedJob.application_link && (
                    <div>
                      <h3 className="font-semibold mb-2">Application Link</h3>
                      <a
                        href={selectedJob.application_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {selectedJob.application_link}
                      </a>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setIsDetailsOpen(false)}
                      className="flex-1"
                    >
                      Close
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleReject(selectedJob.id);
                      }}
                      disabled={rejecting === selectedJob.id}
                      className="flex-1"
                    >
                      {rejecting === selectedJob.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Reject Job
                    </Button>
                    <Button
                      onClick={() => {
                        handleApprove(selectedJob.id);
                      }}
                      disabled={approving === selectedJob.id}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {approving === selectedJob.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Approve & Publish
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

