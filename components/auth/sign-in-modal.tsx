"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { googleAuthService } from "@/lib/googleAuthService";
import { useRouter } from "next/navigation";
import { LoadingLogo } from "@/components/loading-logo";
import { RoleSelectionModal } from "./role-selection-modal";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignUp: () => void;
  onSuccess?: () => void; // Optional callback to prevent redirect
  onRoleSelectionNeeded?: (userData: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  }) => void; // Callback when role selection is needed
}

export function SignInModal({
  isOpen,
  onClose,
  onSignUp,
  onSuccess,
  onRoleSelectionNeeded,
}: SignInModalProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showRoleSelection, setShowRoleSelection] = React.useState(false);
  const [googleUserData, setGoogleUserData] = React.useState<{
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) throw authError;

      // First check if user is a mentor/tutor
      const { data: mentorData, error: mentorError } = await supabase
        .from("mentors")
        .select("id, email")
        .eq("id", authData.user?.id)
        .maybeSingle();

      // If onSuccess callback is provided, call it instead of redirecting (for booking flow)
      if (onSuccess) {
        console.log("Login successful, calling onSuccess callback");
        onClose();
        setTimeout(() => {
          onSuccess();
        }, 100);
        return;
      }

      // If user is a mentor/tutor, redirect to tutor dashboard
      if (mentorData && !mentorError) {
        console.log("User is a mentor/tutor, redirecting to tutor dashboard");
        onClose();
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 100);
        return;
      }

      // Check if user exists in students table
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("id", authData.user?.id)
        .maybeSingle();

      if (studentError || !studentData) {
        console.warn(
          "User not found in mentors or students table, checking user metadata..."
        );
        // Check user metadata for user_type
        const userType = authData.user?.user_metadata?.user_type;
        if (userType === "tutor" || userType === "mentor") {
          console.log(
            "User type from metadata is tutor/mentor, redirecting to company dashboard"
          );
          onClose();
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 100);
          return;
        }
      }

      // Redirect to learner dashboard
      console.log("Redirecting to learner dashboard");
      onClose();
      setTimeout(() => {
        window.location.href = "/dashboard/learner";
      }, 100);
    } catch (error: any) {
      let errorMessage = error.message || "An error occurred during sign in";
      // Replace "Failed to fetch" with a more user-friendly message
      if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("fetch")
      ) {
        errorMessage = "Check your internet connection";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      console.log("Starting Google authentication...");

      // Get Google credential using the same method as BrightByt dashboard
      const credential = await googleAuthService.signInWithGoogle(false);
      console.log("Google credential received:", credential ? "Yes" : "No");

      if (!credential) {
        throw new Error("No credential received from Google");
      }

      // Use Supabase to authenticate with Google token (same as BrightByt dashboard)
      console.log("Signing in with Google via Supabase...");
      const { data, error: signInError } =
        await supabase.auth.signInWithIdToken({
          provider: "google",
          token: credential,
        });

      if (signInError) {
        console.error("Supabase Google sign-in error:", signInError);
        throw new Error(
          `Supabase authentication failed: ${signInError.message}`
        );
      }

      if (!data.user) {
        throw new Error("No user data received from Supabase");
      }

      console.log("Supabase Google authentication successful:", data.user);

      // If onSuccess callback is provided, call it instead of redirecting (for booking flow)
      if (onSuccess) {
        console.log("Google login successful, calling onSuccess callback");
        onClose();
        setTimeout(() => {
          onSuccess();
        }, 100);
        return;
      }

      // Check if user exists in mentors table by email
      const userEmail = data.user.email?.trim().toLowerCase();
      if (!userEmail) {
        throw new Error("No email found in Google account");
      }

      console.log("Checking mentors table for email:", userEmail);
      const { data: mentorData, error: mentorError } = await supabase
        .from("mentors")
        .select("id, email")
        .ilike("email", userEmail) // Case-insensitive search
        .maybeSingle();

      console.log("Mentor query result:", { mentorData, mentorError });

      // If user is a mentor/tutor, redirect to tutor dashboard
      if (mentorData && !mentorError) {
        console.log(
          "User is a mentor/tutor (found by email), redirecting to tutor dashboard"
        );
        onClose();
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 100);
        return;
      }

      // Check if user exists in students table by email
      console.log("Checking students table for email:", userEmail);
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, email")
        .ilike("email", userEmail) // Case-insensitive search
        .maybeSingle();

      console.log("Student query result:", { studentData, studentError });

      // If user exists in students table, redirect to learner dashboard
      if (studentData && !studentError) {
        console.log(
          "User is a student/learner (found by email), redirecting to learner dashboard"
        );
        onClose();
        setTimeout(() => {
          window.location.href = "/dashboard/learner";
        }, 100);
        return;
      }

      // User doesn't exist in either table - redirect to dashboard where role selection will be handled
      console.log(
        "User not found in mentors or students table (email:",
        userEmail,
        "), redirecting to dashboard for role selection"
      );
      setLoading(false);
      onClose(); // Close sign-in modal
      // Redirect to dashboard - it will detect the missing role and show role selection modal
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 100);
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      let errorMessage =
        error.message || "An error occurred during Google sign in.";
      // Replace "Failed to fetch" with a more user-friendly message
      if (
        errorMessage.includes("Failed to fetch") ||
        errorMessage.includes("fetch")
      ) {
        errorMessage = "Check your internet connection";
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  const redirectBasedOnUserType = async (userType: string, userId?: string) => {
    // Map old user types to new ones
    const userTypeMap: { [key: string]: string } = {
      student: "student",
      learner: "student",
      mentor: "mentor",
      tutor: "mentor", // tutor and mentor are the same
      user: "student",
      advertiser: "student", // fallback
      company: "student", // fallback
      influencer: "mentor", // fallback
      affiliate: "mentor", // fallback
    };

    const mappedType = userTypeMap[userType.toLowerCase()] || "student";

    console.log("Redirecting user - Type:", userType, "Mapped:", mappedType);

    // Use window.location for a hard redirect to ensure it happens
    if (mappedType === "mentor" || mappedType === "tutor") {
      console.log("Redirecting to company dashboard");
      window.location.href = "/dashboard";
    } else {
      console.log("Redirecting to learner dashboard");
      window.location.href = "/dashboard/learner";
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
            className="relative w-full max-w-md mx-4"
          >
            <div className="bg-white border-2 border-blue-200 rounded-xl shadow-lg p-6">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                {loading ? (
                  <LoadingLogo size={44} />
                ) : (
                  <Image
                    src="/images/logo1.png"
                    alt="Brightbyt Logo"
                    width={50}
                    height={50}
                    className="object-contain"
                  />
                )}
              </div>

              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="clintonsope48p@gmail.com"
                    required
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Forgot password?
                  </button>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <div className="mt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">
                      Or continue with
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="mt-4 w-full px-4 py-2 border-2 border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {loading ? "Signing in..." : "Sign in with Google"}
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSignUp();
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Role Selection Modal */}
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
        />
      )}
    </AnimatePresence>
  );
}
