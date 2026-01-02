"use client";

import * as React from "react";
import {
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  User,
  FileText,
  Phone,
  MapPin,
  Globe,
  Linkedin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingLogo } from "@/components/loading-logo";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface ProfileCompletionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onComplete: () => void;
}

export function ProfileCompletionPopup({
  isOpen,
  onClose,
  userId,
  onComplete,
}: ProfileCompletionPopupProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [countries, setCountries] = React.useState<
    Array<{ name: string; code: string }>
  >([]);
  const [formData, setFormData] = React.useState({
    full_name: "",
    bio: "",
    phone_number: "",
    country: "",
    city: "",
    facebook: "",
    linkedin: "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen && userId) {
      fetchUserData();
      fetchCountries();
    }
  }, [isOpen, userId]);

  const fetchCountries = React.useCallback(async () => {
    setIsLoadingCountries(true);
    try {
      const response = await fetch(
        "https://restcountries.com/v3.1/all?fields=name,cca2"
      );
      if (!response.ok) throw new Error("Failed to fetch countries");
      const data = await response.json();
      const formattedCountries = data
        .map((country: any) => ({
          name: country.name?.common || "",
          code: country.cca2 || "",
        }))
        .filter((c: any) => c.name && c.code)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      setCountries(formattedCountries);
    } catch (error) {
      console.error("Error fetching countries:", error);
      setCountries([]);
    } finally {
      setIsLoadingCountries(false);
    }
  }, []);

  const fetchUserData = async () => {
    try {
      // Get Supabase session for auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        console.error("No session found");
        return;
      }

      const user = session.user;

      // Check if user is a mentor or student
      const [mentorCheck, studentCheck] = await Promise.all([
        supabase
          .from("mentors")
          .select(
            "id, user_id, name, description, phone_number, country, city, facebook_profile, linkedin_profile"
          )
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("students")
          .select("id, full_name, bio, phone_number, country, city")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      const isMentor = mentorCheck.data && !mentorCheck.error;
      const isStudent = studentCheck.data && !studentCheck.error;

      if (isMentor && mentorCheck.data) {
        // Fetch mentor data
        setFormData({
          full_name: mentorCheck.data.name || "",
          bio: mentorCheck.data.description || "",
          phone_number: mentorCheck.data.phone_number || "",
          country: mentorCheck.data.country || "",
          city: "", // Note: mentors table doesn't have city column
          facebook: mentorCheck.data.facebook_profile || "",
          linkedin: mentorCheck.data.linkedin_profile || "",
        });
      } else if (isStudent) {
        // Try API first for students
        try {
          const baseUrl = API_BASE_URL.replace(/\/+$/, "");
          const response = await fetch(`${baseUrl}/users/students/profile/`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (response.ok) {
            const result = await response.json();
            if (result.data) {
              const socialLinks = result.data.social_links || {};
              setFormData({
                full_name: result.data.full_name || "",
                bio: result.data.bio || "",
                phone_number: result.data.phone_number || "",
                country: result.data.country || "",
                city: result.data.city || "",
                facebook: socialLinks.facebook || "",
                linkedin: socialLinks.linkedin || "",
              });
              return;
            }
          }
        } catch (apiError) {
          console.error("API fetch failed, using direct Supabase:", apiError);
        }

        // Fallback to direct Supabase query for students
        if (studentCheck.data) {
          setFormData({
            full_name: studentCheck.data.full_name || "",
            bio: studentCheck.data.bio || "",
            phone_number: studentCheck.data.phone_number || "",
            country: studentCheck.data.country || "",
            city: studentCheck.data.city || "",
            facebook: "",
            linkedin: "",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Full name is required";
    }

    if (!formData.bio.trim()) {
      newErrors.bio = "Bio is required";
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = "Phone number is required";
    }

    if (!formData.country.trim()) {
      newErrors.country = "Country is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Get Supabase session for auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No session found. Please log in again.");
      }

      const user = session.user;
      if (!user) {
        throw new Error("No user found in session.");
      }

      // Check if user is a mentor or student
      const [mentorCheck, studentCheck] = await Promise.all([
        supabase
          .from("mentors")
          .select("id, user_id")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("students").select("id").eq("id", user.id).maybeSingle(),
      ]);

      // Determine user role
      const isMentor = mentorCheck.data && !mentorCheck.error;
      const isStudent = studentCheck.data && !studentCheck.error;

      if (isMentor && mentorCheck.data) {
        // Update mentor profile directly via Supabase
        const mentorId = mentorCheck.data.id;
        const updateData: any = {
          name: formData.full_name.trim(),
          title: "", // Required field - set to empty string (user can update later)
          description: formData.bio.trim(),
          phone_number: formData.phone_number.trim(),
          country: formData.country.trim(),
          hourly_rate: 0.0, // Required field - set to 0 (user can update later)
          experience: 0, // Required field - set to 0 years (user can update later)
          // Note: city column doesn't exist in mentors table, so we don't save it
          is_complete: true,
        };

        // Handle social links
        const socialLinks: any = {};
        if (formData.facebook.trim()) {
          socialLinks.facebook = formData.facebook.trim();
        }
        if (formData.linkedin.trim()) {
          socialLinks.linkedin = formData.linkedin.trim();
        }
        if (Object.keys(socialLinks).length > 0) {
          updateData.facebook_profile = socialLinks.facebook || null;
          updateData.linkedin_profile = socialLinks.linkedin || null;
        }

        const { error: updateError } = await supabase
          .from("mentors")
          .update(updateData)
          .eq("id", mentorId);

        if (updateError) {
          throw new Error(
            `Failed to update mentor profile: ${updateError.message}`
          );
        }

        // Show success popup
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onComplete();
          onClose();
          router.refresh();
        }, 2000);
      } else if (isStudent) {
        // Call API endpoint for students
        const baseUrl = API_BASE_URL.replace(/\/+$/, "");
        const response = await fetch(
          `${baseUrl}/users/students/complete-profile/`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              full_name: formData.full_name.trim(),
              bio: formData.bio.trim(),
              phone_number: formData.phone_number.trim(),
              country: formData.country.trim(),
              city: formData.city.trim(),
              facebook: formData.facebook.trim() || null,
              linkedin: formData.linkedin.trim() || null,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update profile");
        }

        const result = await response.json();

        if (result.message === "Profile completed successfully") {
          // Show success popup
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            onComplete();
            onClose();
            router.refresh();
          }, 2000);
        } else {
          throw new Error("Unexpected response from server");
        }
      } else {
        throw new Error(
          "User not found in mentors or students table. Please select your role first."
        );
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setErrors({
        submit: error.message || "Failed to update profile. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md"
          >
            <div
              className="relative p-[3px] rounded-xl animate-border-rotate"
              style={{
                background:
                  "conic-gradient(from 0deg, #3b82f6, #2563eb, #1d4ed8, #1e40af, #3b82f6)",
              }}
            >
              <Card className="bg-white shadow-2xl border-2 border-blue-200 rounded-xl overflow-hidden relative z-10">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white pb-2 pt-3">
                  <div className="flex items-center justify-center gap-2">
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
                      Profile Completed!
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Success!
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Your profile has been completed successfully.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Form Popup */}
      {isOpen && !showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              // Prevent closing on backdrop click - user must complete profile
              e.stopPropagation();
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md"
          >
            <div
              className="relative p-[3px] rounded-xl animate-border-rotate"
              style={{
                background:
                  "conic-gradient(from 0deg, #3b82f6, #2563eb, #1d4ed8, #1e40af, #3b82f6)",
              }}
            >
              <Card className="bg-white shadow-2xl border-2 border-blue-200 rounded-xl overflow-hidden relative z-10">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white pb-2 pt-3">
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
                        Complete Your Profile
                      </CardTitle>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-white hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-blue-100 mt-0.5 leading-tight">
                    Complete your profile to help you find the job quick
                  </p>
                </CardHeader>

                <CardContent className="p-2.5">
                  <form onSubmit={handleSubmit} className="space-y-2">
                    {/* Full Name */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            full_name: e.target.value,
                          });
                          if (errors.full_name)
                            setErrors({ ...errors, full_name: "" });
                        }}
                        placeholder="Enter your full name"
                        className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2"
                      />
                      {errors.full_name && (
                        <p className="text-xs text-red-500">
                          {errors.full_name}
                        </p>
                      )}
                    </div>

                    {/* Bio */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5" />
                        Bio <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        value={formData.bio}
                        onChange={(e) => {
                          setFormData({ ...formData, bio: e.target.value });
                          if (errors.bio) setErrors({ ...errors, bio: "" });
                        }}
                        placeholder="Tell us about yourself"
                        rows={3}
                        className="bg-white border-gray-300 focus:border-blue-500 resize-none text-xs py-1 px-2"
                      />
                      {errors.bio && (
                        <p className="text-xs text-red-500">{errors.bio}</p>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="tel"
                        value={formData.phone_number}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            phone_number: e.target.value,
                          });
                          if (errors.phone_number)
                            setErrors({ ...errors, phone_number: "" });
                        }}
                        placeholder="+1 234 567 8900"
                        className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2"
                      />
                      {errors.phone_number && (
                        <p className="text-xs text-red-500">
                          {errors.phone_number}
                        </p>
                      )}
                    </div>

                    {/* Country */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" />
                        Country <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={formData.country}
                        onValueChange={(value) => {
                          setFormData({ ...formData, country: value });
                          if (errors.country)
                            setErrors({ ...errors, country: "" });
                        }}
                        disabled={isLoadingCountries}
                      >
                        <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2">
                          <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.code} value={country.name}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.country && (
                        <p className="text-xs text-red-500">{errors.country}</p>
                      )}
                    </div>

                    {/* City */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        City <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={formData.city}
                        onChange={(e) => {
                          setFormData({ ...formData, city: e.target.value });
                          if (errors.city) setErrors({ ...errors, city: "" });
                        }}
                        placeholder="Enter your city"
                        className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2"
                      />
                      {errors.city && (
                        <p className="text-xs text-red-500">{errors.city}</p>
                      )}
                    </div>

                    {/* Facebook */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" />
                        Facebook{" "}
                        <span className="text-gray-500 font-normal">
                          (Optional)
                        </span>
                      </label>
                      <Input
                        type="url"
                        value={formData.facebook}
                        onChange={(e) =>
                          setFormData({ ...formData, facebook: e.target.value })
                        }
                        placeholder="https://facebook.com/yourprofile"
                        className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2"
                      />
                    </div>

                    {/* LinkedIn */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <Linkedin className="w-2.5 h-2.5" />
                        LinkedIn{" "}
                        <span className="text-gray-500 font-normal">
                          (Optional)
                        </span>
                      </label>
                      <Input
                        type="url"
                        value={formData.linkedin}
                        onChange={(e) =>
                          setFormData({ ...formData, linkedin: e.target.value })
                        }
                        placeholder="https://linkedin.com/in/yourprofile"
                        className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2"
                      />
                    </div>

                    {/* Error Message */}
                    {errors.submit && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                        <AlertCircle className="w-3 h-3" />
                        <span className="text-xs">{errors.submit}</span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-7 text-xs mt-1"
                    >
                      {isLoading ? (
                        <>
                          <LoadingLogo size={12} />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1.5" />
                          Complete Profile
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-gray-500 text-center mt-0.5 leading-tight">
                      All fields marked with{" "}
                      <span className="text-red-500">*</span> are required for
                      verification
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
