"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp,
  FileText,
  Search,
  ArrowRight,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LoadingLogo } from "@/components/loading-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { JobCards } from "@/components/job-cards";

interface JobApplication {
  id: string;
  job_id: string;
  job_title?: string;
  company_name?: string;
  status: string;
  applied_at: string;
  job?: {
    id: string;
    title: string;
    company_name: string;
    location: string;
    job_type: string;
    salary_min?: number;
    salary_max?: number;
    salary_currency?: string;
    is_salary_disclosed?: boolean;
  };
}

export default function ApplicantDashboard() {
  const [userData, setUserData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [applications, setApplications] = React.useState<JobApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"overview" | "jobs">("jobs");
  const router = useRouter();

  React.useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/");
          return;
        }

        // Fetch user profile
        const { data: profileData } = await supabase
          .from("students")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        // Extract name with proper fallbacks
        let studentName = null;
        
        if (profileData?.full_name && typeof profileData.full_name === 'string' && profileData.full_name.trim()) {
          studentName = profileData.full_name.trim();
        } else if (profileData?.name && typeof profileData.name === 'string' && profileData.name.trim()) {
          studentName = profileData.name.trim();
        } else if (user.user_metadata?.full_name && typeof user.user_metadata.full_name === 'string' && user.user_metadata.full_name.trim()) {
          studentName = user.user_metadata.full_name.trim();
        } else if (user.user_metadata?.name && typeof user.user_metadata.name === 'string' && user.user_metadata.name.trim()) {
          studentName = user.user_metadata.name.trim();
        } else if (user.email) {
          studentName = user.email.split("@")[0];
        } else {
          studentName = "Applicant";
        }

        setUserData({
          ...user,
          ...profileData,
          full_name: studentName,
          name: studentName,
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
    const fetchApplications = async () => {
      if (!userData?.email) return;

      try {
        setApplicationsLoading(true);
        const { data: applicationsData, error } = await supabase
          .from("applications")
          .select(
            `
            *,
            jobs (
              id,
              title,
              company_name,
              location,
              job_type,
              salary_min,
              salary_max,
              salary_currency,
              is_salary_disclosed
            )
          `
          )
          .eq("applicant_email", userData.email)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Error fetching applications:", error);
        } else {
          const mappedApplications = (applicationsData || []).map(
            (app: any) => ({
              id: app.id,
              job_id: app.job_id,
              job_title: app.jobs?.title || "Unknown Job",
              company_name: app.jobs?.company_name || "Unknown Company",
              status: app.status || "pending",
              applied_at: app.created_at,
              job: app.jobs,
            })
          );
          setApplications(mappedApplications);
        }
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setApplicationsLoading(false);
      }
    };

    fetchApplications();
  }, [userData?.email]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "accepted":
        return "bg-green-100 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200";
      case "shortlisted":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "reviewing":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingLogo size={48} />
        </div>
      </DashboardLayout>
    );
  }

  const totalApplications = applications.length;
  const pendingApplications = applications.filter(
    (app) => app.status === "pending" || app.status === "reviewing"
  ).length;
  const acceptedApplications = applications.filter(
    (app) => app.status === "accepted"
  ).length;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {userData?.full_name || "Applicant"}!
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Track your job applications and discover new opportunities
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "overview" | "jobs")}
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="jobs">Available Jobs</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Applications
                  </CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalApplications}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {pendingApplications}
                  </div>
                  <p className="text-xs text-muted-foreground">Under review</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Accepted
                  </CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {acceptedApplications}
                  </div>
                  <p className="text-xs text-muted-foreground">Success rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Applications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Applications</CardTitle>
                  <Button
                    onClick={() =>
                      router.push("/dashboard/applicant/applications")
                    }
                    variant="outline"
                    size="sm"
                    className="text-xs md:text-sm"
                  >
                    View All
                    <ArrowRight className="h-3 w-3 md:h-4 md:w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingLogo size={32} />
                  </div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No applications yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Start applying to jobs, learnerships, internships, and
                      bursaries
                    </p>
                    <Button
                      onClick={() => setActiveTab("jobs")}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Browse Jobs
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.map((application) => (
                      <motion.div
                        key={application.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base md:text-lg text-gray-900 mb-1 truncate">
                              {application.job_title}
                            </h3>
                            <p className="text-sm md:text-base text-gray-600 mb-2">
                              {application.company_name}
                            </p>
                            {application.job && (
                              <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-500 mb-2">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                                  {application.job.location}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="capitalize text-xs"
                                >
                                  {application.job.job_type}
                                </Badge>
                              </div>
                            )}
                            <p className="text-xs text-gray-500">
                              Applied {getRelativeTime(application.applied_at)}
                            </p>
                          </div>
                          <Badge className={getStatusColor(application.status)}>
                            {application.status.charAt(0).toUpperCase() +
                              application.status.slice(1)}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                Available Jobs
              </h2>
              <Button
                onClick={() => router.push("/")}
                variant="outline"
                size="sm"
                className="text-xs md:text-sm"
              >
                <Search className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Find More Jobs
              </Button>
            </div>

            <JobCards searchQuery="" selectedCategory={null} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
