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
    return `${currencyToUse.symbol}${convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
              // User is a student, redirect to learner dashboard
              console.log(
                "Dashboard: User is a student, redirecting to learner dashboard"
              );
              setLoading(false);
              router.push("/dashboard/learner");
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
                  console.log("New mentor - application submitted, showing status");
                  setTimeout(() => {
                    setIsApplicationStatusOpen(true);
                  }, 1000);
                } else {
                  console.log("New mentor - no application, showing profile completion");
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
          });
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
              console.log("No application submitted yet - showing profile completion");
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

  // Check profile completion after component mounts - but only if no application is in progress
  useEffect(() => {
    if (!loading && mentorData && userData && userData.id) {
      console.log("=== PROFILE COMPLETION CHECK ===");
      console.log("Loading:", loading);
      console.log("MentorData:", mentorData);
      console.log("UserData:", userData);
      console.log("is_complete value:", mentorData.is_complete);
      console.log("is_complete type:", typeof mentorData.is_complete);

      // Check if profile is incomplete - handle boolean false, string "false", null, undefined
      const isIncomplete =
        mentorData.is_complete === false ||
        mentorData.is_complete === "false" ||
        String(mentorData.is_complete).toLowerCase() === "false" ||
        mentorData.is_complete === null ||
        mentorData.is_complete === undefined;

      console.log("Is incomplete?", isIncomplete);
      console.log("Current modal state:", isProfileCompletionOpen);

      if (isIncomplete) {
        // Check if application has been submitted - if so, don't show profile completion
        const checkApplicationProgress = async () => {
          const { data: progressData } = await supabase
            .from("mentor_application_progress")
            .select("id, application_submitted")
            .eq("user_id", userData.id)
            .maybeSingle();

          if (progressData && progressData.application_submitted) {
            console.log("✅ Application submitted - showing application status instead");
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
  useEffect(() => {
    if (!userLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error(
            "Error getting location for currency conversion:",
            error
          );
          // If geolocation fails, use mentor's country if available
          if (mentorData?.country) {
            const currencyInfo = getCurrencyForCountry(mentorData.country);
            setCurrencyInfo({ symbol: currencyInfo.symbol, code: currencyInfo.code });
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 3600000, // Cache for 1 hour
        }
      );
    }
  }, [userLocation, mentorData?.country]);

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
            setCurrencyInfo({ symbol: currencyInfo.symbol, code: currencyInfo.code });
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
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Welcome back! Here's an overview of your sessions and advertising.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border rounded-xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Sessions
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {
                  sessions.filter(
                    (s) => !s.is_paid && (s.status === "scheduled" || !s.status)
                  ).length
                }
              </div>
              <p className="text-xs text-gray-600">Awaiting payment</p>
            </CardContent>
          </Card>
          <Card className="bg-white border rounded-xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {(() => {
                  const totalRevenue = sessions
                    .filter((s) => s.is_paid)
                    .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
                  return convertedAmounts["total"] || formatRevenue(totalRevenue);
                })()}
              </div>
              <p className="text-xs text-gray-600">
                {sessions.filter((s) => s.is_paid).length} paid{" "}
                {sessions.filter((s) => s.is_paid).length === 1
                  ? "session"
                  : "sessions"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white border rounded-xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Ad Clicks
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {campaigns.reduce(
                  (sum: number, c: any) => sum + (c.total_clicks || 0),
                  0
                )}
              </div>
              <p className="text-xs text-gray-600">
                {campaigns.filter((c: any) => c.status === "active").length}{" "}
                active{" "}
                {campaigns.filter((c: any) => c.status === "active").length ===
                1
                  ? "campaign"
                  : "campaigns"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white border rounded-xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Ad Balance
              </CardTitle>
              <Megaphone className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {adAccount?.balance
                  ? (() => {
                      const balanceUSD = parseFloat(adAccount.balance);
                      const currencyInfo = mentorData?.country 
                        ? getCurrencyForCountry(mentorData.country)
                        : { symbol: "$", rate: 1 };
                      const convertedBalance = balanceUSD * currencyInfo.rate;
                      return `${currencyInfo.symbol}${convertedBalance.toFixed(2)}`;
                    })()
                  : `${currencyInfo.symbol}0.00`}
              </div>
              <p className="text-xs text-gray-600">
                {adAccount?.lifetime_spent
                  ? `$${parseFloat(adAccount.lifetime_spent).toFixed(2)} spent`
                  : "No spending yet"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="border-2 border-blue-500/50 bg-transparent h-9 w-[600px] grid grid-cols-4 rounded-none p-1 shadow-[inset_0_0_35px_rgba(59,130,246,0.3)]">
            <TabsTrigger
              value="overview"
              className="ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border data-[state=active]:border-orange-500 data-[state=active]:rounded-none data-[state=active]:shadow-[inset_0_0_30px_rgba(34,197,94,0.5)] data-[state=active]:text-white data-[state=active]:bg-transparent hover:bg-transparent px-2 py-[2px] text-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border data-[state=active]:border-orange-500 data-[state=active]:rounded-none data-[state=active]:shadow-[inset_0_0_30px_rgba(34,197,94,0.5)] data-[state=active]:text-white data-[state=active]:bg-transparent hover:bg-transparent px-2 py-[2px] text-sm"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border data-[state=active]:border-orange-500 data-[state=active]:rounded-none data-[state=active]:shadow-[inset_0_0_30px_rgba(34,197,94,0.5)] data-[state=active]:text-white data-[state=active]:bg-transparent hover:bg-transparent px-2 py-[2px] text-sm"
            >
              My Sessions
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border data-[state=active]:border-orange-500 data-[state=active]:rounded-none data-[state=active]:shadow-[inset_0_0_30px_rgba(34,197,94,0.5)] data-[state=active]:text-white data-[state=active]:bg-transparent hover:bg-transparent px-2 py-[2px] text-sm"
            >
              Tasks
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="lg:col-span-4 bg-white border rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900">
                    Revenue Overview
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Click on a month to view details
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-6">
                  <div className="space-y-2 w-1/3 border-r border-gray-200 pr-4">
                    {revenueData.map((data, index) => {
                      const currentDate = new Date();
                      const currentMonthIndex = currentDate.getMonth();
                      const currentYear = currentDate.getFullYear();
                      const monthIndex = data.monthIndex;
                      const monthYear = data.year;

                      // Check if this is a future month
                      const isFutureMonth =
                        monthYear > currentYear ||
                        (monthYear === currentYear &&
                          monthIndex > currentMonthIndex);
                      const isPastMonth =
                        !isFutureMonth && data.month !== selectedMonth.month;
                      return (
                        <div key={data.month} className="relative group">
                          {isFutureMonth && (
                            <div className="absolute -right-2 translate-x-full top-1/2 -translate-y-1/2 bg-white text-gray-700 text-xs rounded-lg px-3 py-2 w-48 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 border border-gray-200 shadow-lg">
                              {(() => {
                                const currentDate = new Date();
                                const currentMonthName =
                                  currentDate.toLocaleDateString("en-US", {
                                    month: "long",
                                  });
                                return `We're currently in ${currentMonthName}. This is a future month.`;
                              })()}
                            </div>
                          )}
                          {isPastMonth && (
                            <div className="absolute -right-2 translate-x-full top-1/2 -translate-y-1/2 bg-white text-gray-700 text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 border border-gray-200 shadow-lg">
                              <div className="space-y-1">
                                <p className="font-medium">
                                  Revenue: {formatRevenue(data.revenue)}
                                </p>
                                <p className="text-gray-600">
                                  {Math.round(
                                    (data.revenue / getTotalRevenue()) * 100
                                  )}
                                  % of total revenue
                                </p>
                                {index < revenueData.length - 1 && (
                                  <p className="text-green-600">
                                    {Math.round(
                                      ((revenueData[index + 1].revenue -
                                        data.revenue) /
                                        data.revenue) *
                                        100
                                    )}
                                    % growth next month
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() =>
                              !isFutureMonth && setSelectedMonth(data)
                            }
                            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors
                            ${
                              selectedMonth.month === data.month
                                ? "bg-blue-50 text-blue-600"
                                : isFutureMonth
                                ? "text-gray-400 cursor-not-allowed"
                                : "hover:bg-gray-50 text-gray-600 hover:text-blue-600"
                            }`}
                            disabled={isFutureMonth}
                          >
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                isFutureMonth
                                  ? "bg-gray-100"
                                  : selectedMonth.month === data.month
                                  ? "bg-blue-100"
                                  : "bg-gray-100"
                              }`}
                            >
                              <span
                                className={`text-sm font-medium ${
                                  isFutureMonth
                                    ? "text-gray-400"
                                    : selectedMonth.month === data.month
                                    ? "text-blue-600"
                                    : "text-gray-600"
                                }`}
                              >
                                {data.month}
                              </span>
                            </div>
                            <span
                              className={`text-sm font-medium ${
                                selectedMonth.month === data.month
                                  ? "text-gray-900"
                                  : "text-gray-600"
                              }`}
                            >
                              {selectedMonth.month === data.month
                                ? formatRevenue(data.revenue)
                                : ""}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex-1 flex items-center justify-center">
                    <div className="relative w-72 h-72">
                      <div
                        className="absolute inset-0 rounded-full border-2 border-blue-200 bg-blue-50"
                        style={{
                          animation: "rotateCircle 10s linear infinite",
                        }}
                      >
                        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_45px_rgba(59,130,246,0.1)]" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="space-y-6 text-center p-8">
                          <div>
                            <p className="text-sm text-gray-600">Revenue</p>
                            <p className="text-4xl font-bold text-gray-900 mt-2">
                              {formatRevenue(selectedMonth.revenue)}
                            </p>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <div className="flex items-center justify-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="text-base text-green-600">
                                  {getGrowthPercentage(selectedMonth)}%
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                vs prev month
                              </p>
                            </div>
                            <div>
                              <p className="text-base font-medium text-gray-900">
                                {Math.round(
                                  (selectedMonth.revenue / getTotalRevenue()) *
                                    100
                                )}
                                %
                              </p>
                              <p className="text-sm text-gray-600">
                                of total revenue
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-3 bg-white border rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900">
                    Tutor Requests
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {requestsLoading
                      ? "Loading requests..."
                      : tutorRequests.length > 0
                      ? `You have ${tutorRequests.length} ${
                          tutorRequests.length === 1 ? "request" : "requests"
                        } (pending and accepted)`
                      : "No tutor requests"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {requestsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingLogo size={32} />
                    </div>
                  ) : tutorRequests.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
                      {tutorRequests.map((request) => {
                        const getStatusBadge = (status: string) => {
                          switch (status) {
                            case "pending":
                              return (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                                  Pending
                                </span>
                              );
                            case "accepted":
                              return (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200">
                                  Accepted
                                </span>
                              );
                            case "rejected":
                              return (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700 border border-red-200">
                                  Rejected
                                </span>
                              );
                            default:
                              return (
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                                  {status}
                                </span>
                              );
                          }
                        };

                        const requestDate = new Date(request.created_at);
                        const formattedDate = requestDate.toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        );

                        return (
                          <div
                            key={request.id}
                            className="bg-gradient-to-br from-white to-gray-50 border-2 border-blue-200 rounded-xl p-4 shadow-lg overflow-hidden relative group min-w-[320px] max-w-[320px] flex-shrink-0 cursor-pointer"
                            style={{
                              boxShadow:
                                "0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 4px 6px -2px rgba(59, 130, 246, 0.05)",
                            }}
                          >
                            {/* Gradient accent */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

                            {/* Notification badge */}
                            <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full" />

                            <div className="flex flex-col gap-3">
                              {/* Learner Profile Section */}
                              {request.student_name && (
                                <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                                  <div>
                                    <img
                                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                                        request.student_name
                                      )}&background=3B82F6&color=fff&size=128`}
                                      alt={request.student_name}
                                      className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 shadow-md"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                          request.student_name
                                        )}&background=3B82F6&color=fff&size=128`;
                                      }}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h5 className="text-sm font-bold text-gray-900 truncate">
                                      {request.student_name}
                                    </h5>
                                    {request.grade_level && (
                                      <p className="text-xs text-gray-500 capitalize">
                                        {request.grade_level}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Header with Subject, Status */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                      {request.subject}
                                    </h4>
                                    <div>{getStatusBadge(request.status)}</div>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Calendar className="w-3 h-3" />
                                    <span>{formattedDate}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Description - Compact */}
                              {request.description && (
                                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-2.5 border border-blue-100">
                                  <div className="flex items-start gap-2">
                                    <MessageSquare className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                                    <p className="text-xs text-gray-700 line-clamp-2">
                                      {request.description}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Request Details - Compact */}
                              <div className="space-y-1.5">
                                {request.preferred_time && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                      <Clock className="w-3 h-3 text-indigo-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-gray-500 text-xs">
                                        Preferred Time:{" "}
                                      </span>
                                      <span className="text-gray-900 font-medium">
                                        {request.preferred_time}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Pricing Display */}
                                {requestPricing[request.id] && (
                                  <div className="flex items-center gap-2 text-xs bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-2 border border-green-200">
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                      <DollarSign className="w-3 h-3 text-green-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-gray-500 text-xs">
                                        Hourly Rate:{" "}
                                      </span>
                                      <span className="text-gray-900 font-bold text-sm">
                                        {
                                          requestPricing[request.id]
                                            .hourlyRateLocal
                                        }
                                      </span>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 text-xs">
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                      request.payment_status === "paid"
                                        ? "bg-green-100"
                                        : request.payment_status === "pending"
                                        ? "bg-yellow-100"
                                        : "bg-gray-100"
                                    }`}
                                  >
                                    <DollarSign
                                      className={`w-3 h-3 ${
                                        request.payment_status === "paid"
                                          ? "text-green-600"
                                          : request.payment_status === "pending"
                                          ? "text-yellow-600"
                                          : "text-gray-600"
                                      }`}
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-gray-500 text-xs">
                                      Payment Status:{" "}
                                    </span>
                                    <span
                                      className={`font-medium capitalize ${
                                        request.payment_status === "paid"
                                          ? "text-green-600"
                                          : request.payment_status === "pending"
                                          ? "text-yellow-600"
                                          : "text-gray-600"
                                      }`}
                                    >
                                      {request.payment_status || "pending"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Accept/Reject Buttons */}
                              {request.status === "pending" && (
                                <div className="flex gap-2 pt-2 border-t border-gray-100">
                                  <div className="flex-1">
                                    <Button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleAcceptRequest(request.id);
                                      }}
                                      disabled={
                                        processingRequestId === request.id
                                      }
                                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xs py-1.5 h-auto shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                      size="sm"
                                    >
                                      {processingRequestId === request.id ? (
                                        <>
                                          <LoadingLogo size={14} />
                                          Accepting...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 inline" />
                                          Accept
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                  <div className="flex-1">
                                    <Button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleRejectRequest(request.id);
                                      }}
                                      disabled={
                                        processingRequestId === request.id
                                      }
                                      variant="outline"
                                      className="w-full border-red-300 text-red-700 hover:bg-red-50 text-xs py-1.5 h-auto transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                      size="sm"
                                    >
                                      {processingRequestId === request.id ? (
                                        <>
                                          <LoadingLogo size={14} />
                                          Rejecting...
                                        </>
                                      ) : (
                                        <>
                                          <XCircle className="w-3.5 h-3.5 mr-1.5" />
                                          Reject
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-600 mb-2">No tutor requests</p>
                      <p className="text-sm text-gray-500">
                        New tutor requests will appear here
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-white border rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900">
                    Session Requests
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {(() => {
                      const now = new Date();
                      const seventyTwoHoursAgo = new Date(
                        now.getTime() - 72 * 60 * 60 * 1000
                      );
                      const recentRequests = sessions.filter((s) => {
                        const sessionDate = new Date(`${s.date}T${s.time}`);
                        return (
                          !s.is_paid &&
                          sessionDate >= seventyTwoHoursAgo &&
                          sessionDate <= now
                        );
                      });
                      return `You have ${recentRequests.length} pending ${
                        recentRequests.length === 1 ? "request" : "requests"
                      } (last 72 hours)`;
                    })()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const now = new Date();
                    const seventyTwoHoursAgo = new Date(
                      now.getTime() - 72 * 60 * 60 * 1000
                    );
                    const recentRequests = sessions
                      .filter((s) => {
                        const sessionDate = new Date(`${s.date}T${s.time}`);
                        return (
                          !s.is_paid &&
                          sessionDate >= seventyTwoHoursAgo &&
                          sessionDate <= now
                        );
                      })
                      .sort((a, b) => {
                        const dateA = new Date(`${a.date}T${a.time}`);
                        const dateB = new Date(`${b.date}T${b.time}`);
                        return dateB.getTime() - dateA.getTime();
                      })
                      .slice(0, 5);

                    if (recentRequests.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 mb-2">
                            No session requests
                          </p>
                          <p className="text-sm text-gray-500">
                            New session requests from the last 72 hours will
                            appear here
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {recentRequests.map((session) => {
                          const sessionDate = new Date(
                            `${session.date}T${session.time}`
                          );
                          const hoursAgo = Math.floor(
                            (now.getTime() - sessionDate.getTime()) /
                              (1000 * 60 * 60)
                          );
                          const timeAgo =
                            hoursAgo < 1
                              ? "Just now"
                              : hoursAgo === 1
                              ? "1 hour ago"
                              : hoursAgo < 24
                              ? `${hoursAgo} hours ago`
                              : `${Math.floor(hoursAgo / 24)} day${
                                  Math.floor(hoursAgo / 24) > 1 ? "s" : ""
                                } ago`;

                          return (
                            <div
                              key={session.id}
                              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                            >
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                  {session.topic.charAt(0).toUpperCase()}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {session.topic}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {new Date(session.date).toLocaleDateString(
                                    "en-US",
                                    { month: "short", day: "numeric" }
                                  )}{" "}
                                  at{" "}
                                  {new Date(
                                    `2000-01-01T${session.time}`
                                  ).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}{" "}
                                  • {timeAgo}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {convertedAmounts[session.id] ||
                                    `$${parseFloat(session.amount || 0).toFixed(
                                      2
                                    )}`}{" "}
                                  • {session.duration} min
                                </p>
                              </div>
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white"
                                onClick={() => {
                                  // Navigate to sessions page or open accept modal
                                  window.location.href = `/dashboard/tutor/sessions`;
                                }}
                              >
                                Accept Session
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-gradient-to-r from-blue-500/80 to-green-500/80 hover:from-blue-500/90 hover:to-green-500/90 transition-all duration-300 text-white border-0 shadow-lg shadow-blue-500/20"
                    asChild
                  >
                    <Link
                      href="/dashboard/tutor/sessions"
                      className="flex items-center justify-center"
                    >
                      View all sessions
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="analytics" className="space-y-4">
            {/* Analytics Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white border rounded-xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Ad Clicks
                  </CardTitle>
                  <MousePointer className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {campaigns.reduce(
                      (sum: number, c: any) => sum + (c.total_clicks || 0),
                      0
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {adClicks.length} detailed records
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white border rounded-xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Impressions
                  </CardTitle>
                  <Eye className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {campaigns.reduce(
                      (sum: number, c: any) => sum + (c.total_impressions || 0),
                      0
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {adImpressions.length} detailed records
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white border rounded-xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Click-Through Rate
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const totalClicks = campaigns.reduce(
                        (sum: number, c: any) => sum + (c.total_clicks || 0),
                        0
                      );
                      const totalImpressions = campaigns.reduce(
                        (sum: number, c: any) =>
                          sum + (c.total_impressions || 0),
                        0
                      );
                      return totalImpressions > 0
                        ? ((totalClicks / totalImpressions) * 100).toFixed(2)
                        : "0.00";
                    })()}
                    %
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Clicks per 100 impressions
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white border rounded-xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Paid Students
                  </CardTitle>
                  <Users className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const paidSessions = sessions.filter(
                        (s) =>
                          s.is_paid &&
                          s.learner_name &&
                          s.learner_name !== "TBD"
                      );
                      const uniqueStudents = new Set(
                        paidSessions.map((s) => s.learner_email).filter(Boolean)
                      );
                      return uniqueStudents.size;
                    })()}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {sessions.filter((s) => s.is_paid).length} paid sessions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Conversion Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white border rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-900">
                    Conversion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {(() => {
                      const totalSessions = sessions.length;
                      const paidSessions = sessions.filter(
                        (s) => s.is_paid
                      ).length;
                      return totalSessions > 0
                        ? ((paidSessions / totalSessions) * 100).toFixed(1)
                        : "0.0";
                    })()}
                    %
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    {sessions.filter((s) => s.is_paid).length} of{" "}
                    {sessions.length} sessions paid
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white border rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-900">
                    Revenue per Click
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {(() => {
                      const totalClicks = campaigns.reduce(
                        (sum: number, c: any) => sum + (c.total_clicks || 0),
                        0
                      );
                      const totalRevenue = sessions
                        .filter((s) => s.is_paid)
                        .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
                      return totalClicks > 0
                        ? `$${(totalRevenue / totalClicks).toFixed(2)}`
                        : "$0.00";
                    })()}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Average revenue generated per click
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white border rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-900">
                    Cost per Acquisition
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {(() => {
                      const totalSpent = campaigns.reduce(
                        (sum: number, c: any) =>
                          sum + parseFloat(c.total_spent || 0),
                        0
                      );
                      const paidSessions = sessions.filter(
                        (s) => s.is_paid
                      ).length;
                      return paidSessions > 0
                        ? `$${(totalSpent / paidSessions).toFixed(2)}`
                        : "$0.00";
                    })()}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Ad spend per paid session
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Geographic Analytics */}
            <Card className="bg-white border rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">
                  Geographic Analytics
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Clicks and impressions by location
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingLogo size={32} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Top Countries (Clicks)
                      </h4>
                      <div className="space-y-2">
                        {(() => {
                          const countryClicks: Record<string, number> = {};
                          adClicks.forEach((click) => {
                            if (click.country) {
                              countryClicks[click.country] =
                                (countryClicks[click.country] || 0) + 1;
                            }
                          });
                          const sorted = Object.entries(countryClicks)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 5);
                          return sorted.length > 0 ? (
                            sorted.map(([country, count]) => (
                              <div
                                key={country}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                              >
                                <span className="text-sm text-gray-700">
                                  {country}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {count}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">
                              No geographic data available
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Top Countries (Impressions)
                      </h4>
                      <div className="space-y-2">
                        {(() => {
                          const countryImpressions: Record<string, number> = {};
                          adImpressions.forEach((impression) => {
                            if (impression.country) {
                              countryImpressions[impression.country] =
                                (countryImpressions[impression.country] || 0) +
                                1;
                            }
                          });
                          const sorted = Object.entries(countryImpressions)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 5);
                          return sorted.length > 0 ? (
                            sorted.map(([country, count]) => (
                              <div
                                key={country}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                              >
                                <span className="text-sm text-gray-700">
                                  {country}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {count}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">
                              No geographic data available
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Students Who Paid */}
            <Card className="bg-white border rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">
                  Students Who Paid for Sessions
                </CardTitle>
                <CardDescription className="text-gray-600">
                  List of students who have completed payment
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingLogo size={32} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const paidSessions = sessions.filter(
                        (s) =>
                          s.is_paid &&
                          s.learner_name &&
                          s.learner_name !== "TBD"
                      );
                      const uniqueStudents = new Map();
                      paidSessions.forEach((session) => {
                        if (
                          session.learner_email &&
                          !uniqueStudents.has(session.learner_email)
                        ) {
                          uniqueStudents.set(session.learner_email, {
                            name: session.learner_name,
                            email: session.learner_email,
                            sessions: [],
                          });
                        }
                        if (session.learner_email) {
                          uniqueStudents
                            .get(session.learner_email)
                            .sessions.push({
                              topic: session.topic,
                              date: session.date,
                              amount: session.amount,
                            });
                        }
                      });
                      const studentsArray = Array.from(uniqueStudents.values());
                      return studentsArray.length > 0 ? (
                        studentsArray.map((student, index) => (
                          <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                    {student.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900">
                                      {student.name}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      {student.email}
                                    </p>
                                  </div>
                                </div>
                                <div className="ml-13 mt-2">
                                  <p className="text-xs text-gray-500 mb-1">
                                    {student.sessions.length}{" "}
                                    {student.sessions.length === 1
                                      ? "session"
                                      : "sessions"}{" "}
                                    booked
                                  </p>
                                  <div className="space-y-1">
                                    {student.sessions.map(
                                      (s: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className="text-xs text-gray-600"
                                        >
                                          • {s.topic} - $
                                          {parseFloat(s.amount || 0).toFixed(2)}{" "}
                                          (
                                          {new Date(
                                            s.date
                                          ).toLocaleDateString()}
                                          )
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                Paid
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">No paid students yet</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Students who pay for sessions will appear here
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white border rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">
                  Recent Ad Activity
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Latest clicks and impressions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {adClicks.slice(0, 10).map((click, index) => (
                    <div
                      key={click.id || index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <MousePointer className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Ad Click
                          </p>
                          <p className="text-xs text-gray-500">
                            {click.country || "Unknown"} •{" "}
                            {click.city || "Unknown"} •{" "}
                            {new Date(click.clicked_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        ${parseFloat(click.click_cost || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {adClicks.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No ad clicks recorded yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="sessions" className="space-y-4">
            <Card className="bg-white border rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">My Sessions</CardTitle>
                <CardDescription className="text-gray-600">
                  View and manage your scheduled sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingLogo size={32} />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No sessions scheduled yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sessions.map((session) => {
                      const sessionDate = new Date(
                        `${session.date}T${session.time}`
                      );
                      const isPast = sessionDate < new Date();
                      const statusColor =
                        session.status === "completed"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : session.status === "cancelled"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : session.status === "in-progress"
                          ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                          : isPast
                          ? "bg-gray-100 text-gray-700 border-gray-200"
                          : "bg-blue-100 text-blue-700 border-blue-200";

                      const canJoinMeeting =
                        session.meeting_link &&
                        sessionDate <= new Date() &&
                        !isPast &&
                        session.status !== "completed" &&
                        session.status !== "cancelled";
                      const meetingStartTime = new Date(
                        sessionDate.getTime() + session.duration * 60000
                      );
                      const isMeetingActive =
                        new Date() >= sessionDate &&
                        new Date() <= meetingStartTime;

                      return (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all bg-white"
                        >
                          <div className="flex items-start gap-4">
                            {/* Profile Section */}
                            <div className="flex-shrink-0">
                              {session.learner_name &&
                              session.learner_name !== "TBD" ? (
                                <img
                                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    session.learner_name
                                  )}&background=3B82F6&color=fff&size=128`}
                                  alt={session.learner_name}
                                  className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      session.learner_name
                                    )}&background=3B82F6&color=fff&size=128`;
                                  }}
                                />
                              ) : (
                                <img
                                  src={
                                    mentorData?.avatar ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      mentorData?.name ||
                                        userData?.full_name ||
                                        "M"
                                    )}&background=3B82F6&color=fff&size=128`
                                  }
                                  alt={
                                    mentorData?.name ||
                                    userData?.full_name ||
                                    "Mentor"
                                  }
                                  className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      mentorData?.name ||
                                        userData?.full_name ||
                                        "M"
                                    )}&background=3B82F6&color=fff&size=128`;
                                  }}
                                />
                              )}
                            </div>

                            {/* Content Section */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                                    {session.topic}
                                  </h3>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusColor}`}
                                    >
                                      {session.status ||
                                        (isPast ? "completed" : "scheduled")}
                                    </span>
                                    {session.is_paid && (
                                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700 border border-green-200">
                                        Paid
                                      </span>
                                    )}
                                    {!session.is_paid && (
                                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                                        Awaiting Payment
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Student Info */}
                              {session.is_paid &&
                              session.learner_name &&
                              session.learner_name !== "TBD" ? (
                                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                  <p className="text-xs font-semibold text-blue-900 mb-2">
                                    Student Information
                                  </p>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-blue-600" />
                                      <span className="text-sm font-medium text-gray-900">
                                        {session.learner_name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-4 w-4 text-blue-600" />
                                      <span className="text-sm text-gray-700">
                                        {session.learner_email}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <p className="text-xs font-semibold text-gray-600 mb-1">
                                    No student assigned yet
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Waiting for a student to book this session
                                  </p>
                                </div>
                              )}

                              {/* Session Details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                <div className="flex items-center gap-2 text-gray-700">
                                  <CalendarIcon className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium">
                                    {new Date(session.date).toLocaleDateString(
                                      "en-US",
                                      {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      }
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-700">
                                  <Clock className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium">
                                    {new Date(
                                      `2000-01-01T${session.time}`
                                    ).toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}{" "}
                                    • {session.duration} min
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-700">
                                  <span className="text-sm font-semibold">
                                    {convertedAmounts[session.id] ||
                                      `$${parseFloat(
                                        session.amount || 0
                                      ).toFixed(2)}`}
                                  </span>
                                </div>
                                {session.meeting_type && (
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <Video className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm capitalize">
                                      {session.meeting_type.replace("-", " ")}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Notes */}
                              {session.notes && (
                                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">
                                    Notes
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {session.notes}
                                  </p>
                                </div>
                              )}

                              {/* Meeting Link - Only show if session is paid AND student is assigned */}
                              {session.meeting_link &&
                                session.is_paid === true &&
                                session.learner_name &&
                                session.learner_name !== "TBD" &&
                                session.learner_name.trim() !== "" &&
                                session.learner_email && (
                                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-700 mb-1">
                                          Meeting Link
                                        </p>
                                        <p className="text-sm text-gray-600 truncate">
                                          {session.meeting_link}
                                        </p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          navigator.clipboard.writeText(
                                            session.meeting_link
                                          );
                                        }}
                                        className="ml-2 flex-shrink-0"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )}

                              {/* Join Meeting Button - Only accessible when meeting starts and session is paid AND student is assigned */}
                              {session.meeting_link &&
                                session.is_paid === true &&
                                session.learner_name &&
                                session.learner_name !== "TBD" &&
                                session.learner_name.trim() !== "" &&
                                session.learner_email && (
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    {isMeetingActive ? (
                                      <a
                                        href={session.meeting_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
                                      >
                                        <Video className="h-4 w-4" />
                                        Join Meeting Now
                                        <ArrowRight className="h-4 w-4" />
                                      </a>
                                    ) : sessionDate > new Date() ? (
                                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg font-medium text-sm">
                                        <Clock className="h-4 w-4" />
                                        Meeting starts{" "}
                                        {new Date(
                                          sessionDate
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                        })}{" "}
                                        at{" "}
                                        {new Date(
                                          `2000-01-01T${session.time}`
                                        ).toLocaleTimeString("en-US", {
                                          hour: "numeric",
                                          minute: "2-digit",
                                          hour12: true,
                                        })}
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg font-medium text-sm">
                                        <Clock className="h-4 w-4" />
                                        Meeting has ended
                                      </div>
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tasks" className="space-y-4">
            <Card className="bg-white border rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">Tasks & Grading</CardTitle>
                <CardDescription className="text-gray-600">
                  View and grade student task submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingLogo size={32} />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardList className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-600 mb-2">
                      No tasks yet
                    </p>
                    <p className="text-sm text-gray-500">
                      Tasks you create will appear here for grading
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task: any) => {
                      const dueDate = new Date(task.due_date);

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow bg-white"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-gray-900 mb-2">
                                {task.title}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <Badge
                                  className={
                                    task.status === "graded"
                                      ? "bg-green-100 text-green-700 border-green-200"
                                      : task.status === "submitted"
                                      ? "bg-purple-100 text-purple-700 border-purple-200"
                                      : task.status === "assigned"
                                      ? "bg-blue-100 text-blue-700 border-blue-200"
                                      : "bg-gray-100 text-gray-700 border-gray-200"
                                  }
                                >
                                  {task.status === "graded" && (
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                  )}
                                  {task.status.charAt(0).toUpperCase() +
                                    task.status.slice(1)}
                                </Badge>
                                {task.session && (
                                  <Badge variant="outline">
                                    {task.session.topic}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {task.status === "graded" &&
                              task.score !== null && (
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-green-600">
                                    {task.score}/{task.max_score}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {(
                                      (task.score / task.max_score) *
                                      100
                                    ).toFixed(1)}
                                    %
                                  </div>
                                </div>
                              )}
                          </div>

                          <div className="space-y-3 mb-4">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                              {task.description}
                            </p>

                            {task.instructions && (
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-xs font-semibold text-blue-900 mb-1">
                                  Instructions:
                                </p>
                                <p className="text-sm text-blue-800 whitespace-pre-wrap">
                                  {task.instructions}
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <CalendarIcon className="h-4 w-4" />
                                <span>Due: {dueDate.toLocaleDateString()}</span>
                              </div>
                              {task.learner && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <User className="h-4 w-4" />
                                  <span>
                                    {task.learner.full_name ||
                                      task.learner.email}
                                  </span>
                                </div>
                              )}
                            </div>

                            {task.submission_text && (
                              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-xs font-semibold text-gray-700 mb-1">
                                  Student Submission:
                                </p>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                  {task.submission_text}
                                </p>
                                {task.submission_file_url && (
                                  <a
                                    href={task.submission_file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                                  >
                                    <Download className="h-3 w-3" />
                                    {task.submission_file_name ||
                                      "Download file"}
                                  </a>
                                )}
                                {task.submitted_at && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    Submitted:{" "}
                                    {new Date(
                                      task.submitted_at
                                    ).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            )}

                            {task.status === "graded" && task.feedback && (
                              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-xs font-semibold text-green-900 mb-1">
                                  Your Feedback:
                                </p>
                                <p className="text-sm text-green-800 whitespace-pre-wrap">
                                  {task.feedback}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-2 pt-4 border-t">
                            {task.status === "submitted" && (
                              <Button
                                onClick={() => {
                                  setSelectedTask(task);
                                  setGradeData({
                                    score: task.max_score.toString(),
                                    feedback: "",
                                  });
                                  setIsGradeModalOpen(true);
                                }}
                              >
                                <Star className="h-4 w-4 mr-2" />
                                Grade Task
                              </Button>
                            )}
                            {task.status === "graded" && (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setGradeData({
                                    score:
                                      task.score?.toString() ||
                                      task.max_score.toString(),
                                    feedback: task.feedback || "",
                                  });
                                  setIsGradeModalOpen(true);
                                }}
                              >
                                <Star className="h-4 w-4 mr-2" />
                                Update Grade
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
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
