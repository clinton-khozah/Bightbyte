"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Users,
  Clock,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  Calendar,
  Award,
  Star,
  CheckCircle2,
  Eye,
  MapPin,
  Navigation,
  Video,
  ExternalLink,
  Calendar as CalendarIcon,
  DollarSign,
  Sparkles,
  GraduationCap,
  Pencil,
  Phone,
  Mail,
  User,
  X,
  ArrowRight,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { convertAndFormatPrice } from "@/lib/currency";
import { LoadingLogo } from "@/components/loading-logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  fetchTutorPricing,
  findMatchingPricing,
  getTutorPricing,
} from "@/lib/tutor-pricing";

// Dynamically import modals to avoid SSR issues
const MentorDetailsModal = dynamic(
  () =>
    import("@/components/mentors/mentor-details-modal").then((mod) => ({
      default: mod.MentorDetailsModal,
    })),
  { ssr: false }
);

const BookingModal = dynamic(
  () =>
    import("@/components/mentors/booking-modal").then((mod) => ({
      default: mod.BookingModal,
    })),
  { ssr: false }
);

const ProfilePictureModal = dynamic(
  () =>
    import("@/components/mentors/profile-picture-modal").then((mod) => ({
      default: mod.ProfilePictureModal,
    })),
  { ssr: false }
);

const StudentProfileCompletionForm = dynamic(
  () =>
    import("@/components/dashboard/student-profile-completion-form").then(
      (mod) => ({ default: mod.StudentProfileCompletionForm })
    ),
  { ssr: false }
);

const GlobeViewer = dynamic(
  () =>
    import("@/components/mentors/globe-viewer").then((mod) => ({
      default: mod.GlobeViewer,
    })),
  { ssr: false }
);

const AvailableTutors = dynamic(
  () =>
    import("@/components/achievements/available-tutors").then((mod) => ({
      default: mod.AvailableTutors,
    })),
  { ssr: false }
);

const TutorRequestPopup = dynamic(
  () =>
    import("@/components/tutor-request-popup").then((mod) => ({
      default: mod.TutorRequestPopup,
    })),
  { ssr: false }
);

const ScratchCardGame = dynamic(
  () =>
    import("@/components/dashboard/scratch-card-game").then((mod) => ({
      default: mod.ScratchCardGame,
    })),
  { ssr: false }
);

// Stats will be computed inside the component based on tutorRequests

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const progressData = {
  Mar: "72%",
  current: {
    amount: "87%",
    percentage: "15%",
    vsLastMonth: "vs last month",
    ofTotal: "87% completion rate",
  },
};

interface Mentor {
  id: number;
  supabase_id: string;
  name: string;
  title: string;
  description: string;
  specialization: string[];
  rating: number;
  total_reviews: number;
  hourly_rate: number;
  avatar: string;
  experience: string;
  languages: string[];
  availability: string;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  is_verified?: boolean;
  email?: string;
  phone_number?: string;
  qualifications?: string;
  linkedin_profile?: string;
  github_profile?: string;
  twitter_profile?: string;
  facebook_profile?: string;
  instagram_profile?: string;
  personal_website?: string;
  sessions_conducted?: number;
  is_online?: boolean;
}

interface BookedSession {
  id: string;
  mentor_id: number;
  mentor_name?: string;
  mentor_avatar?: string;
  mentor_title?: string;
  mentor_data?: Mentor | null;
  learner_name: string;
  learner_email: string;
  date: string;
  time: string;
  duration: number;
  topic: string;
  notes?: string;
  meeting_type: string;
  meeting_link?: string;
  status: string;
  amount: number;
  is_paid?: boolean;
  payment_id?: string | null;
  created_at: string;
}

export default function LearnerDashboard() {
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "sessions" | "progress" | "achievements"
  >("overview");
  const [userData, setUserData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [mentors, setMentors] = React.useState<Mentor[]>([]);
  const [mentorsLoading, setMentorsLoading] = React.useState(true);
  const [selectedMentor, setSelectedMentor] = React.useState<Mentor | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [bookingMentor, setBookingMentor] = React.useState<Mentor | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = React.useState(false);
  const [bookingRequestData, setBookingRequestData] = React.useState<
    any | null
  >(null);
  const [profilePictureMentor, setProfilePictureMentor] =
    React.useState<Mentor | null>(null);
  const [isProfilePictureModalOpen, setIsProfilePictureModalOpen] =
    React.useState(false);
  const [isProfileCompletionOpen, setIsProfileCompletionOpen] =
    React.useState(false);
  const [isGlobalMentorSearchOpen, setIsGlobalMentorSearchOpen] =
    React.useState(false);
  const [userLocation, setUserLocation] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isFindingLocation, setIsFindingLocation] = React.useState(false);
  const [bookedSessions, setBookedSessions] = React.useState<BookedSession[]>(
    []
  );
  const [currentPage, setCurrentPage] = React.useState(1);
  const sessionsPerPage = 5;
  const [convertedAmounts, setConvertedAmounts] = React.useState<
    Record<string, string>
  >({});
  const [convertedHourlyRates, setConvertedHourlyRates] = React.useState<
    Record<number, string>
  >({});
  const [sessionsLoading, setSessionsLoading] = React.useState(false);
  const [mentorsWithAds, setMentorsWithAds] = React.useState<Set<number>>(
    new Set()
  );
  const [tutorRequests, setTutorRequests] = React.useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = React.useState(false);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = React.useState(false);
  const [editingRequest, setEditingRequest] = React.useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [acceptedMentors, setAcceptedMentors] = React.useState<
    Record<number, any>
  >({});
  const [selectedMentorForModal, setSelectedMentorForModal] = React.useState<
    any | null
  >(null);
  const [relatedRequestForModal, setRelatedRequestForModal] = React.useState<
    any | null
  >(null);
  const [isMentorDetailsModalOpen, setIsMentorDetailsModalOpen] =
    React.useState(false);
  const [selectingMentor, setSelectingMentor] = React.useState(false);
  const [copiedLinkId, setCopiedLinkId] = React.useState<number | null>(null);
  const [isTutorRequestPopupOpen, setIsTutorRequestPopupOpen] =
    React.useState(false);
  const [deletingRequestId, setDeletingRequestId] = React.useState<
    number | null
  >(null);
  const [isCloseRequestModalOpen, setIsCloseRequestModalOpen] =
    React.useState(false);
  const [requestToCloseId, setRequestToCloseId] = React.useState<number | null>(
    null
  );
  const [expandedRequests, setExpandedRequests] = React.useState<Set<number>>(
    new Set()
  );
  const [requestPricing, setRequestPricing] = React.useState<
    Record<
      number,
      { hourlyRateUSD: number; hourlyRateLocal: string; currencySymbol: string }
    >
  >({});
  const [isScratchCardOpen, setIsScratchCardOpen] = React.useState(false);
  const router = useRouter();

  const handleCloseRequest = (requestId: number) => {
    setRequestToCloseId(requestId);
    setIsCloseRequestModalOpen(true);
  };

  const confirmCloseRequest = async () => {
    if (!requestToCloseId) return;

    try {
      setDeletingRequestId(requestToCloseId);
      setIsCloseRequestModalOpen(false);

      console.log(
        "Deleting request with ID:",
        requestToCloseId,
        "Type:",
        typeof requestToCloseId
      );

      // First, try to get the request to verify it exists and check permissions
      const { data: requestData, error: fetchError } = await supabase
        .from("tutor_requests")
        .select("id, student_email, student_id")
        .eq("id", requestToCloseId)
        .single();

      if (fetchError) {
        console.error("Error fetching request:", fetchError);
        throw new Error(`Request not found: ${fetchError.message}`);
      }

      console.log("Request found:", requestData);

      // Get current user to verify ownership
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log(
        "Current user:",
        user?.email,
        "Request email:",
        requestData.student_email
      );

      // Verify the user owns this request
      if (
        user &&
        requestData.student_email !== user.email &&
        requestData.student_id !== user.id
      ) {
        throw new Error("You don't have permission to delete this request");
      }

      // Delete from database
      const { data, error } = await supabase
        .from("tutor_requests")
        .delete()
        .eq("id", requestToCloseId)
        .select();

      if (error) {
        console.error("Supabase delete error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", JSON.stringify(error, null, 2));

        // If it's a permission error, try updating status to 'cancelled' instead
        if (
          error.code === "42501" ||
          error.message?.includes("permission") ||
          error.message?.includes("policy")
        ) {
          console.log(
            "Permission denied for delete, trying to update status to 'cancelled' instead"
          );
          const { error: updateError } = await supabase
            .from("tutor_requests")
            .update({ status: "cancelled" })
            .eq("id", requestToCloseId);

          if (updateError) {
            console.error("Update to cancelled also failed:", updateError);
            throw new Error(
              "You don't have permission to delete this request. Please contact support."
            );
          } else {
            console.log("Request status updated to 'cancelled'");
            // Remove from local state even though we didn't delete
            setTutorRequests((prev) =>
              prev.filter((req) => req.id !== requestToCloseId)
            );
            setAcceptedMentors((prev) => {
              const updated = { ...prev };
              delete updated[requestToCloseId];
              return updated;
            });
            setRequestPricing((prev) => {
              const updated = { ...prev };
              delete updated[requestToCloseId];
              return updated;
            });
            setExpandedRequests((prev) => {
              const updated = new Set(prev);
              updated.delete(requestToCloseId);
              return updated;
            });
            return; // Exit early since we updated instead of deleted
          }
        }
        throw error;
      }

      console.log("Request deleted successfully:", data);

      // Remove from local state immediately
      setTutorRequests((prev) => {
        const filtered = prev.filter((req) => req.id !== requestToCloseId);
        console.log(
          "Updated tutorRequests:",
          filtered.length,
          "requests remaining"
        );
        return filtered;
      });

      // Also remove from acceptedMentors if it exists
      setAcceptedMentors((prev) => {
        const updated = { ...prev };
        delete updated[requestToCloseId];
        return updated;
      });

      // Remove from requestPricing if it exists
      setRequestPricing((prev) => {
        const updated = { ...prev };
        delete updated[requestToCloseId];
        return updated;
      });

      // Remove from expandedRequests if it exists
      setExpandedRequests((prev) => {
        const updated = new Set(prev);
        updated.delete(requestToCloseId);
        return updated;
      });
    } catch (error) {
      console.error("Error closing request:", error);
      alert("Failed to close request. Please try again.");
      // Reset deleting state on error
      setDeletingRequestId(null);
    } finally {
      setRequestToCloseId(null);
    }
  };

  // Optimized: Fetch user data and sessions in parallel, mentors only when needed
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

        // Parallel check for mentor and student
        const [mentorResult, studentResult] = await Promise.all([
          supabase
            .from("mentors")
            .select("id, email")
            .eq("id", user.id)
            .maybeSingle(),
          supabase.from("students").select("*").eq("id", user.id).maybeSingle(),
        ]);

        // If user is a mentor/tutor, redirect to company dashboard
        if (mentorResult.data && !mentorResult.error) {
          console.log(
            "User is a mentor/tutor, redirecting to company dashboard"
          );
          router.push("/dashboard");
          return;
        }

        // Also check user metadata as fallback
        const userType = user.user_metadata?.user_type;
        if (userType === "tutor" || userType === "mentor") {
          console.log(
            "User type from metadata is tutor/mentor, redirecting to company dashboard"
          );
          router.push("/dashboard");
          return;
        }

        // Only create student record if user is NOT a mentor and doesn't exist in students table
        if (studentResult.error && !mentorResult.data) {
          // Double-check user metadata to ensure they're not a mentor
          const userType = user.user_metadata?.user_type;
          if (userType !== "tutor" && userType !== "mentor") {
            // Create student record
            const { data: newStudent, error: createError } = await supabase
              .from("students")
              .insert({
                id: user.id,
                email: user.email || "",
                full_name:
                  user.user_metadata?.full_name ||
                  user.user_metadata?.name ||
                  user.email?.split("@")[0] ||
                  "User",
                avatar_url: user.user_metadata?.avatar_url || null,
                bio: null,
                website: null,
                phone_number: null,
                date_of_birth: null,
                gender: null,
                country: null,
                city: null,
                timezone: null,
                native_language: null,
                languages_spoken: "[]",
                current_level: "beginner",
                interests: "[]",
                learning_goals: null,
                preferred_learning_style: null,
                availability_hours: null,
                budget_range: null,
                social_links: "{}",
                settings: "{}",
                verified: user.email_confirmed_at ? true : false,
                status: "active",
                is_complete: false,
                role: "student",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (createError) {
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
              setUserData(newStudent);
              if (newStudent && newStudent.is_complete === false) {
                setIsProfileCompletionOpen(true);
              }
            }
          }
        } else if (studentResult.data) {
          setUserData(studentResult.data);
          if (studentResult.data && studentResult.data.is_complete === false) {
            setIsProfileCompletionOpen(true);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
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
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  // Check if user has played scratch card today
  React.useEffect(() => {
    if (!userData?.id || loading) return;

    const checkScratchCardEligibility = async () => {
      if (!userData?.id || loading) return;

      try {
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

        const { data, error } = await supabase
          .from("scratch_card_plays")
          .select("play_date")
          .eq("user_id", userData.id)
          .eq("play_date", today)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          // PGRST116 is "not found" error
          console.error("Error checking scratch card eligibility:", error);
          return;
        }

        // If no play found for today, show the scratch card modal
        if (!data) {
          // Small delay to let the page load first
          setTimeout(() => {
            setIsScratchCardOpen(true);
          }, 1000);
        }
      } catch (error) {
        console.error("Error checking scratch card eligibility:", error);
      }
    };

    checkScratchCardEligibility();
  }, [userData?.id, loading]);

  // Auto-detect user location on page load for currency conversion
  // DISABLED: Removed automatic location request to prevent permission popup
  // Location will only be requested when user explicitly clicks a button
  React.useEffect(() => {
    // Use user's country from profile if available, without requesting location
    if (userData?.country) {
      console.log("User country:", userData.country);
    }
  }, [userData?.country]);

  // Lazy load mentors - only fetch when overview tab is active or when needed
  React.useEffect(() => {
    // Only fetch mentors if we're on overview tab or when explicitly needed
    if (activeTab !== "overview" && !isGlobalMentorSearchOpen) {
      return;
    }

    const fetchMentors = async () => {
      try {
        setMentorsLoading(true);

        // Try API first, fallback to Supabase if API fails
        let mentorsData: any[] = [];

        try {
          const response = await fetch(
            "http://127.0.0.1:8000/api/v1/mentors/list/",
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.mentors) {
              mentorsData = data.mentors;
            }
          }
        } catch (apiError) {
          console.warn("API fetch failed, trying Supabase directly:", apiError);
          // Fallback to Supabase
          const { data, error } = await supabase.from("mentors").select("*");

          if (error) {
            throw error;
          }

          if (data) {
            mentorsData = data;
          }
        }

        if (mentorsData.length > 0) {
          // Process mentors more efficiently
          const processedMentors = mentorsData.map((mentor: any) => {
            // Parse specialization from JSON string if needed
            let specialization = mentor.specialization || [];
            if (typeof specialization === "string") {
              try {
                specialization = JSON.parse(specialization);
              } catch {
                specialization = [];
              }
            }
            if (!Array.isArray(specialization)) {
              specialization = [];
            }

            // Parse languages from JSON string if needed
            let languages = mentor.languages || [];
            if (typeof languages === "string") {
              try {
                languages = JSON.parse(languages);
              } catch {
                languages = [];
              }
            }
            if (!Array.isArray(languages)) {
              languages = [];
            }

            return {
              ...mentor,
              latitude: mentor.latitude ? Number(mentor.latitude) : undefined,
              longitude: mentor.longitude
                ? Number(mentor.longitude)
                : undefined,
              specialization,
              languages,
              // Ensure hourly_rate is always a valid number
              hourly_rate:
                mentor.hourly_rate && mentor.hourly_rate > 0
                  ? Number(mentor.hourly_rate)
                  : mentor.hourly_rate || 0,
            };
          });
          setMentors(processedMentors);
          console.log(`Loaded ${processedMentors.length} mentors on dashboard`);
        } else {
          console.warn("No mentors found in database");
          setMentors([]);
        }
      } catch (error) {
        console.error("Error fetching mentors:", error);
        setMentors([]);
      } finally {
        setMentorsLoading(false);
      }
    };

    fetchMentors();
  }, [activeTab, isGlobalMentorSearchOpen]);

  // Check for tutor to book from landing page after login
  React.useEffect(() => {
    const checkForTutorToBook = async () => {
      const tutorToBookId = localStorage.getItem("tutorToBookId");
      const sessionToBookId = localStorage.getItem("sessionToBookId");
      if (!tutorToBookId) return;

      // If there's a session to book, fetch session data first
      let sessionData: any = null;
      if (sessionToBookId) {
        try {
          const { data: session, error } = await supabase
            .from("sessions")
            .select("*")
            .eq("id", sessionToBookId)
            .maybeSingle();

          if (!error && session) {
            // Format date and time properly for BookingModal
            // BookingModal expects preferred_time in format like "10:10 AM" or "2024-12-12 10:10"
            let preferredTime = "";
            if (session.date && session.time) {
              // Format time as "HH:MM AM/PM"
              try {
                const [hours, minutes] = session.time.split(":").map(Number);
                const ampm = hours >= 12 ? "PM" : "AM";
                const hours12 = hours % 12 || 12;
                preferredTime = `${hours12}:${minutes
                  .toString()
                  .padStart(2, "0")} ${ampm}`;
              } catch (e) {
                // If parsing fails, use the time as-is
                preferredTime = session.time;
              }
            }

            // Format date for BookingModal - it uses created_at to parse the date
            // But we want to use the session date, so we'll combine date and time
            let sessionDateTime = session.date;
            if (session.date && session.time) {
              // Create a proper ISO string from date and time
              try {
                const dateTime = new Date(`${session.date}T${session.time}`);
                sessionDateTime = dateTime.toISOString();
              } catch (e) {
                // Fallback to just the date
                sessionDateTime = session.date;
              }
            }

            sessionData = {
              id: session.id,
              subject: session.topic || session.subject || "General",
              preferred_time:
                preferredTime || (session.time ? session.time : undefined),
              description: session.notes || session.topic || "",
              grade_level: session.level || undefined,
              created_at: sessionDateTime || session.created_at, // Use session date/time for the date
            };
            console.log(
              "Found session to book:",
              sessionData,
              "Original session:",
              session
            );
          }
        } catch (error) {
          console.error("Error fetching session:", error);
        }
      }

      // If mentors are already loaded, find the mentor
      if (mentors.length > 0 && !mentorsLoading) {
        const mentorToBook = mentors.find(
          (m) =>
            m.id.toString() === tutorToBookId ||
            m.id === parseInt(tutorToBookId)
        );
        if (mentorToBook) {
          console.log("Found mentor to book:", mentorToBook);
          // Clear localStorage
          localStorage.removeItem("tutorToBookId");
          if (sessionToBookId) {
            localStorage.removeItem("sessionToBookId");
          }
          // Open booking modal with session data if available
          console.log(
            "Opening booking modal with mentor:",
            mentorToBook,
            "and session data:",
            sessionData
          );
          setBookingMentor(mentorToBook);
          if (sessionData) {
            setBookingRequestData(sessionData);
            console.log("Set booking request data:", sessionData);
          }
          setIsBookingModalOpen(true);
          console.log("Booking modal should now be open");
          return;
        }
      }

      // If mentors not loaded yet, fetch the specific mentor
      if (mentorsLoading || mentors.length === 0) {
        try {
          console.log(
            "Mentors not loaded, fetching mentor with ID:",
            tutorToBookId
          );
          const mentorId = parseInt(tutorToBookId);

          // Try API first
          try {
            const response = await fetch(
              `http://127.0.0.1:8000/api/v1/mentors/list/`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.mentors) {
                const mentor = data.mentors.find(
                  (m: any) =>
                    m.id === mentorId || m.id.toString() === tutorToBookId
                );
                if (mentor) {
                  // Parse specialization and languages
                  let specialization = mentor.specialization || [];
                  if (typeof specialization === "string") {
                    try {
                      specialization = JSON.parse(specialization);
                    } catch {
                      specialization = [];
                    }
                  }
                  if (!Array.isArray(specialization)) {
                    specialization = [];
                  }

                  let languages = mentor.languages || [];
                  if (typeof languages === "string") {
                    try {
                      languages = JSON.parse(languages);
                    } catch {
                      languages = [];
                    }
                  }
                  if (!Array.isArray(languages)) {
                    languages = [];
                  }

                  const mentorToBook: Mentor = {
                    ...mentor,
                    latitude: mentor.latitude
                      ? Number(mentor.latitude)
                      : undefined,
                    longitude: mentor.longitude
                      ? Number(mentor.longitude)
                      : undefined,
                    specialization,
                    languages,
                    hourly_rate:
                      mentor.hourly_rate && mentor.hourly_rate > 0
                        ? Number(mentor.hourly_rate)
                        : mentor.hourly_rate || 0,
                  };

                  console.log("Found mentor from API:", mentorToBook);
                  localStorage.removeItem("tutorToBookId");
                  if (sessionToBookId) {
                    localStorage.removeItem("sessionToBookId");
                  }
                  setBookingMentor(mentorToBook);
                  if (sessionData) {
                    setBookingRequestData(sessionData);
                  }
                  setIsBookingModalOpen(true);
                  return;
                }
              }
            }
          } catch (apiError) {
            console.warn("API fetch failed, trying Supabase:", apiError);
          }

          // Fallback to Supabase
          const { data: mentorData, error } = await supabase
            .from("mentors")
            .select("*")
            .eq("id", mentorId)
            .maybeSingle();

          if (!error && mentorData) {
            // Parse specialization and languages
            let specialization = mentorData.specialization || [];
            if (typeof specialization === "string") {
              try {
                specialization = JSON.parse(specialization);
              } catch {
                specialization = [];
              }
            }
            if (!Array.isArray(specialization)) {
              specialization = [];
            }

            let languages = mentorData.languages || [];
            if (typeof languages === "string") {
              try {
                languages = JSON.parse(languages);
              } catch {
                languages = [];
              }
            }
            if (!Array.isArray(languages)) {
              languages = [];
            }

            const mentorToBook: Mentor = {
              ...mentorData,
              latitude: mentorData.latitude
                ? Number(mentorData.latitude)
                : undefined,
              longitude: mentorData.longitude
                ? Number(mentorData.longitude)
                : undefined,
              specialization,
              languages,
              hourly_rate:
                mentorData.hourly_rate && mentorData.hourly_rate > 0
                  ? Number(mentorData.hourly_rate)
                  : mentorData.hourly_rate || 0,
            };

            console.log("Found mentor from Supabase:", mentorToBook);
            console.log(
              "Opening booking modal with session data:",
              sessionData
            );
            localStorage.removeItem("tutorToBookId");
            if (sessionToBookId) {
              localStorage.removeItem("sessionToBookId");
            }
            setBookingMentor(mentorToBook);
            if (sessionData) {
              setBookingRequestData(sessionData);
              console.log("Set booking request data:", sessionData);
            }
            setIsBookingModalOpen(true);
            console.log("Booking modal should now be open");
          } else {
            console.error("Mentor not found with ID:", tutorToBookId, error);
          }
        } catch (error) {
          console.error("Error fetching mentor:", error);
        }
      }
    };

    // Check immediately and also when mentors are loaded
    // Add a small delay to ensure page is fully loaded
    const timer = setTimeout(() => {
      console.log("Checking for tutor to book...", {
        tutorToBookId: localStorage.getItem("tutorToBookId"),
        sessionToBookId: localStorage.getItem("sessionToBookId"),
        mentorsLength: mentors.length,
        mentorsLoading,
      });
      checkForTutorToBook();
    }, 500);

    return () => clearTimeout(timer);
  }, [mentors, mentorsLoading]);

  // Fetch active ad campaigns for mentors
  React.useEffect(() => {
    const fetchActiveCampaigns = async () => {
      if (mentors.length === 0) return;

      try {
        // Fetch all active campaigns from Supabase
        const { data: campaigns, error } = await supabase
          .from("ad_campaigns")
          .select("mentor_id")
          .eq("status", "active");

        if (error) {
          console.error("Error fetching active campaigns:", error);
          return;
        }

        if (campaigns && campaigns.length > 0) {
          // Create a set of mentor IDs with active campaigns
          const mentorIdsWithAds = new Set(
            campaigns.map((campaign: any) => Number(campaign.mentor_id))
          );
          setMentorsWithAds(mentorIdsWithAds);
        }
      } catch (error) {
        console.error("Error fetching active campaigns:", error);
      }
    };

    fetchActiveCampaigns();
  }, [mentors]);

  // Fetch booked sessions AND all available sessions - only when needed (sessions tab or overview)
  React.useEffect(() => {
    const fetchBookedSessions = async () => {
      if (!userData?.email) {
        console.log("No user email, skipping session fetch");
        return;
      }
      // Only fetch if we're on sessions tab or overview tab
      if (activeTab !== "sessions" && activeTab !== "overview") {
        console.log(
          "Not on sessions/overview tab, skipping fetch. Active tab:",
          activeTab
        );
        return;
      }

      console.log(
        "Starting to fetch sessions for user:",
        userData.email,
        "Active tab:",
        activeTab
      );
      try {
        setSessionsLoading(true);
        // Optimized query - limit to recent sessions for overview, all for sessions tab
        const limit = activeTab === "overview" ? 5 : 100;

        // Fetch sessions booked by this student
        const { data: bookedSessionsData, error: bookedSessionsError } =
          await supabase
            .from("sessions")
            .select(
              `
            *,
            mentors (
              id,
              name,
              avatar,
              title,
              description,
              specialization,
              rating,
              total_reviews,
              hourly_rate,
              experience,
              languages,
              availability,
              country,
              is_verified,
              email,
              phone_number,
              qualifications,
              linkedin_profile,
              github_profile,
              twitter_profile,
              facebook_profile,
              instagram_profile,
              personal_website
            ),
            payments (
              id,
              status,
              payment_intent_id,
              paid_at
            )
          `
            )
            .eq("learner_email", userData.email)
            .order("date", { ascending: true })
            .order("time", { ascending: true })
            .limit(limit);

        // Fetch all upcoming public sessions created by mentors/tutors (available for booking)
        // Fetch ALL sessions first, then filter client-side to debug
        const today = new Date().toISOString().split("T")[0];

        console.log("Fetching public sessions with date >=", today);

        // Simplified query: fetch all sessions where private is false or null
        const { data: allSessionsData, error: allSessionsError } =
          await supabase
            .from("sessions")
            .select(
              `
            *,
            mentors (
              id,
              name,
              avatar,
              title,
              description,
              specialization,
              rating,
              total_reviews,
              hourly_rate,
              experience,
              languages,
              availability,
              country,
              is_verified,
              email,
              phone_number,
              qualifications,
              linkedin_profile,
              github_profile,
              twitter_profile,
              facebook_profile,
              instagram_profile,
              personal_website
            ),
            payments (
              id,
              status,
              payment_intent_id,
              paid_at
            )
          `
            )
            .gte("date", today)
            .eq("status", "scheduled")
            .order("date", { ascending: true })
            .order("time", { ascending: true })
            .limit(limit * 2); // Get more to filter

        console.log(
          "All sessions fetched:",
          allSessionsData?.length || 0,
          allSessionsData
        );

        // Filter client-side: only show public sessions (private = false or null)
        const availableSessionsData = (allSessionsData || []).filter(
          (session: any) => {
            const isPublic =
              session.private === false || session.private === null;
            console.log(
              `Session ${session.id} (${session.topic}): private=${session.private}, isPublic=${isPublic}`
            );
            return isPublic;
          }
        );

        const availableSessionsError = allSessionsError;

        console.log("Filtered public sessions:", availableSessionsData.length);

        if (bookedSessionsError) {
          console.error("Error fetching booked sessions:", bookedSessionsError);
        }
        if (availableSessionsError) {
          console.error(
            "Error fetching available sessions:",
            availableSessionsError
          );
          // Don't return early, continue with booked sessions even if available sessions fail
        }

        // Combine booked sessions and available public sessions, removing duplicates
        const allSessions = [
          ...(bookedSessionsData || []),
          ...(availableSessionsData || []),
        ];
        const uniqueSessions = Array.from(
          new Map(allSessions.map((session) => [session.id, session])).values()
        );

        // Show all sessions (booked by user OR public sessions)
        // No additional filtering needed since we already filtered in the query
        const sessionsData = uniqueSessions;

        console.log(
          "Sessions data before transformation:",
          sessionsData.length,
          sessionsData
        );

        // Transform the data efficiently
        const transformedSessions: BookedSession[] = sessionsData
          .filter((session: any) => {
            const hasMentor = !!session.mentors;
            if (!hasMentor) {
              console.log(
                "Filtering out session without mentor:",
                session.id,
                session.topic
              );
            }
            return hasMentor;
          }) // Only include sessions with mentor data
          .map((session: any) => {
            // Check if payment exists and is successful
            const payment = Array.isArray(session.payments)
              ? session.payments[0]
              : session.payments;
            const isPaid =
              payment &&
              (payment.status === "succeeded" ||
                payment.status === "completed");

            // Build full mentor object for details modal
            const mentorData: Mentor | null = session.mentors
              ? {
                  id: session.mentors.id,
                  supabase_id: "",
                  name: session.mentors.name || "Unknown Mentor",
                  title: session.mentors.title || "",
                  description: session.mentors.description || "",
                  specialization: Array.isArray(session.mentors.specialization)
                    ? session.mentors.specialization
                    : typeof session.mentors.specialization === "string"
                    ? JSON.parse(session.mentors.specialization || "[]")
                    : [],
                  rating: session.mentors.rating || 0,
                  total_reviews: session.mentors.total_reviews || 0,
                  hourly_rate: session.mentors.hourly_rate || 0,
                  avatar:
                    session.mentors.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      session.mentors.name || "User"
                    )}&background=3B82F6&color=fff&size=128`,
                  experience: session.mentors.experience?.toString() || "0",
                  languages: Array.isArray(session.mentors.languages)
                    ? session.mentors.languages
                    : typeof session.mentors.languages === "string"
                    ? JSON.parse(session.mentors.languages || "[]")
                    : [],
                  availability: session.mentors.availability || "Available now",
                  country: session.mentors.country || "",
                  is_verified:
                    session.mentors.is_verified === true ||
                    session.mentors.is_verified === "true",
                  email: session.mentors.email || "",
                  phone_number: session.mentors.phone_number || "",
                  qualifications: session.mentors.qualifications || "",
                  linkedin_profile: session.mentors.linkedin_profile || "",
                  github_profile: session.mentors.github_profile || "",
                  twitter_profile: session.mentors.twitter_profile || "",
                  facebook_profile: session.mentors.facebook_profile || "",
                  instagram_profile: session.mentors.instagram_profile || "",
                  personal_website: session.mentors.personal_website || "",
                  sessions_conducted: 0,
                }
              : null;

            return {
              id: session.id,
              mentor_id: session.mentor_id,
              mentor_name: session.mentors?.name || "Unknown Mentor",
              mentor_avatar:
                session.mentors?.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  session.mentors?.name || "User"
                )}&background=3B82F6&color=fff&size=128`,
              mentor_title: session.mentors?.title || "",
              mentor_data: mentorData,
              learner_name: session.learner_name,
              learner_email: session.learner_email,
              date: session.date,
              time: session.time,
              duration: session.duration,
              topic: session.topic,
              notes: session.notes || "",
              meeting_type: session.meeting_type,
              meeting_link: session.meeting_link || "",
              status: session.status,
              amount: parseFloat(session.amount) || 0,
              is_paid: isPaid,
              payment_id: payment?.id || null,
              created_at: session.created_at,
            };
          });

        console.log("Fetched sessions:", {
          booked: bookedSessionsData?.length || 0,
          available: availableSessionsData?.length || 0,
          unique: uniqueSessions.length,
          total: transformedSessions.length,
          sessions: transformedSessions.map((s) => ({
            id: s.id,
            topic: s.topic,
            learner_email: s.learner_email,
            mentor_name: s.mentor_name,
            private: (sessionsData.find((ss: any) => ss.id === s.id) as any)
              ?.private,
          })),
        });

        // Debug: Log raw data
        console.log("Raw available sessions:", availableSessionsData);
        console.log("Raw booked sessions:", bookedSessionsData);

        setBookedSessions(transformedSessions);
        // Reset to first page when sessions change
        setCurrentPage(1);
      } catch (error) {
        console.error("Error fetching sessions:", error);
        setBookedSessions([]);
        setCurrentPage(1);
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchBookedSessions();
  }, [userData?.email, activeTab]);

  // Convert all session amounts when sessions or user location changes
  React.useEffect(() => {
    const convertAllAmounts = async () => {
      if (bookedSessions.length === 0) {
        setConvertedAmounts({});
        return;
      }

      const conversions: Record<string, string> = {};

      for (const session of bookedSessions) {
        try {
          // Assume amount in database is in USD
          const usdAmount = session.amount;
          if (userLocation) {
            const result = await convertAndFormatPrice(usdAmount, userLocation);
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
          conversions[session.id] = `$${session.amount.toFixed(2)}`;
        }
      }

      setConvertedAmounts(conversions);
    };

    convertAllAmounts();
  }, [bookedSessions, userLocation]);

  // Convert mentor hourly rates when mentors or user location changes
  // Use database pricing from tutor_pricing table with API-based currency conversion
  React.useEffect(() => {
    const convertHourlyRates = async () => {
      if (mentors.length === 0) {
        setConvertedHourlyRates({});
        return;
      }

      const conversions: Record<number, string> = {};

      try {
        // Process all mentors in parallel for better performance
        // getTutorPricing fetches pricing data internally
        await Promise.all(
          mentors.map(async (mentor) => {
            try {
              // Get mentor's primary subject from specialization
              let primarySubject = "General";
              if (
                mentor.specialization &&
                Array.isArray(mentor.specialization) &&
                mentor.specialization.length > 0
              ) {
                primarySubject = mentor.specialization[0];
              } else if (typeof mentor.specialization === "string") {
                try {
                  const parsed = JSON.parse(mentor.specialization);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    primarySubject = parsed[0];
                  }
                } catch {
                  // Keep default
                }
              }

              // Determine level from mentor data
              const mentorLevel =
                (mentor as any).level ||
                (mentor as any).education_level ||
                "Secondary";
              const mentorCategory = (mentor as any).category || undefined;
              const mentorSubLevel =
                (mentor as any).sub_level ||
                (mentor as any).grade_level ||
                undefined;

              // Use getTutorPricing to match landing page pricing logic
              const tutorCountry = mentor.country || "South Africa";
              const pricingMatch = await getTutorPricing(
                primarySubject,
                tutorCountry,
                mentorLevel,
                mentorCategory,
                mentorSubLevel
              );

              // Format price the same way as landing page: {currencySymbol}{price.toFixed(2)}
              conversions[mentor.id] = `${
                pricingMatch.currencySymbol
              }${pricingMatch.hourlyRateLocal.toFixed(2)}`;
            } catch (error) {
              console.error(
                `Error converting hourly rate for mentor ${mentor.id}:`,
                error
              );
              // Fallback to USD with default rate
              conversions[mentor.id] = `$10.00`;
            }
          })
        );
      } catch (error) {
        console.error("Error fetching pricing data:", error);
        // Fallback: use mentor's hourly_rate or default
        await Promise.all(
          mentors.map(async (mentor) => {
            const usdRate =
              mentor.hourly_rate && mentor.hourly_rate > 0
                ? mentor.hourly_rate
                : 10.0;
            try {
              const result = await convertAndFormatPrice(usdRate, userLocation);
              conversions[mentor.id] = result.formatted;
            } catch {
              conversions[mentor.id] = `$${usdRate.toFixed(2)}`;
            }
          })
        );
      }

      setConvertedHourlyRates(conversions);
    };

    convertHourlyRates();
  }, [mentors, userLocation]);

  // Memoize renderStars to avoid recreating on every render
  const renderStars = React.useCallback((rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star
          key="half"
          className="w-4 h-4 text-yellow-400 fill-yellow-400 opacity-50"
        />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star
          key={`empty-${i}`}
          className="w-4 h-4 text-gray-300 fill-gray-300"
        />
      );
    }

    return stars;
  }, []);

  // Logo colors for the circle background
  const circleColors = {
    overview: "rgba(59, 130, 246, 0.1)", // Light Blue transparent
    sessions: "rgba(96, 165, 250, 0.1)", // Lighter Blue transparent
    progress: "rgba(147, 197, 253, 0.1)", // Lightest Blue transparent
    achievements: "rgba(59, 130, 246, 0.1)", // Light Blue transparent
  };

  // Border colors for the circle with glow
  const circleBorderColors = {
    overview: "#3B82F6", // Light Blue
    sessions: "#60A5FA", // Lighter Blue
    progress: "#93C5FD", // Lightest Blue
    achievements: "#3B82F6", // Light Blue
  };

  // Fetch tutor requests when user data is available
  React.useEffect(() => {
    console.log("🔵 TUTOR REQUESTS useEffect triggered!");
    console.log("🔵 userData:", userData);

    const fetchTutorRequests = async () => {
      try {
        console.log("🟢 Starting fetchTutorRequests function...");

        // Get the authenticated user's email directly from Supabase Auth
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error("❌ Auth error:", authError);
          return;
        }

        if (!user?.email) {
          console.log(
            "⚠️ No user email available from auth, skipping tutor requests fetch"
          );
          return;
        }

        setRequestsLoading(true);

        console.log("📧 ========== FETCHING ALL TUTOR REQUESTS ==========");
        console.log("📋 Table: tutor_requests");
        console.log("🔎 Fetching ALL requests (no email filter)");

        // Fetch all requests - RLS policy will handle filtering
        let { data, error } = await supabase
          .from("tutor_requests")
          .select("*")
          .order("created_at", { ascending: false });

        console.log("🔵 Query - Error:", error);
        console.log("🔵 Query - Error code:", error?.code);
        console.log("🔵 Query - Error message:", error?.message);
        console.log("🔵 Query - Data count:", data?.length || 0);
        console.log("🔵 Query - Data:", JSON.stringify(data, null, 2));

        // Log all emails found in the requests
        if (data && data.length > 0) {
          console.log(
            "📧 Emails in requests:",
            data.map((r) => r.student_email)
          );
        }

        if (error) {
          console.error("❌ Error fetching tutor requests:", error);
          console.error("❌ Error code:", error.code);
          console.error("❌ Error message:", error.message);

          // If it's a permission error (42501 or 403), it's likely an RLS policy issue
          if (
            error.code === "42501" ||
            error.code === "PGRST301" ||
            error.message?.includes("permission denied")
          ) {
            console.error(
              "⚠️ RLS Policy Error: The policy is blocking access to tutor_requests table."
            );
            console.error(
              "💡 Solution: Run TEMP_DISABLE_RLS_FOR_TESTING.sql in Supabase SQL Editor to temporarily allow access."
            );
            // Don't throw, just set empty array
            setTutorRequests([]);
            setRequestsLoading(false);
            return;
          }

          console.error("❌ Error details:", JSON.stringify(error, null, 2));
          setTutorRequests([]);
          setRequestsLoading(false);
          return;
        }

        console.log("🎉 === FINAL RESULT ===");
        console.log("📈 Total requests found:", data?.length || 0);
        console.log("📋 Requests:", JSON.stringify(data, null, 2));

        // Always set the data, even if empty
        if (data) {
          console.log(
            "✅ Setting tutor requests state with",
            data.length,
            "requests"
          );
          // Debug: Log meeting_link for paid requests
          data.forEach((req: any) => {
            if (req.payment_status === "paid") {
              console.log(
                `Request ${req.id} - payment_status: ${req.payment_status}, meeting_link:`,
                req.meeting_link
              );
            }
          });
          // Filter out cancelled requests from display
          const activeRequests = data.filter(
            (req: any) => req.status !== "cancelled"
          );
          setTutorRequests(activeRequests);
          console.log(
            "✅ State set! tutorRequests should now have",
            data.length,
            "items"
          );

          // Fetch pricing for all requests
          if (data.length > 0) {
            try {
              const pricingData = await fetchTutorPricing();
              const pricingMap: Record<
                number,
                {
                  hourlyRateUSD: number;
                  hourlyRateLocal: string;
                  currencySymbol: string;
                }
              > = {};

              // Currency conversion will use userLocation for API-based conversion

              // First, get all accepted requests to calculate review-based pricing
              const acceptedRequests = (data || []).filter(
                (req: any) =>
                  req.status === "accepted" && req.accepted_by_mentor_id
              );

              // Fetch mentors for accepted requests to get review counts
              let mentorsWithReviews: Record<number, number> = {};
              if (acceptedRequests.length > 0) {
                const mentorIds = acceptedRequests.map(
                  (req: any) => req.accepted_by_mentor_id
                );
                const { data: mentorsData } = await supabase
                  .from("mentors")
                  .select("id, total_reviews")
                  .in("id", mentorIds);

                if (mentorsData) {
                  acceptedRequests.forEach((req: any) => {
                    const mentor = mentorsData.find(
                      (m: any) => m.id === req.accepted_by_mentor_id
                    );
                    if (mentor) {
                      mentorsWithReviews[req.id] = mentor.total_reviews || 0;
                    }
                  });
                }
              }

              // Process all requests and convert prices in parallel for better performance
              await Promise.all(
                data.map(async (request: any) => {
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

                  const matchedPricing = findMatchingPricing(
                    pricingData,
                    request.subject,
                    level
                  );

                  let hourlyRateUSD = matchedPricing
                    ? parseFloat(matchedPricing.hourly_rate_usd.toString())
                    : 10.0;

                  // Apply review-based price increase (2% per review for tutors with reviews)
                  // Tutors with more reviews get higher prices
                  if (
                    request.status === "accepted" &&
                    mentorsWithReviews[request.id] !== undefined
                  ) {
                    const tutorReviews = mentorsWithReviews[request.id];
                    if (tutorReviews > 0) {
                      // Increase by 2% per review
                      const reviewMultiplier = 1 + tutorReviews * 0.02;
                      hourlyRateUSD = hourlyRateUSD * reviewMultiplier;
                    }
                  }

                  // Apply 25% discount for tutor requests
                  const discountedRateUSD = hourlyRateUSD * 0.75;

                  // Convert to local currency using API-based conversion
                  // Use userLocation if available, otherwise try to detect from browser
                  let locationToUse = userLocation;

                  // DISABLED: Removed automatic location request to prevent permission popup
                  // Location will only be requested when user explicitly clicks a button
                  // If userLocation is not set, skip location-based conversion
                  if (!locationToUse) {
                    console.log("Location not available, skipping location-based conversion");
                  }

                  const convertedPrice = await convertAndFormatPrice(
                    discountedRateUSD,
                    locationToUse
                  );

                  pricingMap[request.id] = {
                    hourlyRateUSD: discountedRateUSD,
                    hourlyRateLocal: convertedPrice.formatted,
                    currencySymbol: convertedPrice.symbol,
                  };
                })
              );
              setRequestPricing(pricingMap);
            } catch (pricingError) {
              console.error("Error fetching pricing:", pricingError);
            }
          }
        } else {
          console.log("⚠️ Data is null/undefined. Setting empty array.");
          setTutorRequests([]);
        }

        // Fetch mentors who accepted requests
        const acceptedRequests = (data || []).filter(
          (req: any) => req.status === "accepted" && req.accepted_by_mentor_id
        );

        if (acceptedRequests.length > 0) {
          const mentorIds = acceptedRequests.map(
            (req: any) => req.accepted_by_mentor_id
          );
          const { data: mentorsData, error: mentorsError } = await supabase
            .from("mentors")
            .select("*")
            .in("id", mentorIds);

          if (!mentorsError && mentorsData) {
            const mentorsMap: Record<number, any> = {};
            acceptedRequests.forEach((req: any) => {
              const mentor = mentorsData.find(
                (m: any) => m.id === req.accepted_by_mentor_id
              );
              if (mentor) {
                mentorsMap[req.id] = mentor;
              }
            });
            setAcceptedMentors(mentorsMap);
          }
        }
      } catch (error) {
        console.error("Exception in fetchTutorRequests:", error);
        setTutorRequests([]);
      } finally {
        setRequestsLoading(false);
      }
    };

    // Only fetch if we have user data or can get auth user
    if (userData || true) {
      // Always try to fetch
      fetchTutorRequests();
    }
  }, [userData]);

  // Reconvert pricing when userLocation changes (if pricing already exists)
  React.useEffect(() => {
    if (!userLocation || Object.keys(requestPricing).length === 0) return;

    const reconvertPricing = async () => {
      try {
        const pricingMap: Record<
          number,
          {
            hourlyRateUSD: number;
            hourlyRateLocal: string;
            currencySymbol: string;
          }
        > = {};

        // Reconvert existing USD amounts with new location
        await Promise.all(
          Object.entries(requestPricing).map(async ([requestId, pricing]) => {
            const convertedPrice = await convertAndFormatPrice(
              pricing.hourlyRateUSD,
              userLocation
            );
            pricingMap[parseInt(requestId)] = {
              hourlyRateUSD: pricing.hourlyRateUSD,
              hourlyRateLocal: convertedPrice.formatted,
              currencySymbol: convertedPrice.symbol,
            };
          })
        );
        setRequestPricing(pricingMap);
      } catch (error) {
        console.error("Error reconverting pricing:", error);
      }
    };

    reconvertPricing();
  }, [userLocation]);

  // Fetch tasks for the learner
  React.useEffect(() => {
    const fetchTasks = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user?.id) return;

        setTasksLoading(true);
        const { data: tasksData, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("learner_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching tasks:", error);
          setTasks([]);
        } else {
          setTasks(tasksData || []);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setTasks([]);
      } finally {
        setTasksLoading(false);
      }
    };

    fetchTasks();
  }, [userData]);

  const handleSelectMentor = async (requestId: number, mentorId: number) => {
    try {
      setSelectingMentor(true);
      console.log("📚 Selecting mentor:", mentorId, "for request:", requestId);

      // Update the request to mark the mentor as selected/booked
      const { error } = await supabase
        .from("tutor_requests")
        .update({
          status: "completed", // Mark as completed when tutor is booked
          accepted_by_mentor_id: mentorId,
        })
        .eq("id", requestId);

      if (error) {
        console.error("❌ Error updating request:", error);
        throw error;
      }

      console.log("✅ Request updated successfully");

      // Remove the accepted mentor from the display for this request
      setAcceptedMentors((prev) => {
        const updated = { ...prev };
        delete updated[requestId];
        return updated;
      });

      // Update the request status in local state
      setTutorRequests((prev) =>
        prev.map((req) =>
          req.id === requestId
            ? { ...req, status: "completed", accepted_by_mentor_id: mentorId }
            : req
        )
      );

      setIsMentorDetailsModalOpen(false);
      setSelectedMentorForModal(null);

      // Show success message
      alert("Tutor selected successfully! You can now proceed with booking.");
    } catch (error) {
      console.error("❌ Error selecting mentor:", error);
      alert("Failed to select tutor. Please try again.");
    } finally {
      setSelectingMentor(false);
    }
  };

  // Compute stats based on actual data
  const stats = React.useMemo(() => {
    // Calculate Total Sessions from bookedSessions
    const totalSessions = bookedSessions.length;
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const sessionsThisMonth = bookedSessions.filter((session) => {
      const sessionDate = new Date(session.date);
      return (
        sessionDate.getMonth() === thisMonth &&
        sessionDate.getFullYear() === thisYear
      );
    }).length;
    const sessionsChangeText =
      sessionsThisMonth > 0
        ? `+${sessionsThisMonth} this month`
        : totalSessions > 0
        ? `${totalSessions} total`
        : "No sessions yet";

    // Calculate Active Tutors from unique mentors in bookedSessions
    const uniqueMentorIds = new Set(
      bookedSessions
        .map((session) => session.mentor_id)
        .filter((id) => id != null)
    );
    const activeTutorsCount = uniqueMentorIds.size;

    // Calculate new tutors this month
    const sessionsThisMonthWithMentors = bookedSessions.filter((session) => {
      const sessionDate = new Date(session.date);
      return (
        sessionDate.getMonth() === thisMonth &&
        sessionDate.getFullYear() === thisYear &&
        session.mentor_id != null
      );
    });
    const newMentorIdsThisMonth = new Set(
      sessionsThisMonthWithMentors.map((session) => session.mentor_id)
    );
    const newTutorsCount = newMentorIdsThisMonth.size;
    const tutorsChangeText =
      newTutorsCount > 0
        ? `+${newTutorsCount} new tutors`
        : activeTutorsCount > 0
        ? `${activeTutorsCount} active`
        : "No tutors yet";

    // Calculate Tasks from actual tasks table
    const totalTasks = tasks.length;
    const tasksThisMonth = tasks.filter((task) => {
      const taskDate = new Date(task.created_at);
      return (
        taskDate.getMonth() === thisMonth && taskDate.getFullYear() === thisYear
      );
    }).length;
    const tasksChangeText =
      tasksThisMonth > 0
        ? `+${tasksThisMonth} this month`
        : totalTasks > 0
        ? `${totalTasks} total`
        : "No tasks yet";

    return [
      {
        name: "Total Sessions",
        value: totalSessions.toString(),
        change: sessionsChangeText,
        icon: BookOpen,
        color: "#3B82F6", // Light Blue
      },
      {
        name: "Active Tutors",
        value: activeTutorsCount.toString(),
        change: tutorsChangeText,
        icon: Users,
        color: "#60A5FA", // Lighter Blue
      },
      {
        name: "Tasks",
        value: totalTasks.toString(),
        change: tasksChangeText,
        icon: Clock,
        color: "#93C5FD", // Lightest Blue
      },
    ];
  }, [bookedSessions, tasks]);

  // Memoize tab content to avoid recalculation
  const content = React.useMemo(() => {
    const totalRequests = tutorRequests.length;
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const requestsThisMonth = tutorRequests.filter((req) => {
      const reqDate = new Date(req.created_at);
      return (
        reqDate.getMonth() === thisMonth && reqDate.getFullYear() === thisYear
      );
    }).length;
    const changeText =
      requestsThisMonth > 0
        ? `+${requestsThisMonth} this month`
        : `${totalRequests} total`;

    switch (activeTab) {
      case "sessions":
        return {
          title: "Sessions Overview",
          description: "Your learning sessions and tutor requests",
          amount: totalRequests.toString(),
          percentage:
            requestsThisMonth > 0
              ? `${Math.round(
                  (requestsThisMonth / Math.max(totalRequests, 1)) * 100
                )}%`
              : "0%",
          comparison: changeText,
          share: `${totalRequests} total requests`,
        };
      case "progress":
        return {
          title: "Tasks Overview",
          description: "Your learning progress and achievements",
          amount: "87%",
          percentage: "15%",
          comparison: "vs last month",
          share: "87% completion rate",
        };
      case "achievements":
        return {
          title: "Available Tutors",
          description:
            "Browse and connect with verified tutors, lecturers, and therapists",
          amount: mentors.length.toString(),
          percentage: "",
          comparison: "",
          share: `${mentors.length} tutors available`,
        };
      default:
        return {
          title: "Learning Overview",
          description: "Your learning journey at a glance",
          amount: progressData.current.amount,
          percentage: progressData.current.percentage,
          comparison: progressData.current.vsLastMonth,
          share: progressData.current.ofTotal,
        };
    }
  }, [activeTab, tutorRequests, mentors]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingLogo size={48} />
      </div>
    );
  }

  return (
    <DashboardLayout role="learner">
      <div className="space-y-6 p-6">
        {/* User Welcome Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {userData?.full_name || "Learner"}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's an overview of your learning journey.
            </p>
          </div>
          <button
            onClick={() => {
              setIsGlobalMentorSearchOpen(true);
              // Always set searching state when opening
              setIsFindingLocation(true);
              // Get user location when opening
              if (!userLocation && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    setUserLocation({
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                    });
                    // Keep searching state for a bit to show the UI
                    setTimeout(() => {
                      setIsFindingLocation(false);
                    }, 1000);
                  },
                  (error) => {
                    console.error("Error getting location:", error);
                    // Keep searching state for a bit even on error
                    setTimeout(() => {
                      setIsFindingLocation(false);
                    }, 1000);
                  },
                  {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                  }
                );
              } else {
                // If location already exists, still show searching briefly
                setTimeout(() => {
                  setIsFindingLocation(false);
                }, 500);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm hover:shadow-md whitespace-nowrap"
          >
            <MapPin className="w-4 h-4" />
            <span>Find Nearby Mentor</span>
          </button>
        </div>

        {/* Horizontal Lines */}
        <div className="flex flex-col gap-2 mb-8">
          <motion.div
            className="h-0.5 bg-gradient-to-r from-blue-400 to-transparent"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.7, delay: 0.1 }}
          />
          <motion.div
            className="h-0.5 bg-gradient-to-r from-blue-300 to-transparent w-3/4"
            initial={{ width: 0 }}
            animate={{ width: "75%" }}
            transition={{ duration: 0.7, delay: 0.2 }}
          />
          <motion.div
            className="h-0.5 bg-gradient-to-r from-blue-200 to-transparent w-1/2"
            initial={{ width: 0 }}
            animate={{ width: "50%" }}
            transition={{ duration: 0.7, delay: 0.3 }}
          />
          <motion.div
            className="h-0.5 bg-gradient-to-r from-blue-100 to-transparent w-1/4"
            initial={{ width: 0 }}
            animate={{ width: "25%" }}
            transition={{ duration: 0.7, delay: 0.4 }}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white border rounded-xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-sm"
              style={{
                borderColor: stat.color + "40",
                boxShadow: `0 4px 6px -1px ${stat.color}20, 0 2px 4px -1px ${stat.color}10`,
              }}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-600 text-sm group-hover:text-gray-900 transition-colors">
                    {stat.name}
                  </span>
                  <stat.icon
                    className="h-4 w-4 transition-colors"
                    style={{ color: stat.color }}
                  />
                </div>
                <motion.div
                  className="text-3xl font-bold mb-2 transition-all duration-300"
                  style={{
                    color: stat.color,
                  }}
                >
                  {stat.value}
                </motion.div>
                <div className="text-sm text-gray-600 transition-colors">
                  {stat.change}
                </div>
              </div>
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle at center, ${stat.color} 0%, transparent 70%)`,
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-blue-500 text-blue-600 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === "sessions"
                ? "border-blue-400 text-blue-600 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Sessions
          </button>
          <button
            onClick={() => setActiveTab("progress")}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === "progress"
                ? "border-blue-300 text-blue-600 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab("achievements")}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === "achievements"
                ? "border-blue-500 text-blue-600 font-medium"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Available Tutors
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          {activeTab === "overview" && (
            <div>
              {/* Tutor Requests Section - Show First */}
              <div className="mb-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      My Tutor Requests
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Requests you've submitted for tutoring assistance
                    </p>
                  </div>
                  <button
                    onClick={() => setIsTutorRequestPopupOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm hover:shadow-md whitespace-nowrap"
                  >
                    <BookOpen className="w-4 h-4" />
                    Make a Request
                  </button>
                </div>

                {requestsLoading ? (
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="bg-gray-100 rounded-lg p-4 animate-pulse min-w-[320px] flex-shrink-0"
                      >
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : tutorRequests.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                          case "completed":
                            return (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                Completed
                              </span>
                            );
                          case "cancelled":
                            return (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                                Cancelled
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
                        <motion.div
                          key={request.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                          className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden relative group flex flex-col"
                          style={{ minHeight: "280px" }}
                        >
                          {/* Decorative gradient accent */}
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500"></div>

                          <div className="flex flex-col gap-3 flex-1">
                            {/* Header with Subject, Status, and Edit Button */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                    {request.subject}
                                  </h4>
                                  {getStatusBadge(request.status)}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Calendar className="w-3 h-3" />
                                  <span>{formattedDate}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingRequest(request);
                                    setIsEditModalOpen(true);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md border border-blue-200 hover:border-blue-600"
                                  title="Edit Request"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                {request.payment_status === "pending" && (
                                  <button
                                    onClick={() =>
                                      handleCloseRequest(request.id)
                                    }
                                    disabled={deletingRequestId === request.id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md border border-red-200 hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Close Request"
                                  >
                                    {deletingRequestId === request.id ? (
                                      <>
                                        <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Closing...</span>
                                      </>
                                    ) : (
                                      <>
                                        <X className="w-3.5 h-3.5" />
                                        <span>Close</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Description - Compact */}
                            {request.description && (
                              <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                                  <p className="text-xs text-gray-700 line-clamp-2">
                                    {request.description}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Payment Status - Always Visible */}
                            <div className="flex items-center gap-2 text-xs mt-2">
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
                                  Payment:{" "}
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

                            {/* Expandable Details */}
                            {expandedRequests.has(request.id) && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-2 overflow-hidden mt-2"
                              >
                                {/* Student Info - Compact */}
                                <div className="space-y-1.5 pt-1.5 border-t border-gray-100">
                                  {request.student_name && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                        <User className="w-3 h-3 text-blue-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-gray-500 text-xs">
                                          Name:{" "}
                                        </span>
                                        <span className="text-gray-900 font-medium">
                                          {request.student_name}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {request.student_email && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                        <Mail className="w-3 h-3 text-blue-600" />
                                      </div>
                                      <div className="flex-1 min-w-0 truncate">
                                        <span className="text-gray-500 text-xs">
                                          Email:{" "}
                                        </span>
                                        <span className="text-gray-900 font-medium truncate">
                                          {request.student_email}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {request.student_phone && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                        <Phone className="w-3 h-3 text-green-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-gray-500 text-xs">
                                          Phone:{" "}
                                        </span>
                                        <span className="text-gray-900 font-medium">
                                          {request.student_phone}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Request Details - Compact */}
                                <div className="pt-1.5 border-t border-gray-100 space-y-1.5">
                                  {request.grade_level && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                        <GraduationCap className="w-3 h-3 text-orange-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-gray-500 text-xs">
                                          Grade:{" "}
                                        </span>
                                        <span className="text-gray-900 font-medium capitalize">
                                          {request.grade_level}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {request.preferred_time && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                        <Clock className="w-3 h-3 text-indigo-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-gray-500 text-xs">
                                          Time:{" "}
                                        </span>
                                        <span className="text-gray-900 font-medium">
                                          {request.preferred_time}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}

                            {/* View More / View Less Button */}
                            <button
                              onClick={() => {
                                setExpandedRequests((prev) => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(request.id)) {
                                    newSet.delete(request.id);
                                  } else {
                                    newSet.add(request.id);
                                  }
                                  return newSet;
                                });
                              }}
                              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 mt-2"
                            >
                              {expandedRequests.has(request.id) ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                  View Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                  View More
                                </>
                              )}
                            </button>

                            {/* Accepted Tutors Section - Only show if status is accepted and tutor exists */}
                            {request.status === "accepted" &&
                            acceptedMentors[request.id] ? (
                              <div className="pt-1.5 border-t border-gray-200 mt-2 mt-auto">
                                <div className="mb-1.5">
                                  <p className="text-xs font-semibold text-gray-700 mb-1.5">
                                    Tutor Who Accepted:
                                  </p>
                                  <motion.div
                                    className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${
                                      request.status === "completed" &&
                                      request.accepted_by_mentor_id ===
                                        acceptedMentors[request.id]?.id
                                        ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300"
                                        : "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"
                                    }`}
                                    whileHover={{ scale: 1.01 }}
                                    onClick={() => {
                                      setSelectedMentorForModal(
                                        acceptedMentors[request.id]
                                      );
                                      setRelatedRequestForModal(request);
                                      setIsMentorDetailsModalOpen(true);
                                    }}
                                  >
                                    <img
                                      src={
                                        acceptedMentors[request.id].avatar ||
                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                          acceptedMentors[request.id].name
                                        )}&background=${
                                          request.status === "completed" &&
                                          request.accepted_by_mentor_id ===
                                            acceptedMentors[request.id]?.id
                                            ? "10b981"
                                            : "f59e0b"
                                        }&color=fff&size=128`
                                      }
                                      alt={acceptedMentors[request.id].name}
                                      className={`w-8 h-8 rounded-full object-cover border-2 ${
                                        request.status === "completed" &&
                                        request.accepted_by_mentor_id ===
                                          acceptedMentors[request.id]?.id
                                          ? "border-green-300"
                                          : "border-yellow-300"
                                      }`}
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                          acceptedMentors[request.id].name
                                        )}&background=10b981&color=fff&size=128`;
                                      }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-gray-900 truncate">
                                        {acceptedMentors[request.id].name}
                                      </p>
                                      <p className="text-xs text-gray-600 truncate">
                                        {acceptedMentors[request.id].title ||
                                          "Tutor"}
                                      </p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                                        <span className="text-xs text-gray-700">
                                          {acceptedMentors[
                                            request.id
                                          ].rating?.toFixed(1) || "5.0"}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          (
                                          {acceptedMentors[request.id]
                                            .total_reviews || 0}{" "}
                                          reviews)
                                        </span>
                                      </div>
                                      {requestPricing[request.id] && (
                                        <div
                                          className={`flex items-center gap-1 mt-0.5 pt-0.5 border-t ${
                                            request.status === "completed" &&
                                            request.accepted_by_mentor_id ===
                                              acceptedMentors[request.id]?.id
                                              ? "border-green-200"
                                              : "border-yellow-200"
                                          }`}
                                        >
                                          <DollarSign
                                            className={`w-2.5 h-2.5 ${
                                              request.status === "completed" &&
                                              request.accepted_by_mentor_id ===
                                                acceptedMentors[request.id]?.id
                                                ? "text-green-600"
                                                : "text-yellow-600"
                                            }`}
                                          />
                                          <span className="text-xs text-gray-500">
                                            Hourly Rate:
                                          </span>
                                          <span
                                            className={`text-xs font-bold ${
                                              request.status === "completed" &&
                                              request.accepted_by_mentor_id ===
                                                acceptedMentors[request.id]?.id
                                                ? "text-green-700"
                                                : "text-yellow-700"
                                            }`}
                                          >
                                            {
                                              requestPricing[request.id]
                                                .hourlyRateLocal
                                            }{" "}
                                            <span className="text-xs text-green-600 font-normal">
                                              (25% off)
                                            </span>
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <motion.div
                                      animate={{ x: [0, 3, 0] }}
                                      transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                      }}
                                    >
                                      <ArrowRight
                                        className={`w-3 h-3 ${
                                          request.status === "completed" &&
                                          request.accepted_by_mentor_id ===
                                            acceptedMentors[request.id]?.id
                                            ? "text-green-600"
                                            : "text-yellow-600"
                                        }`}
                                      />
                                    </motion.div>
                                  </motion.div>
                                </div>
                                {/* Meeting Link - Show when payment is paid and request is accepted */}
                                {request.status === "accepted" &&
                                  request.payment_status === "paid" &&
                                  (request.meeting_link ||
                                    request.meetingLink) && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <p className="text-xs font-semibold text-gray-700 mb-1.5">
                                        Meeting Link
                                      </p>
                                      <div className="flex flex-col gap-2">
                                        <a
                                          href={
                                            request.meeting_link ||
                                            request.meetingLink
                                          }
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 text-sm font-semibold w-full shadow-md hover:shadow-lg"
                                        >
                                          <Video className="w-4 h-4" />
                                          Join Meeting
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                        <button
                                          onClick={async () => {
                                            const link =
                                              request.meeting_link ||
                                              request.meetingLink ||
                                              "";
                                            try {
                                              await navigator.clipboard.writeText(
                                                link
                                              );
                                              setCopiedLinkId(request.id);
                                              setTimeout(() => {
                                                setCopiedLinkId(null);
                                              }, 2000);
                                            } catch (err) {
                                              console.error(
                                                "Failed to copy:",
                                                err
                                              );
                                            }
                                          }}
                                          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-xs font-medium w-full border ${
                                            copiedLinkId === request.id
                                              ? "bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                                              : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                                          }`}
                                        >
                                          {copiedLinkId === request.id ? (
                                            <>
                                              <Check className="w-3.5 h-3.5" />
                                              Copied!
                                            </>
                                          ) : (
                                            <>
                                              <Copy className="w-3.5 h-3.5" />
                                              Copy Link
                                            </>
                                          )}
                                        </button>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-2 text-center">
                                        This link has been sent to your email.
                                        You can also copy it here.
                                      </p>
                                    </div>
                                  )}
                              </div>
                            ) : (
                              // Add divider for cards without accepted tutors
                              <div className="pt-2 border-t border-gray-200 mt-2 mt-auto"></div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <h4 className="text-base font-semibold text-gray-900 mb-1">
                      No tutor requests yet
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Submit a request to get matched with a tutor
                    </p>
                  </div>
                )}
              </div>

              {/* Available Tutors Section - Show Below Requests */}
              <div className="pt-8 border-t border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Available Tutors
                </h2>

                {mentorsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="bg-gray-100 rounded-lg p-4 animate-pulse"
                      >
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : mentors.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mentors.map((mentor, index) => (
                      <motion.div
                        key={mentor.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                        className={`relative bg-white rounded-lg p-6 group hover:shadow-lg transition-all duration-300 border flex flex-col h-full ${
                          mentorsWithAds.has(mentor.id)
                            ? "border-yellow-400 border-2 shadow-yellow-100"
                            : "border-gray-200"
                        }`}
                      >
                        {/* Sponsored Badge - Top Right Corner */}
                        {mentorsWithAds.has(mentor.id) && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 200,
                              damping: 15,
                            }}
                            className="absolute top-3 right-3 z-10"
                          >
                            <div className="relative">
                              <div className="absolute inset-0 bg-yellow-400 blur-md opacity-50 rounded-full"></div>
                              <div className="relative bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-full p-2 shadow-lg border-2 border-yellow-300">
                                <Star className="w-5 h-5 text-white fill-white" />
                              </div>
                            </div>
                          </motion.div>
                        )}
                        {/* Header with Avatar and Price */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <button
                                onClick={() => {
                                  setProfilePictureMentor(mentor);
                                  setIsProfilePictureModalOpen(true);
                                }}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                              >
                                <img
                                  src={
                                    mentor.avatar ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      mentor.name
                                    )}&background=3B82F6&color=fff&size=128`
                                  }
                                  alt={mentor.name}
                                  className="w-14 h-14 rounded-full object-cover border-2 border-blue-200 hover:border-blue-400 transition-colors"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      mentor.name
                                    )}&background=3B82F6&color=fff&size=128`;
                                  }}
                                />
                              </button>
                              {mentor.is_verified && (
                                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-white shadow-lg z-10">
                                  <CheckCircle2 className="w-4 h-4 text-white" />
                                </div>
                              )}
                              {!mentor.is_verified && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-gray-900 font-semibold text-base">
                                  {mentor.name}
                                </h3>
                                {mentorsWithAds.has(mentor.id) && (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-xs font-bold border-2 border-yellow-300 shadow-lg"
                                    title="This mentor has active advertising"
                                  >
                                    <Sparkles className="w-3 h-3 fill-white" />
                                    <span className="font-semibold">
                                      Sponsored
                                    </span>
                                  </motion.span>
                                )}
                                {mentor.is_verified && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                                    <CheckCircle2 className="w-3 h-3 fill-blue-600 text-blue-600" />
                                    Verified
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {mentor.title}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">
                              {convertedHourlyRates[mentor.id] ||
                                `$${mentor.hourly_rate.toFixed(2)}`}
                            </div>
                            <div className="text-xs text-gray-500">/hour</div>
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1">
                            {renderStars(mentor.rating)}
                          </div>
                        </div>

                        {/* Description/About */}
                        {mentor.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {mentor.description}
                          </p>
                        )}

                        {/* Specializations */}
                        {(() => {
                          // Parse specialization from JSON string if needed
                          let specializations: string[] = [];
                          if (Array.isArray(mentor.specialization)) {
                            specializations = mentor.specialization;
                          } else if (
                            typeof mentor.specialization === "string"
                          ) {
                            try {
                              specializations = JSON.parse(
                                mentor.specialization || "[]"
                              );
                            } catch {
                              specializations = [];
                            }
                          }

                          return specializations.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {specializations.slice(0, 3).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full"
                                >
                                  {skill}
                                </span>
                              ))}
                              {specializations.length > 3 && (
                                <span className="px-2 py-1 text-xs text-gray-500">
                                  +{specializations.length - 3}
                                </span>
                              )}
                            </div>
                          ) : null;
                        })()}

                        {/* Action Buttons */}
                        <div className="mt-auto pt-4 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push("/dashboard/learner/mentors");
                            }}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 mb-2"
                          >
                            <Eye className="w-4 h-4" />
                            View More
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBookingMentor(mentor);
                              setIsBookingModalOpen(true);
                            }}
                            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium py-2 px-4 rounded-lg transition-colors duration-200 border border-blue-200"
                          >
                            Book Session
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg">No tutors available at the moment</p>
                  </div>
                )}

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  onClick={() => router.push("/dashboard/learner/mentors")}
                  className="w-full mt-8 py-3 text-center text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                >
                  View all tutors →
                </motion.button>
              </div>
            </div>
          )}

          {activeTab === "sessions" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {content.title}
                </h2>
                <p className="text-gray-600">{content.description}</p>
              </div>

              {sessionsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-gray-100 rounded-lg p-6 animate-pulse"
                    >
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : bookedSessions.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {bookedSessions
                      .slice(
                        (currentPage - 1) * sessionsPerPage,
                        currentPage * sessionsPerPage
                      )
                      .map((session) => {
                        const sessionDate = new Date(session.date);
                        const sessionDateTime = new Date(
                          `${session.date}T${session.time}`
                        );
                        const meetingEndTime = new Date(
                          sessionDateTime.getTime() + session.duration * 60000
                        );
                        const now = new Date();
                        const isUpcoming = sessionDateTime > now;
                        const isPast = sessionDateTime < now;
                        const isMeetingActive =
                          now >= sessionDateTime && now <= meetingEndTime;
                        const isEnded = now > meetingEndTime;
                        const isMySession =
                          session.learner_email === userData?.email;
                        const isAvailableSession =
                          !isMySession &&
                          (session.learner_name === "TBD" ||
                            session.learner_email === "tbd@example.com");

                        // Determine display status based on time
                        let displayStatus = session.status;
                        let displayStatusLabel =
                          session.status.charAt(0).toUpperCase() +
                          session.status.slice(1).replace("-", " ");

                        if (isMeetingActive && session.status === "scheduled") {
                          displayStatus = "in-progress";
                          displayStatusLabel = "Ongoing";
                        } else if (
                          isEnded &&
                          (session.status === "scheduled" ||
                            session.status === "in-progress")
                        ) {
                          displayStatus = "completed";
                          displayStatusLabel = "Ended";
                        }

                        const statusColors: Record<string, string> = {
                          scheduled:
                            "bg-blue-100 text-blue-700 border-blue-200",
                          completed:
                            "bg-green-100 text-green-700 border-green-200",
                          cancelled: "bg-red-100 text-red-700 border-red-200",
                          "in-progress":
                            "bg-yellow-100 text-yellow-700 border-yellow-200",
                          ongoing:
                            "bg-yellow-100 text-yellow-700 border-yellow-200",
                          ended: "bg-gray-100 text-gray-700 border-gray-200",
                        };

                        const cardBgClass =
                          isUpcoming && isAvailableSession
                            ? "bg-gradient-to-br from-blue-50 via-white to-blue-50 border-2 border-blue-200 hover:!border-green-400"
                            : "bg-white border border-gray-200 hover:!border-green-400 hover:!border-2";

                        return (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                              duration: 0.4,
                              delay: bookedSessions.indexOf(session) * 0.05,
                              ease: [0.4, 0, 0.2, 1],
                            }}
                            whileHover={{
                              transition: { duration: 0.2 },
                            }}
                            className={`${cardBgClass} rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden`}
                          >
                            {/* Blue accent bar for upcoming available sessions */}
                            {isUpcoming && isAvailableSession && (
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500"
                              />
                            )}

                            {/* Subtle pulse animation for available sessions */}
                            {isUpcoming && isAvailableSession && (
                              <motion.div
                                animate={{
                                  opacity: [0.3, 0.6, 0.3],
                                  scale: [1, 1.05, 1],
                                }}
                                transition={{
                                  duration: 3,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                                className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full"
                              />
                            )}
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                              {/* Left Section - Session Info */}
                              <div className="flex-1">
                                <div className="flex items-start gap-3 mb-3">
                                  {/* Mentor Avatar */}
                                  <motion.div
                                    className="relative flex-shrink-0"
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <div className="relative">
                                      <img
                                        src={
                                          session.mentor_avatar ||
                                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                            session.mentor_name || "User"
                                          )}&background=3B82F6&color=fff&size=128`
                                        }
                                        alt={session.mentor_name}
                                        className={`w-12 h-12 rounded-full object-cover border-2 ${
                                          isUpcoming && isAvailableSession
                                            ? "border-blue-400 shadow-md shadow-blue-200"
                                            : "border-blue-200"
                                        }`}
                                        onError={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                            session.mentor_name || "User"
                                          )}&background=3B82F6&color=fff&size=128`;
                                        }}
                                      />
                                      {isUpcoming && isAvailableSession && (
                                        <motion.div
                                          animate={{
                                            boxShadow: [
                                              "0 0 0 0 rgba(59, 130, 246, 0.7)",
                                              "0 0 0 8px rgba(59, 130, 246, 0)",
                                            ],
                                          }}
                                          transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeOut",
                                          }}
                                          className="absolute inset-0 rounded-full border-2 border-blue-400"
                                        />
                                      )}
                                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                                    </div>
                                  </motion.div>

                                  {/* Session Details */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      <motion.h3
                                        className={`text-base font-bold ${
                                          isUpcoming && isAvailableSession
                                            ? "text-blue-900"
                                            : "text-gray-900"
                                        }`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.1 }}
                                      >
                                        {session.topic}
                                      </motion.h3>
                                      <motion.span
                                        className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                                          statusColors[displayStatus] ||
                                          "bg-gray-100 text-gray-700 border-gray-200"
                                        }`}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.15 }}
                                      >
                                        {displayStatusLabel}
                                      </motion.span>
                                    </div>

                                    {/* Mentor Name */}
                                    <motion.div
                                      className="flex items-center gap-2 mb-2"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 0.2 }}
                                    >
                                      <Users
                                        className={`w-3.5 h-3.5 ${
                                          isUpcoming && isAvailableSession
                                            ? "text-blue-600"
                                            : "text-gray-500"
                                        }`}
                                      />
                                      <span
                                        className={`text-sm font-semibold ${
                                          isUpcoming && isAvailableSession
                                            ? "text-blue-800"
                                            : "text-gray-700"
                                        }`}
                                      >
                                        {session.mentor_name}
                                      </span>
                                      {session.mentor_title && (
                                        <span
                                          className={`text-xs ${
                                            isUpcoming && isAvailableSession
                                              ? "text-blue-600"
                                              : "text-gray-500"
                                          }`}
                                        >
                                          • {session.mentor_title}
                                        </span>
                                      )}
                                    </motion.div>

                                    <div className="space-y-2 text-xs">
                                      {/* Payment Status Badge */}
                                      <motion.div
                                        className="flex items-center gap-2"
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.25 }}
                                      >
                                        {session.learner_email ===
                                        userData?.email ? (
                                          <span
                                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                              session.is_paid
                                                ? "bg-green-100 text-green-700 border border-green-300"
                                                : "bg-orange-100 text-orange-700 border border-orange-300"
                                            }`}
                                          >
                                            {session.is_paid
                                              ? "Paid"
                                              : "Awaiting Payment"}
                                          </span>
                                        ) : (
                                          <motion.span
                                            className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-400"
                                            animate={
                                              isUpcoming && isAvailableSession
                                                ? {
                                                    boxShadow: [
                                                      "0 4px 6px -1px rgba(59, 130, 246, 0.3)",
                                                      "0 4px 12px -1px rgba(59, 130, 246, 0.5)",
                                                      "0 4px 6px -1px rgba(59, 130, 246, 0.3)",
                                                    ],
                                                  }
                                                : {}
                                            }
                                            transition={{
                                              duration: 2,
                                              repeat: Infinity,
                                              ease: "easeInOut",
                                            }}
                                          >
                                            ✨ Available
                                          </motion.span>
                                        )}
                                      </motion.div>

                                      {/* Student Info for Available Sessions */}
                                      {session.learner_name === "TBD" ||
                                      session.learner_email ===
                                        "tbd@example.com" ? (
                                        <motion.div
                                          className={`p-2 rounded-lg border ${
                                            isUpcoming && isAvailableSession
                                              ? "bg-blue-50/80 border-blue-200"
                                              : "bg-gray-50 border-gray-200"
                                          }`}
                                          initial={{ opacity: 0, scale: 0.95 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          transition={{ delay: 0.3 }}
                                        >
                                          <p
                                            className={`text-xs font-bold mb-0.5 ${
                                              isUpcoming && isAvailableSession
                                                ? "text-blue-800"
                                                : "text-gray-700"
                                            }`}
                                          >
                                            No student assigned yet
                                          </p>
                                          <p
                                            className={`text-xs ${
                                              isUpcoming && isAvailableSession
                                                ? "text-blue-600"
                                                : "text-gray-500"
                                            }`}
                                          >
                                            Waiting for a student to book this
                                            session
                                          </p>
                                        </motion.div>
                                      ) : session.learner_email ===
                                        userData?.email ? (
                                        <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                                          <p className="text-xs font-semibold text-blue-900 mb-0.5">
                                            Your Session
                                          </p>
                                          <p className="text-xs text-blue-700">
                                            You have booked this session
                                          </p>
                                        </div>
                                      ) : null}

                                      {/* Date */}
                                      <motion.div
                                        className={`flex items-center gap-2 ${
                                          isUpcoming && isAvailableSession
                                            ? "text-blue-800"
                                            : "text-gray-700"
                                        }`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.35 }}
                                      >
                                        <CalendarIcon
                                          className={`w-4 h-4 ${
                                            isUpcoming && isAvailableSession
                                              ? "text-blue-600"
                                              : "text-gray-500"
                                          }`}
                                        />
                                        <span className="font-medium">
                                          {sessionDate.toLocaleDateString(
                                            "en-US",
                                            {
                                              weekday: "short",
                                              month: "short",
                                              day: "numeric",
                                              year: "numeric",
                                            }
                                          )}
                                        </span>
                                      </motion.div>

                                      {/* Time & Duration */}
                                      <motion.div
                                        className={`flex items-center gap-2 ${
                                          isUpcoming && isAvailableSession
                                            ? "text-blue-800"
                                            : "text-gray-700"
                                        }`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 }}
                                      >
                                        <Clock
                                          className={`w-4 h-4 ${
                                            isUpcoming && isAvailableSession
                                              ? "text-blue-600"
                                              : "text-gray-500"
                                          }`}
                                        />
                                        <span className="font-medium">
                                          {new Date(
                                            `2000-01-01T${session.time}`
                                          ).toLocaleTimeString("en-US", {
                                            hour: "numeric",
                                            minute: "2-digit",
                                            hour12: true,
                                          })}{" "}
                                          • {session.duration} min
                                        </span>
                                      </motion.div>

                                      {/* Amount */}
                                      <motion.div
                                        className={`flex items-center gap-2 ${
                                          isUpcoming && isAvailableSession
                                            ? "text-blue-800"
                                            : "text-gray-700"
                                        }`}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.45 }}
                                      >
                                        <span
                                          className={`font-bold text-base ${
                                            isUpcoming && isAvailableSession
                                              ? "text-blue-900"
                                              : "text-gray-900"
                                          }`}
                                        >
                                          {convertedAmounts[session.id] ||
                                            `$${session.amount.toFixed(2)}`}
                                        </span>
                                      </motion.div>

                                      {/* Meeting Type */}
                                      {session.meeting_type && (
                                        <motion.div
                                          className={`flex items-center gap-2 ${
                                            isUpcoming && isAvailableSession
                                              ? "text-blue-800"
                                              : "text-gray-700"
                                          }`}
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: 0.5 }}
                                        >
                                          <Video
                                            className={`w-4 h-4 ${
                                              isUpcoming && isAvailableSession
                                                ? "text-blue-600"
                                                : "text-gray-500"
                                            }`}
                                          />
                                          <span className="font-medium capitalize">
                                            {session.meeting_type.replace(
                                              "-",
                                              " "
                                            )}
                                          </span>
                                        </motion.div>
                                      )}

                                      {/* Notes */}
                                      {session.notes && (
                                        <motion.div
                                          className={`mt-2 pt-2 border-t ${
                                            isUpcoming && isAvailableSession
                                              ? "border-blue-200"
                                              : "border-gray-200"
                                          }`}
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          transition={{ delay: 0.55 }}
                                        >
                                          <p
                                            className={`text-xs font-bold mb-1 ${
                                              isUpcoming && isAvailableSession
                                                ? "text-blue-800"
                                                : "text-gray-700"
                                            }`}
                                          >
                                            Notes
                                          </p>
                                          <p
                                            className={`text-xs ${
                                              isUpcoming && isAvailableSession
                                                ? "text-blue-700"
                                                : "text-gray-600"
                                            }`}
                                          >
                                            {session.notes}
                                          </p>
                                        </motion.div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Right Section - Meeting Link & Actions */}
                              <div className="flex flex-col gap-3 md:items-end">
                                {/* View Mentor Details Button */}
                                {session.mentor_data && (
                                  <button
                                    onClick={() => {
                                      setSelectedMentor(session.mentor_data!);
                                      setIsModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-sm"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Mentor Details
                                  </button>
                                )}

                                {/* Join Meeting / Pay / Book Button */}
                                {(() => {
                                  const sessionDateTime = new Date(
                                    `${session.date}T${session.time}`
                                  );
                                  const meetingEndTime = new Date(
                                    sessionDateTime.getTime() +
                                      session.duration * 60000
                                  );
                                  const now = new Date();
                                  const isMeetingActive =
                                    now >= sessionDateTime &&
                                    now <= meetingEndTime;
                                  const isUpcoming = sessionDateTime > now;
                                  const isEnded = now > meetingEndTime;
                                  const isMySession =
                                    session.learner_email === userData?.email;

                                  // If it's my session and I've paid
                                  if (isMySession && session.is_paid) {
                                    if (
                                      isMeetingActive &&
                                      session.meeting_link &&
                                      session.meeting_type !== "in-person"
                                    ) {
                                      return (
                                        <>
                                          <a
                                            href={session.meeting_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
                                          >
                                            <Video className="w-4 h-4" />
                                            Join Meeting Now
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                          <div className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium border border-green-200">
                                            <Clock className="w-3 h-3 inline-block mr-1" />
                                            Meeting is ongoing
                                          </div>
                                        </>
                                      );
                                    } else if (
                                      isEnded &&
                                      session.meeting_type !== "in-person"
                                    ) {
                                      return (
                                        <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                                          <CheckCircle2 className="w-4 h-4 inline-block mr-2" />
                                          Meeting has ended
                                        </div>
                                      );
                                    } else if (
                                      isUpcoming &&
                                      session.meeting_link &&
                                      session.meeting_type !== "in-person"
                                    ) {
                                      return (
                                        <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                                          <Clock className="w-4 h-4 inline-block mr-2" />
                                          Starts{" "}
                                          {sessionDateTime.toLocaleDateString(
                                            "en-US",
                                            { month: "short", day: "numeric" }
                                          )}{" "}
                                          at{" "}
                                          {sessionDateTime.toLocaleTimeString(
                                            "en-US",
                                            {
                                              hour: "numeric",
                                              minute: "2-digit",
                                              hour12: true,
                                            }
                                          )}
                                        </div>
                                      );
                                    } else if (
                                      session.meeting_type === "in-person"
                                    ) {
                                      if (isEnded) {
                                        return (
                                          <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                                            <CheckCircle2 className="w-4 h-4 inline-block mr-2" />
                                            Session has ended
                                          </div>
                                        );
                                      } else if (isMeetingActive) {
                                        return (
                                          <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200">
                                            <MapPin className="w-4 h-4 inline-block mr-2" />
                                            Session is ongoing
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                                            <MapPin className="w-4 h-4 inline-block mr-2" />
                                            In-Person Session
                                          </div>
                                        );
                                      }
                                    }
                                  }

                                  // If it's an available session (not booked by me)
                                  if (
                                    !isMySession &&
                                    (session.learner_name === "TBD" ||
                                      session.learner_email ===
                                        "tbd@example.com")
                                  ) {
                                    return (
                                      <motion.button
                                        onClick={() => {
                                          if (session.mentor_data) {
                                            setBookingMentor(
                                              session.mentor_data
                                            );
                                            setIsBookingModalOpen(true);
                                          }
                                        }}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/50 relative overflow-hidden"
                                        whileHover={{
                                          scale: 1.05,
                                          boxShadow:
                                            "0 10px 25px -5px rgba(59, 130, 246, 0.5)",
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        animate={
                                          isUpcoming
                                            ? {
                                                boxShadow: [
                                                  "0 10px 25px -5px rgba(59, 130, 246, 0.4)",
                                                  "0 10px 30px -5px rgba(59, 130, 246, 0.6)",
                                                  "0 10px 25px -5px rgba(59, 130, 246, 0.4)",
                                                ],
                                              }
                                            : {}
                                        }
                                        transition={{
                                          duration: 2,
                                          repeat: Infinity,
                                          ease: "easeInOut",
                                        }}
                                      >
                                        <motion.div
                                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                          animate={{
                                            x: ["-100%", "100%"],
                                          }}
                                          transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "linear",
                                          }}
                                        />
                                        <BookOpen className="w-5 h-5 relative z-10" />
                                        <span className="relative z-10">
                                          Book This Session
                                        </span>
                                      </motion.button>
                                    );
                                  }

                                  // If I haven't paid yet
                                  if (isMySession && !session.is_paid) {
                                    return (
                                      <button
                                        onClick={() => {
                                          if (session.mentor_data) {
                                            setBookingMentor(
                                              session.mentor_data
                                            );
                                            setIsBookingModalOpen(true);
                                          }
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm"
                                      >
                                        <DollarSign className="w-4 h-4" />
                                        Pay & Join Meeting
                                      </button>
                                    );
                                  }

                                  return null;
                                })()}

                                {session.meeting_link &&
                                  session.is_paid &&
                                  session.learner_email === userData?.email &&
                                  (() => {
                                    const sessionDateTime = new Date(
                                      `${session.date}T${session.time}`
                                    );
                                    const meetingEndTime = new Date(
                                      sessionDateTime.getTime() +
                                        session.duration * 60000
                                    );
                                    const isMeetingActive =
                                      new Date() >= sessionDateTime &&
                                      new Date() <= meetingEndTime;

                                    if (isMeetingActive) {
                                      return (
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(
                                              session.meeting_link || ""
                                            );
                                            // You could add a toast notification here
                                          }}
                                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                                        >
                                          Copy meeting link
                                        </button>
                                      );
                                    }
                                    return null;
                                  })()}

                                <div className="text-xs text-gray-500 mt-2">
                                  Meeting Type:{" "}
                                  <span className="font-medium capitalize">
                                    {session.meeting_type.replace("-", " ")}
                                  </span>
                                </div>
                                {session.learner_email === userData?.email &&
                                  !session.is_paid && (
                                    <div className="text-xs text-orange-600 font-medium">
                                      Payment Required
                                    </div>
                                  )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>

                  {/* Pagination Controls */}
                  {bookedSessions.length > sessionsPerPage && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        Showing {(currentPage - 1) * sessionsPerPage + 1} to{" "}
                        {Math.min(
                          currentPage * sessionsPerPage,
                          bookedSessions.length
                        )}{" "}
                        of {bookedSessions.length} sessions
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from(
                            {
                              length: Math.ceil(
                                bookedSessions.length / sessionsPerPage
                              ),
                            },
                            (_, i) => i + 1
                          ).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                currentPage === page
                                  ? "bg-blue-600 text-white"
                                  : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(
                                Math.ceil(
                                  bookedSessions.length / sessionsPerPage
                                ),
                                prev + 1
                              )
                            )
                          }
                          disabled={
                            currentPage >=
                            Math.ceil(bookedSessions.length / sessionsPerPage)
                          }
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No sessions booked yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Start your learning journey by booking a session with a
                    mentor
                  </p>
                  <button
                    onClick={() => router.push("/dashboard/learner/mentors")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                  >
                    <BookOpen className="w-4 h-4" />
                    Browse Mentors
                  </button>
                </div>
              )}

              {/* Tutor Requests Section */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    My Tutor Requests
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Requests you've submitted for tutoring assistance
                  </p>
                </div>

                {requestsLoading ? (
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="bg-gray-100 rounded-lg p-4 animate-pulse min-w-[320px] flex-shrink-0"
                      >
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
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
                          case "completed":
                            return (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                Completed
                              </span>
                            );
                          case "cancelled":
                            return (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-50 text-gray-700 border border-gray-200">
                                Cancelled
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
                        <motion.div
                          key={request.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                          className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden relative group min-w-[320px] max-w-[320px] flex-shrink-0"
                        >
                          {/* Decorative gradient accent */}
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500"></div>

                          <div className="flex flex-col gap-3">
                            {/* Header with Subject, Status, and Edit Button */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <h4 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                    {request.subject}
                                  </h4>
                                  {getStatusBadge(request.status)}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <Calendar className="w-3 h-3" />
                                  <span>{formattedDate}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => {
                                    setEditingRequest(request);
                                    setIsEditModalOpen(true);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md border border-blue-200 hover:border-blue-600"
                                  title="Edit Request"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                {request.payment_status === "pending" && (
                                  <button
                                    onClick={() =>
                                      handleCloseRequest(request.id)
                                    }
                                    disabled={deletingRequestId === request.id}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md border border-red-200 hover:border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Close Request"
                                  >
                                    {deletingRequestId === request.id ? (
                                      <>
                                        <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Closing...</span>
                                      </>
                                    ) : (
                                      <>
                                        <X className="w-3.5 h-3.5" />
                                        <span>Close</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Description - Compact */}
                            {request.description && (
                              <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                                  <p className="text-xs text-gray-700 line-clamp-2">
                                    {request.description}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Compact Details */}
                            <div className="space-y-2">
                              {/* Student Info - Compact */}
                              <div className="space-y-1.5">
                                {request.student_name && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                      <User className="w-3 h-3 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-gray-500 text-xs">
                                        Name:{" "}
                                      </span>
                                      <span className="text-gray-900 font-medium">
                                        {request.student_name}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {request.student_email && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                      <Mail className="w-3 h-3 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0 truncate">
                                      <span className="text-gray-500 text-xs">
                                        Email:{" "}
                                      </span>
                                      <span className="text-gray-900 font-medium truncate">
                                        {request.student_email}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {request.student_phone && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                      <Phone className="w-3 h-3 text-green-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-gray-500 text-xs">
                                        Phone:{" "}
                                      </span>
                                      <span className="text-gray-900 font-medium">
                                        {request.student_phone}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Request Details - Compact */}
                              <div className="pt-1.5 border-t border-gray-100 space-y-1.5">
                                {request.grade_level && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                      <GraduationCap className="w-3 h-3 text-orange-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-gray-500 text-xs">
                                        Grade:{" "}
                                      </span>
                                      <span className="text-gray-900 font-medium capitalize">
                                        {request.grade_level}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {request.preferred_time && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                      <Clock className="w-3 h-3 text-indigo-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-gray-500 text-xs">
                                        Time:{" "}
                                      </span>
                                      <span className="text-gray-900 font-medium">
                                        {request.preferred_time}
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
                                      Payment:{" "}
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
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <h4 className="text-base font-semibold text-gray-900 mb-1">
                      No tutor requests yet
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Submit a request to get matched with a tutor
                    </p>
                    <button
                      onClick={() => router.push("/dashboard/learner/requests")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <BookOpen className="w-4 h-4" />
                      Create Request
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "progress" && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {content.title}
              </h2>
              <p className="text-gray-600">{content.description}</p>
            </div>
          )}

          {activeTab === "achievements" && (
            <div>
              <AvailableTutors
                mentors={mentors}
                mentorsLoading={mentorsLoading}
                mentorsWithAds={mentorsWithAds}
                userLocation={userLocation}
                convertedHourlyRates={convertedHourlyRates}
                onViewMore={(mentor) => {
                  setSelectedMentor(mentor);
                  setIsModalOpen(true);
                }}
                onBookSession={(mentor) => {
                  setBookingMentor(mentor);
                  setIsBookingModalOpen(true);
                }}
                onProfilePictureClick={(mentor) => {
                  setProfilePictureMentor(mentor);
                  setIsProfilePictureModalOpen(true);
                }}
                onFindNearby={() => {
                  setIsGlobalMentorSearchOpen(true);
                  setIsFindingLocation(true);
                  if (!userLocation && navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        setUserLocation({
                          lat: position.coords.latitude,
                          lng: position.coords.longitude,
                        });
                        setTimeout(() => {
                          setIsFindingLocation(false);
                        }, 1000);
                      },
                      (error) => {
                        console.error("Error getting location:", error);
                        setTimeout(() => {
                          setIsFindingLocation(false);
                        }, 1000);
                      },
                      {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0,
                      }
                    );
                  } else {
                    setTimeout(() => {
                      setIsFindingLocation(false);
                    }, 500);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mentor Details Modal */}
      <MentorDetailsModal
        mentor={selectedMentor}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedMentor(null);
        }}
        onBookSession={(mentorId) => {
          const mentorToBook = mentors.find((m) => m.id === mentorId);
          if (mentorToBook) {
            setBookingMentor(mentorToBook);
            setIsBookingModalOpen(true);
            setIsModalOpen(false);
          }
        }}
      />

      {/* Booking Modal */}
      <BookingModal
        mentor={bookingMentor}
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setBookingMentor(null);
          setBookingRequestData(null);
        }}
        requestData={bookingRequestData}
        userLocation={userLocation}
        onPaymentSuccess={async (requestId, meetingLink) => {
          if (requestId) {
            try {
              // Update payment status and meeting link in the tutor request
              const updateData: any = { payment_status: "paid" };
              if (meetingLink) {
                updateData.meeting_link = meetingLink;
              }

              const { error } = await supabase
                .from("tutor_requests")
                .update(updateData)
                .eq("id", requestId);

              if (error) {
                console.error("Error updating payment status:", error);
                console.error("Update data:", updateData);
              } else {
                console.log(
                  "✅ Successfully updated request:",
                  requestId,
                  "with meeting_link:",
                  meetingLink
                );
                // Update local state
                setTutorRequests((prev) =>
                  prev.map((req) =>
                    req.id === requestId
                      ? {
                          ...req,
                          payment_status: "paid",
                          meeting_link: meetingLink || req.meeting_link,
                        }
                      : req
                  )
                );

                // Refresh the request data to ensure we have the latest from database
                const { data: updatedRequest } = await supabase
                  .from("tutor_requests")
                  .select("*")
                  .eq("id", requestId)
                  .single();

                if (updatedRequest) {
                  setTutorRequests((prev) =>
                    prev.map((req) =>
                      req.id === requestId ? updatedRequest : req
                    )
                  );
                }
              }
            } catch (error) {
              console.error("Error updating payment status:", error);
            }
          }
        }}
      />

      {/* Profile Picture Modal */}
      {profilePictureMentor && (
        <ProfilePictureModal
          isOpen={isProfilePictureModalOpen}
          onClose={() => {
            setIsProfilePictureModalOpen(false);
            setProfilePictureMentor(null);
          }}
          imageUrl={
            profilePictureMentor.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              profilePictureMentor.name
            )}&background=3B82F6&color=fff&size=128`
          }
          mentorName={profilePictureMentor.name}
        />
      )}

      {/* Global Mentor Search Modal */}
      <GlobeViewer
        isOpen={isGlobalMentorSearchOpen}
        onClose={() => {
          setIsGlobalMentorSearchOpen(false);
          setIsFindingLocation(false);
        }}
        userLocation={userLocation}
        mentors={mentors.map((mentor) => {
          // Ensure all data is passed correctly
          const mappedMentor = {
            id: mentor.id,
            name: mentor.name,
            latitude: mentor.latitude ? Number(mentor.latitude) : undefined,
            longitude: mentor.longitude ? Number(mentor.longitude) : undefined,
            city: mentor.city || undefined,
            country: mentor.country || undefined,
            is_online: mentor.is_online ?? true,
            avatar: mentor.avatar || undefined,
            specialization: mentor.specialization || [],
            title: mentor.title || undefined,
            rating: mentor.rating || 0,
            total_reviews: mentor.total_reviews || 0,
          };
          return mappedMentor;
        })}
        onMentorClick={(mentor) => {
          const fullMentor = mentors.find((m) => m.id === mentor.id);
          if (fullMentor) {
            setSelectedMentor(fullMentor);
            setIsModalOpen(true);
            setIsGlobalMentorSearchOpen(false);
          }
        }}
        userAvatar={userData?.avatar_url}
        userName={userData?.full_name}
        isSearching={isFindingLocation}
        onRefresh={() => {
          if (navigator.geolocation) {
            setIsFindingLocation(true);
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setUserLocation({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                });
                setIsFindingLocation(false);
              },
              (error) => {
                console.error("Error getting location:", error);
                setIsFindingLocation(false);
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              }
            );
          }
        }}
      />

      {/* Student Profile Completion Form */}
      {userData && (
        <StudentProfileCompletionForm
          isOpen={isProfileCompletionOpen}
          onClose={() => setIsProfileCompletionOpen(false)}
          userId={userData.id}
          onComplete={() => {
            setIsProfileCompletionOpen(false);
            // Refresh user data
            const fetchUserData = async () => {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (user) {
                const { data: studentData } = await supabase
                  .from("students")
                  .select("*")
                  .eq("id", user.id)
                  .single();
                if (studentData) {
                  setUserData(studentData);
                }
              }
            };
            fetchUserData();
          }}
        />
      )}

      {/* Mentor Details Modal for Accepted Tutors */}
      {isMentorDetailsModalOpen && selectedMentorForModal && (
        <MentorDetailsModal
          mentor={{
            id: selectedMentorForModal.id,
            supabase_id: selectedMentorForModal.id?.toString() || "",
            name: selectedMentorForModal.name || "Unknown",
            title: selectedMentorForModal.title || "Tutor",
            description: selectedMentorForModal.description || "",
            specialization: selectedMentorForModal.specialization || [],
            rating: selectedMentorForModal.rating || 5.0,
            total_reviews: selectedMentorForModal.total_reviews || 0,
            hourly_rate: selectedMentorForModal.hourly_rate || 0,
            avatar: selectedMentorForModal.avatar || "",
            experience: selectedMentorForModal.experience || "",
            languages: selectedMentorForModal.languages || [],
            availability: selectedMentorForModal.availability || "",
            country: selectedMentorForModal.country,
            is_verified: selectedMentorForModal.is_verified,
            email: selectedMentorForModal.email,
            phone_number: selectedMentorForModal.phone_number,
            qualifications: selectedMentorForModal.qualifications,
            linkedin_profile: selectedMentorForModal.linkedin_profile,
            github_profile: selectedMentorForModal.github_profile,
            twitter_profile: selectedMentorForModal.twitter_profile,
            facebook_profile: selectedMentorForModal.facebook_profile,
            instagram_profile: selectedMentorForModal.instagram_profile,
            personal_website: selectedMentorForModal.personal_website,
            sessions_conducted: selectedMentorForModal.sessions_conducted,
          }}
          isOpen={isMentorDetailsModalOpen}
          onClose={() => {
            setIsMentorDetailsModalOpen(false);
            setSelectedMentorForModal(null);
            setRelatedRequestForModal(null);
          }}
          relatedRequest={relatedRequestForModal}
          onBookSession={async (mentorId) => {
            // Find the request that has this mentor
            const request = tutorRequests.find(
              (req) =>
                req.status === "accepted" &&
                acceptedMentors[req.id]?.id === mentorId
            );

            // Convert the accepted mentor to Mentor format
            const mentorKey = Object.keys(acceptedMentors).find(
              (reqId) => acceptedMentors[parseInt(reqId)]?.id === mentorId
            );
            const mentor = mentorKey
              ? acceptedMentors[parseInt(mentorKey)]
              : undefined;

            if (mentor && request) {
              // Use calculated pricing from request if available, otherwise use mentor's rate
              const calculatedRate =
                requestPricing[request.id]?.hourlyRateUSD ||
                mentor.hourly_rate ||
                0;

              const mentorToBook: Mentor = {
                id: mentor.id,
                supabase_id: mentor.id?.toString() || "",
                name: mentor.name || "Unknown",
                title: mentor.title || "Tutor",
                description: mentor.description || "",
                specialization: mentor.specialization || [],
                rating: mentor.rating || 5.0,
                total_reviews: mentor.total_reviews || 0,
                hourly_rate: calculatedRate, // Use calculated rate from request pricing
                avatar: mentor.avatar || "",
                experience: mentor.experience || "",
                languages: mentor.languages || [],
                availability: mentor.availability || "Available",
                country: mentor.country,
                is_verified: mentor.is_verified,
                email: mentor.email,
                phone_number: mentor.phone_number,
                qualifications: mentor.qualifications,
                linkedin_profile: mentor.linkedin_profile,
                github_profile: mentor.github_profile,
                twitter_profile: mentor.twitter_profile,
                facebook_profile: mentor.facebook_profile,
                instagram_profile: mentor.instagram_profile,
                personal_website: mentor.personal_website,
                sessions_conducted: mentor.sessions_conducted,
              };

              // Set request data for auto-filling booking form
              setBookingRequestData({
                id: request.id,
                subject: request.subject,
                preferred_time: request.preferred_time,
                description: request.description,
                grade_level: request.grade_level,
                created_at: request.created_at,
              });

              setBookingMentor(mentorToBook);
              setIsBookingModalOpen(true);
              setIsMentorDetailsModalOpen(false);
              setSelectedMentorForModal(null);
            }
          }}
          userLocation={userLocation}
        />
      )}

      {/* Edit Tutor Request Modal */}
      {isEditModalOpen && editingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Edit Tutor Request
              </h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingRequest(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const updates = {
                    subject: formData.get("subject") as string,
                    description: formData.get("description") as string,
                    grade_level: formData.get("grade_level") as string,
                    preferred_time: formData.get("preferred_time") as string,
                    student_name: formData.get("student_name") as string,
                    student_phone: formData.get("student_phone") as string,
                    updated_at: new Date().toISOString(),
                  };

                  try {
                    const { error } = await supabase
                      .from("tutor_requests")
                      .update(updates)
                      .eq("id", editingRequest.id);

                    if (error) throw error;

                    // Refresh requests
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();
                    if (user?.email) {
                      const { data } = await supabase
                        .from("tutor_requests")
                        .select("*")
                        .eq("student_email", user.email)
                        .order("created_at", { ascending: false });
                      if (data) setTutorRequests(data);
                    }

                    setIsEditModalOpen(false);
                    setEditingRequest(null);
                  } catch (error) {
                    console.error("Error updating request:", error);
                    alert("Failed to update request. Please try again.");
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    defaultValue={editingRequest.subject}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    defaultValue={editingRequest.description}
                    rows={4}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grade Level
                    </label>
                    <select
                      name="grade_level"
                      defaultValue={editingRequest.grade_level}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="elementary">Elementary</option>
                      <option value="middle">Middle</option>
                      <option value="high">High School</option>
                      <option value="college">College</option>
                      <option value="adult">Adult</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred Time
                    </label>
                    <input
                      type="text"
                      name="preferred_time"
                      defaultValue={editingRequest.preferred_time}
                      placeholder="e.g., 10:00 AM - 12:00 PM"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student Name
                    </label>
                    <input
                      type="text"
                      name="student_name"
                      defaultValue={editingRequest.student_name}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="student_phone"
                      defaultValue={editingRequest.student_phone}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingRequest(null);
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Tutor Request Popup */}
      <TutorRequestPopup
        isOpen={isTutorRequestPopupOpen}
        onClose={() => setIsTutorRequestPopupOpen(false)}
        userData={userData}
        onRequestSubmitted={async () => {
          setIsTutorRequestPopupOpen(false);
          // Refresh tutor requests after submission
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user?.email) {
            try {
              const { data, error } = await supabase
                .from("tutor_requests")
                .select("*")
                .eq("student_email", user.email)
                .order("created_at", { ascending: false });

              if (error) {
                console.error("Error refreshing requests:", error);
              } else {
                setTutorRequests(data || []);
              }
            } catch (error) {
              console.error("Error refreshing requests:", error);
            }
          }
        }}
      />

      {/* Close Request Confirmation Modal */}
      <AlertDialog
        open={isCloseRequestModalOpen}
        onOpenChange={setIsCloseRequestModalOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close this request? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsCloseRequestModalOpen(false);
                setRequestToCloseId(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCloseRequest}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Close Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scratch Card Game Modal */}
      {userData?.id && (
        <ScratchCardGame
          isOpen={isScratchCardOpen}
          onClose={() => setIsScratchCardOpen(false)}
          userId={userData.id}
        />
      )}
    </DashboardLayout>
  );
}
