"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  Mail,
  Share2,
  Facebook,
  MessageCircle,
  Linkedin,
  Twitter,
  Copy,
  Sparkles,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LoadingLogo } from "@/components/loading-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Job {
  id: string;
  title: string;
  company_name: string;
  company_logo?: string;
  description: string;
  job_type: "job" | "learnership" | "internship" | "bursary";
  category: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  is_salary_disclosed: boolean;
  experience_level?: string;
  application_deadline?: string;
  start_date?: string;
  duration?: string;
  status: string;
  is_featured: boolean;
  is_urgent: boolean;
  total_applications: number;
  total_views: number;
  created_at: string;
  application_method?: string;
  application_link?: string;
  application_email?: string;
}

export default function SuggestedJobsPage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const router = useRouter();

  // Fetch user profile with preferences
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/");
          return;
        }

        // Fetch user profile with preferences
        const { data: profileData } = await supabase
          .from("students")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        setUserData({
          ...user,
          ...profileData,
          full_name:
            profileData?.full_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0],
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  // Fetch jobs and filter based on preferences
  useEffect(() => {
    const fetchJobs = async () => {
      if (!userData) return;

      try {
        setJobsLoading(true);

        // Try API first
        try {
          const response = await fetch(
            "http://127.0.0.1:8000/api/v1/jobs/list/",
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
              const mappedJobs: Job[] = data.jobs.map((job: any) => ({
                id: job.id,
                title: job.title,
                company_name: job.company_name || "Company",
                company_logo: job.company_logo || job.logo,
                description: job.description || "",
                job_type: job.job_type || "job",
                category: job.category || "General",
                location: job.location || "Remote",
                salary_min: job.salary_min,
                salary_max: job.salary_max,
                salary_currency: job.salary_currency || "USD",
                is_salary_disclosed: job.is_salary_disclosed !== false,
                experience_level: job.experience_level,
                application_deadline: job.application_deadline,
                start_date: job.start_date,
                duration: job.duration,
                status: job.status || "open",
                is_featured: job.is_featured || false,
                is_urgent: job.is_urgent || false,
                total_applications: job.total_applications || 0,
                total_views: job.total_views || 0,
                created_at: job.created_at || new Date().toISOString(),
                application_method: job.application_method || "platform",
                application_link: job.application_link || null,
                application_email: job.application_email || null,
              }));

              setJobs(mappedJobs);
              setJobsLoading(false);
              return;
            }
          }
        } catch (apiError) {
          console.log("API fetch failed, trying Supabase directly:", apiError);
        }

        // Fallback to Supabase
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select("*")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(100);

        if (jobsError) {
          console.error("Error fetching jobs:", jobsError);
          setJobs([]);
          return;
        }

        const mappedJobs: Job[] = (jobsData || []).map((job: any) => ({
          id: job.id,
          title: job.title,
          company_name: job.company_name || "Company",
          company_logo: job.company_logo || job.logo,
          description: job.description || "",
          job_type: job.job_type || "job",
          category: job.category || "General",
          location: job.location || "Remote",
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          salary_currency: job.salary_currency || "USD",
          is_salary_disclosed: job.is_salary_disclosed !== false,
          experience_level: job.experience_level,
          application_deadline: job.application_deadline,
          start_date: job.start_date,
          duration: job.duration,
          status: job.status || "open",
          is_featured: job.is_featured || false,
          is_urgent: job.is_urgent || false,
          total_applications: job.total_applications || 0,
          total_views: job.total_views || 0,
          created_at: job.created_at || new Date().toISOString(),
          application_method: job.application_method || "platform",
          application_link: job.application_link || null,
          application_email: job.application_email || null,
        }));

        setJobs(mappedJobs);
      } catch (error) {
        console.error("Error fetching jobs:", error);
        setJobs([]);
      } finally {
        setJobsLoading(false);
      }
    };

    fetchJobs();
  }, [userData]);

  // Filter jobs based on user preferences
  const suggestedJobs = useMemo(() => {
    if (!userData || !jobs.length) return [];

    const preferences = {
      preferred_job_types: userData.preferred_job_types || [],
      preferred_categories: userData.preferred_categories || [],
      preferred_locations: userData.preferred_locations || [],
      salary_expectation_min: userData.salary_expectation_min,
      salary_expectation_max: userData.salary_expectation_max,
      salary_currency: userData.salary_currency || "USD",
    };

    // Parse JSONB fields if they're strings
    const parseJsonb = (value: any) => {
      if (!value) return [];
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      }
      return Array.isArray(value) ? value : [];
    };

    const preferredJobTypes = parseJsonb(preferences.preferred_job_types);
    const preferredCategories = parseJsonb(preferences.preferred_categories);
    const preferredLocations = parseJsonb(preferences.preferred_locations);

    // If no preferences set, return all jobs
    if (
      preferredJobTypes.length === 0 &&
      preferredCategories.length === 0 &&
      preferredLocations.length === 0
    ) {
      return jobs;
    }

    // Filter jobs based on preferences
    return jobs.filter((job) => {
      // Check job type match
      if (
        preferredJobTypes.length > 0 &&
        !preferredJobTypes.includes(job.job_type)
      ) {
        return false;
      }

      // Check category match
      if (
        preferredCategories.length > 0 &&
        !preferredCategories.includes(job.category)
      ) {
        return false;
      }

      // Check location match (case-insensitive partial match)
      if (preferredLocations.length > 0) {
        const jobLocationLower = job.location.toLowerCase();
        const matchesLocation = preferredLocations.some((loc: string) =>
          jobLocationLower.includes(loc.toLowerCase())
        );
        if (!matchesLocation) {
          return false;
        }
      }

      // Check salary range if specified
      if (
        preferences.salary_expectation_min &&
        job.salary_max &&
        job.salary_max < preferences.salary_expectation_min
      ) {
        return false;
      }

      if (
        preferences.salary_expectation_max &&
        job.salary_min &&
        job.salary_min > preferences.salary_expectation_max
      ) {
        return false;
      }

      return true;
    });
  }, [userData, jobs]);

  // Share job function
  const handleShare = (job: Job, platform: string) => {
    const jobUrl = `${window.location.origin}/jobs/${job.id}`;
    const shareText = encodeURIComponent(
      `Check out this job: ${job.title} at ${job.company_name}`
    );

    let shareUrl = "";

    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(jobUrl)}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${shareText}%20${encodeURIComponent(jobUrl)}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(jobUrl)}`;
        break;
      case "copy":
        navigator.clipboard.writeText(jobUrl);
        toast.success("Job link copied to clipboard!");
        return;
      default:
        return;
    }

    window.open(shareUrl, "_blank", "width=600,height=400");
  };

  const formatSalary = (job: Job) => {
    if (!job.is_salary_disclosed) return "Salary not disclosed";
    const currencySymbol =
      job.salary_currency === "USD"
        ? "$"
        : job.salary_currency === "ZAR"
        ? "R"
        : job.salary_currency === "EUR"
        ? "€"
        : job.salary_currency === "GBP"
        ? "£"
        : job.salary_currency;
    if (job.salary_min && job.salary_max) {
      return `${currencySymbol}${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`;
    }
    if (job.salary_min) {
      return `${currencySymbol}${job.salary_min.toLocaleString()}+`;
    }
    return "Salary negotiable";
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
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

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Suggested Jobs
            </h1>
          </div>
          <p className="text-sm md:text-base text-gray-600">
            Jobs matched to your preferences from your profile
          </p>
        </div>

        {jobsLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingLogo size={48} />
          </div>
        ) : suggestedJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No suggested jobs found
              </h3>
              <p className="text-gray-600 mb-4">
                {userData?.preferred_job_types?.length === 0 &&
                userData?.preferred_categories?.length === 0
                  ? "Update your profile preferences to see personalized job suggestions."
                  : "Try adjusting your preferences in your profile to see more matches."}
              </p>
              <Button
                onClick={() => router.push("/dashboard/applicant/profile")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Update Profile Preferences
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {suggestedJobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="h-12 w-12 border border-gray-200 flex-shrink-0">
                        <AvatarImage
                          src={job.company_logo}
                          alt={job.company_name || "Company"}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-sm font-semibold">
                          {job.company_name
                            ? job.company_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()
                            : "C"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-lg line-clamp-2 flex-1">
                            {job.title}
                          </h3>
                          {job.is_featured && (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs flex-shrink-0">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {job.company_name}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>Posted {getTimeAgo(job.created_at)}</span>
                      </div>
                      {job.application_deadline && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Deadline:{" "}
                            {new Date(job.application_deadline).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {job.duration && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>Duration: {job.duration}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className="capitalize">
                        {job.job_type}
                      </Badge>
                      <Badge variant="outline">{job.category}</Badge>
                      {job.experience_level && (
                        <Badge variant="outline" className="capitalize">
                          {job.experience_level}
                        </Badge>
                      )}
                    </div>

                    {job.is_salary_disclosed && (
                      <div className="mb-4 text-sm font-medium text-gray-900">
                        <span>{formatSalary(job)}</span>
                      </div>
                    )}

                    {job.application_method === "email" && job.application_email && (
                      <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex items-center gap-2 text-xs text-green-700">
                          <Mail className="h-3 w-3" />
                          <span className="font-medium">
                            Apply via email: {job.application_email}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => {
                          window.location.href = `/jobs/${job.id}`;
                        }}
                        variant="outline"
                        className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 text-xs h-8"
                      >
                        View More
                      </Button>
                      {job.application_method === "external_link" &&
                      job.application_link ? (
                        <Button
                          onClick={() => {
                            window.location.href = `/jobs/${job.id}#apply`;
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Apply
                        </Button>
                      ) : job.application_method === "email" &&
                        job.application_email ? (
                        <Button
                          onClick={() => {
                            window.location.href = `/jobs/${job.id}#apply`;
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8"
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Apply
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            window.location.href = `/jobs/${job.id}#apply`;
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8"
                        >
                          Apply
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-gray-300 hover:bg-gray-50"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => handleShare(job, "facebook")}
                            className="cursor-pointer"
                          >
                            <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                            Facebook
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleShare(job, "whatsapp")}
                            className="cursor-pointer"
                          >
                            <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                            WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleShare(job, "linkedin")}
                            className="cursor-pointer"
                          >
                            <Linkedin className="h-4 w-4 mr-2 text-blue-700" />
                            LinkedIn
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleShare(job, "twitter")}
                            className="cursor-pointer"
                          >
                            <Twitter className="h-4 w-4 mr-2 text-blue-400" />
                            Twitter
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleShare(job, "copy")}
                            className="cursor-pointer"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

