"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BarChart3,
  DollarSign,
  Eye,
  Globe,
  LineChart,
  MessageSquare,
  TrendingUp,
  Users,
  Mail,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Activity,
  Clock,
  Calendar as CalendarIcon,
  Video,
  User,
  Copy,
  ClipboardList,
  CheckCircle2,
  Star,
  Download,
  Send,
  MousePointer,
  XCircle,
  Phone,
  GraduationCap,
  BookOpen,
  Calendar,
  Pencil,
  Briefcase,
  MapPin,
  Users as UsersIcon,
  Share2,
  Facebook,
  MessageCircle,
  Linkedin,
  Twitter,
} from "lucide-react";
import Link from "next/link";
import { AnimatedBorderCard } from "@/components/ui/animated-border-card";
import { motion } from "framer-motion";
import { DisplayCards } from "@/components/ui/display-cards";
import { useState, useEffect, useMemo } from "react";
import { Meteors } from "@/components/ui/meteors";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimatedText } from "@/components/ui/animated-text";
import { AnimatedEmail } from "@/components/ui/animated-email";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { MentorProfileCompletionForm } from "@/components/dashboard/mentor-profile-completion-form";
import { DashboardLayout } from "@/components/dashboard/layout";
import { ProfileCompletionSuccessModal } from "@/components/dashboard/profile-completion-success-modal";
import { MentorApplicationStatusPopup } from "@/components/dashboard/mentor-application-status-popup";
import { TutorApplicationModal } from "@/components/dashboard/tutor-application-modal";
import jsPDF from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { convertAndFormatPrice } from "@/lib/currency";
import { LoadingLogo } from "@/components/loading-logo";
import { fetchTutorPricing, findMatchingPricing } from "@/lib/tutor-pricing";
import {
  convertUSDToLocal,
  getCurrencyForCountry,
} from "@/lib/currency-exchange";
import { RoleSelectionModal } from "@/components/auth/role-selection-modal";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar-client";

const cardVariants = {
  hidden: {
    x: 0,
    y: 0,
    scale: 0.8,
    opacity: 0,
  },
  visible: (custom: number) => ({
    x: 0,
    y: 0,
    scale: 1,
    opacity: 1,
    transition: {
      delay: custom * 0.15,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const topPerformingAdSpaces = [
  {
    icon: <Globe className="size-4 text-green-400" />,
    title: "Tech Blog Premium Banner",
    description: "$4,200 revenue",
    date: "This month",
    iconClassName: "text-green-400",
    titleClassName: "text-green-400",
    className:
      "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    icon: <Users className="size-4 text-orange-400" />,
    title: "Newsletter Sponsorship",
    description: "$3,150 revenue",
    date: "This month",
    iconClassName: "text-orange-400",
    titleClassName: "text-orange-400",
    className:
      "[grid-area:stack] translate-x-12 translate-y-8 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    icon: <MessageSquare className="size-4 text-blue-300" />,
    title: "Podcast Ad Spot",
    description: "$2,800 revenue",
    date: "This month",
    iconClassName: "text-blue-300",
    titleClassName: "text-blue-300",
    className:
      "[grid-area:stack] translate-x-24 translate-y-16 hover:translate-y-8 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
];

// Helper functions for job cards
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

// Share job function
const handleShareJob = (job: any, platform: string) => {
  const jobUrl = `${window.location.origin}/jobs/${job.id}`;
  const shareText = encodeURIComponent(`Check out this job: ${job.title} at ${job.company_name || 'Company'}`);

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

export default function DashboardPage() {
  const [userData, setUserData] = useState<any>(null);
  const [mentorData, setMentorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileCompletionOpen, setIsProfileCompletionOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [isApplicationStatusOpen, setIsApplicationStatusOpen] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [googleUserData, setGoogleUserData] = useState<{
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  } | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 20;
  const [companyData, setCompanyData] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [convertedAmounts, setConvertedAmounts] = useState<
    Record<string, string>
  >({});
  const [currencyInfo, setCurrencyInfo] = useState<{
    symbol: string;
    code: string;
  }>({ symbol: "$", code: "USD" });
  const [adAccount, setAdAccount] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeData, setGradeData] = useState({
    score: "",
    feedback: "",
  });
  const [adClicks, setAdClicks] = useState<any[]>([]);
  const [adImpressions, setAdImpressions] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [tutorRequests, setTutorRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestPricing, setRequestPricing] = useState<
    Record<
      number,
      { hourlyRateUSD: number; hourlyRateLocal: string; currencySymbol: string }
    >
  >({});
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(
    null
  );
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [refreshJobsTrigger, setRefreshJobsTrigger] = useState(0);
  const router = useRouter();

  // Helper function to format revenue with currency
  const formatRevenue = (usdAmount: number): string => {
    // Determine which currency to use
    let currencyToUse: { symbol: string; rate: number };

    if (currencyInfo.symbol && currencyInfo.code !== "USD") {
      // Use currencyInfo state if it's not USD
      const countryCurrency = mentorData?.country
        ? getCurrencyForCountry(mentorData.country)
        : { symbol: currencyInfo.symbol, rate: 1 };
      currencyToUse = countryCurrency;
    } else if (mentorData?.country) {
      // Fallback to mentor's country
      currencyToUse = getCurrencyForCountry(mentorData.country);
    } else {
      // Default to USD
      currencyToUse = { symbol: "$", rate: 1 };
    }

    const convertedAmount = usdAmount * currencyToUse.rate;
    return `${currencyToUse.symbol}${convertedAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Calculate monthly revenue from paid sessions (memoized to recalculate when sessions change)
  const revenueData = useMemo(() => {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const currentDate = new Date();
    const currentMonthIndex = currentDate.getMonth();

    // Get last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonthIndex - i + 12) % 12;
      const year =
        currentDate.getFullYear() - (currentMonthIndex - i < 0 ? 1 : 0);
      months.push({
        month: monthNames[monthIndex],
        monthIndex: monthIndex,
        year: year,
        revenue: 0,
      });
    }

    // Calculate revenue for each month from paid sessions
    sessions
      .filter((s) => s.is_paid)
      .forEach((session) => {
        const sessionDate = new Date(session.date);
        const sessionMonth = sessionDate.getMonth();
        const sessionYear = sessionDate.getFullYear();

        const monthData = months.find(
          (m) => m.monthIndex === sessionMonth && m.year === sessionYear
        );

        if (monthData) {
          monthData.revenue += parseFloat(session.amount || 0);
        }
      });

    return months;
  }, [sessions]);

  const currentMonth = revenueData[revenueData.length - 1] || revenueData[0];
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Update selected month when revenueData changes
  useEffect(() => {
    if (
      currentMonth &&
      (!selectedMonth || selectedMonth.month !== currentMonth.month)
    ) {
      setSelectedMonth(currentMonth);
    }
  }, [revenueData, currentMonth, selectedMonth]);

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

        // Store auth user ID (UUID) for use in news posts
        setAuthUserId(user.id);

        const userEmail = user.email?.trim().toLowerCase();

        // Fetch mentor data - check by email first, then by user_id (UUID)
        // Note: id is BIGINT, not UUID, so we only match by user_id and email
        const { data: mentor, error: mentorError } = await supabase
          .from("mentors")
          .select("*")
          .or(
            userEmail
              ? `email.ilike.${userEmail},user_id.eq.${user.id}`
              : `user_id.eq.${user.id}`
          )
          .maybeSingle();

        console.log(
          "Dashboard: Checking mentor by email:",
          userEmail,
          "or ID:",
          user.id
        );
        console.log("Dashboard: Mentor query result:", { mentor, mentorError });

        if (mentorError || !mentor) {
          // Check if user exists in students table by email
          if (userEmail) {
            const { data: studentData } = await supabase
              .from("students")
              .select("id, email")
              .ilike("email", userEmail)
              .maybeSingle();

            console.log("Dashboard: Student query result:", { studentData });

            if (studentData) {
              // User is a student/applicant, redirect to applicant dashboard
              console.log(
                "Dashboard: User is a student/applicant, redirecting to applicant dashboard"
              );
              setLoading(false);
              router.push("/dashboard/applicant");
              return;
            }
          }

          // Check user metadata to see if they signed up as tutor/mentor/other
          const userType = user.user_metadata?.user_type;

          if (
            userType === "tutor" ||
            userType === "mentor" ||
            userType === "user"
          ) {
            // User signed up as tutor but mentor record doesn't exist yet
            // Create a basic mentor record - use user_id to link to Supabase Auth
            const { data: newMentor, error: createError } = await supabase
              .from("mentors")
              .insert({
                user_id: user.id,
                name:
                  user.user_metadata?.full_name ||
                  user.email?.split("@")[0] ||
                  "User",
                email: user.email || "",
                title: "",
                description: "",
                specialization: "[]",
                rating: 1.0,
                total_reviews: 0,
                hourly_rate: 0.0,
                avatar: user.user_metadata?.avatar_url || "",
                experience: 0,
                languages: "[]",
                availability: "Available now",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                phone_number: "",
                gender: "",
                age: null,
                country: "",
                latitude: null,
                longitude: null,
                sessions_conducted: 0,
                is_complete: false, // Set to false so profile completion popup shows
                qualifications: "",
                id_document: "",
                id_number: "",
                cv_document: "",
                payment_method: "",
                linkedin_profile: "",
                github_profile: "",
                twitter_profile: "",
                facebook_profile: "",
                instagram_profile: "",
                personal_website: "",
                bank_name: "",
                account_holder_name: "",
                account_number: "",
                routing_number: "",
                payment_account_details: "{}",
                payment_period: "per_session",
                is_complete: false,
                is_verified: false,
              })
              .select()
              .single();

            if (createError) {
              console.error("Error creating mentor record:", createError);
              setUserData({
                id: user.id,
                email: user.email || "",
                full_name:
                  user.user_metadata?.full_name ||
                  user.email?.split("@")[0] ||
                  "User",
                user_type: "mentor",
              });
            } else {
              setMentorData(newMentor);
              setUserData({
                ...newMentor,
                full_name: newMentor.name,
                user_type: "mentor",
                email: newMentor.email || user.email || "", // Always include email from auth user
              });
              console.log(
                "New mentor created - is_complete:",
                newMentor.is_complete
              );

              // Direct check - if incomplete, check for application progress
              const isIncomplete =
                newMentor.is_complete === false ||
                newMentor.is_complete === "false" ||
                String(newMentor.is_complete).toLowerCase() === "false" ||
                newMentor.is_complete === null ||
                newMentor.is_complete === undefined;

              if (isIncomplete) {
                // Check if application has been submitted
                const { data: progressData } = await supabase
                  .from("mentor_application_progress")
                  .select("id, application_submitted")
                  .eq("user_id", user.id)
                  .maybeSingle();

                if (progressData && progressData.application_submitted) {
                  console.log(
                    "New mentor - application submitted, showing status"
                  );
                  setTimeout(() => {
                    setIsApplicationStatusOpen(true);
                  }, 1000);
                } else {
                  console.log(
                    "New mentor - no application, showing profile completion"
                  );
                  setTimeout(() => {
                    setIsProfileCompletionOpen(true);
                  }, 1000);
                }
              }
            }
          } else {
            // User is not a mentor and not in students table
            // Check if they have an application in progress
            const { data: progressData } = await supabase
              .from("mentor_application_progress")
              .select("id, application_submitted, mentor_id")
              .eq("user_id", user.id)
              .maybeSingle();

            if (progressData && progressData.application_submitted) {
              // Application exists but mentor record might be missing - try to find mentor
              if (progressData.mentor_id) {
                const { data: mentorFromProgress } = await supabase
                  .from("mentors")
                  .select("*")
                  .eq("id", progressData.mentor_id)
                  .maybeSingle();

                if (mentorFromProgress) {
                  setMentorData(mentorFromProgress);
                  setUserData({
                    ...mentorFromProgress,
                    full_name: mentorFromProgress.name,
                    user_type: "mentor",
                    email: mentorFromProgress.email || user.email || "", // Always include email from auth user
                  });
                  setLoading(false);
                  setTimeout(() => {
                    setIsApplicationStatusOpen(true);
                  }, 500);
                  return;
                }
              }
            }

            // No application found, show role selection modal
            console.log(
              "Dashboard: User not found in mentors or students table, showing role selection modal"
            );
            setGoogleUserData({
              id: user.id,
              email: user.email || "",
              name: user.user_metadata?.name || user.user_metadata?.full_name,
              avatar:
                user.user_metadata?.avatar_url || user.user_metadata?.picture,
            });
            setLoading(false);
            setTimeout(() => {
              setShowRoleSelection(true);
            }, 500);
            return;
          }
        } else {
          setMentorData(mentor);
          setUserData({
            ...mentor,
            full_name: mentor.name,
            user_type: "mentor",
            email: mentor.email || user.email || "", // Always include email from auth user
          });

          // Also try to fetch company data
          const { data: company, error: companyError } = await supabase
            .from("companies")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!companyError && company) {
            setCompanyData(company);
          } else {
            // Use mentor as company fallback
            setCompanyData({
              id: mentor.id,
              company_name: mentor.name || mentor.company_name,
              name: mentor.name,
              user_id: mentor.user_id,
            });
          }

          console.log(
            "Mentor found - is_complete:",
            mentor.is_complete,
            "type:",
            typeof mentor.is_complete
          );

          // Direct check - if incomplete, check for application progress
          const isIncomplete =
            mentor.is_complete === false ||
            mentor.is_complete === "false" ||
            String(mentor.is_complete).toLowerCase() === "false" ||
            mentor.is_complete === null ||
            mentor.is_complete === undefined;

          if (isIncomplete) {
            // Check if application has been submitted
            const { data: progressData } = await supabase
              .from("mentor_application_progress")
              .select("id, application_submitted")
              .eq("user_id", user.id)
              .maybeSingle();

            if (progressData && progressData.application_submitted) {
              console.log("Application submitted - showing application status");
              // Show application status popup
              setTimeout(() => {
                setIsApplicationStatusOpen(true);
              }, 1000);
            } else {
              console.log(
                "No application submitted yet - showing profile completion"
              );
              // Show profile completion if no application submitted
              setTimeout(() => {
                setIsProfileCompletionOpen(true);
              }, 1000);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            setUserData({
              id: user.id,
              email: user.email || "",
              full_name:
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split("@")[0] ||
                "User",
            });
          } else {
            router.push("/");
          }
        } catch (authError) {
          console.error("Error getting user:", authError);
          router.push("/");
        }
      } finally {
        // Ensure loading is always set to false
        setLoading(false);
      }
    };

    fetchUserData();

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn("Loading timeout - setting loading to false");
      setLoading(false);
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure email is always set from auth user
  useEffect(() => {
    const ensureEmail = async () => {
      if (userData && !userData.email) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user?.email) {
            setUserData({ ...userData, email: user.email });
          }
        } catch (error) {
          console.error("Error fetching email:", error);
        }
      }
    };
    ensureEmail();
  }, [userData]);

  // Check profile completion after component mounts - but only if no application is in progress
  useEffect(() => {
    console.log("=== PROFILE COMPLETION CHECK ===");
    console.log("Loading:", loading);
    console.log("MentorData:", mentorData);
    console.log("UserData:", userData);
    
    if (!loading && mentorData && userData && userData.id) {
      console.log("is_complete value:", mentorData.is_complete);
      console.log("is_complete type:", typeof mentorData.is_complete);

      // Show popup if is_complete is NOT true (false, null, undefined, or "false")
      // is_complete will be true after completing the profile
      const isComplete = mentorData.is_complete === true || mentorData.is_complete === "true";
      
      console.log("Is complete?", isComplete);
      console.log("Current modal state:", isProfileCompletionOpen);

      if (!isComplete) {
        // Check if application has been submitted - if so, don't show profile completion
        const checkApplicationProgress = async () => {
          const { data: progressData } = await supabase
            .from("mentor_application_progress")
            .select("id, application_submitted")
            .eq("user_id", userData.id)
            .maybeSingle();

          console.log("Application progress data:", progressData);

          if (progressData && progressData.application_submitted) {
            console.log(
              "✅ Application submitted - showing application status instead"
            );
            // Application is in progress, show status popup (handled by other useEffect)
            setIsApplicationStatusOpen(true);
            setIsProfileCompletionOpen(false); // Ensure profile completion is closed
          } else {
            console.log("✅ Profile is incomplete - Opening modal in 500ms");
            // No application submitted, show profile completion
            const timer = setTimeout(() => {
              console.log("🚀 Setting modal to open NOW");
              setIsProfileCompletionOpen(true);
            }, 500);
            return () => clearTimeout(timer);
          }
        };

        checkApplicationProgress();
      } else {
        console.log("❌ Profile is complete, not opening modal");
      }
    } else {
      console.log("⚠️ Conditions not met for profile check:", {
        loading,
        hasMentorData: !!mentorData,
        hasUserData: !!userData,
        userId: userData?.id,
      });
    }
  }, [loading, mentorData, userData]);

  // Fetch sessions for the mentor
  useEffect(() => {
    const fetchSessions = async () => {
      if (!mentorData?.id || !userData?.id) return;

      try {
        setSessionsLoading(true);
        // Fetch sessions where this mentor is the mentor, including payment status
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("sessions")
          .select(
            `
            *,
            payments (
              id,
              status,
              payment_intent_id,
              paid_at
            )
          `
          )
          .eq("mentor_id", mentorData.id)
          .order("date", { ascending: false })
          .order("time", { ascending: false });

        if (sessionsError) {
          console.error("Error fetching sessions:", sessionsError);
          setSessions([]);
          return;
        }

        // Transform sessions to include payment status
        const transformedSessions = (sessionsData || []).map((session: any) => {
          const payment = Array.isArray(session.payments)
            ? session.payments[0]
            : session.payments;
          const isPaid =
            payment &&
            (payment.status === "succeeded" || payment.status === "completed");

          return {
            ...session,
            is_paid: isPaid,
            payment_status: payment?.status || "pending",
          };
        });

        setSessions(transformedSessions);
      } catch (error) {
        console.error("Error fetching sessions:", error);
        setSessions([]);
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchSessions();
  }, [mentorData?.id, userData?.id]);

  // Fetch jobs for the company/mentor
  useEffect(() => {
    const fetchJobs = async () => {
      if (!companyData?.id && !mentorData?.id) {
        console.log("⚠️ No company or mentor ID available for fetching jobs");
        return;
      }

      try {
        setJobsLoading(true);
        const companyId = companyData?.id;
        const mentorId = mentorData?.id;

        console.log("🔍 Fetching jobs with:", {
          companyId,
          mentorId,
          companyData: companyData?.id,
          mentorData: mentorData?.id,
        });

        // Try API first
        try {
          const apiCompanyId = companyId || mentorId;
          const response = await fetch(
            `http://127.0.0.1:8000/api/v1/jobs/list/?company_id=${apiCompanyId}`,
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
              console.log("✅ Jobs fetched from API:", data.jobs.length);
              setJobs(data.jobs);
              setJobsLoading(false);
              return;
            }
          }
        } catch (apiError) {
          console.log("API fetch failed, trying Supabase directly:", apiError);
        }

        // Fallback to Supabase - fetch jobs for this company OR mentor ID
        // This handles cases where:
        // 1. Jobs are posted with company_id = company ID
        // 2. Jobs are posted with company_id = mentor ID (when no company exists)
        let jobsData, jobsError;

        // Build array of IDs to search for (remove duplicates)
        const idsToSearch: number[] = [];
        if (companyId && !idsToSearch.includes(companyId))
          idsToSearch.push(companyId);
        if (mentorId && !idsToSearch.includes(mentorId))
          idsToSearch.push(mentorId);

        console.log("🔍 Searching for jobs with company_id in:", idsToSearch);
        console.log("📊 Company data:", { companyId, companyData });
        console.log("👤 Mentor data:", { mentorId, mentorData });

        if (idsToSearch.length === 0) {
          console.warn("⚠️ No IDs to search for jobs");
          // As a last resort, try fetching all jobs to see what's in the database
          const { data: allJobs } = await supabase
            .from("jobs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10);
          console.log(
            "📋 Sample of all jobs in database:",
            allJobs?.map((j: any) => ({
              id: j.id,
              title: j.title,
              company_id: j.company_id,
              created_at: j.created_at,
            }))
          );
          setJobs([]);
          setJobsLoading(false);
          return;
        }

        // Get current user ID for posted_by filtering
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        const currentUserId = authUser?.id || null;

        console.log("👤 Current user ID:", currentUserId);
        console.log("🔍 IDs to search:", idsToSearch);

        // Build query conditions: company_id OR posted_by
        const conditions: string[] = [];

        if (idsToSearch.length > 0) {
          const uniqueIds = [...new Set(idsToSearch)];
          if (uniqueIds.length === 1) {
            conditions.push(`company_id.eq.${uniqueIds[0]}`);
          } else {
            const companyIdConditions = uniqueIds
              .map((id) => `company_id.eq.${id}`)
              .join(",");
            conditions.push(`(${companyIdConditions})`);
          }
        }

        // Also include jobs posted by the current user (even if company_id is null)
        // Try to query by posted_by, but if column doesn't exist, fall back to company_id only
        if (currentUserId) {
          // First try with posted_by
          const conditionsWithPostedBy = [
            ...conditions,
            `posted_by.eq.${currentUserId}`,
          ];
          const orConditionWithPostedBy = conditionsWithPostedBy.join(",");

          console.log(
            "🔍 Trying query with posted_by:",
            orConditionWithPostedBy
          );
          const { data: dataWithPostedBy, error: errorWithPostedBy } =
            await supabase
              .from("jobs")
              .select("*")
              .or(orConditionWithPostedBy)
              .order("created_at", { ascending: false });

          // Check if error is due to missing column
          if (errorWithPostedBy) {
            console.warn(
              "⚠️ Error querying with posted_by (column may not exist):",
              errorWithPostedBy.message
            );
            // If column doesn't exist, fall back to company_id only
            if (
              errorWithPostedBy.message?.includes("column") ||
              errorWithPostedBy.message?.includes("does not exist")
            ) {
              console.log("📋 Falling back to company_id only query");
              if (conditions.length > 0) {
                const orCondition = conditions.join(",");
                console.log(
                  "🔍 Querying jobs with company_id only:",
                  orCondition
                );
                const { data, error } = await supabase
                  .from("jobs")
                  .select("*")
                  .or(orCondition)
                  .order("created_at", { ascending: false });
                jobsData = data;
                jobsError = error;
              } else {
                console.warn("⚠️ No company IDs to search for jobs");
                jobsData = [];
              }
            } else {
              // Other error, use it
              jobsData = dataWithPostedBy;
              jobsError = errorWithPostedBy;
            }
          } else {
            // Success with posted_by
            jobsData = dataWithPostedBy;
            jobsError = errorWithPostedBy;
          }
        } else {
          // No user ID, use company_id only
          if (conditions.length > 0) {
            const orCondition = conditions.join(",");
            console.log("🔍 Querying jobs with company_id only:", orCondition);
            const { data, error } = await supabase
              .from("jobs")
              .select("*")
              .or(orCondition)
              .order("created_at", { ascending: false });
            jobsData = data;
            jobsError = error;
          } else {
            console.warn("⚠️ No IDs or user ID to search for jobs");
            jobsData = [];
          }
        }

        // Also fetch jobs with null company_id (these might be the user's jobs created before fix)
        // Merge them with existing results
        if (currentUserId && !jobsError) {
          console.log("📋 Also checking for null company_id jobs...");
          const { data: nullCompanyJobs, error: nullError } = await supabase
            .from("jobs")
            .select("*")
            .is("company_id", null)
            .order("created_at", { ascending: false })
            .limit(50);

          if (!nullError && nullCompanyJobs && nullCompanyJobs.length > 0) {
            console.log(
              "📋 Found null company_id jobs:",
              nullCompanyJobs.length
            );
            // Merge with existing jobs and remove duplicates
            const allJobs = [...(jobsData || []), ...nullCompanyJobs];
            const uniqueJobs = allJobs.filter(
              (job: any, index: number, self: any[]) =>
                index === self.findIndex((j: any) => j.id === job.id)
            );
            jobsData = uniqueJobs;
            console.log("✅ Total jobs after merge:", jobsData.length);
          }
        }

        if (jobsError) {
          console.error("❌ Error fetching jobs:", jobsError);
          setJobs([]);
          return;
        }

        console.log(
          "✅ Jobs fetched from Supabase:",
          jobsData?.length || 0,
          "jobs"
        );
        console.log(
          "📋 Job details:",
          jobsData?.map((j: any) => ({
            id: j.id,
            company_id: j.company_id,
            posted_by: j.posted_by,
            company_name: j.company_name,
            title: j.title,
          }))
        );
        console.log("👤 Current user ID:", currentUserId);
        console.log("🔍 IDs searched:", idsToSearch);

        setJobs(jobsData || []);
      } catch (error) {
        console.error("❌ Error fetching jobs:", error);
        setJobs([]);
      } finally {
        setJobsLoading(false);
      }
    };

    fetchJobs();
  }, [companyData?.id, mentorData?.id, refreshJobsTrigger]);

  // Listen for job posted event to refresh jobs list
  useEffect(() => {
    const handleJobPosted = () => {
      console.log("🔄 Refreshing jobs list after job posted");
      // Small delay to ensure database has updated
      setTimeout(() => {
        setRefreshJobsTrigger((prev) => prev + 1);
      }, 300);
    };

    window.addEventListener("jobPosted", handleJobPosted);
    return () => window.removeEventListener("jobPosted", handleJobPosted);
  }, []);

  // Fetch tasks for grading
  useEffect(() => {
    const fetchTutorRequests = async () => {
      if (!mentorData?.id) return;

      try {
        setRequestsLoading(true);
        const { data, error } = await supabase
          .from("tutor_requests")
          .select("*")
          .in("status", ["pending", "accepted"])
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching tutor requests:", error);
          return;
        }

        const requests = data || [];
        setTutorRequests(requests);

        // Fetch pricing for all requests
        if (requests.length > 0) {
          const pricingData = await fetchTutorPricing();
          const pricingMap: Record<
            number,
            {
              hourlyRateUSD: number;
              hourlyRateLocal: string;
              currencySymbol: string;
            }
          > = {};

          for (const request of requests) {
            // Map grade_level to level
            let level = "Secondary"; // default
            if (request.grade_level) {
              const gradeLower = request.grade_level.toLowerCase();
              if (
                gradeLower.includes("primary") ||
                gradeLower.includes("elementary")
              ) {
                level = "Primary";
              } else if (
                gradeLower.includes("middle") ||
                gradeLower.includes("secondary")
              ) {
                level = "Secondary";
              } else if (
                gradeLower.includes("university") ||
                gradeLower.includes("college")
              ) {
                level = "University";
              } else if (gradeLower.includes("professional")) {
                level = "Professional";
              }
            }

            // Find matching pricing
            const matchedPricing = findMatchingPricing(
              pricingData,
              request.subject,
              level,
              undefined, // category
              request.grade_level // sub_level
            );

            let hourlyRateUSD = matchedPricing
              ? parseFloat(matchedPricing.hourly_rate_usd.toString())
              : 10.0;

            // Apply 25% discount for tutor requests
            const discountedRateUSD = hourlyRateUSD * 0.75;

            // Convert to local currency (using mentor's country or default to USD)
            const mentorCountry = mentorData?.country || "United States";
            const hourlyRateLocal = convertUSDToLocal(
              discountedRateUSD,
              mentorCountry
            );
            const currencyInfo = getCurrencyForCountry(mentorCountry);

            pricingMap[request.id] = {
              hourlyRateUSD: discountedRateUSD,
              hourlyRateLocal: `${currencyInfo.symbol}${hourlyRateLocal.toFixed(
                2
              )}`,
              currencySymbol: currencyInfo.symbol,
            };
          }

          setRequestPricing(pricingMap);
        }
      } catch (error) {
        console.error("Error fetching tutor requests:", error);
      } finally {
        setRequestsLoading(false);
      }
    };

    fetchTutorRequests();
  }, [mentorData?.id, mentorData?.country]);

  const handleAcceptRequest = async (requestId: number) => {
    if (processingRequestId === requestId) return; // Prevent double-click

    try {
      setProcessingRequestId(requestId);
      console.log("🟢 Accepting request:", requestId);
      console.log("🟢 Mentor ID:", mentorData?.id);

      if (!mentorData?.id) {
        toast.error("Mentor data not available. Please refresh the page.");
        setProcessingRequestId(null);
        return;
      }

      const { data, error } = await supabase
        .from("tutor_requests")
        .update({
          status: "accepted",
          accepted_by_mentor_id: mentorData.id,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select();

      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }

      console.log("✅ Update successful:", data);

      // Update the request status in local state instead of removing it
      setTutorRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? {
                ...req,
                status: "accepted",
                accepted_by_mentor_id: mentorData.id,
                accepted_at: new Date().toISOString(),
              }
            : req
        )
      );

      toast.success(
        "Request accepted successfully! The student will be notified."
      );
    } catch (error: any) {
      console.error("❌ Error accepting request:", error);
      const errorMessage =
        error?.message || "Failed to accept request. Please try again.";
      toast.error(errorMessage);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    if (processingRequestId === requestId) return; // Prevent double-click

    try {
      setProcessingRequestId(requestId);
      console.log("🔴 Rejecting request:", requestId);

      const { data, error } = await supabase
        .from("tutor_requests")
        .update({
          status: "rejected",
        })
        .eq("id", requestId)
        .select();

      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }

      console.log("✅ Rejection successful:", data);

      // Remove rejected request from pending list (only show pending requests)
      setTutorRequests(tutorRequests.filter((req) => req.id !== requestId));

      toast.success("Request rejected");
    } catch (error: any) {
      console.error("❌ Error rejecting request:", error);
      const errorMessage =
        error?.message || "Failed to reject request. Please try again.";
      toast.error(errorMessage);
    } finally {
      setProcessingRequestId(null);
    }
  };

  useEffect(() => {
    const fetchTasks = async () => {
      if (!mentorData?.id) return;

      try {
        setTasksLoading(true);
        const { data, error } = await supabase
          .from("tasks")
          .select(
            `
            *,
            session:sessions (
              topic,
              date,
              time
            ),
            learner:users!tasks_learner_id_fkey (
              email,
              full_name
            )
          `
          )
          .eq("mentor_id", mentorData.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTasks(data || []);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setTasksLoading(false);
      }
    };

    fetchTasks();
  }, [mentorData?.id]);

  // Fetch ad account data for reports
  useEffect(() => {
    const fetchAdData = async () => {
      if (!mentorData?.id) return;

      try {
        // Fetch ad account
        const accountResponse = await fetch(
          `http://127.0.0.1:8000/api/v1/mentors/ads/account/${mentorData.id}/`
        );
        const accountData = await accountResponse.json();
        if (accountData.success && accountData.account) {
          setAdAccount(accountData.account);
        }

        // Fetch campaigns
        const campaignsResponse = await fetch(
          `http://127.0.0.1:8000/api/v1/mentors/ads/campaigns/${mentorData.id}/`
        );
        const campaignsData = await campaignsResponse.json();
        if (campaignsData.success && campaignsData.campaigns) {
          setCampaigns(campaignsData.campaigns);
        }

        // Fetch transactions
        const transactionsResponse = await fetch(
          `http://127.0.0.1:8000/api/v1/mentors/ads/transactions/${mentorData.id}/`
        );
        const transactionsData = await transactionsResponse.json();
        if (transactionsData.success && transactionsData.transactions) {
          setTransactions(transactionsData.transactions);
        }
      } catch (error) {
        console.error("Error fetching ad data:", error);
      }
    };

    fetchAdData();
  }, [mentorData?.id]);

  // Initialize currency from mentor's country if available
  useEffect(() => {
    if (mentorData?.country && !userLocation) {
      const currencyInfo = getCurrencyForCountry(mentorData.country);
      setCurrencyInfo({ symbol: currencyInfo.symbol, code: currencyInfo.code });
    }
  }, [mentorData?.country, userLocation]);

  // Auto-detect user location on page load for currency conversion
  // DISABLED: Removed automatic location request to prevent permission popup
  // Location will only be requested when user explicitly clicks a button
  useEffect(() => {
    // Use mentor's country for currency if available, without requesting location
    if (mentorData?.country && !userLocation) {
      const currencyInfo = getCurrencyForCountry(mentorData.country);
      setCurrencyInfo({
        symbol: currencyInfo.symbol,
        code: currencyInfo.code,
      });
    }
  }, [mentorData?.country]);

  // Convert all session amounts when sessions or user location changes
  useEffect(() => {
    const convertAllAmounts = async () => {
      if (sessions.length === 0) {
        setConvertedAmounts({});
        return;
      }

      const conversions: Record<string, string> = {};

      for (const session of sessions) {
        try {
          // Assume amount in database is in USD
          const usdAmount = parseFloat(session.amount || 0);
          if (usdAmount === 0) {
            conversions[session.id] = "$0.00";
            continue;
          }

          // Try to use user location first, then fallback to mentor's country
          let locationToUse = userLocation;

          // If no user location but mentor has country, try to use mentor's country
          if (!locationToUse && mentorData?.country) {
            const countryLower = mentorData.country.toLowerCase();
            // Map common country names to approximate coordinates for currency conversion
            if (
              countryLower.includes("south africa") ||
              countryLower.includes("southafrica") ||
              countryLower === "za"
            ) {
              locationToUse = { lat: -25.7479, lng: 28.2293 }; // Pretoria, South Africa
            } else if (
              countryLower.includes("united states") ||
              countryLower.includes("usa") ||
              countryLower === "us"
            ) {
              locationToUse = { lat: 40.7128, lng: -74.006 }; // New York, USA
            } else if (
              countryLower.includes("united kingdom") ||
              countryLower.includes("uk") ||
              countryLower === "gb"
            ) {
              locationToUse = { lat: 51.5074, lng: -0.1278 }; // London, UK
            } else if (
              countryLower.includes("canada") ||
              countryLower === "ca"
            ) {
              locationToUse = { lat: 45.5017, lng: -73.5673 }; // Montreal, Canada
            } else if (
              countryLower.includes("australia") ||
              countryLower === "au"
            ) {
              locationToUse = { lat: -33.8688, lng: 151.2093 }; // Sydney, Australia
            } else if (
              countryLower.includes("india") ||
              countryLower === "in"
            ) {
              locationToUse = { lat: 28.6139, lng: 77.209 }; // New Delhi, India
            } else if (
              countryLower.includes("nigeria") ||
              countryLower === "ng"
            ) {
              locationToUse = { lat: 6.5244, lng: 3.3792 }; // Lagos, Nigeria
            } else if (
              countryLower.includes("kenya") ||
              countryLower === "ke"
            ) {
              locationToUse = { lat: -1.2921, lng: 36.8219 }; // Nairobi, Kenya
            } else if (
              countryLower.includes("ghana") ||
              countryLower === "gh"
            ) {
              locationToUse = { lat: 5.6037, lng: -0.187 }; // Accra, Ghana
            }
          }

          if (locationToUse) {
            const result = await convertAndFormatPrice(
              usdAmount,
              locationToUse
            );
            conversions[session.id] = result.formatted;
          } else {
            // No location, use USD
            conversions[session.id] = `$${usdAmount.toFixed(2)}`;
          }
        } catch (error) {
          console.error(
            `Error converting currency for session ${session.id}:`,
            error
          );
          // Fallback to USD
          conversions[session.id] = `$${parseFloat(session.amount || 0).toFixed(
            2
          )}`;
        }
      }

      setConvertedAmounts(conversions);
    };

    convertAllAmounts();

    // Also convert total revenue for display (always convert, even if 0)
    const totalRevenue = sessions
      .filter((s) => s.is_paid)
      .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);

    // Determine location to use: userLocation first, then mentor's country
    if (userLocation) {
      convertAndFormatPrice(totalRevenue, userLocation)
        .then((result) => {
          setCurrencyInfo({ symbol: result.symbol, code: result.currency });
          setConvertedAmounts((prev) => ({
            ...prev,
            total: result.formatted,
          }));
        })
        .catch(() => {
          // Fallback to mentor's country or USD
          if (mentorData?.country) {
            const currencyInfo = getCurrencyForCountry(mentorData.country);
            setCurrencyInfo({
              symbol: currencyInfo.symbol,
              code: currencyInfo.code,
            });
            const convertedTotal = totalRevenue * currencyInfo.rate;
            setConvertedAmounts((prev) => ({
              ...prev,
              total: `${currencyInfo.symbol}${convertedTotal.toFixed(2)}`,
            }));
          } else {
            setConvertedAmounts((prev) => ({
              ...prev,
              total: `$${totalRevenue.toFixed(2)}`,
            }));
          }
        });
    } else if (mentorData?.country) {
      // Use mentor's country for currency conversion
      const currencyInfo = getCurrencyForCountry(mentorData.country);
      setCurrencyInfo({ symbol: currencyInfo.symbol, code: currencyInfo.code });
      const convertedTotal = totalRevenue * currencyInfo.rate;
      setConvertedAmounts((prev) => ({
        ...prev,
        total: `${currencyInfo.symbol}${convertedTotal.toFixed(2)}`,
      }));
    } else {
      // No location available, use USD
      setConvertedAmounts((prev) => ({
        ...prev,
        total: `$${totalRevenue.toFixed(2)}`,
      }));
    }
  }, [sessions, userLocation, mentorData?.country]);

  // Helper function to load logo image
  const loadLogoImage = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          } else {
            reject(new Error("Could not get canvas context"));
          }
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = "/images/logo1.png";
    });
  };

  // Generate Monthly Revenue Report PDF
  const generateMonthlyRevenueReport = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // Load and add logo
    try {
      const imgData = await loadLogoImage();
      doc.addImage(imgData, "PNG", margin, yPos, 50, 15);
      yPos += 20;
    } catch (error) {
      console.error("Error loading logo:", error);
      yPos += 20;
    }

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Monthly Revenue Report", pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 10;

    const currentDate = new Date();
    const monthName = currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(monthName, pageWidth / 2, yPos, { align: "center" });
    yPos += 20;

    // Revenue Summary
    const totalRevenue = adAccount?.lifetime_spent || 0;
    const currentBalance = adAccount?.balance || 0;
    const totalSpent = parseFloat(totalRevenue.toString());

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Revenue Summary", margin, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Lifetime Spent: $${totalSpent.toFixed(2)}`, margin, yPos);
    yPos += 8;
    doc.text(
      `Current Account Balance: $${parseFloat(
        currentBalance.toString()
      ).toFixed(2)}`,
      margin,
      yPos
    );
    yPos += 8;
    doc.text(
      `Active Campaigns: ${
        campaigns.filter((c: any) => c.status === "active").length
      }`,
      margin,
      yPos
    );
    yPos += 15;

    // Recent Transactions
    if (transactions.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Recent Transactions", margin, yPos);
      yPos += 10;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const recentTransactions = transactions.slice(0, 10);
      recentTransactions.forEach((tx: any) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = margin;
        }
        const date = new Date(tx.created_at).toLocaleDateString();
        const amount = parseFloat(tx.amount.toString());
        doc.text(
          `${date} - ${tx.type}: $${amount.toFixed(2)}`,
          margin + 5,
          yPos
        );
        yPos += 6;
      });
    }

    doc.save(`Monthly_Revenue_Report_${monthName.replace(" ", "_")}.pdf`);
  };

  // Generate Ad Performance Summary PDF
  const generateAdPerformanceReport = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // Load and add logo
    try {
      const imgData = await loadLogoImage();
      doc.addImage(imgData, "PNG", margin, yPos, 50, 15);
      yPos += 20;
    } catch (error) {
      console.error("Error loading logo:", error);
      yPos += 20;
    }

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Ad Performance Summary", pageWidth / 2, yPos, {
      align: "center",
    });
    yPos += 10;

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Last 30 Days (${last30Days.toLocaleDateString()} - ${new Date().toLocaleDateString()})`,
      pageWidth / 2,
      yPos,
      { align: "center" }
    );
    yPos += 20;

    // Campaign Performance
    if (campaigns.length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Campaign Performance", margin, yPos);
      yPos += 10;

      campaigns.forEach((campaign: any) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = margin;
        }
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(campaign.name || "Unnamed Campaign", margin, yPos);
        yPos += 7;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Status: ${campaign.status}`, margin + 5, yPos);
        yPos += 5;
        doc.text(
          `Total Clicks: ${campaign.total_clicks || 0}`,
          margin + 5,
          yPos
        );
        yPos += 5;
        doc.text(
          `Total Impressions: ${campaign.total_impressions || 0}`,
          margin + 5,
          yPos
        );
        yPos += 5;
        doc.text(
          `Total Spent: $${parseFloat(
            (campaign.total_spent || 0).toString()
          ).toFixed(2)}`,
          margin + 5,
          yPos
        );
        yPos += 5;
        const ctr =
          campaign.total_impressions > 0
            ? (
                ((campaign.total_clicks || 0) / campaign.total_impressions) *
                100
              ).toFixed(2)
            : "0.00";
        doc.text(`CTR: ${ctr}%`, margin + 5, yPos);
        yPos += 10;
      });
    } else {
      doc.setFontSize(11);
      doc.text("No campaigns found", margin, yPos);
    }

    doc.save(
      `Ad_Performance_Summary_${new Date().toISOString().split("T")[0]}.pdf`
    );
  };

  // Generate Audience Demographics Report PDF
  const generateAudienceDemographicsReport = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // Load and add logo
    try {
      const imgData = await loadLogoImage();
      doc.addImage(imgData, "PNG", margin, yPos, 50, 15);
      yPos += 20;
    } catch (error) {
      console.error("Error loading logo:", error);
      yPos += 20;
    }

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Audience Demographics", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    const quarter = Math.floor((new Date().getMonth() + 3) / 3);
    const year = new Date().getFullYear();
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Q${quarter} ${year}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 20;

    // Aggregate data from campaigns
    const totalClicks = campaigns.reduce(
      (sum: number, c: any) => sum + (c.total_clicks || 0),
      0
    );
    const totalImpressions = campaigns.reduce(
      (sum: number, c: any) => sum + (c.total_impressions || 0),
      0
    );

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Overall Statistics", margin, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Clicks: ${totalClicks}`, margin, yPos);
    yPos += 8;
    doc.text(`Total Impressions: ${totalImpressions}`, margin, yPos);
    yPos += 8;
    const overallCTR =
      totalImpressions > 0
        ? ((totalClicks / totalImpressions) * 100).toFixed(2)
        : "0.00";
    doc.text(`Overall CTR: ${overallCTR}%`, margin, yPos);
    yPos += 15;

    doc.setFontSize(11);
    doc.text(
      "Note: Detailed geographic and demographic data is collected",
      margin,
      yPos
    );
    yPos += 6;
    doc.text(
      "through campaign analytics and can be viewed in the Analytics section.",
      margin,
      yPos
    );

    doc.save(`Audience_Demographics_Q${quarter}_${year}.pdf`);
  };

  const stats = [
    {
      title: "Total Revenue",
      value: "$12,543",
      change: "+18% from last month",
      icon: DollarSign,
    },
    {
      title: "Active Ad Spaces",
      value: "8",
      change: "+2 new this month",
      icon: Globe,
    },
    {
      title: "Pending Requests",
      value: "5",
      change: "3 new since yesterday",
      icon: MessageSquare,
    },
    {
      title: "Total Impressions",
      value: "1.2M",
      change: "+12% from last month",
      icon: Eye,
    },
  ];

  const getGrowthPercentage = (currentMonth: (typeof revenueData)[0]) => {
    const currentIndex = revenueData.findIndex(
      (data) => data.month === currentMonth.month
    );
    if (currentIndex <= 0) return 0;
    return Math.round(
      ((currentMonth.revenue - revenueData[currentIndex - 1].revenue) /
        revenueData[currentIndex - 1].revenue) *
        100
    );
  };

  const getTotalRevenue = () =>
    revenueData.reduce((acc, curr) => acc + curr.revenue, 0);

  if (loading) {
    return (
      <DashboardLayout role="mentor">
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <LoadingLogo size={48} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="mentor">
      <div className="space-y-3 md:space-y-6 p-3 md:p-6">
        <div>
          <h2 className="text-lg md:text-2xl font-bold text-gray-900">
            Dashboard
          </h2>
          <p className="text-xs md:text-base text-gray-600 mt-1">
            Welcome back! Here's an overview of your jobs and advertising.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-3 md:gap-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 flex-1 w-full md:w-auto">
            <Card className="bg-white border rounded-xl p-3 md:p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-gray-600">
                  Posted Jobs
                </CardTitle>
                <Briefcase className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-gray-900">
                  {jobs.filter((j) => j.status === "open").length}
                </div>
                <p className="text-[10px] md:text-xs text-gray-600">
                  Open positions
                </p>
              </CardContent>
            </Card>
            <Card className="bg-white border rounded-xl p-3 md:p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-gray-600">
                  Views
                </CardTitle>
                <Eye className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-gray-900">
                  {jobs.reduce(
                    (sum: number, j: any) => sum + (j.total_views || 0),
                    0
                  )}
                </div>
                <p className="text-[10px] md:text-xs text-gray-600">
                  {jobs.length} {jobs.length === 1 ? "job" : "jobs"} posted
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="jobs" className="space-y-2 md:space-y-4">
          <TabsList
            className={`border-2 border-blue-500/50 bg-transparent h-7 md:h-9 ${(() => {
              const email = userData?.email?.trim().toLowerCase();
              return email === "clintonkhozah@gmail.com"
                ? "w-full md:w-[400px] grid grid-cols-2"
                : "w-full md:w-[200px] grid grid-cols-1";
            })()} rounded-none p-0.5 md:p-1 shadow-[inset_0_0_35px_rgba(59,130,246,0.3)]`}
          >
            <TabsTrigger
              value="jobs"
              className="ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border data-[state=active]:border-orange-500 data-[state=active]:rounded-none data-[state=active]:shadow-[inset_0_0_30px_rgba(34,197,94,0.5)] data-[state=active]:text-white data-[state=active]:bg-transparent hover:bg-transparent px-2 py-[2px] text-xs md:text-sm"
            >
              My Jobs
            </TabsTrigger>
            {(() => {
              const email = userData?.email?.trim().toLowerCase();
              return (
                email === "clintonkhozah@gmail.com" && (
                  <TabsTrigger
                    value="analytics"
                    className="ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border data-[state=active]:border-orange-500 data-[state=active]:rounded-none data-[state=active]:shadow-[inset_0_0_30px_rgba(34,197,94,0.5)] data-[state=active]:text-white data-[state=active]:bg-transparent hover:bg-transparent px-2 py-[2px] text-xs md:text-sm"
                  >
                    Analytics
                  </TabsTrigger>
                )
              );
            })()}
          </TabsList>
          {(() => {
            const email = userData?.email?.trim().toLowerCase();
            return (
              email === "clintonkhozah@gmail.com" && (
                <TabsContent value="analytics" className="space-y-4">
                  <Card className="bg-white border rounded-xl shadow-sm">
                    <CardContent>
                      <div className="space-y-6">
                        <div className="text-center py-12">
                          <BarChart3 className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Google Analytics Dashboard
                          </h3>
                          <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            Access your comprehensive website analytics,
                            including visitor statistics, traffic sources, user
                            behavior, and conversion metrics.
                          </p>
                          <Button
                            onClick={() => {
                              window.open(
                                "https://analytics.google.com/analytics/web/",
                                "_blank"
                              );
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Open Google Analytics
                          </Button>
                        </div>
                        <div className="border-t pt-6">
                          <h4 className="text-sm font-semibold text-gray-700 mb-4">
                            Quick Stats
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-900">
                                {jobs.reduce(
                                  (sum: number, j: any) =>
                                    sum + (j.total_views || 0),
                                  0
                                )}
                              </div>
                              <div className="text-sm text-blue-700 mt-1">
                                Total Job Views
                              </div>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-900">
                                {jobs.reduce(
                                  (sum: number, j: any) =>
                                    sum + (j.total_applications || 0),
                                  0
                                )}
                              </div>
                              <div className="text-sm text-green-700 mt-1">
                                Total Applications
                              </div>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg">
                              <div className="text-2xl font-bold text-purple-900">
                                {jobs.length}
                              </div>
                              <div className="text-sm text-purple-700 mt-1">
                                Jobs Posted
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )
            );
          })()}
          <TabsContent value="jobs" className="space-y-2 md:space-y-4">
            <Card className="bg-white border rounded-xl shadow-sm">
              <CardHeader className="p-3 md:p-6">
                <div>
                  <CardTitle className="text-base md:text-lg text-gray-900">
                    My Jobs
                  </CardTitle>
                  <CardDescription className="text-xs md:text-sm text-gray-600">
                    View and manage your posted jobs, learnerships, internships,
                    and bursaries
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                {jobsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingLogo size={32} />
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No jobs posted yet</p>
                    <Button
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("openCreateJobModal")
                        );
                      }}
                    >
                      Post a Job
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                      {jobs
                        .slice(
                          (currentPage - 1) * jobsPerPage,
                          currentPage * jobsPerPage
                        )
                        .map((job) => {
                          const getJobTypeColor = (type: string) => {
                            switch (type) {
                              case "job":
                                return "bg-blue-100 text-blue-700 border-blue-200";
                              case "learnership":
                                return "bg-purple-100 text-purple-700 border-purple-200";
                              case "internship":
                                return "bg-green-100 text-green-700 border-green-200";
                              case "bursary":
                                return "bg-orange-100 text-orange-700 border-orange-200";
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

                          return (
                            <motion.div
                              key={job.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex-shrink-0"
                            >
                              <Card className="min-h-[400px] md:min-h-[550px] bg-gradient-to-br from-blue-50 via-white to-blue-50 border-2 border-blue-200 shadow-sm hover:shadow-xl transition-all flex flex-col rounded-xl relative overflow-hidden">
                                <CardContent className="p-3 md:p-6 flex flex-col flex-grow relative">
                                  {/* Blue accent bar */}
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 0.6, delay: 0.2 }}
                                    className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500"
                                  />

                                  <div className="flex items-start gap-2 md:gap-4 mb-2 md:mb-4">
                                    <div className="relative flex-shrink-0">
                                      <Avatar className="h-10 w-10 md:h-16 md:w-16 border-2 border-blue-400 shadow-lg shadow-blue-200">
                                        <AvatarImage
                                          src={job.company_logo}
                                          alt={
                                            job.company_name ||
                                            companyData?.company_name ||
                                            "Company"
                                          }
                                          className="object-cover"
                                        />
                                        <AvatarFallback className="bg-gray-100 text-gray-600 text-sm font-semibold">
                                          {job.company_name ||
                                          companyData?.company_name
                                            ? (
                                                job.company_name ||
                                                companyData?.company_name
                                              )
                                                .split(" ")
                                                .map((n: string) => n[0])
                                                .join("")
                                                .slice(0, 2)
                                                .toUpperCase()
                                            : "C"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2 flex-wrap">
                                        <h3 className="text-sm md:text-xl font-bold text-blue-900 line-clamp-1">
                                          {job.title}
                                        </h3>
                                        {job.is_featured && (
                                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 px-2 md:px-3 py-0.5 md:py-1.5 rounded-full text-[10px] md:text-xs font-semibold border shadow-sm">
                                            Featured
                                          </Badge>
                                        )}
                                      </div>
                                      {(job.company_name ||
                                        companyData?.company_name) && (
                                        <p className="text-xs md:text-sm font-semibold text-blue-800 mb-0.5 md:mb-1">
                                          {job.company_name ||
                                            companyData?.company_name}
                                        </p>
                                      )}
                                      {job.created_at && (
                                        <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">
                                          Posted{" "}
                                          {getRelativeTime(job.created_at)}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mb-2 md:mb-4 flex-grow">
                                    <p className="text-gray-700 text-xs md:text-sm mb-2 md:mb-3 text-left line-clamp-2 leading-snug">
                                      {job.description}
                                    </p>

                                    {/* Job Details in Blue Gradient Box */}
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2 md:p-3.5 text-xs md:text-sm text-gray-700 mb-2 md:mb-3 w-full space-y-1.5 md:space-y-2 border border-blue-200">
                                      <div className="flex items-center gap-1.5 md:gap-2">
                                        <MapPin className="h-3 w-3 md:h-4 md:w-4 text-blue-600 flex-shrink-0" />
                                        <div>
                                          <span className="font-semibold text-gray-900 text-[10px] md:text-sm">
                                            Location:{" "}
                                          </span>
                                          <span className="text-[10px] md:text-sm">
                                            {job.location}
                                          </span>
                                        </div>
                                      </div>
                                      {job.application_deadline && (
                                        <div className="flex items-start gap-1.5 md:gap-2">
                                          <CalendarIcon className="h-3 w-3 md:h-4 md:w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                          <div className="flex-1 leading-tight">
                                            <span className="font-semibold text-gray-900 text-[10px] md:text-sm">
                                              Deadline:{" "}
                                            </span>
                                            <span className="text-[10px] md:text-sm">
                                              {new Date(
                                                job.application_deadline
                                              ).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                              })}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                      {job.duration && (
                                        <div className="flex items-center gap-1.5 md:gap-2">
                                          <Clock className="h-3 w-3 md:h-4 md:w-4 text-blue-600 flex-shrink-0" />
                                          <div>
                                            <span className="font-semibold text-gray-900 text-[10px] md:text-sm">
                                              Duration:{" "}
                                            </span>
                                            <span className="text-[10px] md:text-sm">
                                              {job.duration}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1 md:gap-1.5 mb-2 md:mb-3">
                                      <Badge
                                        className={`${getJobTypeColor(
                                          job.job_type
                                        )} px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs font-medium border`}
                                      >
                                        {getJobTypeIcon(job.job_type)}
                                        <span className="ml-0.5 md:ml-1 capitalize">
                                          {job.job_type}
                                        </span>
                                      </Badge>
                                      <Badge
                                        variant="secondary"
                                        className="bg-blue-100 text-blue-700 border border-blue-300 px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs font-medium"
                                      >
                                        {job.category}
                                      </Badge>
                                      {job.experience_level && (
                                        <Badge
                                          variant="secondary"
                                          className="bg-purple-100 text-purple-700 border border-purple-300 px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs font-medium"
                                        >
                                          {job.experience_level}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Salary at bottom */}
                                  <div className="mt-auto pt-2 md:pt-4 border-t border-blue-200">
                                    <div className="flex items-center justify-between mb-2 md:mb-3">
                                      <div className="text-right flex-1">
                                        <div className="text-lg md:text-2xl font-bold text-gray-900">
                                          {formatSalary(job)}
                                        </div>
                                        <div className="text-[10px] md:text-xs text-gray-600">
                                          SALARY
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Stats */}
                                  <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs text-gray-600 mb-2 md:mb-3">
                                    <div className="flex items-center gap-0.5 md:gap-1">
                                      <Eye className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                      <span>{job.total_views || 0} views</span>
                                    </div>
                                    <div className="flex items-center gap-0.5 md:gap-1">
                                      <UsersIcon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                                      <span>
                                        {job.total_applications || 0}{" "}
                                        applications
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex gap-1.5 md:gap-2 mt-2 md:mt-3">
                                    <Button
                                      onClick={() => {
                                        window.location.href = `/jobs/${job.id}`;
                                      }}
                                      variant="outline"
                                      className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50 text-xs md:text-sm px-2 md:px-4 py-1 md:py-2 h-7 md:h-10"
                                    >
                                      View More
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        window.location.href = `/jobs/${job.id}#apply`;
                                      }}
                                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all text-xs md:text-sm px-2 md:px-4 py-1 md:py-2 h-7 md:h-10"
                                    >
                                      Apply
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-7 md:h-10 w-7 md:w-10 border-gray-300 hover:bg-gray-50"
                                        >
                                          <Share2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem
                                          onClick={() => handleShareJob(job, "facebook")}
                                          className="cursor-pointer"
                                        >
                                          <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                                          Facebook
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleShareJob(job, "whatsapp")}
                                          className="cursor-pointer"
                                        >
                                          <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                                          WhatsApp
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleShareJob(job, "linkedin")}
                                          className="cursor-pointer"
                                        >
                                          <Linkedin className="h-4 w-4 mr-2 text-blue-700" />
                                          LinkedIn
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleShareJob(job, "twitter")}
                                          className="cursor-pointer"
                                        >
                                          <Twitter className="h-4 w-4 mr-2 text-blue-400" />
                                          Twitter
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleShareJob(job, "copy")}
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
                          );
                        })}
                    </div>

                    {/* Pagination Controls */}
                    {jobs.length > jobsPerPage && (
                      <div className="flex items-center justify-center gap-2 mt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={currentPage === 1}
                          className="flex items-center gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: Math.ceil(jobs.length / jobsPerPage) },
                            (_, i) => i + 1
                          )
                            .filter((page) => {
                              // Show first page, last page, current page, and pages around current
                              if (
                                page === 1 ||
                                page === Math.ceil(jobs.length / jobsPerPage)
                              )
                                return true;
                              if (Math.abs(page - currentPage) <= 1)
                                return true;
                              return false;
                            })
                            .map((page, index, array) => {
                              // Add ellipsis if there's a gap
                              const showEllipsis =
                                index > 0 && page - array[index - 1] > 1;
                              return (
                                <div
                                  key={page}
                                  className="flex items-center gap-1"
                                >
                                  {showEllipsis && (
                                    <span className="px-2 text-gray-500">
                                      ...
                                    </span>
                                  )}
                                  <Button
                                    variant={
                                      currentPage === page
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                    className={
                                      currentPage === page
                                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                                        : ""
                                    }
                                  >
                                    {page}
                                  </Button>
                                </div>
                              );
                            })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(
                                Math.ceil(jobs.length / jobsPerPage),
                                prev + 1
                              )
                            )
                          }
                          disabled={
                            currentPage === Math.ceil(jobs.length / jobsPerPage)
                          }
                          className="flex items-center gap-1"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Page Info */}
                    {jobs.length > jobsPerPage && (
                      <div className="text-center text-sm text-gray-600 mt-4">
                        Showing {(currentPage - 1) * jobsPerPage + 1} to{" "}
                        {Math.min(currentPage * jobsPerPage, jobs.length)} of{" "}
                        {jobs.length} jobs
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Mentor Profile Completion Form - Only show if application status is not open */}
        {userData && userData.id && !isApplicationStatusOpen && (
          <MentorProfileCompletionForm
            isOpen={isProfileCompletionOpen}
            onClose={() => {
              console.log("Closing profile completion modal");
              setIsProfileCompletionOpen(false);
            }}
            userId={userData.id}
            onComplete={async () => {
              console.log("Profile completion finished");
              setIsProfileCompletionOpen(false);
              // Check if application has been submitted
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (user) {
                const { data: progressData } = await supabase
                  .from("mentor_application_progress")
                  .select("id, application_submitted")
                  .eq("user_id", user.id)
                  .maybeSingle();

                if (progressData && progressData.application_submitted) {
                  // Application already submitted, show status popup
                  setIsApplicationStatusOpen(true);
                } else {
                  // No application submitted, show success modal
                  setIsSuccessModalOpen(true);
                }
              }
              // Refresh user data
              const fetchUserData = async () => {
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (user) {
                  const { data: mentor } = await supabase
                    .from("mentors")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();
                  if (mentor) {
                    setMentorData(mentor);
                    setUserData({
                      ...mentor,
                      full_name: mentor.name,
                      user_type: "mentor",
                      email: mentor.email || user.email || "", // Always include email from auth user
                    });
                  }
                }
              };
              fetchUserData();
            }}
          />
        )}
        <ProfileCompletionSuccessModal
          isOpen={isSuccessModalOpen}
          onClose={() => setIsSuccessModalOpen(false)}
          onContinue={async () => {
            setIsSuccessModalOpen(false);
            // Check if application has already been submitted
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              const { data: progressData } = await supabase
                .from("mentor_application_progress")
                .select("id, application_submitted")
                .eq("user_id", user.id)
                .maybeSingle();

              if (progressData && progressData.application_submitted) {
                // Application already submitted, show status popup
                setIsApplicationStatusOpen(true);
              } else {
                // No application submitted, show application form
                setIsApplicationModalOpen(true);
              }
            } else {
              setIsApplicationModalOpen(true);
            }
          }}
        />
        <TutorApplicationModal
          isOpen={isApplicationModalOpen}
          onClose={() => setIsApplicationModalOpen(false)}
          userEmail={userData?.email || ""}
          userName={userData?.full_name || userData?.name || ""}
          onComplete={() => {
            setIsApplicationModalOpen(false);
            // Show application status popup after submission
            setTimeout(() => {
              setIsApplicationStatusOpen(true);
            }, 500);
          }}
        />
        {/* Application Status Popup - Shows when is_complete is FALSE */}
        {mentorData &&
          (mentorData.is_complete === false ||
            mentorData.is_complete === "false" ||
            mentorData.is_complete === null ||
            mentorData.is_complete === undefined) && (
            <MentorApplicationStatusPopup
              isOpen={isApplicationStatusOpen}
              mentorId={mentorData.id}
              userId={userData?.id || null}
              onClose={() => {
                setIsApplicationStatusOpen(false);
                // Use router refresh instead of full reload
                router.refresh();
              }}
            />
          )}
        {googleUserData && (
          <RoleSelectionModal
            isOpen={showRoleSelection}
            onClose={() => {
              setShowRoleSelection(false);
              setGoogleUserData(null);
            }}
            userId={googleUserData.id}
            userEmail={googleUserData.email}
            userName={googleUserData.name}
            userAvatar={googleUserData.avatar}
            onTutorSelected={() => {
              // Close role selection modal
              setShowRoleSelection(false);
              setGoogleUserData(null);
              // Refresh user data to get the newly created mentor record
              const refreshUserData = async () => {
                try {
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();
                  if (!user) return;

                  const { data: mentor } = await supabase
                    .from("mentors")
                    .select("*")
                    .eq("user_id", user.id)
                    .maybeSingle();

                  if (mentor) {
                    setMentorData(mentor);
                    setUserData({
                      ...mentor,
                      full_name: mentor.name,
                      user_type: "mentor",
                      email: mentor.email || user.email || "", // Always include email from auth user
                    });
                    // Check if application has been submitted
                    const { data: progressData } = await supabase
                      .from("mentor_application_progress")
                      .select("id, application_submitted")
                      .eq("user_id", user.id)
                      .maybeSingle();

                    if (progressData && progressData.application_submitted) {
                      // Application submitted, show status popup
                      setTimeout(() => {
                        setIsApplicationStatusOpen(true);
                      }, 300);
                    } else {
                      // No application, show profile completion
                      setTimeout(() => {
                        setIsProfileCompletionOpen(true);
                      }, 300);
                    }
                  }
                } catch (error) {
                  console.error("Error refreshing user data:", error);
                }
              };
              refreshUserData();
            }}
          />
        )}

        {/* Grade Task Modal */}
        <Dialog open={isGradeModalOpen} onOpenChange={setIsGradeModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Grade Task: {selectedTask?.title}</DialogTitle>
              <DialogDescription>
                Provide a score and feedback for the student's submission
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="score">
                  Score (out of {selectedTask?.max_score || 100})
                </Label>
                <Input
                  id="score"
                  type="number"
                  value={gradeData.score}
                  onChange={(e) =>
                    setGradeData({ ...gradeData, score: e.target.value })
                  }
                  min="0"
                  max={selectedTask?.max_score || 100}
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  value={gradeData.feedback}
                  onChange={(e) =>
                    setGradeData({ ...gradeData, feedback: e.target.value })
                  }
                  placeholder="Provide detailed feedback for the student..."
                  rows={8}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsGradeModalOpen(false);
                    setSelectedTask(null);
                    setGradeData({ score: "", feedback: "" });
                  }}
                  disabled={grading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedTask) return;
                    if (
                      !gradeData.score ||
                      parseFloat(gradeData.score) < 0 ||
                      parseFloat(gradeData.score) >
                        (selectedTask.max_score || 100)
                    ) {
                      toast.error("Please enter a valid score");
                      return;
                    }

                    setGrading(true);
                    try {
                      const { error } = await supabase
                        .from("tasks")
                        .update({
                          score: parseFloat(gradeData.score),
                          feedback: gradeData.feedback || null,
                          graded_at: new Date().toISOString(),
                          graded_by: mentorData?.id,
                          status: "graded",
                        })
                        .eq("id", selectedTask.id);

                      if (error) throw error;

                      toast.success("Task graded successfully!");
                      setIsGradeModalOpen(false);
                      setSelectedTask(null);
                      setGradeData({ score: "", feedback: "" });

                      // Refresh tasks
                      const { data, error: fetchError } = await supabase
                        .from("tasks")
                        .select(
                          `
                        *,
                        session:sessions (
                          topic,
                          date,
                          time
                        ),
                        learner:users!tasks_learner_id_fkey (
                          email,
                          full_name
                        )
                      `
                        )
                        .eq("mentor_id", mentorData.id)
                        .order("created_at", { ascending: false });

                      if (!fetchError) setTasks(data || []);
                    } catch (error: any) {
                      console.error("Error grading task:", error);
                      toast.error(error.message || "Failed to grade task");
                    } finally {
                      setGrading(false);
                    }
                  }}
                  disabled={grading}
                >
                  {grading ? (
                    <>
                      <LoadingLogo size={16} />
                      Grading...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Submit Grade
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
