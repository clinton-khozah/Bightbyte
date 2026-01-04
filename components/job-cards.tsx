"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  MapPin,
  Clock,
  Briefcase,
  GraduationCap,
  DollarSign,
  Calendar,
  ExternalLink,
  Mail,
  Share2,
  Facebook,
  MessageCircle,
  Linkedin,
  Twitter,
  Copy,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LoadingLogo } from "@/components/loading-logo";
import dynamic from "next/dynamic";
import { trackJobEvent, trackButtonClick } from "@/lib/analytics";
import { apiCache, createCacheKey } from "@/lib/api-cache";

// Dynamically import modals to avoid SSR issues
const SignInModal = dynamic(
  () => import("@/components/auth/sign-in-modal").then((mod) => ({ default: mod.SignInModal })),
  { ssr: false }
);

const SignUpModal = dynamic(
  () => import("@/components/auth/sign-up-modal").then((mod) => ({ default: mod.SignUpModal })),
  { ssr: false }
);

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
  tags: string[];
  benefits: string[];
  created_at: string;
  application_method?: string;
  application_link?: string;
  application_email?: string;
}

interface JobCardsProps {
  searchQuery?: string;
  selectedCategory?: string | null;
}

export function JobCards({
  searchQuery = "",
  selectedCategory = null,
}: JobCardsProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const jobsPerPage = 100;
  const containerRef = useRef<HTMLDivElement>(null);

  // Format job for social media copy
  const formatJobForSocialMedia = (job: Job): string => {
    const currencySymbol = getCurrencySymbol(job.salary_currency || "USD");
    let salaryText = "Salary not disclosed";
    
    if (job.is_salary_disclosed) {
      if (job.salary_min && job.salary_max) {
        salaryText = `${currencySymbol}${job.salary_min.toLocaleString()} - ${currencySymbol}${job.salary_max.toLocaleString()}`;
      } else if (job.salary_min) {
        salaryText = `${currencySymbol}${job.salary_min.toLocaleString()}+`;
      } else {
        salaryText = "Salary negotiable";
      }
    }

    const jobTypeText = job.job_type.charAt(0).toUpperCase() + job.job_type.slice(1);
    const experienceLevel = job.experience_level || "Not specified";
    
    let formattedText = `🏢 ${job.title}\n`;
    formattedText += `📍 ${job.company_name || "Company Not Specified"}\n\n`;
    
    // Description (first 300 characters)
    const description = job.description || "No description available.";
    const shortDescription = description.length > 300 
      ? description.substring(0, 300) + "..." 
      : description;
    formattedText += `${shortDescription}\n\n`;
    
    formattedText += `📍 Location: ${job.location}\n`;
    formattedText += `💼 Job Type: ${jobTypeText}\n`;
    formattedText += `📊 Category: ${job.category}\n`;
    formattedText += `💵 Salary: ${salaryText}\n`;
    formattedText += `🎯 Experience Level: ${experienceLevel}\n`;
    
    if (job.requirements && job.requirements.trim()) {
      formattedText += `\n📋 Requirements:\n${job.requirements}\n`;
    }
    
    if (job.qualifications && job.qualifications.trim()) {
      formattedText += `\n🎓 Qualifications:\n${job.qualifications}\n`;
    }
    
    formattedText += `\n🔗 Apply: ${window.location.origin}/jobs/${job.id}`;
    
    return formattedText;
  };

  // Share job function
  const handleShare = (job: Job, platform: string) => {
    const jobUrl = `${window.location.origin}/jobs/${job.id}`;
    const jobTitle = encodeURIComponent(job.title);
    const jobDescription = encodeURIComponent(`${job.title} at ${job.company_name} - ${job.location}`);
    const shareText = encodeURIComponent(`Check out this job: ${job.title} at ${job.company_name}`);

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
        trackButtonClick("Copy Link", "job_card");
        return;
      case "copy-job":
        const formattedJob = formatJobForSocialMedia(job);
        navigator.clipboard.writeText(formattedJob);
        trackButtonClick("Copy Job", "job_card");
        toast.success("Job details copied to clipboard! Ready to paste on Facebook, WhatsApp, or Instagram.");
        return;
      default:
        return;
    }

    trackButtonClick(`Share to ${platform}`, "job_card");
    window.open(shareUrl, "_blank", "width=600,height=400");
  };

  // Fetch jobs from database with caching
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);

        // Check cache first
        const cacheKey = createCacheKey("http://127.0.0.1:8000/api/v1/jobs/list/");
        const cachedData = apiCache.get<Job[]>(cacheKey);
        if (cachedData) {
          console.log("✅ Using cached jobs data");
          setAllJobs(cachedData);
          const displayJobs = searchQuery.trim() || selectedCategory
            ? cachedData
            : cachedData.slice(0, 10);
          setJobs(displayJobs);
          setLoading(false);
          return;
        }

        // Try API first
        try {
          const response = await fetch(
            "http://127.0.0.1:8000/api/v1/jobs/list/",
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
              // Add cache headers
              cache: 'force-cache',
              next: { revalidate: 300 } // Revalidate every 5 minutes
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.jobs) {
              const mappedJobs: Job[] = data.jobs.map((job: any) => ({
                id: job.id,
                title: job.title || "Untitled Job",
                company_name: job.company_name || "",
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
                tags: Array.isArray(job.tags) ? job.tags : [],
                benefits: Array.isArray(job.benefits) ? job.benefits : [],
                created_at: job.created_at || new Date().toISOString(),
                application_method: job.application_method || "platform",
                application_link: job.application_link || null,
                application_email: job.application_email || null,
              }));

              // Filter to only show jobs from last month
              const oneMonthAgo = new Date();
              oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
              
              const sortedJobs = mappedJobs
                .filter((job) => {
                  if (job.status !== "open") return false;
                  if (!job.created_at) return false;
                  const jobDate = new Date(job.created_at);
                  return jobDate >= oneMonthAgo;
                })
                .sort((a, b) => {
                  if (a.is_featured && !b.is_featured) return -1;
                  if (!a.is_featured && b.is_featured) return 1;
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });

              // Cache the results
              apiCache.set(cacheKey, sortedJobs, 5 * 60 * 1000); // Cache for 5 minutes
              
              setAllJobs(sortedJobs);
              const displayJobs = searchQuery.trim() || selectedCategory
                ? sortedJobs
                : sortedJobs.slice(0, 10);
              setJobs(displayJobs);
              setLoading(false);
              return;
            }
          }
        } catch (apiError) {
          console.log("API fetch failed, trying Supabase directly:", apiError);
        }

        // Fallback to Supabase - only get jobs from last month
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const { data: jobsData, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("status", "open")
          .gte("created_at", oneMonthAgo.toISOString())
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) {
          console.error("Error fetching jobs from Supabase:", error);
          setJobs([]);
        } else if (jobsData && jobsData.length > 0) {
          const mappedJobs: Job[] = jobsData.map((job: any) => ({
            id: job.id,
            title: job.title || "Untitled Job",
            company_name: job.company_name || "",
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
            tags: Array.isArray(job.tags) ? job.tags : [],
            benefits: Array.isArray(job.benefits) ? job.benefits : [],
            created_at: job.created_at || new Date().toISOString(),
            application_method: job.application_method || "platform",
            application_link: job.application_link || null,
            application_email: job.application_email || null,
          }));

          // Cache Supabase results too
          const supabaseCacheKey = createCacheKey("supabase:jobs");
          apiCache.set(supabaseCacheKey, mappedJobs, 5 * 60 * 1000);
          
          setAllJobs(mappedJobs);
          const displayJobs = searchQuery.trim() || selectedCategory
            ? mappedJobs
            : mappedJobs.slice(0, 10);
          setJobs(displayJobs);
        } else {
          setJobs([]);
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Filter jobs based on search query and selected category
  const filteredJobs = useMemo(() => {
    // Filter jobs to only show those from last month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const jobsToFilter = (searchQuery.trim() || selectedCategory ? allJobs : jobs).filter((job) => {
      if (!job.created_at) return false;
      const jobDate = new Date(job.created_at);
      return jobDate >= oneMonthAgo;
    });
    
    let filtered = jobsToFilter;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          (job.company_name && job.company_name.toLowerCase().includes(query)) ||
          job.description.toLowerCase().includes(query) ||
          job.category.toLowerCase().includes(query) ||
          job.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((job) =>
        job.category.toLowerCase() === selectedCategory.toLowerCase() ||
        job.job_type.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    return filtered;
  }, [jobs, allJobs, searchQuery, selectedCategory]);

  // Reset to page 1 when search or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;
  const endIndex = startIndex + jobsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of job cards section
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const formatSalary = (job: Job) => {
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

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInMonths = Math.floor(diffInDays / 30);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
    } else if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
    } else if (diffInMonths < 1) {
      return "Less than a month ago";
    } else {
      return `${diffInMonths} month${diffInMonths !== 1 ? "s" : ""} ago`;
    }
  };

  if (loading) {
    return (
      <div className="w-full py-8 flex items-center justify-center">
        <LoadingLogo size={32} />
      </div>
    );
  }

  return (
    <div className="w-full py-8">
      {filteredJobs.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center py-12"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.2,
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            className="text-6xl mb-4"
          >
            🔍
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-white text-lg font-['Verdana',sans-serif] drop-shadow-md"
          >
            {jobs.length === 0
              ? "No jobs available at the moment. Please check back later."
              : "No jobs match your search criteria."}
          </motion.p>
        </motion.div>
      ) : (
        <>
          {/* Mobile View - Vertical Scrollable List */}
          <div className="md:hidden space-y-4" ref={containerRef}>
            {paginatedJobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: "easeOut",
                }}
              >
                  <Card className="min-h-[380px] bg-gradient-to-br from-blue-50 via-white to-blue-50 border-2 border-blue-200 shadow-sm hover:shadow-xl transition-all flex flex-col rounded-lg relative overflow-hidden">
                    <CardContent className="p-3 flex flex-col flex-grow relative">
                      {/* Blue accent bar */}
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500"
                      />
                      
                      <div className="flex items-start gap-2 mb-2">
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-10 w-10 border border-blue-400 shadow-md shadow-blue-200">
                            <AvatarImage
                              src={job.company_logo}
                              alt={job.company_name || "Company"}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-semibold">
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
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-white shadow-sm"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <h3 className="text-sm font-bold text-blue-900 line-clamp-2">
                              {job.title}
                            </h3>
                            {job.is_featured && (
                              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border shadow-sm">
                                Featured
                              </Badge>
                            )}
                            {job.is_urgent && (
                              <Badge className="bg-red-100 text-red-700 border-red-200 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border shadow-sm">
                                Urgent
                              </Badge>
                            )}
                          </div>
                          {job.company_name && job.company_name !== "Unknown Company" && (
                            <p className="text-xs font-semibold text-blue-800 mb-0.5 line-clamp-1">{job.company_name}</p>
                          )}
                          {job.created_at && (
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              Posted {getRelativeTime(job.created_at)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mb-2 flex-grow">
                        <p className="text-gray-700 text-xs mb-2 text-left line-clamp-2 leading-snug">
                          {job.description}
                        </p>

                        {/* Job Details in Blue Gradient Box */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-md p-2 text-xs text-gray-700 mb-2 w-full space-y-1 border border-blue-200">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-blue-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-gray-900 text-[10px]">Location: </span>
                              <span className="text-[10px]">{job.location}</span>
                            </div>
                          </div>
                          {job.company_name && (
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="h-3 w-3 text-blue-600 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-gray-900 text-[10px]">Company: </span>
                                <span className="text-[10px] truncate">{job.company_name}</span>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-3 w-3 text-blue-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-gray-900 text-[10px]">Type: </span>
                              <span className="text-[10px] capitalize">{job.job_type}</span>
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          <Badge className={`${getJobTypeColor(job.job_type)} px-1.5 py-0.5 text-[10px] font-medium border`}>
                            <span className="capitalize">{job.job_type}</span>
                          </Badge>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 border border-blue-300 px-1.5 py-0.5 text-[10px] font-medium">
                            {job.category}
                          </Badge>
                          {job.experience_level && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border border-purple-300 px-1.5 py-0.5 text-[10px] font-medium">
                              {job.experience_level}
                            </Badge>
                          )}
                          {job.tags && job.tags.length > 0 && job.tags.slice(0, 2).map((tag, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 px-1.5 py-0.5"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Salary at bottom */}
                      <div className="mt-auto pt-2 border-t border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-right flex-1">
                            <div className="text-lg font-bold text-gray-900">
                              {formatSalary(job)}
                            </div>
                            <div className="text-[10px] text-gray-600">
                              SALARY
                            </div>
                          </div>
                        </div>
                      </div>

                      {job.application_method === "email" && job.application_email && (
                        <div className="mb-2 p-1.5 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-center gap-1.5 text-[10px] text-green-700">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="font-medium line-clamp-1">Apply via email: {job.application_email}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-1.5 mt-2">
                        <Button
                          onClick={() => {
                            trackJobEvent.click(job.id, job.title, "view_more");
                            trackButtonClick("View More", "job_card");
                            router.push(`/jobs/${job.id}`);
                          }}
                          variant="outline"
                          className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 text-xs h-8 px-2"
                        >
                          View More
                        </Button>
                        {job.application_method === "external_link" && job.application_link ? (
                          <Button
                            onClick={() => {
                              trackJobEvent.apply(job.id, job.title, "external_link");
                              trackButtonClick("Apply (External)", "job_card");
                              window.location.href = `/jobs/${job.id}#apply`;
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all text-xs h-8 px-2"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Apply
                          </Button>
                        ) : job.application_method === "email" && job.application_email ? (
                          <Button
                            onClick={() => {
                              trackJobEvent.apply(job.id, job.title, "email");
                              trackButtonClick("Apply (Email)", "job_card");
                              window.location.href = `/jobs/${job.id}#apply`;
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all text-xs h-8 px-2"
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            Apply
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              trackJobEvent.apply(job.id, job.title, "platform");
                              trackButtonClick("Apply (Platform)", "job_card");
                              window.location.href = `/jobs/${job.id}#apply`;
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all text-xs h-8 px-2"
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
                            <DropdownMenuItem
                              onClick={() => handleShare(job, "copy-job")}
                              className="cursor-pointer"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Job Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
              </motion.div>
            ))}
          </div>

          {/* Desktop View - Grid Layout */}
          <div className="hidden md:block" ref={containerRef}>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedJobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.05,
                    ease: "easeOut",
                  }}
                >
                  <Card className="min-h-[550px] bg-gradient-to-br from-blue-50 via-white to-blue-50 border-2 border-blue-200 shadow-sm hover:shadow-xl transition-all flex flex-col rounded-xl relative overflow-hidden">
                    <CardContent className="p-6 flex flex-col flex-grow relative">
                      {/* Blue accent bar */}
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500"
                      />
                      
                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-16 w-16 border-2 border-blue-400 shadow-lg shadow-blue-200">
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
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-xl font-bold text-blue-900 line-clamp-1">
                              {job.title}
                            </h3>
                            {job.is_featured && (
                              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm">
                                Featured
                              </Badge>
                            )}
                            {job.is_urgent && (
                              <Badge className="bg-red-100 text-red-700 border-red-200 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm">
                                Urgent
                              </Badge>
                            )}
                          </div>
                          {job.company_name && job.company_name !== "Unknown Company" && (
                            <p className="text-sm font-semibold text-blue-800 mb-1">{job.company_name}</p>
                          )}
                          {job.created_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Posted {getRelativeTime(job.created_at)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mb-4 flex-grow">
                        <p className="text-gray-700 text-sm mb-3 text-left line-clamp-2 leading-snug">
                          {job.description}
                        </p>

                        {/* Job Details in Blue Gradient Box */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3.5 text-sm text-gray-700 mb-3 w-full space-y-2 border border-blue-200">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <div>
                              <span className="font-semibold text-gray-900">Location: </span>
                              <span>{job.location}</span>
                            </div>
                          </div>
                          {job.company_name && (
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="font-semibold text-gray-900">Company: </span>
                                <span className="truncate">{job.company_name}</span>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <div>
                              <span className="font-semibold text-gray-900">Type: </span>
                              <span className="capitalize">{job.job_type}</span>
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <Badge className={`${getJobTypeColor(job.job_type)} px-2 py-1 text-xs font-medium border`}>
                            {getJobTypeIcon(job.job_type)}
                            <span className="ml-1 capitalize">{job.job_type}</span>
                          </Badge>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 border border-blue-300 px-2 py-1 text-xs font-medium">
                            {job.category}
                          </Badge>
                          {job.experience_level && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border border-purple-300 px-2 py-1 text-xs font-medium">
                              {job.experience_level}
                            </Badge>
                          )}
                          {job.tags && job.tags.length > 0 && job.tags.slice(0, 2).map((tag, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs bg-blue-50 text-blue-700 border-blue-200 px-2 py-1"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Salary at bottom */}
                      <div className="mt-auto pt-4 border-t border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-right flex-1">
                            <div className="text-2xl font-bold text-gray-900">
                              {formatSalary(job)}
                            </div>
                            <div className="text-xs text-gray-600">
                              SALARY
                            </div>
                          </div>
                        </div>
                      </div>

                      {job.application_method === "email" && job.application_email && (
                        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-xs text-green-700">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="font-medium">Apply via email: {job.application_email}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={() => {
                            trackJobEvent.click(job.id, job.title, "view_more");
                            trackButtonClick("View More", "job_card");
                            router.push(`/jobs/${job.id}`);
                          }}
                          variant="outline"
                          className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          View More
                        </Button>
                        {job.application_method === "external_link" && job.application_link ? (
                          <Button
                            onClick={() => {
                              trackJobEvent.apply(job.id, job.title, "external_link");
                              trackButtonClick("Apply (External)", "job_card");
                              window.location.href = `/jobs/${job.id}#apply`;
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Apply
                          </Button>
                        ) : job.application_method === "email" && job.application_email ? (
                          <Button
                            onClick={() => {
                              trackJobEvent.apply(job.id, job.title, "email");
                              trackButtonClick("Apply (Email)", "job_card");
                              window.location.href = `/jobs/${job.id}#apply`;
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Apply
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              trackJobEvent.apply(job.id, job.title, "platform");
                              trackButtonClick("Apply (Platform)", "job_card");
                              window.location.href = `/jobs/${job.id}#apply`;
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                          >
                            Apply
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 border-gray-300 hover:bg-gray-50"
                            >
                              <Share2 className="h-4 w-4" />
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
                            <DropdownMenuItem
                              onClick={() => handleShare(job, "copy-job")}
                              className="cursor-pointer"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Job Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
          </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let page;
                    if (totalPages <= 7) {
                      page = i + 1;
                    } else if (currentPage <= 4) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      page = totalPages - 6 + i;
                    } else {
                      page = currentPage - 3 + i;
                    }
                    return page;
                  })
                  .filter((page, index, array) => {
                    // Remove duplicates
                    return array.indexOf(page) === index;
                  })
                  .map((page, index, array) => {
                    const showEllipsis = index > 0 && page - array[index - 1] > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && (
                          <span className="px-2 text-gray-500">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className={currentPage === page ? "bg-blue-600 text-white" : ""}
                        >
                          {page}
                        </Button>
                      </React.Fragment>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Page Info */}
            <div className="text-center text-sm text-white mt-4 mb-2">
              Showing {startIndex + 1} - {Math.min(endIndex, filteredJobs.length)} of {filteredJobs.length} jobs
            </div>
          </div>
        </>
      )}

      {/* Pagination Controls for Mobile */}
      {filteredJobs.length > 0 && totalPages > 1 && (
        <div className="md:hidden flex items-center justify-center gap-2 mt-6 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 text-xs"
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </Button>
          
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-600 px-2">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 text-xs"
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}

      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => {
          setIsSignInOpen(false);
        }}
        onSignUp={() => {
          setIsSignInOpen(false);
          setIsSignUpOpen(true);
        }}
      />

      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
      />
    </div>
  );
}

