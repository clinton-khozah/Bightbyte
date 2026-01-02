"use client";

import * as React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCircle,
  Upload,
  FileText,
  CreditCard,
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  X,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LoadingLogo } from "@/components/loading-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ApplicantProfilePage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [idUrl, setIdUrl] = useState<string | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    preferred_job_types: [] as string[],
    preferred_categories: [] as string[],
    preferred_locations: [] as string[],
    salary_expectation_min: "",
    salary_expectation_max: "",
    salary_currency: "USD",
    availability_date: "",
    work_experience: "",
    education: "",
    skills: "",
    languages: "",
    additional_info: "",
  });

  const router = useRouter();

  const jobTypes = ["job", "learnership", "internship", "bursary"];
  const categories = [
    "IT",
    "Engineering",
    "Finance",
    "Healthcare",
    "Education",
    "Marketing",
    "Sales",
    "Customer Service",
    "Human Resources",
    "Operations",
    "Other",
  ];

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

        // Fetch user profile
        const { data: profileData } = await supabase
          .from("students")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        setUserData({
          ...user,
          ...profileData,
          full_name:
            profileData?.full_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0],
        });

        // Load existing profile data
        if (profileData) {
          // Handle JSONB columns - they might be strings or already parsed objects
          const parseJsonb = (value: any) => {
            if (!value) return [];
            if (typeof value === 'string') {
              try {
                return JSON.parse(value);
              } catch {
                return [];
              }
            }
            return Array.isArray(value) ? value : [];
          };

          setProfileData({
            full_name: profileData.full_name || "",
            email: profileData.email || user.email || "",
            phone: profileData.phone_number || "",
            location: profileData.city || profileData.country || "",
            preferred_job_types: parseJsonb(profileData.preferred_job_types),
            preferred_categories: parseJsonb(profileData.preferred_categories),
            preferred_locations: parseJsonb(profileData.preferred_locations),
            salary_expectation_min: profileData.salary_expectation_min?.toString() || "",
            salary_expectation_max: profileData.salary_expectation_max?.toString() || "",
            salary_currency: profileData.salary_currency || "USD",
            availability_date: profileData.availability_date || "",
            work_experience: profileData.work_experience || "",
            education: profileData.education || "",
            skills: profileData.skills || "",
            languages: profileData.languages || "",
            additional_info: profileData.additional_info || "",
          });

          // Load existing file URLs
          if (profileData.cv_document) setCvUrl(profileData.cv_document);
          if (profileData.id_document) setIdUrl(profileData.id_document);
        } else {
          setProfileData({
            ...profileData,
            email: user.email || "",
            full_name:
              user.user_metadata?.full_name || user.email?.split("@")[0] || "",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("CV file size must be less than 5MB");
      return;
    }

    if (!file.type.includes("pdf") && !file.type.includes("doc")) {
      toast.error("Please upload a PDF or DOC file");
      return;
    }

    setCvFile(file);
    setUploadingCv(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/cv_${Date.now()}.${fileExt}`;
      const filePath = `applicant-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("course-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("course-media").getPublicUrl(filePath);

      setCvUrl(publicUrl);
      toast.success("CV uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading CV:", error);
      toast.error("Failed to upload CV: " + error.message);
      setCvFile(null);
    } finally {
      setUploadingCv(false);
    }
  };

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("ID file size must be less than 5MB");
      return;
    }

    if (!file.type.includes("pdf") && !file.type.includes("image")) {
      toast.error("Please upload a PDF or image file");
      return;
    }

    setIdFile(file);
    setUploadingId(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/id_${Date.now()}.${fileExt}`;
      const filePath = `applicant-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("course-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("course-media").getPublicUrl(filePath);

      setIdUrl(publicUrl);
      toast.success("ID document uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading ID:", error);
      toast.error("Failed to upload ID: " + error.message);
      setIdFile(null);
    } finally {
      setUploadingId(false);
    }
  };

  const handleToggleJobType = (type: string) => {
    setProfileData((prev) => {
      const currentTypes = prev.preferred_job_types || [];
      return {
        ...prev,
        preferred_job_types: currentTypes.includes(type)
          ? currentTypes.filter((t) => t !== type)
          : [...currentTypes, type],
      };
    });
  };

  const handleToggleCategory = (category: string) => {
    setProfileData((prev) => {
      const currentCategories = prev.preferred_categories || [];
      return {
        ...prev,
        preferred_categories: currentCategories.includes(category)
          ? currentCategories.filter((c) => c !== category)
          : [...currentCategories, category],
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to save your profile");
        return;
      }

      // Check if student record exists
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      const profileUpdate: any = {
        email: profileData.email,
        full_name: profileData.full_name,
        phone_number: profileData.phone || null,
        city: profileData.location || null,
        country: profileData.location || null,
        preferred_job_types: (profileData.preferred_job_types || []).length > 0 
          ? profileData.preferred_job_types 
          : [],
        preferred_categories: (profileData.preferred_categories || []).length > 0
          ? profileData.preferred_categories
          : [],
        preferred_locations: (profileData.preferred_locations || []).length > 0
          ? profileData.preferred_locations
          : [],
        salary_expectation_min: profileData.salary_expectation_min
          ? parseFloat(profileData.salary_expectation_min)
          : null,
        salary_expectation_max: profileData.salary_expectation_max
          ? parseFloat(profileData.salary_expectation_max)
          : null,
        salary_currency: profileData.salary_currency || "USD",
        availability_date: profileData.availability_date || null,
        work_experience: profileData.work_experience || null,
        education: profileData.education || null,
        skills: profileData.skills || null,
        languages: profileData.languages || null,
        additional_info: profileData.additional_info || null,
        cv_document: cvUrl || null,
        id_document: idUrl || null,
        notification_preferences: {
          email_notifications: true,
          job_matches: true,
        },
        updated_at: new Date().toISOString(),
      };

      if (existingStudent) {
        // Update existing record
        const { error } = await supabase
          .from("students")
          .update(profileUpdate)
          .eq("id", user.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase.from("students").insert({
          ...profileUpdate,
          id: user.id,
          status: "active",
          role: "student",
          created_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      // Show success modal
      setShowSuccessModal(true);
      toast.success("Profile saved successfully!");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingLogo size={48} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            My Profile
          </h1>
          <p className="text-sm md:text-base text-gray-600">
            Upload your CV and ID, and tell us about the jobs you're looking for
          </p>
        </div>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        full_name: e.target.value,
                      })
                    }
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, phone: e.target.value })
                    }
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profileData.location}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        location: e.target.value,
                      })
                    }
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Uploads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CV Upload */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4" />
                  CV / Resume *
                </Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleCvUpload}
                      disabled={uploadingCv}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      PDF or DOC format, max 5MB
                    </p>
                  </div>
                  {uploadingCv ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  ) : cvUrl ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <a
                        href={cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View CV
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* ID Upload */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4" />
                  ID Document *
                </Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleIdUpload}
                      disabled={uploadingId}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      PDF or image format, max 5MB
                    </p>
                  </div>
                  {uploadingId ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  ) : idUrl ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <a
                        href={idUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View ID
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Job Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preferred Job Types */}
              <div>
                <Label className="mb-2 block">Preferred Job Types</Label>
                <div className="flex flex-wrap gap-2">
                  {jobTypes.map((type) => (
                    <Badge
                      key={type}
                      variant={
                        (profileData.preferred_job_types || []).includes(type)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer capitalize"
                      onClick={() => handleToggleJobType(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Preferred Categories */}
              <div>
                <Label className="mb-2 block">Preferred Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge
                      key={category}
                      variant={
                        (profileData.preferred_categories || []).includes(
                          category
                        )
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => handleToggleCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Salary Expectations */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="salary_min">Minimum Salary</Label>
                  <Input
                    id="salary_min"
                    type="number"
                    value={profileData.salary_expectation_min}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        salary_expectation_min: e.target.value,
                      })
                    }
                    placeholder="Min"
                  />
                </div>
                <div>
                  <Label htmlFor="salary_max">Maximum Salary</Label>
                  <Input
                    id="salary_max"
                    type="number"
                    value={profileData.salary_expectation_max}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        salary_expectation_max: e.target.value,
                      })
                    }
                    placeholder="Max"
                  />
                </div>
                <div>
                  <Label htmlFor="salary_currency">Currency</Label>
                  <select
                    id="salary_currency"
                    value={profileData.salary_currency}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        salary_currency: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="ZAR">ZAR (R)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              {/* Availability Date */}
              <div>
                <Label htmlFor="availability_date">Available From</Label>
                <Input
                  id="availability_date"
                  type="date"
                  value={profileData.availability_date}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      availability_date: e.target.value,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="work_experience">Work Experience</Label>
                <Textarea
                  id="work_experience"
                  value={profileData.work_experience}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      work_experience: e.target.value,
                    })
                  }
                  placeholder="Describe your work experience..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="education">Education</Label>
                <Textarea
                  id="education"
                  value={profileData.education}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      education: e.target.value,
                    })
                  }
                  placeholder="List your educational qualifications..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="skills">Skills</Label>
                <Textarea
                  id="skills"
                  value={profileData.skills}
                  onChange={(e) =>
                    setProfileData({ ...profileData, skills: e.target.value })
                  }
                  placeholder="List your skills (comma-separated)..."
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="languages">Languages</Label>
                <Input
                  id="languages"
                  value={profileData.languages}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      languages: e.target.value,
                    })
                  }
                  placeholder="e.g., English, Spanish, French"
                />
              </div>
              <div>
                <Label htmlFor="additional_info">Additional Information</Label>
                <Textarea
                  id="additional_info"
                  value={profileData.additional_info}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      additional_info: e.target.value,
                    })
                  }
                  placeholder="Any additional information you'd like to share..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !profileData.full_name || !profileData.email}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuccessModal(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
            >
              {/* Success Icon */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  className="w-20 h-20 mx-auto rounded-full bg-green-500 flex items-center justify-center mb-4 shadow-lg"
                >
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold text-gray-900 mb-2"
                >
                  Profile Saved Successfully!
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-600 text-sm"
                >
                  Your profile information has been saved and updated.
                </motion.p>
              </div>

              {/* Content */}
              <div className="p-6 text-center">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-700 mb-6"
                >
                  Your profile is now up to date. You can continue browsing jobs or make changes anytime.
                </motion.p>
                <Button
                  onClick={() => setShowSuccessModal(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-medium transition-colors"
                >
                  Got it!
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
