"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  Briefcase,
  Users, 
  TrendingUp,
  Calendar,
  Plus,
  Eye,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LoadingLogo } from "@/components/loading-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Job {
  id: string;
  title: string;
  job_type: string;
  status: string;
  total_applications: number;
  total_views: number;
  created_at: string;
}

export default function CompanyDashboard() {
  const [userData, setUserData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = React.useState(true);
  const router = useRouter();


  React.useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        // Fetch company profile
        const { data: companyData } = await supabase
          .from("companies")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

              setUserData({ 
          ...user,
          ...companyData,
          full_name: companyData?.name || companyData?.company_name || user.user_metadata?.full_name || user.email?.split("@")[0],
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  React.useEffect(() => {
    const fetchJobs = async () => {
      if (!userData?.id) return;

      try {
        setJobsLoading(true);
        
        // Fetch jobs: company's jobs + automated jobs (null company_id)
        let jobsData, error;
        
        try {
          // Try to include automated jobs
          const result = await supabase
            .from("jobs")
            .select("*")
            .or(`company_id.eq.${userData.id},company_id.is.null,is_automated.eq.true`)
            .order("created_at", { ascending: false })
            .limit(50);
          
          jobsData = result.data;
          error = result.error;
        } catch (err) {
          // Fallback: just company_id and null company_id
          const result = await supabase
            .from("jobs")
            .select("*")
            .or(`company_id.eq.${userData.id},company_id.is.null`)
            .order("created_at", { ascending: false })
            .limit(50);
          
          jobsData = result.data;
          error = result.error;
        }

        if (error) {
          console.error("Error fetching jobs:", error);
      } else {
          setJobs(jobsData || []);
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setJobsLoading(false);
      }
    };

    if (userData) {
      fetchJobs();
    }
  }, [userData?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingLogo size={48} />
      </div>
    );
  }

  const totalJobs = jobs.length;
  const openJobs = jobs.filter((job) => job.status === "open").length;
  const totalApplications = jobs.reduce((sum, job) => sum + (job.total_applications || 0), 0);

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {userData?.company_name || userData?.full_name || "Company"}!
          </h1>
          <p className="text-gray-600">
            Manage your job postings and review applications
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalJobs}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openJobs}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalApplications}</div>
              <p className="text-xs text-muted-foreground">Total received</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Job Postings</CardTitle>
              <Button
                onClick={() => {
                  // Trigger the modal in the layout
                  window.dispatchEvent(new CustomEvent('openCreateJobModal'));
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Post New Job
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingLogo size={32} />
          </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No jobs posted yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Start posting jobs, learnerships, internships, and bursaries to find the best candidates
                </p>
                <Button
                  onClick={() => router.push("/dashboard/company/jobs")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Post Your First Job
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                          {job.title}
                  </h3>
                        <div className="flex items-center gap-4 mb-2">
                          <Badge variant="outline" className="capitalize">
                            {job.job_type}
                          </Badge>
                          <Badge
                            className={
                              job.status === "open"
                                ? "bg-green-100 text-green-700 border-green-200"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }
                          >
                            {job.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {job.total_applications || 0} applications
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {job.total_views || 0} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
            </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/company/jobs/${job.id}`)}
                      >
                        View Details
                      </Button>
                  </div>
                </motion.div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
