"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  BarChart2,
  Settings,
  MessageSquare,
  DollarSign,
  Bell,
  Menu,
  X,
  MonitorPlay,
  PlusCircle,
  HelpCircle,
  LogOut,
  Calendar,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  ChevronDown,
  Megaphone,
  FileText,
  FolderOpen,
  ClipboardList,
  HardDrive,
  CheckCircle2,
  Briefcase,
  Search,
  Newspaper,
  Loader2,
  Clock,
} from "lucide-react";
import clsx from "clsx";
import { supabase } from "@/lib/supabase";
import { UserProfilePopup } from "./user-profile-popup";
import { LogoutConfirmationModal } from "./logout-confirmation-modal";
import dynamic from "next/dynamic";

// Dynamically import CreateSessionModal to avoid SSR issues for learners
const CreateSessionModal = dynamic(
  () =>
    import("./create-session-modal").then((mod) => ({
      default: mod.CreateSessionModal,
    })),
  { ssr: false }
);

// Dynamically import CreateJobModal to avoid SSR issues for companies
const CreateJobModal = dynamic(
  () =>
    import("./create-job-modal").then((mod) => ({
      default: mod.CreateJobModal,
    })),
  { ssr: false }
);

// Dynamically import MentorSettingsModal to avoid SSR issues for learners
const MentorSettingsModal = dynamic(
  () =>
    import("./mentor-settings-modal").then((mod) => ({
      default: mod.MentorSettingsModal,
    })),
  { ssr: false }
);

// Dynamically import MentorProfileCompletionForm to avoid SSR issues
const MentorProfileCompletionForm = dynamic(
  () =>
    import("./mentor-profile-completion-form").then((mod) => ({
      default: mod.MentorProfileCompletionForm,
    })),
  { ssr: false }
);

// Dynamically import StudentProfileCompletionForm to avoid SSR issues
const StudentProfileCompletionForm = dynamic(
  () =>
    import("./student-profile-completion-form").then((mod) => ({
      default: mod.StudentProfileCompletionForm,
    })),
  { ssr: false }
);

interface SidebarLink {
  icon: any;
  label: string;
  href: string;
}

// Dynamic links based on user type
const getMainLinks = (userType: string, userEmail?: string): SidebarLink[] => {
  if (userType === "company" || userType === "mentor" || userType === "tutor") {
    const links: SidebarLink[] = [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        href: "/dashboard",
      },
      {
        icon: Briefcase,
        label: "My Jobs",
        href: "/dashboard/myjobs",
      },
      {
        icon: Clock,
        label: "Pending Jobs",
        href: "/dashboard/pending-jobs",
      },
      {
        icon: Play,
        label: "Run Automation",
        href: "/dashboard/automation-control",
      },
    ];

    // Only show Analytics, News, and Users for clintonkhozah@gmail.com
    const email = userEmail?.trim().toLowerCase();
    if (email === "clintonkhozah@gmail.com") {
      links.push({
        icon: BarChart2,
        label: "Analytics",
        href: "/dashboard/advertising/reports",
      });
      links.push({
        icon: Newspaper,
        label: "News",
        href: "/dashboard/news",
      });
      links.push({
        icon: Users,
        label: "Users",
        href: "/dashboard/users",
      });
    }

    return links;
  } else {
    // Job Applicant links
    return [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        href: "/dashboard/applicant",
      },
      {
        icon: Briefcase,
        label: "My Applications",
        href: "/dashboard/applicant/applications",
      },
      {
        icon: FolderOpen,
        label: "Suggested Jobs",
        href: "/dashboard/applicant/saved",
      },
      {
        icon: UserCircle,
        label: "Profile",
        href: "/dashboard/applicant/profile",
      },
      {
        icon: Search,
        label: "Find Jobs",
        href: "/",
      },
    ];
  }
};

const bottomLinks: SidebarLink[] = [
  {
    icon: Settings,
    label: "Settings",
    href: "/dashboard/advertiser/settings",
  },
  {
    icon: LogOut,
    label: "Logout",
    href: "/auth/logout",
  },
];

export function DashboardLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: string;
}) {
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [isProfileCompletionOpen, setIsProfileCompletionOpen] = useState(false);
  const [mentorData, setMentorData] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // Close sidebar on mobile when navigating to dashboard
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile && pathname === "/dashboard") {
      setIsSidebarCollapsed(true);
    }
    // Reset navigation loading state when pathname changes
    setNavigatingTo(null);
  }, [pathname]);

  // Listen for custom event to open settings modal
  useEffect(() => {
    const handleOpenSettings = () => {
      setIsSettingsModalOpen(true);
    };

    window.addEventListener("openSettingsModal", handleOpenSettings);

    return () => {
      window.removeEventListener("openSettingsModal", handleOpenSettings);
    };
  }, []);

  // Listen for openCreateJobModal event from child components
  useEffect(() => {
    const handleOpenModal = () => {
      const currentUserType = role || userData?.user_type || "student";
      if (
        currentUserType === "company" ||
        currentUserType === "mentor" ||
        currentUserType === "tutor"
      ) {
        setIsCreateJobOpen(true);
      }
    };

    window.addEventListener("openCreateJobModal", handleOpenModal);
    return () =>
      window.removeEventListener("openCreateJobModal", handleOpenModal);
  }, [role, userData?.user_type]);

  const [authUserEmail, setAuthUserEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Store auth user email for admin checks
        setAuthUserEmail(user.email || undefined);

        // Check companies table first for recruiters
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!companyError && companyData) {
          // User is a company/recruiter
          const verified =
            companyData.is_verified === true ||
            companyData.is_verified === "true" ||
            companyData.is_verified === "pending"
              ? companyData.is_verified === "pending"
                ? "pending"
                : true
              : false;

          // Parse JSON fields if they're strings
          let settings = companyData.settings || {};
          if (typeof settings === "string") {
            try {
              settings = JSON.parse(settings);
            } catch {
              settings = {};
            }
          }

          // Extract name - use company.name (person's name) first, then company_name
          // Prioritize company.name as it contains the person's name (e.g., "Clinton Khoza")
          let companyName = null;
          
          if (companyData.name && typeof companyData.name === 'string' && companyData.name.trim()) {
            companyName = companyData.name.trim();
          } else if (companyData.company_name && typeof companyData.company_name === 'string' && companyData.company_name.trim()) {
            companyName = companyData.company_name.trim();
          } else if (user.user_metadata?.full_name && typeof user.user_metadata.full_name === 'string' && user.user_metadata.full_name.trim()) {
            companyName = user.user_metadata.full_name.trim();
          } else if (user.user_metadata?.name && typeof user.user_metadata.name === 'string' && user.user_metadata.name.trim()) {
            companyName = user.user_metadata.name.trim();
          } else if (user.email) {
            companyName = user.email.split("@")[0];
          } else {
            companyName = "User";
          }

          // Store mentorData for profile completion check (use company data)
          setMentorData(companyData as any);

          const userDataToSet = {
            ...companyData,
            id: companyData.user_id || user.id,
            company_id: companyData.id,
            user_type: "company",
            email: companyData.email || user.email || "",
            verified,
            settings,
            avatar_url: companyData.avatar || companyData.logo || null,
            phone_number: companyData.phone_number || null,
            country: companyData.country || null,
            city: companyData.city || null,
            bio: companyData.description || null,
            website: companyData.website || null,
            created_at: companyData.created_at || null,
            updated_at: companyData.updated_at || null,
          };

          // Override name fields AFTER all other fields to ensure they're not overridden
          userDataToSet.full_name = companyName;
          userDataToSet.name = companyName;

          setUserData(userDataToSet);
        } else {
          // Check if user is in mentors or students table
          // For mentors, use user_id column (UUID) to match Supabase Auth user.id
          const { data: mentorData, error: mentorError } = await supabase
            .from("mentors")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!mentorError && mentorData) {
            // Store mentorData for profile completion check
            setMentorData(mentorData);
          // Convert verified field to boolean if it's a string
          const verified =
            mentorData.is_verified === true ||
            mentorData.is_verified === "true" ||
            mentorData.is_verified === "pending"
              ? mentorData.is_verified === "pending"
                ? "pending"
                : true
              : false;

          // Parse JSON fields if they're strings
          let social_links = mentorData.social_links || {};
          if (typeof social_links === "string") {
            try {
              social_links = JSON.parse(social_links);
            } catch {
              social_links = {};
            }
          }

          let settings = mentorData.settings || {};
          if (typeof settings === "string") {
            try {
              settings = JSON.parse(settings);
            } catch {
              settings = {};
            }
          }

          // Parse languages and specialization if they're strings
          let languages_spoken = mentorData.languages || [];
          if (typeof languages_spoken === "string") {
            try {
              languages_spoken = JSON.parse(languages_spoken);
            } catch {
              languages_spoken = [];
            }
          }
          if (!Array.isArray(languages_spoken)) {
            languages_spoken = [];
          }

          // Determine user type from user metadata or default to 'mentor'
          // Check user metadata to see if they signed up as tutor, mentor, or other
          const userTypeFromMetadata = user.user_metadata?.user_type;
          let userType = "mentor"; // default

          if (userTypeFromMetadata === "tutor") {
            userType = "tutor";
          } else if (userTypeFromMetadata === "mentor") {
            userType = "mentor";
          } else if (userTypeFromMetadata === "user") {
            // If they signed up as 'user' or 'other', check their title to determine
            const titleLower = (mentorData.title || "").toLowerCase();
            if (
              titleLower.includes("tutor") ||
              titleLower.includes("tutoring")
            ) {
              userType = "tutor";
            } else {
              userType = "mentor";
            }
          }

          // Try to fetch company data for this mentor
          let companyIdForJobs = mentorData.id; // Default to mentor id
          const { data: companyData, error: companyError } = await supabase
            .from("companies")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!companyError && companyData) {
            companyIdForJobs = companyData.id;
          }

          // Extract name with proper fallbacks (handle empty strings and null values)
          // Use the same logic as profile popup: mentorData.name directly
          // Debug: Log what we're getting
          console.log("Mentor data for name extraction:", {
            mentorDataName: mentorData.name,
            mentorDataFullName: mentorData.full_name,
            mentorDataKeys: Object.keys(mentorData),
            userMetadata: user.user_metadata,
            userEmail: user.email
          });
          
          let mentorName = mentorData.name || 
                          mentorData.full_name || 
                          user.user_metadata?.full_name || 
                          user.user_metadata?.name || 
                          user.email?.split("@")[0] || 
                          "User";
          
          // Trim and ensure it's not empty
          if (typeof mentorName === 'string') {
            mentorName = mentorName.trim() || user.email?.split("@")[0] || "User";
          }
          
          console.log("Final extracted name:", mentorName);
          
          // Create userData object, ensuring name fields are set correctly
          const userDataToSet = {
            ...mentorData,
            id: mentorData.user_id || user.id, // Use user_id as the id for consistency
            mentor_db_id: mentorData.id, // Store the database ID for session creation
            company_id: companyIdForJobs, // Store company_id for job creation
            user_type: userType,
            email: mentorData.email || user.email || "", // Always include email from auth user
            verified,
            social_links,
            settings,
            languages_spoken,
            avatar_url: mentorData.avatar || null,
            phone_number: mentorData.phone_number || null,
            country: mentorData.country || null,
            city: mentorData.city || null,
            bio: mentorData.description || null,
            title: mentorData.title,
            experience: mentorData.experience,
            hourly_rate: mentorData.hourly_rate,
            availability: mentorData.availability,
            specialization: mentorData.specialization,
            qualifications: mentorData.qualifications,
            website: mentorData.personal_website || null,
            created_at: mentorData.created_at || null,
            updated_at: mentorData.updated_at || null,
          };
          
          // Override name fields AFTER all other fields to ensure they're not overridden
          userDataToSet.full_name = mentorName;
          userDataToSet.name = mentorName;
          
          setUserData(userDataToSet);
        } else {
          // Check students table
          const { data: studentData, error: studentError } = await supabase
            .from("students")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (studentError && studentError.code !== "PGRST116") {
            console.error("Error fetching student data:", studentError);
            // Don't throw, just continue - user might not be in students table
          }

          if (!studentData) {
            // Student record doesn't exist yet - still set userData for display
            // but is_complete will be undefined/null, so popup will show
            const studentDataToSet = {
              id: user.id,
              email: user.email || "",
              user_type: "student",
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
              name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
              is_complete: false, // Explicitly set to false so popup shows
            };
            setStudentData(studentDataToSet);
            setUserData(studentDataToSet);
            return;
          }

          // Convert verified field to boolean if it's a string
          const verified =
            studentData.verified === true ||
            studentData.verified === "true" ||
            studentData.verified === "pending"
              ? studentData.verified === "pending"
                ? "pending"
                : true
              : false;

          // Parse JSON fields if they're strings
          let social_links = studentData.social_links || {};
          if (typeof social_links === "string") {
            try {
              social_links = JSON.parse(social_links);
            } catch {
              social_links = {};
            }
          }

          let settings = studentData.settings || {};
          if (typeof settings === "string") {
            try {
              settings = JSON.parse(settings);
            } catch {
              settings = {};
            }
          }

          // Parse languages_spoken and interests if they're strings
          let languages_spoken = studentData.languages_spoken;
          if (typeof languages_spoken === "string") {
            try {
              languages_spoken = JSON.parse(languages_spoken);
            } catch {
              // If it's a string like "[]", try to clean it
              languages_spoken =
                languages_spoken.replace(/[\[\]"]/g, "") || null;
            }
          }

          let interests = studentData.interests;
          if (typeof interests === "string") {
            try {
              interests = JSON.parse(interests);
            } catch {
              // If it's a string like "[]", try to clean it
              interests = interests.replace(/[\[\]"]/g, "") || null;
            }
          }

          // Extract name with proper fallbacks (handle empty strings and null values)
          // Debug: Log what we're getting from students table
          console.log("Student data for name extraction:", {
            studentDataFullName: studentData.full_name,
            studentDataName: studentData.name,
            studentDataKeys: Object.keys(studentData),
            userMetadata: user.user_metadata,
            userEmail: user.email
          });
          
          let studentName = null;
          
          if (studentData.full_name && typeof studentData.full_name === 'string' && studentData.full_name.trim()) {
            studentName = studentData.full_name.trim();
          } else if (studentData.name && typeof studentData.name === 'string' && studentData.name.trim()) {
            studentName = studentData.name.trim();
          } else if (user.user_metadata?.full_name && typeof user.user_metadata.full_name === 'string' && user.user_metadata.full_name.trim()) {
            studentName = user.user_metadata.full_name.trim();
          } else if (user.user_metadata?.name && typeof user.user_metadata.name === 'string' && user.user_metadata.name.trim()) {
            studentName = user.user_metadata.name.trim();
          } else if (user.email) {
            studentName = user.email.split("@")[0];
          } else {
            studentName = "User";
          }
          
          console.log("Final extracted student name:", studentName);
          
          const studentDataToSet = {
            ...studentData,
            user_type: "student",
            full_name: studentName,
            name: studentName,
            email: studentData.email || user.email || "", // Always include email from auth user
            verified,
            social_links,
            settings,
            languages_spoken,
            interests,
          };
          
          setStudentData(studentDataToSet);
          setUserData(studentDataToSet);
        }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Check profile completion for recruiters (mentor/tutor/company) on first login
  useEffect(() => {
    if (!loading && mentorData && userData && userData.id) {
      const userType = role || userData?.user_type || "student";
      
      // Only check for recruiters (mentor, tutor, company)
      if (userType === "mentor" || userType === "tutor" || userType === "company") {
        // Show popup if is_complete is NOT true (false, null, undefined, or "false")
        // is_complete will be true after completing the profile
        const isComplete = mentorData.is_complete === true || mentorData.is_complete === "true";
        
        if (!isComplete) {
          // Check if application has been submitted - if so, don't show profile completion
          const checkApplicationProgress = async () => {
            const { data: progressData } = await supabase
              .from("mentor_application_progress")
              .select("id, application_submitted")
              .eq("user_id", userData.id)
              .maybeSingle();

            if (!progressData || !progressData.application_submitted) {
              // No application submitted, show profile completion popup
              setTimeout(() => {
                setIsProfileCompletionOpen(true);
              }, 500);
            }
          };

          checkApplicationProgress();
        }
      }
    }
  }, [loading, mentorData, userData, role]);

  // Check profile completion for students/applicants on first login
  useEffect(() => {
    console.log("Student profile completion check:", {
      loading,
      studentData: !!studentData,
      userData: !!userData,
      userDataId: userData?.id,
      userType: role || userData?.user_type,
      studentIsComplete: studentData?.is_complete,
      userDataIsComplete: userData?.is_complete,
      pathname
    });

    if (!loading && userData && userData.id) {
      const userType = role || userData?.user_type || "student";
      
      // Check for students/applicants - also check if we're on applicant dashboard
      const isApplicantRoute = pathname?.includes("/applicant");
      const isStudentType = userType === "student" || userType === "applicant" || isApplicantRoute;
      
      if (isStudentType) {
        // Use studentData if available, otherwise check userData
        const dataToCheck = studentData || userData;
        // If no student record exists, is_complete will be undefined/null, so show popup
        const isComplete = dataToCheck.is_complete === true || dataToCheck.is_complete === "true";
        
        console.log("Student/applicant profile check:", {
          userType,
          isApplicantRoute,
          isStudentType,
          isComplete,
          isCompleteValue: dataToCheck.is_complete,
          willShowPopup: !isComplete
        });
        
        if (!isComplete) {
          // Show profile completion popup for students/applicants
          console.log("Opening student profile completion popup");
          setTimeout(() => {
            setIsProfileCompletionOpen(true);
          }, 500);
        } else {
          console.log("Student profile is complete, not showing popup");
        }
      } else {
        console.log("Not a student/applicant, skipping profile completion check");
      }
    } else {
      console.log("Conditions not met for student profile check:", {
        loading,
        hasUserData: !!userData,
        hasUserId: !!userData?.id
      });
    }
  }, [loading, studentData, userData, role, pathname]);

  // Get the user type from role prop or userData
  const userType = role || userData?.user_type || "student";
  // Use authUserEmail for admin checks (more reliable than userData.email)
  const emailForAdminCheck = authUserEmail || userData?.email;
  const mainLinks = useMemo(() => {
    return getMainLinks(userType, emailForAdminCheck);
  }, [userType, emailForAdminCheck]);

  // Fetch notifications (sessions, ad payments, storage purchases from last 72 hours)
  useEffect(() => {
    if (!userData?.id && !userData?.mentor_db_id) {
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true);
        const now = new Date();
        const seventyTwoHoursAgo = new Date(
          now.getTime() - 72 * 60 * 60 * 1000
        );
        const notificationsList: any[] = [];

        // Fetch job post notifications from database (last 72 hours)
        if (userData?.email) {
          try {
            const { data: jobNotifications, error: jobNotifError } =
              await supabase
                .from("job_post_notifications")
                .select("*")
                .eq("user_email", userData.email)
                .gte("created_at", seventyTwoHoursAgo.toISOString())
                .gt("expires_at", now.toISOString()) // Only get non-expired notifications
                .order("created_at", { ascending: false })
                .limit(50);

            if (!jobNotifError && jobNotifications) {
              jobNotifications.forEach((notif: any) => {
                const notifDate = new Date(notif.created_at);
                const hoursAgo = Math.floor(
                  (now.getTime() - notifDate.getTime()) / (1000 * 60 * 60)
                );
                notificationsList.push({
                  id: notif.id,
                  type: notif.type || "job_posted",
                  title: notif.title,
                  description: notif.message,
                  timestamp: notif.created_at,
                  hoursAgo,
                  icon: "Briefcase",
                  color: "text-blue-600",
                  bgColor: "bg-blue-100",
                  is_read: notif.is_read,
                  job_id: notif.job_id,
                  db_notification: true, // Flag to identify database notifications
                });
              });
            }
          } catch (error) {
            console.error("Error fetching job notifications:", error);
          }
        }

        // Fetch recent sessions (booked or requested)
        // Only use mentor_db_id (BIGINT) - sessions table expects BIGINT mentor_id, not UUID
        if (userData?.mentor_db_id) {
          const mentorId = userData.mentor_db_id;

          // Get sessions from last 72 hours
          const { data: recentSessions } = await supabase
            .from("sessions")
            .select("*")
            .eq("mentor_id", mentorId)
            .gte("created_at", seventyTwoHoursAgo.toISOString())
            .order("created_at", { ascending: false })
            .limit(20);

          if (recentSessions) {
            recentSessions.forEach((session: any) => {
              const sessionDate = new Date(session.created_at);
              const hoursAgo = Math.floor(
                (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60)
              );

              if (
                session.is_paid &&
                session.learner_name &&
                session.learner_name !== "TBD"
              ) {
                notificationsList.push({
                  id: `session-${session.id}`,
                  type: "session_booked",
                  title: "Session Booked",
                  description: `${session.learner_name} booked "${session.topic}"`,
                  amount: session.amount,
                  timestamp: session.created_at,
                  hoursAgo,
                  icon: "CheckCircle2",
                  color: "text-green-600",
                  bgColor: "bg-green-100",
                });
              } else if (!session.is_paid) {
                notificationsList.push({
                  id: `session-request-${session.id}`,
                  type: "session_requested",
                  title: "New Session Request",
                  description: `New session request: "${session.topic}"`,
                  timestamp: session.created_at,
                  hoursAgo,
                  icon: "Calendar",
                  color: "text-blue-600",
                  bgColor: "bg-blue-100",
                });
              }
            });
          }

          // Fetch recent ad deposits (from last 72 hours)
          try {
            const response = await fetch(
              `http://127.0.0.1:8000/api/v1/mentors/ads/deposits/${userData.mentor_db_id}/`
            );
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.deposits) {
                data.deposits.forEach((deposit: any) => {
                  const depositDate = new Date(
                    deposit.created_at || deposit.deposited_at
                  );
                  if (depositDate >= seventyTwoHoursAgo) {
                    const hoursAgo = Math.floor(
                      (now.getTime() - depositDate.getTime()) / (1000 * 60 * 60)
                    );
                    notificationsList.push({
                      id: `ad-deposit-${deposit.id}`,
                      type: "ad_payment",
                      title: "Ad Account Deposit",
                      description: `Added $${parseFloat(
                        deposit.amount || 0
                      ).toFixed(2)} to ad account`,
                      amount: deposit.amount,
                      timestamp: deposit.created_at || deposit.deposited_at,
                      hoursAgo,
                      icon: "Megaphone",
                      color: "text-purple-600",
                      bgColor: "bg-purple-100",
                    });
                  }
                });
              }
            }
          } catch (error) {
            console.error("Error fetching ad deposits:", error);
          }

          // Fetch recent storage purchases (from last 72 hours)
          const { data: storagePurchases } = await supabase
            .from("storage_purchases")
            .select("*")
            .eq("mentor_id", userData.mentor_db_id)
            .eq("payment_status", "succeeded")
            .gte("created_at", seventyTwoHoursAgo.toISOString())
            .order("created_at", { ascending: false })
            .limit(10);

          if (storagePurchases) {
            storagePurchases.forEach((purchase: any) => {
              const purchaseDate = new Date(purchase.created_at);
              const hoursAgo = Math.floor(
                (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60)
              );
              notificationsList.push({
                id: `storage-${purchase.id}`,
                type: "storage_purchase",
                title: "Storage Upgrade",
                description: `Purchased ${purchase.storage_gb} GB storage`,
                amount: purchase.price_usd,
                timestamp: purchase.created_at,
                hoursAgo,
                icon: "HardDrive",
                color: "text-indigo-600",
                bgColor: "bg-indigo-100",
              });
            });
          }
        }

        // Sort by timestamp (newest first)
        notificationsList.sort((a, b) => {
          const dateA = new Date(a.timestamp);
          const dateB = new Date(b.timestamp);
          return dateB.getTime() - dateA.getTime();
        });

        setNotifications(notificationsList);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setNotificationsLoading(false);
      }
    };

    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [userData?.id, userData?.mentor_db_id]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={clsx(
          "bg-white border-r border-gray-200 transition-all duration-300",
          // On mobile: always fixed overlay, hidden when collapsed
          "md:static fixed inset-y-0 left-0 z-40 md:z-auto",
          "md:translate-x-0",
          isSidebarCollapsed
            ? "translate-x-[-100%] md:translate-x-0 w-16 md:w-20"
            : "translate-x-0 w-56 md:w-64"
        )}
      >
        <div className="flex flex-col h-full px-2 md:px-4 py-3 md:py-6">
          {/* Mobile Close Button - Only show when sidebar is open */}
          {!isSidebarCollapsed && (
            <div className="flex items-center justify-between mb-4 md:mb-8 px-1 md:px-2 md:hidden">
              <div className="h-12 w-12 flex items-center justify-center flex-shrink-0">
                <Image
                  src="/images/logo1.png"
                  alt="Logo"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          )}

          {/* Logo Section - Desktop Only */}
          <div
            className={clsx(
              "hidden md:flex items-center justify-center mb-4 md:mb-8 px-1 md:px-2",
              isSidebarCollapsed && "justify-center"
            )}
          >
            <div className="h-12 w-12 md:h-20 md:w-20 flex items-center justify-center flex-shrink-0">
              <Image
                src="/images/logo1.png"
                alt="Logo"
                width={isSidebarCollapsed ? 48 : 80}
                height={isSidebarCollapsed ? 48 : 80}
                className="object-contain"
              />
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 space-y-1">
            {mainLinks.map((link) => {
              const isNavigating = navigatingTo === link.href;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    if (link.href !== pathname) {
                      setNavigatingTo(link.href);
                      // Reset loading state after navigation completes
                      setTimeout(() => {
                        setNavigatingTo(null);
                      }, 1000);
                    }
                  }}
                  className={clsx(
                    "flex items-center px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-colors group relative",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                    isSidebarCollapsed && "justify-center",
                    isNavigating && "opacity-70 cursor-wait"
                  )}
                  title={isSidebarCollapsed ? link.label : undefined}
                >
                  {isNavigating ? (
                    <Loader2
                      className={clsx(
                        "h-4 w-4 md:h-5 md:w-5 flex-shrink-0 animate-spin",
                        !isSidebarCollapsed && "mr-2 md:mr-3"
                      )}
                    />
                  ) : (
                    <link.icon
                      className={clsx(
                        "h-4 w-4 md:h-5 md:w-5 flex-shrink-0",
                        !isSidebarCollapsed && "mr-2 md:mr-3"
                      )}
                    />
                  )}
                  {!isSidebarCollapsed && (
                    <span className="text-xs md:text-sm">{link.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Action Button - Different for different user types */}
          {!isSidebarCollapsed && (
            <div className="px-1 md:px-2 my-2 md:my-4">
              {userType === "company" ||
              userType === "mentor" ||
              userType === "tutor" ? (
                <button
                  onClick={() => setIsCreateJobOpen(true)}
                  className="w-full px-2 md:px-3 py-1.5 md:py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs md:text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <PlusCircle className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Post a Job</span>
                  <span className="sm:hidden">Post</span>
                </button>
              ) : (
                <Link
                  href="/"
                  className="w-full px-2 md:px-3 py-1.5 md:py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs md:text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Search className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Find Jobs</span>
                  <span className="sm:hidden">Find</span>
                </Link>
              )}
            </div>
          )}

          {/* Collapsed Action Button */}
          {isSidebarCollapsed && (
            <div className="px-1 md:px-2 my-2 md:my-4">
              {userType === "company" ||
              userType === "mentor" ||
              userType === "tutor" ? (
                <button
                  onClick={() => setIsCreateJobOpen(true)}
                  className="w-full p-1.5 md:p-2 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
                  title="Post a Job"
                >
                  <PlusCircle className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              ) : (
                <Link
                  href="/"
                  className="w-full p-1.5 md:p-2 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
                  title="Find Jobs"
                >
                  <Search className="h-4 w-4 md:h-5 md:w-5" />
                </Link>
              )}
            </div>
          )}

          {/* Bottom Navigation */}
          <nav className="space-y-1">
            {bottomLinks.map((link) => {
              // Handle logout button separately
              if (link.label === "Logout") {
                return (
                  <button
                    key={link.href}
                    onClick={() => setIsLogoutModalOpen(true)}
                    className={clsx(
                      "flex items-center w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-colors",
                      "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                      isSidebarCollapsed && "justify-center"
                    )}
                    title={isSidebarCollapsed ? link.label : undefined}
                  >
                    <link.icon
                      className={clsx(
                        "h-4 w-4 md:h-5 md:w-5 flex-shrink-0",
                        !isSidebarCollapsed && "mr-2 md:mr-3"
                      )}
                    />
                    {!isSidebarCollapsed && (
                      <span className="text-xs md:text-sm">{link.label}</span>
                    )}
                  </button>
                );
              }

              // Handle Settings button separately - open modal for mentors/tutors
              if (
                link.label === "Settings" &&
                (userType === "company" ||
                  userType === "mentor" ||
                  userType === "tutor")
              ) {
                return (
                  <button
                    key={link.href}
                    onClick={() => setIsSettingsModalOpen(true)}
                    className={clsx(
                      "flex items-center w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-colors",
                      pathname === link.href
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                      isSidebarCollapsed && "justify-center"
                    )}
                    title={isSidebarCollapsed ? link.label : undefined}
                  >
                    <link.icon
                      className={clsx(
                        "h-4 w-4 md:h-5 md:w-5 flex-shrink-0",
                        !isSidebarCollapsed && "mr-2 md:mr-3"
                      )}
                    />
                    {!isSidebarCollapsed && (
                      <span className="text-xs md:text-sm">{link.label}</span>
                    )}
                  </button>
                );
              }

              // Regular links
              const isNavigating = navigatingTo === link.href;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    if (link.href !== pathname) {
                      setNavigatingTo(link.href);
                      // Reset loading state after navigation completes
                      setTimeout(() => {
                        setNavigatingTo(null);
                      }, 1000);
                    }
                  }}
                  className={clsx(
                    "flex items-center px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-colors relative",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                    isSidebarCollapsed && "justify-center",
                    isNavigating && "opacity-70 cursor-wait"
                  )}
                  title={isSidebarCollapsed ? link.label : undefined}
                >
                  {isNavigating ? (
                    <Loader2
                      className={clsx(
                        "h-4 w-4 md:h-5 md:w-5 flex-shrink-0 animate-spin",
                        !isSidebarCollapsed && "mr-2 md:mr-3"
                      )}
                    />
                  ) : (
                    <link.icon
                      className={clsx(
                        "h-4 w-4 md:h-5 md:w-5 flex-shrink-0",
                        !isSidebarCollapsed && "mr-2 md:mr-3"
                      )}
                    />
                  )}
                  {!isSidebarCollapsed && (
                    <span className="text-xs md:text-sm">{link.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile overlay when sidebar is open */}
      {!isSidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50 flex flex-col w-full">
        {/* Top Header with User Info */}
        <div className="bg-white border-b border-gray-200 px-3 md:px-6 py-2 md:py-4 flex items-center justify-between shadow-sm">
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 md:p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 hover:border-gray-300"
            aria-label="Toggle sidebar"
          >
            {isSidebarCollapsed ? (
              <Menu className="h-5 w-5 md:h-6 md:w-6 text-gray-600" />
            ) : (
              <X className="h-5 w-5 md:h-6 md:w-6 text-gray-600" />
            )}
          </button>

          <div className="flex items-center gap-1.5 md:gap-3">
            {/* WhatsApp and Notifications Icons */}
            <div className="flex items-center gap-2">
              {/* WhatsApp Icon */}
              <a
                href="https://wa.me/27723592849?text=Hello%2C%20I%20need%20assistance%20with%20my%20account"
                target="_blank"
                rel="noopener noreferrer"
                className="relative p-1.5 md:p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 hover:border-green-400 group"
                aria-label="Contact us on WhatsApp"
              >
                <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-gray-600 group-hover:text-green-600 transition-colors" />
              </a>

              {/* Notifications Icon */}
              <button
                onClick={() => setIsNotificationsOpen(true)}
                className="relative p-1.5 md:p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 hover:border-orange-400 group"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4 md:h-5 md:w-5 text-gray-600 group-hover:text-orange-600 transition-colors" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                )}
              </button>
            </div>

            {/* User Profile */}
            <div
              className="flex items-center gap-2 md:gap-4 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl px-2 md:px-5 py-1.5 md:py-3 transition-all duration-200 border border-gray-200 hover:border-blue-400 hover:shadow-md group"
              onClick={() => setIsProfileOpen(true)}
            >
              <div className="text-right hidden sm:block">
                <h2 className="font-semibold text-sm md:text-base bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-purple-700 transition-colors">
                  {(() => {
                    // Debug: Log what we have in userData
                    if (userData) {
                      console.log("Displaying name - userData:", {
                        full_name: userData.full_name,
                        name: userData.name,
                        email: userData.email,
                        mentorDataName: userData.name || "not found",
                        allKeys: Object.keys(userData).filter(k => k.includes('name') || k === 'email')
                      });
                    }
                    
                    // Try multiple sources for the name - check each explicitly
                    let displayName = null;
                    
                    if (userData?.full_name && userData.full_name.trim() && userData.full_name !== "User") {
                      displayName = userData.full_name.trim();
                    } else if (userData?.name && userData.name.trim() && userData.name !== "User") {
                      displayName = userData.name.trim();
                    } else if (userData?.email) {
                      displayName = userData.email.split("@")[0];
                    } else {
                      displayName = "User";
                    }
                    
                    console.log("Final display name:", displayName);
                    return displayName;
                  })()}
                </h2>
                <p className="text-xs md:text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-purple-600 transition-colors">
                  {userData?.user_type === "company"
                    ? "Recruiter"
                    : userData?.user_type === "tutor"
                    ? "Recruiter"
                    : userData?.user_type === "mentor"
                    ? "Recruiter"
                    : userData?.user_type === "student" ||
                      userData?.user_type === "applicant"
                    ? "Applicant"
                    : "User"}
                </p>
              </div>
              <div className="relative flex items-center gap-1 md:gap-2">
                {userData?.avatar_url ? (
                  <div className="h-8 w-8 md:h-12 md:w-12 rounded-full overflow-hidden border-2 border-blue-200 shadow-sm group-hover:border-blue-400 transition-colors">
                    <img
                      src={userData.avatar_url}
                      alt={userData.full_name || "User"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-8 w-8 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-blue-200 shadow-sm group-hover:border-blue-400 transition-colors">
                    <UserCircle className="h-5 w-5 md:h-8 md:w-8 text-white" />
                  </div>
                )}
                <ChevronDown className="h-4 w-4 md:h-5 md:w-5 text-gray-400 group-hover:text-blue-600 transition-colors hidden sm:block" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">{children}</div>
      </main>

      {/* User Profile Popup */}
      <UserProfilePopup
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userData={userData}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />

      {/* Notifications Dropdown */}
      {isNotificationsOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsNotificationsOpen(false)}
          />
          {/* Notifications Panel */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:top-16 md:right-6 md:left-auto md:translate-x-0 md:translate-y-0 w-[90%] max-w-[400px] md:w-[500px] max-h-[80vh] md:max-h-[700px] bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-3 md:p-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
              <div>
                <h3 className="font-semibold text-base md:text-lg text-gray-900">
                  Notifications
                </h3>
                <p className="text-xs md:text-sm text-gray-600">
                  Last 72 hours
                </p>
              </div>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] md:max-h-[650px]">
              {notificationsLoading ? (
                <div className="p-6 md:p-10 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 md:h-10 md:w-10 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-3 md:mt-4 text-sm md:text-base text-gray-600">
                    Loading notifications...
                  </p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 md:p-10 text-center text-gray-500">
                  <Bell className="h-12 w-12 md:h-16 md:w-16 text-gray-300 mx-auto mb-2 md:mb-3" />
                  <p className="text-sm md:text-base">No new notifications</p>
                  <p className="text-xs md:text-sm mt-2">
                    You'll see updates here when they arrive
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notif) => {
                    const IconComponent =
                      notif.icon === "CheckCircle2"
                        ? CheckCircle2
                        : notif.icon === "Calendar"
                        ? Calendar
                        : notif.icon === "Megaphone"
                        ? Megaphone
                        : notif.icon === "HardDrive"
                        ? HardDrive
                        : notif.icon === "Briefcase"
                        ? Briefcase
                        : Bell;

                    const timeAgo =
                      notif.hoursAgo < 1
                        ? "Just now"
                        : notif.hoursAgo === 1
                        ? "1 hour ago"
                        : notif.hoursAgo < 24
                        ? `${notif.hoursAgo} hours ago`
                        : `${Math.floor(notif.hoursAgo / 24)} day${
                            Math.floor(notif.hoursAgo / 24) > 1 ? "s" : ""
                          } ago`;

                    const handleDelete = async (e: React.MouseEvent) => {
                      e.stopPropagation();
                      if (notif.db_notification && notif.id) {
                        try {
                          const { error } = await supabase
                            .from("job_post_notifications")
                            .delete()
                            .eq("id", notif.id);

                          if (error) {
                            console.error(
                              "Error deleting notification:",
                              error
                            );
                          } else {
                            // Remove from local state
                            setNotifications((prev) =>
                              prev.filter((n) => n.id !== notif.id)
                            );
                          }
                        } catch (err) {
                          console.error("Error deleting notification:", err);
                        }
                      } else {
                        // For non-database notifications, just remove from local state
                        setNotifications((prev) =>
                          prev.filter((n) => n.id !== notif.id)
                        );
                      }
                    };

                    return (
                      <div
                        key={notif.id}
                        className="p-3 md:p-5 hover:bg-gray-50 transition-colors cursor-pointer relative group"
                        onClick={() => {
                          // Navigate based on notification type
                          if (
                            notif.type === "session_booked" ||
                            notif.type === "session_requested"
                          ) {
                            window.location.href = "/dashboard/myjobs";
                          } else if (notif.type === "ad_payment") {
                            window.location.href =
                              "/dashboard/advertising/reports";
                          } else if (notif.type === "storage_purchase") {
                            window.location.href = "/dashboard/tutor/storage";
                          } else if (
                            notif.type === "job_posted" &&
                            notif.job_id
                          ) {
                            window.location.href = `/jobs/${notif.job_id}`;
                          }
                          setIsNotificationsOpen(false);
                        }}
                      >
                        <button
                          onClick={handleDelete}
                          className="absolute top-2 right-2 md:top-3 md:right-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1"
                          aria-label="Delete notification"
                        >
                          <X className="h-3 w-3 md:h-4 md:w-4" />
                        </button>
                        <div className="flex items-start gap-2 md:gap-4 pr-5 md:pr-6">
                          <div
                            className={`flex-shrink-0 h-8 w-8 md:h-12 md:w-12 rounded-full ${notif.bgColor} flex items-center justify-center`}
                          >
                            <IconComponent
                              className={`h-4 w-4 md:h-6 md:w-6 ${notif.color}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm md:text-base font-semibold text-gray-900">
                              {notif.title}
                            </p>
                            <p className="text-xs md:text-sm text-gray-600 mt-1 md:mt-1.5">
                              {notif.description}
                            </p>
                            <div className="flex items-center justify-between mt-2 md:mt-3">
                              <span className="text-xs md:text-sm text-gray-500">
                                {timeAgo}
                              </span>
                              {notif.amount && (
                                <span className="text-xs md:text-sm font-semibold text-gray-900">
                                  ${parseFloat(notif.amount || 0).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Create Session Modal */}
      {userData && (userType === "mentor" || userType === "tutor") && (
        <CreateSessionModal
          isOpen={isCreateSessionOpen}
          onClose={() => setIsCreateSessionOpen(false)}
          mentorId={userData.mentor_db_id || userData.id || ""}
          onSuccess={() => {
            // Don't reload - let user see logs and success message
            console.log(
              "✅ Job posted successfully! Check console for details."
            );
            // Optionally refresh data without full page reload
            // window.location.reload()
          }}
        />
      )}

      {/* Create Job Modal */}
      {userData &&
        (userType === "company" ||
          userType === "mentor" ||
          userType === "tutor") && (
          <CreateJobModal
            isOpen={isCreateJobOpen}
            onClose={() => setIsCreateJobOpen(false)}
            companyId={
              userData.company_id || userData.id || companyData?.id || ""
            }
            onSuccess={() => {
              // Don't reload - let user see logs and success message
              console.log(
                "✅ Job posted successfully! Check console for details."
              );
              // Optionally refresh jobs list without full page reload
              // window.location.reload()
            }}
          />
        )}

      {/* Settings Modal for Mentors/Tutors */}
      {(userType === "mentor" || userType === "tutor") && userData && (
        <MentorSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          userData={userData}
          onUpdate={() => {
            // Refresh user data after settings update
            const fetchUserData = async () => {
              try {
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) return;

                const { data: mentorData } = await supabase
                  .from("mentors")
                  .select("*")
                  .eq("user_id", user.id)
                  .maybeSingle();

                if (mentorData) {
                  // Process mentor data similar to initial fetch
                  let social_links = mentorData.social_links || {};
                  if (typeof social_links === "string") {
                    try {
                      social_links = JSON.parse(social_links);
                    } catch {
                      social_links = {};
                    }
                  }

                  let settings = mentorData.settings || {};
                  if (typeof settings === "string") {
                    try {
                      settings = JSON.parse(settings);
                    } catch {
                      settings = {};
                    }
                  }

                  let languages = mentorData.languages || [];
                  if (typeof languages === "string") {
                    try {
                      languages = JSON.parse(languages);
                    } catch {
                      languages = [];
                    }
                  }

                  let specialization = mentorData.specialization || [];
                  if (typeof specialization === "string") {
                    try {
                      specialization = JSON.parse(specialization);
                    } catch {
                      specialization = [];
                    }
                  }

                  setUserData({
                    ...mentorData,
                    id: mentorData.user_id || user.id,
                    email: mentorData.email || user.email || "", // Always include email from auth user
                    mentor_db_id: mentorData.id,
                    full_name: mentorData.name,
                    avatar_url: mentorData.avatar || null,
                    bio: mentorData.description || null,
                    user_type: userType,
                    verified:
                      mentorData.is_verified === true ||
                      mentorData.is_verified === "true",
                    social_links,
                    settings,
                    languages_spoken: languages,
                    phone_number: mentorData.phone_number || null,
                    country: mentorData.country || null,
                    city: mentorData.city || null,
                    title: mentorData.title,
                    experience: mentorData.experience,
                    hourly_rate: mentorData.hourly_rate,
                    availability: mentorData.availability,
                    specialization: specialization,
                    qualifications: mentorData.qualifications,
                  });
                }
              } catch (error) {
                console.error("Error refreshing user data:", error);
              }
            };
            fetchUserData();
          }}
        />
      )}

      {/* Mentor Profile Completion Form - Only for recruiters */}
      {userData && userData.id && (userData.user_type === "mentor" || userData.user_type === "tutor" || userData.user_type === "company") && (
        <MentorProfileCompletionForm
          isOpen={isProfileCompletionOpen}
          onClose={() => {
            setIsProfileCompletionOpen(false);
          }}
          userId={userData.id}
          onComplete={async () => {
            setIsProfileCompletionOpen(false);
            // Refresh user data after completion
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              // Fetch updated mentor data
              const { data: updatedMentorData, error: mentorError } = await supabase
                .from("mentors")
                .select("*")
                .eq("user_id", user.id)
                .maybeSingle();
              
              if (!mentorError && updatedMentorData) {
                setMentorData(updatedMentorData);
                
                // Extract name from mentor data
                const mentorName = (updatedMentorData.name && updatedMentorData.name.trim()) ||
                                 user.user_metadata?.full_name ||
                                 user.user_metadata?.name ||
                                 user.email?.split("@")[0] ||
                                 "User";
                
                // Determine user type
                const userTypeFromMetadata = user.user_metadata?.user_type;
                let userType = "mentor";
                
                if (userTypeFromMetadata === "tutor") {
                  userType = "tutor";
                } else if (userTypeFromMetadata === "mentor") {
                  userType = "mentor";
                } else if (userTypeFromMetadata === "company") {
                  userType = "company";
                }
                
                // Parse JSON fields
                let social_links = updatedMentorData.social_links || {};
                if (typeof social_links === "string") {
                  try {
                    social_links = JSON.parse(social_links);
                  } catch {
                    social_links = {};
                  }
                }
                
                let settings = updatedMentorData.settings || {};
                if (typeof settings === "string") {
                  try {
                    settings = JSON.parse(settings);
                  } catch {
                    settings = {};
                  }
                }
                
                let languages_spoken = updatedMentorData.languages || [];
                if (typeof languages_spoken === "string") {
                  try {
                    languages_spoken = JSON.parse(languages_spoken);
                  } catch {
                    languages_spoken = [];
                  }
                }
                if (!Array.isArray(languages_spoken)) {
                  languages_spoken = [];
                }
                
                const verified =
                  updatedMentorData.is_verified === true ||
                  updatedMentorData.is_verified === "true" ||
                  updatedMentorData.is_verified === "pending"
                    ? updatedMentorData.is_verified === "pending"
                      ? "pending"
                      : true
                    : false;
                
                // Update userData with mentor data and ensure name is set
                setUserData({
                  ...updatedMentorData,
                  id: updatedMentorData.user_id || user.id,
                  mentor_db_id: updatedMentorData.id,
                  user_type: userType,
                  email: updatedMentorData.email || user.email || "",
                  verified,
                  social_links,
                  settings,
                  languages_spoken,
                  avatar_url: updatedMentorData.avatar || null,
                  phone_number: updatedMentorData.phone_number || null,
                  country: updatedMentorData.country || null,
                  city: updatedMentorData.city || null,
                  bio: updatedMentorData.description || null,
                  full_name: mentorName.trim() || user.email?.split("@")[0] || "User",
                  name: mentorName.trim() || user.email?.split("@")[0] || "User",
                });
              }
            }
          }}
        />
      )}

      {/* Student Profile Completion Form - Only for applicants/students */}
      {userData && userData.id && (userData.user_type === "student" || userData.user_type === "applicant") && (
        <StudentProfileCompletionForm
          isOpen={isProfileCompletionOpen}
          onClose={() => {
            setIsProfileCompletionOpen(false);
          }}
          userId={userData.id}
          onComplete={async () => {
            setIsProfileCompletionOpen(false);
            // Refresh user data after completion
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              // Fetch updated student data
              const { data: updatedStudentData, error: studentError } = await supabase
                .from("students")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();
              
              if (!studentError && updatedStudentData) {
                setStudentData(updatedStudentData);
                
                // Extract name from student data
                let studentName = null;
                
                if (updatedStudentData.full_name && typeof updatedStudentData.full_name === 'string' && updatedStudentData.full_name.trim()) {
                  studentName = updatedStudentData.full_name.trim();
                } else if (updatedStudentData.name && typeof updatedStudentData.name === 'string' && updatedStudentData.name.trim()) {
                  studentName = updatedStudentData.name.trim();
                } else if (user.user_metadata?.full_name && typeof user.user_metadata.full_name === 'string' && user.user_metadata.full_name.trim()) {
                  studentName = user.user_metadata.full_name.trim();
                } else if (user.user_metadata?.name && typeof user.user_metadata.name === 'string' && user.user_metadata.name.trim()) {
                  studentName = user.user_metadata.name.trim();
                } else if (user.email) {
                  studentName = user.email.split("@")[0];
                } else {
                  studentName = "User";
                }
                
                // Parse JSON fields
                let social_links = updatedStudentData.social_links || {};
                if (typeof social_links === "string") {
                  try {
                    social_links = JSON.parse(social_links);
                  } catch {
                    social_links = {};
                  }
                }
                
                let settings = updatedStudentData.settings || {};
                if (typeof settings === "string") {
                  try {
                    settings = JSON.parse(settings);
                  } catch {
                    settings = {};
                  }
                }
                
                let languages_spoken = updatedStudentData.languages_spoken;
                if (typeof languages_spoken === "string") {
                  try {
                    languages_spoken = JSON.parse(languages_spoken);
                  } catch {
                    languages_spoken = languages_spoken.replace(/[\[\]"]/g, "") || null;
                  }
                }
                
                let interests = updatedStudentData.interests;
                if (typeof interests === "string") {
                  try {
                    interests = JSON.parse(interests);
                  } catch {
                    interests = interests.replace(/[\[\]"]/g, "") || null;
                  }
                }
                
                const verified =
                  updatedStudentData.verified === true ||
                  updatedStudentData.verified === "true" ||
                  updatedStudentData.verified === "pending"
                    ? updatedStudentData.verified === "pending"
                      ? "pending"
                      : true
                    : false;
                
                // Update userData with student data and ensure name is set
                setUserData({
                  ...updatedStudentData,
                  user_type: "student",
                  full_name: studentName,
                  name: studentName,
                  email: updatedStudentData.email || user.email || "",
                  verified,
                  social_links,
                  settings,
                  languages_spoken,
                  interests,
                });
              }
            }
          }}
        />
      )}
    </div>
  );
}
