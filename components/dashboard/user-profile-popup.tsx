import * as React from "react";
import {
  X,
  Globe,
  Link as LinkIcon,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Edit2,
  Check,
  Phone,
  MapPin,
  User,
  Languages,
  Target,
  DollarSign,
  BookOpen,
  Clock as ClockIcon,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VerificationPopup } from "./verification-popup";
import { LogoutConfirmationModal } from "./logout-confirmation-modal";
import { supabase } from "@/lib/supabase";
import { LoadingLogo } from "@/components/loading-logo";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
  userData: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    user_type: string;
    created_at: string;
    updated_at: string;
    verified: boolean | "pending" | "true" | "false";
    bio: string | null;
    website: string | null;
    phone_number?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    country?: string | null;
    city?: string | null;
    timezone?: string | null;
    native_language?: string | null;
    languages_spoken?: string | string[] | null;
    current_level?: string | null;
    interests?: string | string[] | null;
    learning_goals?: string | null;
    preferred_learning_style?: string | null;
    availability_hours?: string | null;
    budget_range?: string | null;
    social_links: Record<string, string> | string | null;
    settings: Record<string, any> | string | null;
    status?: string | null;
    is_complete?: boolean | null;
    role?: string | null;
    // Mentor/Tutor specific fields
    title?: string | null;
    experience?: string | number | null;
    hourly_rate?: number | null;
    availability?: string | null;
    specialization?: string | string[] | null;
    qualifications?: string | null;
  } | null;
  onVerificationSubmit?: () => void;
}

export function UserProfilePopup({
  isOpen,
  onClose,
  userData,
  onVerificationSubmit,
}: UserProfilePopupProps) {
  const [isVerificationOpen, setIsVerificationOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);
  const [profileData, setProfileData] = React.useState(userData);
  const [formData, setFormData] = React.useState({
    full_name: userData?.full_name || "",
    website: userData?.website || "",
    bio: userData?.bio || "",
    social_links: userData?.social_links || {},
    phone_number: userData?.phone_number || "",
    country: userData?.country || "",
    city: userData?.city || "",
    current_level: userData?.current_level || "",
    languages_spoken: Array.isArray(userData?.languages_spoken)
      ? userData.languages_spoken.join(", ")
      : typeof userData?.languages_spoken === "string"
      ? userData.languages_spoken.replace(/[\[\]"]/g, "") || ""
      : "",
    interests: Array.isArray(userData?.interests)
      ? userData.interests.join(", ")
      : typeof userData?.interests === "string"
      ? userData.interests.replace(/[\[\]"]/g, "") || ""
      : "",
    // Mentor/Tutor specific fields
    hourly_rate: userData?.hourly_rate || 0,
    experience: userData?.experience || "",
    specialization: Array.isArray(userData?.specialization)
      ? userData.specialization.join(", ")
      : typeof userData?.specialization === "string"
      ? userData.specialization.replace(/[\[\]"]/g, "") || ""
      : "",
  });

  // Update form data when profileData changes
  React.useEffect(() => {
    if (profileData) {
      setFormData({
        full_name: profileData.full_name || "",
        website: profileData.website || "",
        bio: profileData.bio || "",
        social_links: profileData.social_links || {},
        phone_number: profileData.phone_number || "",
        country: profileData.country || "",
        city: profileData.city || "",
        current_level: profileData.current_level || "",
        languages_spoken: Array.isArray(profileData.languages_spoken)
          ? profileData.languages_spoken.join(", ")
          : typeof profileData.languages_spoken === "string"
          ? profileData.languages_spoken.replace(/[\[\]"]/g, "") || ""
          : "",
        interests: Array.isArray(profileData.interests)
          ? profileData.interests.join(", ")
          : typeof profileData.interests === "string"
          ? profileData.interests.replace(/[\[\]"]/g, "") || ""
          : "",
        // Mentor/Tutor specific fields
        hourly_rate: profileData?.hourly_rate || 0,
        experience: profileData?.experience || "",
        specialization: Array.isArray(profileData?.specialization)
          ? profileData.specialization.join(", ")
          : typeof profileData?.specialization === "string"
          ? profileData.specialization.replace(/[\[\]"]/g, "") || ""
          : "",
      });
    }
  }, [profileData]);

  // Fetch user data if not provided
  React.useEffect(() => {
    const fetchProfileData = async () => {
      // If userData is provided, use it
      if (userData) {
        // Ensure email is always set from auth user if missing
        if (!userData.email) {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user?.email) {
              setProfileData({ ...userData, email: user.email });
              return;
            }
          } catch (error) {
            console.error("Error fetching auth user email:", error);
          }
        }
        setProfileData(userData);
        return;
      }

          // If popup is open but no userData, fetch it
      if (isOpen && !userData) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            console.error("No authenticated user found");
            return;
          }

          // Check companies table first for recruiters
          const { data: companyData, error: companyError } = await supabase
            .from("companies")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!companyError && companyData) {
            const verified =
              companyData.is_verified === true ||
              companyData.is_verified === "true" ||
              companyData.is_verified === "pending"
                ? companyData.is_verified === "pending"
                  ? "pending"
                  : true
                : false;

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

            setProfileData({
              ...companyData,
              id: companyData.user_id || user.id,
              full_name: companyName,
              user_type: "company",
              verified,
              avatar_url: companyData.avatar || companyData.logo || null,
              bio: companyData.description || null,
              email: companyData.email || user.email || null,
            });
            return;
          }

          // Check mentors table
          const { data: mentorData, error: mentorError } = await supabase
            .from("mentors")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!mentorError && mentorData) {
            const verified =
              mentorData.is_verified === true ||
              mentorData.is_verified === "true" ||
              mentorData.is_verified === "pending"
                ? mentorData.is_verified === "pending"
                  ? "pending"
                  : true
                : false;

            // Determine user type
            const userTypeFromMetadata = user.user_metadata?.user_type;
            let userType = "mentor";

            if (userTypeFromMetadata === "tutor") {
              userType = "tutor";
            } else if (userTypeFromMetadata === "mentor") {
              userType = "mentor";
            } else if (userTypeFromMetadata === "user") {
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

            setProfileData({
              ...mentorData,
              id: mentorData.user_id || user.id,
              full_name: mentorData.name,
              user_type: userType,
              verified,
              avatar_url: mentorData.avatar || null,
              bio: mentorData.description || null,
              email: mentorData.email || user.email || null, // Always get email from auth user
            });
            return;
          }

          // Check students table
          const { data: studentData, error: studentError } = await supabase
            .from("students")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (!studentError && studentData) {
            const verified =
              studentData.verified === true ||
              studentData.verified === "true" ||
              studentData.verified === "pending"
                ? studentData.verified === "pending"
                  ? "pending"
                  : true
                : false;

            setProfileData({
              ...studentData,
              user_type: "student",
              verified,
              email: studentData.email || user.email || null, // Always get email from auth user
            });
            return;
          }

          // If no data found in either table, create a basic profile from auth user
          setProfileData({
            id: user.id,
            full_name:
              user.user_metadata?.full_name ||
              user.email?.split("@")[0] ||
              "User",
            email: user.email || "", // Always include email from auth user
            user_type: user.user_metadata?.user_type || "user",
            verified: false,
            avatar_url: null,
            bio: null,
            phone_number: null,
            country: null,
            city: null,
            website: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            languages_spoken: [],
            interests: [],
            social_links: {},
          } as any);
        } catch (error) {
          console.error("Error fetching profile data:", error);
        }
      }
    };

    fetchProfileData();
  }, [isOpen, userData]);

  const handleVerificationSubmit = async (formData: any) => {
    if (!profileData) return;
    try {
      setIsLoading(true);

      // Determine which table to update based on user type
      const isMentor =
        profileData?.user_type === "mentor" ||
        profileData?.user_type === "tutor";
      const tableName = isMentor ? "mentors" : "students";
      const verifiedField = isMentor ? "is_verified" : "verified";

      const { error } = await supabase
        .from(tableName)
        .update({ [verifiedField]: "pending" })
        .eq("id", profileData?.id);

      if (error) throw error;

      if (onVerificationSubmit) {
        onVerificationSubmit();
      }
      setIsVerificationOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error submitting verification:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    try {
      setIsLoading(true);

      // Create an object with only the changed fields, using existing data as base
      const updates: Record<string, any> = {};

      // Only update fields that have changed and are not empty
      if (
        formData.full_name !== profileData?.full_name &&
        formData.full_name.trim() !== ""
      ) {
        updates.full_name = formData.full_name;
      }

      if (
        formData.website !== profileData?.website &&
        formData.website.trim() !== ""
      ) {
        updates.website = formData.website;
      }

      if (formData.bio !== profileData?.bio && formData.bio.trim() !== "") {
        updates.bio = formData.bio;
      }

      // Update phone_number
      if (formData.phone_number !== (profileData?.phone_number || "")) {
        updates.phone_number = formData.phone_number.trim() || null;
      }

      // Update country
      if (formData.country !== (profileData?.country || "")) {
        updates.country = formData.country.trim() || null;
      }

      // Update city
      if (formData.city !== (profileData?.city || "")) {
        updates.city = formData.city.trim() || null;
      }

      // Update current_level
      if (formData.current_level !== (profileData?.current_level || "")) {
        updates.current_level = formData.current_level.trim() || null;
      }

      // Update languages_spoken (convert comma-separated string to array)
      const currentLanguages = Array.isArray(profileData?.languages_spoken)
        ? profileData?.languages_spoken.join(", ")
        : typeof profileData?.languages_spoken === "string"
        ? profileData?.languages_spoken.replace(/[\[\]"]/g, "") || ""
        : "";
      if (formData.languages_spoken !== currentLanguages) {
        updates.languages_spoken = formData.languages_spoken.trim()
          ? formData.languages_spoken
              .split(",")
              .map((lang) => lang.trim())
              .filter(Boolean)
          : [];
      }

      // Update interests (convert comma-separated string to array)
      const currentInterests = Array.isArray(profileData?.interests)
        ? profileData?.interests.join(", ")
        : typeof profileData?.interests === "string"
        ? profileData?.interests.replace(/[\[\]"]/g, "") || ""
        : "";
      if (formData.interests !== currentInterests) {
        updates.interests = formData.interests.trim()
          ? formData.interests
              .split(",")
              .map((interest) => interest.trim())
              .filter(Boolean)
          : [];
      }

      // Only update social_links if it has changed and is not empty
      if (
        JSON.stringify(formData.social_links) !==
          JSON.stringify(profileData?.social_links) &&
        Object.keys(formData.social_links).length > 0
      ) {
        updates.social_links = formData.social_links;
      }

      // Determine which table to update based on user type
      const isMentor =
        profileData?.user_type === "mentor" ||
        profileData?.user_type === "tutor";

      // Update mentor/tutor specific fields
      if (isMentor) {
        // Update hourly_rate
        if (formData.hourly_rate !== (profileData?.hourly_rate || 0)) {
          updates.hourly_rate =
            parseFloat(formData.hourly_rate.toString()) || 0;
        }

        // Update experience
        if (formData.experience !== (profileData?.experience || "")) {
          updates.experience = formData.experience.toString();
        }

        // Update specialization (convert comma-separated string to array)
        const currentSpecialization = Array.isArray(profileData?.specialization)
          ? profileData?.specialization.join(", ")
          : typeof profileData?.specialization === "string"
          ? (() => {
              try {
                return (
                  JSON.parse(profileData.specialization.replace(/'/g, '"')) ||
                  []
                );
              } catch {
                return profileData.specialization.replace(/[\[\]"]/g, "") || "";
              }
            })()
          : "";
        const formSpecialization = formData.specialization.trim();
        if (formSpecialization !== currentSpecialization) {
          updates.specialization = formSpecialization
            ? formSpecialization
                .split(",")
                .map((spec) => spec.trim())
                .filter(Boolean)
            : [];
        }
      }

      // Only update if there are actual changes
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();

        const tableName = isMentor ? "mentors" : "students";

        // For mentors, map full_name to name
        if (isMentor && updates.full_name) {
          updates.name = updates.full_name;
          delete updates.full_name;
        }

        const { error } = await supabase
          .from(tableName)
          .update(updates)
          .eq(isMentor ? "user_id" : "id", profileData?.id || "");

        if (error) throw error;

        // Show success message first
        setShowSuccess(true);

        // Update the parent component's userData
        if (onVerificationSubmit) {
          onVerificationSubmit();
        }

        // Close the profile popup after a short delay
        setTimeout(() => {
          onClose();
        }, 500);

        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else {
        // No changes were made
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getVerificationStatus = () => {
    const verified = profileData?.verified;
    // Handle both boolean and string values
    if (verified === true || verified === "true") {
      return {
        icon: CheckCircle,
        text: "Verified",
        color: "text-green-500",
        clickable: false,
      };
    } else if (verified === "pending") {
      return {
        icon: Clock,
        text: "Pending Verification",
        color: "text-blue-500",
        clickable: false,
      };
    } else {
      return {
        icon: XCircle,
        text: "Unverified",
        color: "text-yellow-500",
        clickable: true,
      };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <AnimatePresence>
      {/* Loading Overlay */}
      {isLoading && (
        <motion.div
          key="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center"
        >
          <LoadingLogo size={32} />
        </motion.div>
      )}

      {/* Success Popup */}
      {showSuccess && (
        <motion.div
          key="success-popup"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-4 right-4 z-[100]"
        >
          <div className="relative">
            {/* Glowing background effect */}
            <div className="absolute inset-0 bg-green-400 blur-xl opacity-30 rounded-lg" />

            {/* Main popup card - Light background */}
            <div className="relative bg-white border-2 border-green-400 rounded-lg p-4 shadow-2xl">
              <div className="flex items-center gap-3">
                {/* Animated checkmark icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-400"
                >
                  <Check className="h-6 w-6 text-green-600" />
                </motion.div>

                {/* Success message */}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Profile Updated Successfully
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Changes have been saved to your profile
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 3, ease: "linear" }}
                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-green-400 to-green-600 rounded-b-lg"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Profile Popup */}
      {isOpen && (
        <React.Fragment key="profile-popup">
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              key="profile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Popup Card */}
            <motion.div
              key="profile-card"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md max-h-[90vh] overflow-hidden z-50"
            >
              <div
                className="relative p-[3px] rounded-xl animate-border-rotate"
                style={{
                  background:
                    "conic-gradient(from 0deg, #3b82f6, #2563eb, #1d4ed8, #1e40af, #3b82f6)",
                }}
              >
                <Card className="bg-white shadow-2xl border-2 border-blue-200 rounded-xl overflow-hidden relative z-10 max-h-[90vh] flex flex-col">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white pb-2 pt-3 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1">
                          <Image
                            src="/images/logo1.png"
                            alt="BrightByt Logo"
                            width={24}
                            height={24}
                            className="object-contain"
                          />
                        </div>
                        <CardTitle className="text-sm font-bold">
                          My Profile
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Logout Button */}
                        <button
                          onClick={() => setIsLogoutModalOpen(true)}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white hover:bg-white/20 rounded-lg transition-colors"
                          title="Logout"
                        >
                          <LogOut size={14} />
                          <span>Logout</span>
                        </button>
                        {/* Close Button */}
                        <button
                          onClick={onClose}
                          className="text-white hover:bg-white/20 rounded-full p-0.5 transition-colors"
                          aria-label="Close"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 overflow-y-auto flex-1">
                    {/* Loading State */}
                    {!profileData ? (
                      <div className="flex items-center justify-center py-12">
                        <LoadingLogo size={32} />
                      </div>
                    ) : (
                      <>
                        {/* Profile Content */}
                        {(() => {
                          const status = getVerificationStatus();
                          return (
                            <>
                              <div className="text-center mb-4">
                                <div className="relative w-14 h-14 mx-auto mb-2">
                                  {profileData?.avatar_url ? (
                                    <img
                                      src={profileData.avatar_url}
                                      alt={profileData.full_name || "User"}
                                      className="w-full h-full rounded-full object-cover border-4 border-gray-200"
                                    />
                                  ) : (
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center border-4 border-blue-200">
                                      <span className="text-3xl font-medium text-white">
                                        {(profileData?.full_name ||
                                          "U")[0].toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  <div
                                    className={`absolute bottom-1 right-1 flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-gray-200 shadow-sm ${
                                      status.clickable
                                        ? "cursor-pointer hover:bg-gray-50 transition-colors"
                                        : ""
                                    }`}
                                    onClick={() => {
                                      if (status.clickable) {
                                        onClose();
                                        setIsVerificationOpen(true);
                                      }
                                    }}
                                  >
                                    <status.icon
                                      size={12}
                                      className={status.color}
                                    />
                                    <span
                                      className={`text-xs font-medium ${status.color}`}
                                    >
                                      {status.text}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={formData.full_name}
                                      onChange={(e) =>
                                        setFormData({
                                          ...formData,
                                          full_name: e.target.value,
                                        })
                                      }
                                      className="text-xl font-bold text-gray-900 bg-white border border-gray-300 px-2 py-1 rounded text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                      placeholder={
                                        profileData?.full_name || "User"
                                      }
                                    />
                                  ) : (
                                    <h2 className="text-lg font-bold text-gray-900">
                                      {profileData?.full_name || "User"}
                                    </h2>
                                  )}
                                  <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                  >
                                    <Edit2 className="h-4 w-4 text-gray-500" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                                  <span className="px-2 py-0.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-medium rounded-full">
                                    {profileData?.user_type === "tutor"
                                      ? "Tutor"
                                      : profileData?.user_type === "mentor"
                                      ? "Company"
                                      : profileData?.user_type === "student"
                                      ? "Student"
                                      : profileData?.user_type
                                          ?.charAt(0)
                                          .toUpperCase() +
                                          profileData?.user_type?.slice(1) ||
                                        "User"}
                                  </span>
                                </div>
                              </div>

                              {/* User Details Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-4">
                                {/* Left Column */}
                                <div className="space-y-2">
                                  {/* Email - Always show */}
                                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Mail
                                        size={12}
                                        className="text-blue-500 flex-shrink-0"
                                      />
                                      <h3 className="text-xs font-medium text-gray-700 truncate">
                                        Email
                                      </h3>
                                    </div>
                                    <p
                                      className="text-gray-600 text-xs truncate"
                                      title={profileData?.email || "Loading..."}
                                    >
                                      {profileData?.email || "Loading..."}
                                    </p>
                                  </div>

                                  {/* Phone Number - Only show if provided */}
                                  {profileData?.phone_number && (
                                    <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <Phone
                                          size={12}
                                          className="text-green-500 flex-shrink-0"
                                        />
                                        <h3 className="text-xs font-medium text-gray-700">
                                          Phone
                                        </h3>
                                      </div>
                                      {isEditing ? (
                                        <input
                                          type="tel"
                                          value={formData.phone_number}
                                          onChange={(e) =>
                                            setFormData({
                                              ...formData,
                                              phone_number: e.target.value,
                                            })
                                          }
                                          className="w-full bg-white text-gray-900 px-2 py-1 rounded mt-1 text-xs border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                          placeholder="+1234567890"
                                        />
                                      ) : (
                                        <p className="text-gray-600 text-xs mt-1">
                                          {profileData?.phone_number}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Country - Only show if provided */}
                                  {profileData?.country && (
                                    <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <MapPin
                                          size={12}
                                          className="text-red-500 flex-shrink-0"
                                        />
                                        <h3 className="text-xs font-medium text-gray-700">
                                          Country
                                        </h3>
                                      </div>
                                      {isEditing ? (
                                        <input
                                          type="text"
                                          value={formData.country}
                                          onChange={(e) =>
                                            setFormData({
                                              ...formData,
                                              country: e.target.value,
                                            })
                                          }
                                          className="w-full bg-white text-gray-900 px-2 py-1 rounded mt-1 text-xs border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                          placeholder="Enter country"
                                        />
                                      ) : (
                                        <p className="text-gray-600 text-xs mt-1">
                                          {profileData?.country}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* City - Only show if provided */}
                                  {profileData?.city && (
                                    <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <MapPin
                                          size={12}
                                          className="text-orange-500 flex-shrink-0"
                                        />
                                        <h3 className="text-xs font-medium text-gray-700">
                                          City
                                        </h3>
                                      </div>
                                      {isEditing ? (
                                        <input
                                          type="text"
                                          value={formData.city}
                                          onChange={(e) =>
                                            setFormData({
                                              ...formData,
                                              city: e.target.value,
                                            })
                                          }
                                          className="w-full bg-white text-gray-900 px-2 py-1 rounded mt-1 text-xs border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                          placeholder="Enter city"
                                        />
                                      ) : (
                                        <p className="text-gray-600 text-xs mt-1">
                                          {profileData?.city}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Current Level - Only show if provided */}
                                  {profileData?.current_level && (
                                    <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <BookOpen
                                          size={12}
                                          className="text-cyan-500 flex-shrink-0"
                                        />
                                        <h3 className="text-xs font-medium text-gray-700">
                                          Level
                                        </h3>
                                      </div>
                                      {isEditing ? (
                                        <select
                                          value={formData.current_level}
                                          onChange={(e) =>
                                            setFormData({
                                              ...formData,
                                              current_level: e.target.value,
                                            })
                                          }
                                          className="w-full bg-white text-gray-900 px-2 py-1 rounded mt-1 text-xs border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        >
                                          <option value="">Select level</option>
                                          <option value="beginner">
                                            Beginner
                                          </option>
                                          <option value="intermediate">
                                            Intermediate
                                          </option>
                                          <option value="advanced">
                                            Advanced
                                          </option>
                                          <option value="expert">Expert</option>
                                        </select>
                                      ) : (
                                        <p className="text-gray-600 text-xs mt-1 capitalize">
                                          {profileData?.current_level}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Member Since */}
                                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Calendar
                                        size={12}
                                        className="text-yellow-500 flex-shrink-0"
                                      />
                                      <h3 className="text-xs font-medium text-gray-700">
                                        Member Since
                                      </h3>
                                    </div>
                                    <p className="text-gray-600 text-xs mt-1">
                                      {formatDate(profileData?.created_at)}
                                    </p>
                                  </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-2">
                                  {/* Website - Only show if provided */}
                                  {profileData?.website && (
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                      <div className="flex items-center gap-2">
                                        <Globe
                                          size={14}
                                          className="text-blue-500"
                                        />
                                        <h3 className="text-xs font-medium text-gray-700">
                                          Website
                                        </h3>
                                      </div>
                                      {isEditing ? (
                                        <input
                                          type="url"
                                          value={formData.website}
                                          onChange={(e) =>
                                            setFormData({
                                              ...formData,
                                              website: e.target.value,
                                            })
                                          }
                                          className="w-full bg-white text-gray-900 px-2 py-1 rounded mt-1 text-xs border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                          placeholder="Add your website..."
                                        />
                                      ) : (
                                        <a
                                          href={profileData?.website}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 text-xs hover:underline mt-1 block truncate"
                                        >
                                          {profileData?.website}
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  {/* Languages Spoken - Only show if provided */}
                                  {(() => {
                                    const languages = Array.isArray(
                                      profileData?.languages_spoken
                                    )
                                      ? profileData.languages_spoken
                                      : typeof profileData?.languages_spoken ===
                                        "string"
                                      ? profileData.languages_spoken
                                          .replace(/[\[\]"]/g, "")
                                          .split(",")
                                          .map((l: string) => l.trim())
                                          .filter(Boolean)
                                      : [];
                                    return languages.length > 0 ? (
                                      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200 col-span-2">
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <Languages
                                            size={12}
                                            className="text-teal-500 flex-shrink-0"
                                          />
                                          <h3 className="text-xs font-medium text-gray-700">
                                            Languages
                                          </h3>
                                        </div>
                                        {isEditing ? (
                                          <input
                                            type="text"
                                            value={formData.languages_spoken}
                                            onChange={(e) =>
                                              setFormData({
                                                ...formData,
                                                languages_spoken:
                                                  e.target.value,
                                              })
                                            }
                                            className="w-full bg-white text-gray-900 px-2 py-1 rounded mt-1 text-xs border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                            placeholder="e.g., English, Spanish, French"
                                          />
                                        ) : (
                                          <p className="text-gray-600 text-xs mt-1">
                                            {languages.join(", ")}
                                          </p>
                                        )}
                                      </div>
                                    ) : null;
                                  })()}

                                  {/* Last Updated */}
                                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-200 col-span-2">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Calendar
                                        size={12}
                                        className="text-purple-500 flex-shrink-0"
                                      />
                                      <h3 className="text-xs font-medium text-gray-700">
                                        Last Updated
                                      </h3>
                                    </div>
                                    <p className="text-gray-600 text-xs mt-1">
                                      {formatDate(profileData?.updated_at)}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Update Button */}
                              {isEditing && (
                                <div className="mt-4 flex justify-end gap-2">
                                  <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleUpdateProfile}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                                  >
                                    Save Changes
                                  </button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        </React.Fragment>
      )}

      {/* Verification Popup */}
      {profileData && (
        <VerificationPopup
          key="verification-popup"
          isOpen={isVerificationOpen}
          onClose={() => setIsVerificationOpen(false)}
          onSubmit={handleVerificationSubmit}
          userId={profileData?.id || ""}
        />
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        key="logout-modal"
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </AnimatePresence>
  );
}
