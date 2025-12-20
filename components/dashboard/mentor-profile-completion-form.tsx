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
import { Button } from "@/components/ui/button";
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
import Image from "next/image";
import { LoadingLogo } from "@/components/loading-logo";

interface MentorProfileCompletionFormProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onComplete: () => void;
}

export function MentorProfileCompletionForm({
  isOpen,
  onClose,
  userId,
  onComplete,
}: MentorProfileCompletionFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = React.useState(false);
  const [countries, setCountries] = React.useState<
    Array<{ name: string; code: string }>
  >([]);
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    phone_number: "",
    country: "",
    city: "",
    facebook_profile: "",
    linkedin_profile: "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const fetchUserData = React.useCallback(async () => {
    try {
      // Get authenticated user UUID from session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        console.error("No session found");
        return;
      }

      const authUserId = session.user.id; // UUID from Supabase Auth

      const { data: mentorData, error } = await supabase
        .from("mentors")
        .select("*")
        .eq("user_id", authUserId) // Use UUID from session, not userId prop
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching mentor data:", error);
        return;
      }

      if (mentorData) {
        setFormData({
          name: mentorData.name || "",
          description: mentorData.description || "",
          phone_number: mentorData.phone_number || "",
          country: mentorData.country || "",
          city: mentorData.city || "",
          facebook_profile: mentorData.facebook_profile || "",
          linkedin_profile: mentorData.linkedin_profile || "",
        });
      }
    } catch (error) {
      console.error("Error fetching mentor data:", error);
    }
  }, [userId]);

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

  React.useEffect(() => {
    if (isOpen) {
      fetchUserData();
      fetchCountries();
    }
  }, [isOpen, fetchUserData, fetchCountries]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation - only check required fields
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Full name is required";
    if (!formData.description.trim()) newErrors.description = "Bio is required";
    if (!formData.phone_number.trim())
      newErrors.phone_number = "Phone number is required";
    if (!formData.country) newErrors.country = "Country is required";
    // Note: city validation removed - mentors table doesn't have city column

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      // Get authenticated user UUID from session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        throw new Error("No session found. Please log in again.");
      }

      const authUserId = session.user.id; // UUID from Supabase Auth

      // Build update data - only include the simplified fields
      const updateData: any = {
        name: formData.name.trim(),
        title: "", // Required field - set to empty string (user can update later)
        description: formData.description.trim(),
        phone_number: formData.phone_number.trim(),
        country: formData.country,
        hourly_rate: 0.00, // Required field - set to 0 (user can update later)
        experience: 0, // Required field - set to 0 years (user can update later)
        // Note: city column doesn't exist in mentors table, so we don't save it
        facebook_profile: formData.facebook_profile.trim() || null,
        linkedin_profile: formData.linkedin_profile.trim() || null,
        is_complete: false, // Keep false until they complete full profile later
        updated_at: new Date().toISOString(),
      };

      // Explicitly remove id if it somehow got included
      delete updateData.id;

      // Check if mentor record exists first - get the numeric id
      const { data: existingMentor, error: checkError } = await supabase
        .from("mentors")
        .select("id, user_id")
        .eq("user_id", authUserId) // Use UUID from session, not userId prop
        .maybeSingle();

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking existing mentor:", checkError);
        throw checkError;
      }

      let error;
      if (existingMentor && existingMentor.id) {
        // Update existing record using the numeric id
        console.log(
          "Updating existing mentor record with id:",
          existingMentor.id
        );
        const { error: updateError } = await supabase
          .from("mentors")
          .update(updateData)
          .eq("id", existingMentor.id); // Use numeric id for update
        error = updateError;
        if (error) {
          console.error("Update error details:", error);
        }
      } else {
        // Insert new record with user_id
        console.log("Inserting new mentor record for user_id:", authUserId);
        const { error: insertError } = await supabase.from("mentors").insert({
          ...updateData,
          user_id: authUserId, // Use UUID from session, not userId prop
        });
        error = insertError;
        if (error) {
          console.error("Insert error details:", error);
        }
      }

      if (error) {
        console.error("Error saving mentor profile:", error);
        throw error;
      }

      onComplete();
    } catch (error: any) {
      console.error("Error updating mentor profile:", error);
      setErrors({
        submit: error.message || "Failed to update profile. Please try again.",
      });
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
            onClick={onClose}
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
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2"
                      />
                      {errors.name && (
                        <p className="text-xs text-red-500">{errors.name}</p>
                      )}
                    </div>

                    {/* Bio */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5" />
                        Bio <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Tell us about yourself"
                        rows={3}
                        className="bg-white border-gray-300 focus:border-blue-500 resize-none text-xs py-1 px-2"
                      />
                      {errors.description && (
                        <p className="text-xs text-red-500">
                          {errors.description}
                        </p>
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
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
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
                        onValueChange={(value) =>
                          setFormData({ ...formData, country: value })
                        }
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
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
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
                        name="facebook_profile"
                        value={formData.facebook_profile}
                        onChange={handleInputChange}
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
                        name="linkedin_profile"
                        value={formData.linkedin_profile}
                        onChange={handleInputChange}
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
