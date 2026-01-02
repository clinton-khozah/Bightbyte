"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/layout";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  Briefcase,
  MapPin,
  Users,
  Eye,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Mail,
  Filter,
  Search,
  GraduationCap,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobDetailsModal } from "@/components/dashboard/job-details-modal";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar-client";

export default function MyJobsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "open" | "closed" | "filled" | "cancelled"
  >("all");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "job" | "learnership" | "internship" | "bursary"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isJobDetailsOpen, setIsJobDetailsOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          router.push("/");
          return;
        }

        // Try to fetch company data first
        let company = null;
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!companyError && companyData) {
          company = companyData;
        } else {
          // Fallback to mentors table for backward compatibility
          const { data: mentor, error: mentorError } = await supabase
            .from("mentors")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (mentorError || !mentor) {
            console.error(
              "Error fetching company/mentor data:",
              mentorError || companyError
            );
            setLoading(false);
            return;
          }
          // Convert mentor to company format
          company = {
            id: mentor.id,
            company_name: mentor.name || mentor.company_name,
            name: mentor.name,
            user_id: mentor.user_id,
          };
        }

        setCompanyData(company);
        setUserData({
          id: user.id,
          email: user.email,
          full_name:
            company?.company_name ||
            company?.name ||
            user.email?.split("@")[0] ||
            "User",
        });
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  // Fetch jobs for the company
  useEffect(() => {
    const fetchJobs = async () => {
      if (!companyData?.id || !userData?.id) return;

      try {
        setJobsLoading(true);

        // Try API first
        try {
          const response = await fetch(
            `http://127.0.0.1:8000/api/v1/jobs/list/?company_id=${companyData.id}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.jobs) {
              setJobs(data.jobs);
              setJobsLoading(false);
              return;
            }
          }
        } catch (apiError) {
          console.log("API fetch failed, trying Supabase directly:", apiError);
        }

        // Fallback to Supabase - also check for null company_id (jobs created before fix)
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select("*")
          .or(`company_id.eq.${companyData.id},company_id.is.null`)
          .order("created_at", { ascending: false });

        if (jobsError) {
          console.error("Error fetching jobs:", jobsError);
          setJobs([]);
          return;
        }

        // Map jobs to include company_name from companyData
        const jobsWithCompanyName = (jobsData || []).map((job: any) => ({
          ...job,
          company_name:
            job.company_name ||
            companyData?.company_name ||
            companyData?.name ||
            userData?.full_name ||
            "Company",
        }));

        setJobs(jobsWithCompanyName);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        setJobs([]);
      } finally {
        setJobsLoading(false);
      }
    };

    fetchJobs();
  }, [companyData?.id, userData?.id]);

  const filteredJobs = jobs.filter((job) => {
    // Status filter
    if (statusFilter !== "all" && job.status !== statusFilter) {
      return false;
    }

    // Type filter
    if (typeFilter !== "all" && job.job_type !== typeFilter) {
      return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        job.title,
        job.description,
        job.category,
        job.location,
        job.company_name || companyData?.company_name || "",
      ]
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(query)) {
        return false;
      }
    }

    return true;
  });

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case "learnership":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "internship":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "bursary":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getJobTypeIcon = (type: string) => {
    switch (type) {
      case "learnership":
        return <GraduationCap className="w-4 h-4" />;
      case "internship":
        return <Briefcase className="w-4 h-4" />;
      case "bursary":
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Briefcase className="w-4 h-4" />;
    }
  };

  const getCurrencySymbol = (currency: string) => {
    const currencyMap: { [key: string]: string } = {
      USD: "$",
      ZAR: "R",
      EUR: "€",
      GBP: "£",
      NGN: "₦",
      KES: "KSh",
      GHS: "GH₵",
      EGP: "E£",
      AUD: "A$",
      CAD: "C$",
      INR: "₹",
      BRL: "R$",
      MXN: "$",
    };
    return currencyMap[currency.toUpperCase()] || currency;
  };

  const formatSalary = (job: any) => {
    if (!job.is_salary_disclosed) {
      return "Salary not disclosed";
    }
    const currencySymbol = getCurrencySymbol(job.salary_currency || "USD");
    if (job.salary_min && job.salary_max) {
      return `${currencySymbol}${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`;
    }
    if (job.salary_min) {
      return `${currencySymbol}${job.salary_min.toLocaleString()}+`;
    }
    return "Salary negotiable";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-700 border-green-200";
      case "closed":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "filled":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="mentor">
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading your jobs...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="mentor">
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-3 md:py-6">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-4xl font-bold text-gray-900 mb-1 md:mb-2">
            My Jobs
          </h1>
          <p className="text-xs md:text-lg text-gray-600">
            View and manage your posted jobs, learnerships, internships, and
            bursaries
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 md:mb-6 space-y-3 md:space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
            <Input
              placeholder="Search jobs by title, description, category, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 md:pl-10 h-8 md:h-11 text-xs md:text-sm"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-3 items-start md:items-center">
            <div className="flex items-center gap-1.5 md:gap-2 w-full md:w-auto">
              <Filter className="h-3 w-3 md:h-4 md:w-4 text-gray-500" />
              <span className="text-xs md:text-sm font-medium text-gray-700">
                Status:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 md:gap-3 w-full md:w-auto">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
                className="rounded-lg text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-4"
              >
                All ({jobs.length})
              </Button>
              <Button
                variant={statusFilter === "open" ? "default" : "outline"}
                onClick={() => setStatusFilter("open")}
                className="rounded-lg text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-4"
              >
                Open ({jobs.filter((j) => j.status === "open").length})
              </Button>
              <Button
                variant={statusFilter === "closed" ? "default" : "outline"}
                onClick={() => setStatusFilter("closed")}
                className="rounded-lg text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-4"
              >
                Closed ({jobs.filter((j) => j.status === "closed").length})
              </Button>
              <Button
                variant={statusFilter === "filled" ? "default" : "outline"}
                onClick={() => setStatusFilter("filled")}
                className="rounded-lg text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-4"
              >
                Filled ({jobs.filter((j) => j.status === "filled").length})
              </Button>
              <Button
                variant={statusFilter === "cancelled" ? "default" : "outline"}
                onClick={() => setStatusFilter("cancelled")}
                className="rounded-lg text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-4"
              >
                Cancelled ({jobs.filter((j) => j.status === "cancelled").length}
                )
              </Button>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2 mt-2 md:mt-0 md:ml-4 w-full md:w-auto">
              <span className="text-xs md:text-sm font-medium text-gray-700">
                Type:
              </span>
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value: any) => setTypeFilter(value)}
            >
              <SelectTrigger className="w-full md:w-[180px] h-7 md:h-9 text-xs md:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="job">Jobs</SelectItem>
                <SelectItem value="learnership">Learnerships</SelectItem>
                <SelectItem value="internship">Internships</SelectItem>
                <SelectItem value="bursary">Bursaries</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Jobs List */}
        {jobsLoading ? (
          <Card className="bg-white border rounded-xl shadow-sm">
            <CardContent className="py-8 md:py-12">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-blue-600 mx-auto" />
                  <p className="mt-3 md:mt-4 text-gray-600 text-xs md:text-sm">
                    Loading jobs...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : filteredJobs.length === 0 ? (
          <Card className="bg-white border rounded-xl shadow-sm">
            <CardContent className="py-8 md:py-12">
              <div className="text-center">
                <Briefcase className="h-8 w-8 md:h-12 md:w-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                <p className="text-gray-600 text-sm md:text-lg mb-1 md:mb-2">
                  {jobs.length === 0
                    ? "No jobs posted yet"
                    : "No jobs match your filters"}
                </p>
                <p className="text-gray-500 text-xs md:text-sm mb-3 md:mb-4">
                  {jobs.length === 0
                    ? 'Click "Post a Job" to create your first job posting'
                    : "Try adjusting your search or filters"}
                </p>
                {jobs.length === 0 && (
                  <Button
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent("openCreateJobModal")
                      );
                    }}
                    className="mt-3 md:mt-4 h-8 md:h-10 text-xs md:text-sm px-3 md:px-4"
                  >
                    Post a Job
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {filteredJobs.map((job, index) => {
              const companyName =
                job.company_name || companyData?.company_name || "";

              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="min-h-[400px] md:min-h-[550px] bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col">
                    <CardContent className="p-3 md:p-5 flex flex-col flex-grow">
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 md:h-16 md:w-16 border-2 border-gray-200 flex-shrink-0">
                            <AvatarImage
                              src={job.company_logo}
                              alt={companyName}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-gray-100 text-gray-600 text-[10px] md:text-sm font-semibold">
                              {companyName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm md:text-lg font-semibold text-gray-900 line-clamp-1">
                              {job.title}
                            </h3>
                            {companyName &&
                              companyName !== "Unknown Company" && (
                                <p className="text-xs md:text-sm text-gray-600 line-clamp-1">
                                  {companyName}
                                </p>
                              )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          {job.is_featured && (
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[9px] md:text-xs px-1 md:px-2 py-0 md:py-0.5">
                              Featured
                            </Badge>
                          )}
                          {job.is_urgent && (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-[9px] md:text-xs px-1 md:px-2 py-0 md:py-0.5">
                              Urgent
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mb-3 md:mb-4 flex-grow">
                        <div className="flex flex-wrap gap-1 md:gap-2 mb-2 md:mb-3">
                          <Badge
                            className={`${getJobTypeColor(
                              job.job_type
                            )} text-[9px] md:text-xs px-1 md:px-2 py-0 md:py-0.5`}
                          >
                            <span className="hidden md:inline">
                              {getJobTypeIcon(job.job_type)}
                            </span>
                            <span className="ml-0 md:ml-1 capitalize">
                              {job.job_type}
                            </span>
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="bg-gray-100 text-gray-700 border-gray-200 text-[9px] md:text-xs px-1 md:px-2 py-0 md:py-0.5"
                          >
                            {job.category}
                          </Badge>
                          {job.experience_level && (
                            <Badge
                              variant="outline"
                              className="text-[9px] md:text-xs px-1 md:px-2 py-0 md:py-0.5"
                            >
                              {job.experience_level}
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs md:text-sm text-gray-700 leading-relaxed line-clamp-2 md:line-clamp-3 mb-2 md:mb-3">
                          {job.description}
                        </p>

                        <div className="space-y-1 md:space-y-2 mb-2 md:mb-3">
                          <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-600">
                            <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span className="line-clamp-1">{job.location}</span>
                          </div>
                          {companyName && (
                            <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-600">
                              <Briefcase className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                              <span className="line-clamp-1">
                                Company: {companyName}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-600">
                            <Briefcase className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                            <span className="line-clamp-1 capitalize">
                              Type: {job.job_type}
                            </span>
                          </div>
                        </div>

                        {job.tags && job.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2 md:mb-3">
                            {job.tags
                              .slice(0, 3)
                              .map((tag: string, idx: number) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-[9px] md:text-xs bg-blue-50 text-blue-700 border-blue-200 px-1 md:px-2 py-0 md:py-0.5"
                                >
                                  {tag}
                                </Badge>
                              ))}
                          </div>
                        )}
                      </div>

                      <div className="mb-3 md:mb-4 mt-auto p-2 md:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] md:text-xs text-gray-600 mb-0.5 md:mb-1">
                              Compensation
                            </p>
                            <p className="text-base md:text-lg font-bold text-blue-600">
                              {formatSalary(job)}
                            </p>
                            {job.total_applications > 0 && (
                              <p className="text-[9px] md:text-xs text-gray-500 mt-0.5 md:mt-1">
                                {job.total_applications} application
                                {job.total_applications !== 1 ? "s" : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Application Method Indicator */}
                      {job.application_method === "external_link" &&
                        job.application_link && (
                          <div className="mb-2 md:mb-3 p-1.5 md:p-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-xs text-blue-700">
                              <ExternalLink className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                              <span className="font-medium line-clamp-1">
                                Apply on company website
                              </span>
                            </div>
                          </div>
                        )}
                      {job.application_method === "email" &&
                        job.application_email && (
                          <div className="mb-2 md:mb-3 p-1.5 md:p-2 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-xs text-green-700">
                              <Mail className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                              <span className="font-medium line-clamp-1">
                                Apply via email: {job.application_email}
                              </span>
                            </div>
                          </div>
                        )}

                      <div className="flex gap-1.5 md:gap-2">
                        {job.application_method === "external_link" &&
                        job.application_link ? (
                          <Button
                            onClick={() => {
                              window.open(
                                job.application_link!,
                                "_blank",
                                "noopener,noreferrer"
                              );
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all h-7 md:h-9 text-xs md:text-sm"
                          >
                            <ExternalLink className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                            Apply
                          </Button>
                        ) : job.application_method === "email" &&
                          job.application_email ? (
                          <Button
                            onClick={() => {
                              window.location.href = `mailto:${
                                job.application_email
                              }?subject=Application for ${encodeURIComponent(
                                job.title
                              )}`;
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all h-7 md:h-9 text-xs md:text-sm"
                          >
                            <Mail className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                            Apply
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              setSelectedJob(job);
                              setIsJobDetailsOpen(true);
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all h-7 md:h-9 text-xs md:text-sm"
                          >
                            Apply Now
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedJob(job);
                            setIsJobDetailsOpen(true);
                          }}
                          className="h-7 md:h-9 text-xs md:text-sm px-2 md:px-4"
                        >
                          <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Job Details Modal */}
      <JobDetailsModal
        isOpen={isJobDetailsOpen}
        onClose={() => {
          setIsJobDetailsOpen(false);
          setSelectedJob(null);
        }}
        job={selectedJob}
      />
    </DashboardLayout>
  );
}
