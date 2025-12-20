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

interface StudentProfileCompletionFormProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onComplete: () => void;
}

export function StudentProfileCompletionForm({
  isOpen,
  onClose,
  userId,
  onComplete,
}: StudentProfileCompletionFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = React.useState(false);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
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

  // Add global styles for select options
  React.useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .student-profile-completion-form-container select {
        cursor: pointer;
      }
      .student-profile-completion-form-container select option {
        background-color: white !important;
        color: #1f2937 !important;
        padding: 0.875rem 1rem !important;
        font-size: 1rem !important;
        line-height: 1.5 !important;
        border-bottom: 1px solid #f3f4f6 !important;
      }
      .student-profile-completion-form-container select option:first-child {
        color: #6b7280 !important;
        font-style: italic;
      }
      .student-profile-completion-form-container select option:hover {
        background-color: #f0f9ff !important;
        color: #0284c7 !important;
      }
      .student-profile-completion-form-container select option:checked,
      .student-profile-completion-form-container select option:focus {
        background: linear-gradient(to right, #dbeafe, #e0f2fe) !important;
        color: #0369a1 !important;
        font-weight: 500 !important;
      }
      .student-profile-completion-form-container select:focus option:checked {
        background: linear-gradient(to right, #bfdbfe, #dbeafe) !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const fetchCountries = async () => {
    setIsLoadingCountries(true);
    try {
      // Try API endpoint first - matching eduspaceAI-frontend pattern
      const baseUrl = API_BASE_URL.replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/users/countries/`);
      if (response.ok) {
        const result = await response.json();
        console.log("Countries fetched from API:", result);
        if (
          result.countries &&
          Array.isArray(result.countries) &&
          result.countries.length > 0
        ) {
          setCountries(result.countries);
          console.log("Countries set:", result.countries.length);
          return;
        }
      }

      // Fallback: Fetch directly from REST Countries API
      console.log("Falling back to direct REST Countries API");
      const fallbackResponse = await fetch(
        "https://restcountries.com/v3.1/all?fields=name,cca2,cca3"
      );
      if (!fallbackResponse.ok) {
        throw new Error("Failed to fetch countries from fallback API");
      }
      const fallbackData = await fallbackResponse.json();

      const formattedCountries = fallbackData
        .map((country: any) => ({
          name: country.name?.common || "",
          code: country.cca2 || "",
          code3: country.cca3 || "",
        }))
        .filter((c: any) => c.name && c.code)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      setCountries(formattedCountries);
      console.log("Countries set from fallback:", formattedCountries.length);
    } catch (error) {
      console.error("Error fetching countries:", error);
      setCountries([]);
    } finally {
      setIsLoadingCountries(false);
    }
  };

  const fetchUserData = async () => {
    try {
      // Get Supabase session for auth token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error("No session found");
        return;
      }

      // Fetch from API - matching eduspaceAI-frontend pattern
      const baseUrl = API_BASE_URL.replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/users/students/profile/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

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
        if (result.data.avatar_url) {
          setAvatarPreview(result.data.avatar_url);
        }
      }
    } catch (error) {
      console.error("Error fetching user data from API:", error);
      // Don't use direct Supabase calls - all data must go through API
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Get Supabase session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No session found");
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("course-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("course-media").getPublicUrl(filePath);

      // Set avatar preview - the URL will be saved when form is submitted through API
      setAvatarPreview(publicUrl);
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      alert(error.message || "Failed to upload profile picture");
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCompleteLater = () => {
    onClose();
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

      // Call API endpoint - matching eduspaceAI-frontend pattern
      const baseUrl = API_BASE_URL.replace(/\/+$/, ""); // Remove trailing slashes from base URL
      const apiUrl = `${baseUrl}/users/students/complete-profile/`;
      console.log("Submitting to API:", apiUrl);
      console.log("API Base URL:", API_BASE_URL);
      console.log("Request method: PUT");

      const response = await fetch(apiUrl, {
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
          avatar_url: avatarPreview || null,
        }),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (!response.ok) {
        let errorMessage = "Failed to update profile";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          if (errorData.missing_fields) {
            errorMessage += `: ${errorData.missing_fields.join(", ")}`;
          }
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.message === "Profile completed successfully") {
        onComplete();
        onClose();
        // Refresh the page to update the user data
        router.refresh();
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      alert(error.message || "Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
                      onClick={handleCompleteLater}
                      className="text-white hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-blue-100 mt-0.5 leading-tight">
                    Fill in your information to get started
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
