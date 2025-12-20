"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GraduationCap, User } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { LoadingLogo } from "@/components/loading-logo";

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  userName?: string;
  userAvatar?: string;
  onTutorSelected?: () => void; // Optional callback when tutor is selected
}

export function RoleSelectionModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  userName,
  userAvatar,
  onTutorSelected,
}: RoleSelectionModalProps) {
  const [selectedRole, setSelectedRole] = React.useState<
    "learner" | "tutor" | null
  >(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleRoleSelection = async (role: "learner" | "tutor") => {
    setSelectedRole(role);
    setError("");
    setLoading(true);

    try {
      const nameToUse = userName || userEmail?.split("@")[0] || "User";

      if (role === "tutor") {
        // Check if mentor record already exists
        console.log("Checking for existing mentor record for user:", userId);
        const { data: existingMentor, error: checkError } = await supabase
          .from("mentors")
          .select("id, user_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (checkError && checkError.code !== "PGRST116") {
          console.error("Error checking for existing mentor:", checkError);
          throw new Error(
            `Failed to check tutor profile: ${checkError.message}`
          );
        }

        if (existingMentor) {
          // Mentor record already exists
          console.log("Mentor record already exists");
          onClose();
          // If callback provided, use it; otherwise redirect
          if (onTutorSelected) {
            setTimeout(() => {
              onTutorSelected();
            }, 100);
          } else {
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 100);
          }
          return;
        }

        // Create mentor/tutor record
        console.log(
          "Creating new mentor record for Google sign-in user:",
          userId
        );
        const { data: mentorData, error: mentorError } = await supabase
          .from("mentors")
          .insert({
            user_id: userId,
            name: nameToUse,
            email: userEmail,
            title: "",
            description: "",
            specialization: "[]",
            rating: 1.0,
            total_reviews: 0,
            hourly_rate: 0.0,
            avatar: userAvatar || "",
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

        if (mentorError) {
          console.error("Error creating mentor record:", mentorError);
          throw new Error(
            `Failed to create tutor profile: ${mentorError.message}`
          );
        }

        console.log("Mentor record created successfully");
        onClose();
        // If callback provided, use it to open profile completion; otherwise redirect
        if (onTutorSelected) {
          setTimeout(() => {
            onTutorSelected();
          }, 100);
        } else {
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 100);
        }
      } else {
        // Check if student record already exists
        console.log("Checking for existing student record for user:", userId);
        const { data: existingStudent, error: checkError } = await supabase
          .from("students")
          .select("id, email")
          .eq("id", userId)
          .maybeSingle();

        if (checkError && checkError.code !== "PGRST116") {
          console.error("Error checking for existing student:", checkError);
          throw new Error(
            `Failed to check learner profile: ${checkError.message}`
          );
        }

        if (existingStudent) {
          // Student record already exists, just redirect
          console.log(
            "Student record already exists, redirecting to learner dashboard"
          );
          onClose();
          setTimeout(() => {
            window.location.href = "/dashboard/learner";
          }, 100);
          return;
        }

        // Create student/learner record
        console.log(
          "Creating new student record for Google sign-in user:",
          userId
        );
        const { error: studentError } = await supabase.from("students").insert({
          id: userId,
          email: userEmail,
          full_name: nameToUse,
          avatar_url: userAvatar || null,
          bio: null,
          website: null,
          phone_number: null,
          country: null,
          city: null,
          gender: null,
          date_of_birth: null,
          current_level: null,
          native_language: null,
          languages_spoken: null,
          interests: null,
          learning_goals: null,
          preferred_learning_style: null,
          availability_hours: null,
          budget_range: null,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (studentError) {
          console.error("Error creating student record:", studentError);
          throw new Error(
            `Failed to create learner profile: ${studentError.message}`
          );
        }

        console.log(
          "Student record created successfully, redirecting to learner dashboard"
        );
        onClose();
        setTimeout(() => {
          window.location.href = "/dashboard/learner";
        }, 100);
      }
    } catch (error: any) {
      console.error("Error creating profile:", error);
      setError(error.message || "Failed to create profile. Please try again.");
      setSelectedRole(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl mx-4"
          >
            <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-300 rounded-2xl shadow-2xl p-8 md:p-10">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                {loading ? (
                  <LoadingLogo size={64} />
                ) : (
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl opacity-50"></div>
                    <Image
                      src="/images/logo1.png"
                      alt="BrightByt Logo"
                      width={80}
                      height={80}
                      className="object-contain relative z-10"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Choose Your Role
                </h2>
                {!loading && (
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="h-6 w-6" />
                  </button>
                )}
              </div>

              <p className="text-lg text-gray-700 mb-8 text-center font-medium">
                Please select how you'd like to use{" "}
                <span className="text-blue-600 font-bold">BrightByt</span>
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Learner Option */}
                <button
                  onClick={() => handleRoleSelection("learner")}
                  disabled={loading}
                  className={`group relative p-6 border-2 rounded-xl transition-all transform hover:scale-105 ${
                    selectedRole === "learner"
                      ? "border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg ring-2 ring-blue-400"
                      : "border-gray-300 bg-white hover:border-blue-400 hover:shadow-md"
                  } ${
                    loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div
                      className={`p-4 rounded-xl transition-all ${
                        selectedRole === "learner"
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg"
                          : "bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-blue-200"
                      }`}
                    >
                      <GraduationCap
                        className={`h-10 w-10 transition-all ${
                          selectedRole === "learner"
                            ? "text-white"
                            : "text-gray-600 group-hover:text-blue-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`text-xl font-bold mb-2 ${
                          selectedRole === "learner"
                            ? "text-blue-700"
                            : "text-gray-900"
                        }`}
                      >
                        Learner
                      </h3>
                      <p
                        className={`text-sm leading-relaxed ${
                          selectedRole === "learner"
                            ? "text-blue-600"
                            : "text-gray-600"
                        }`}
                      >
                        I want to learn from expert tutors and mentors
                      </p>
                    </div>
                  </div>
                  {selectedRole === "learner" && (
                    <div className="absolute top-2 right-2">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    </div>
                  )}
                </button>

                {/* Tutor Option */}
                <button
                  onClick={() => handleRoleSelection("tutor")}
                  disabled={loading}
                  className={`group relative p-6 border-2 rounded-xl transition-all transform hover:scale-105 ${
                    selectedRole === "tutor"
                      ? "border-purple-600 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg ring-2 ring-purple-400"
                      : "border-gray-300 bg-white hover:border-purple-400 hover:shadow-md"
                  } ${
                    loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div
                      className={`p-4 rounded-xl transition-all ${
                        selectedRole === "tutor"
                          ? "bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg"
                          : "bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-purple-100 group-hover:to-purple-200"
                      }`}
                    >
                      <User
                        className={`h-10 w-10 transition-all ${
                          selectedRole === "tutor"
                            ? "text-white"
                            : "text-gray-600 group-hover:text-purple-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`text-xl font-bold mb-2 ${
                          selectedRole === "tutor"
                            ? "text-purple-700"
                            : "text-gray-900"
                        }`}
                      >
                        Tutor/Mentor
                      </h3>
                      <p
                        className={`text-sm leading-relaxed ${
                          selectedRole === "tutor"
                            ? "text-purple-600"
                            : "text-gray-600"
                        }`}
                      >
                        I want to teach and mentor students
                      </p>
                    </div>
                  </div>
                  {selectedRole === "tutor" && (
                    <div className="absolute top-2 right-2">
                      <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                    </div>
                  )}
                </button>
              </div>

              {loading && (
                <div className="mt-6 text-center">
                  <LoadingLogo size={32} />
                  <p className="text-sm text-gray-600 mt-3 font-medium">
                    Setting up your profile...
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
