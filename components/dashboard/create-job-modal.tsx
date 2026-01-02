"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  Briefcase,
  GraduationCap,
  Clock,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Mail,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string | number;
  onSuccess?: () => void;
}

export function CreateJobModal({
  isOpen,
  onClose,
  companyId,
  onSuccess,
}: CreateJobModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);
  const [logoFile, setLogoFile] = React.useState<File | null>(null);

  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    job_type: "job",
    category: "",
    location: "Remote",
    salary_min: "",
    salary_max: "",
    salary_currency: "USD",
    is_salary_disclosed: true,
    experience_level: "",
    education_level: "",
    application_deadline: "",
    start_date: "",
    duration: "",
    requirements: "",
    qualifications: "",
    tags: "",
    benefits: "",
    company_logo: "",
    company_name: "", // Company name field
    application_method: "platform", // 'platform', 'external_link', 'email'
    application_link: "",
    application_email: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo size must be less than 5MB");
      return;
    }

    setLogoFile(file);
    setError("");

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    setUploadingLogo(true);
    try {
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const sanitizedCompanyId = String(companyId).replace(
        /[^a-zA-Z0-9]/g,
        "_"
      );
      const fileName = `company_logo_${sanitizedCompanyId}_${timestamp}.${fileExtension}`;
      const filePath = `company-logos/${sanitizedCompanyId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("course-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("course-media").getPublicUrl(filePath);

      setFormData((prev) => ({
        ...prev,
        company_logo: publicUrl,
      }));
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      setError("Failed to upload logo. Please try again.");
      setLogoFile(null);
      setLogoPreview(null);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.title.trim()) {
      setError("Job title is required");
      return;
    }
    if (!formData.description.trim()) {
      setError("Job description is required");
      return;
    }
    if (!formData.category.trim()) {
      setError("Category is required");
      return;
    }
    if (!formData.location.trim()) {
      setError("Location is required");
      return;
    }
    if (
      formData.application_method === "external_link" &&
      !formData.application_link?.trim()
    ) {
      setError("Application link is required when using external link method");
      return;
    }
    if (
      formData.application_method === "email" &&
      !formData.application_email?.trim()
    ) {
      setError("Application email is required when using email method");
      return;
    }
    if (
      formData.application_method === "email" &&
      formData.application_email &&
      !formData.application_email.includes("@")
    ) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse tags and benefits from comma-separated strings
      const tags = formData.tags
        ? formData.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];
      const benefits = formData.benefits
        ? formData.benefits
            .split(",")
            .map((benefit) => benefit.trim())
            .filter(Boolean)
        : [];

      // Prepare job data with proper null handling
      // Ensure company_id is valid - use mentor ID as fallback if no company exists
      let validCompanyId: number | null = null;

      console.log("🔍 Company ID validation - START:", {
        original: companyId,
        type: typeof companyId,
        value: companyId,
      });

      if (companyId && companyId !== "" && companyId !== 0) {
        if (typeof companyId === "string") {
          const trimmed = companyId.trim();
          if (trimmed === "" || trimmed === "0") {
            validCompanyId = null;
          } else {
            const parsed = parseInt(trimmed);
            validCompanyId = isNaN(parsed) || parsed === 0 ? null : parsed;
          }
        } else if (typeof companyId === "number") {
          validCompanyId =
            isNaN(companyId) || companyId === 0 ? null : companyId;
        }
      } else {
        validCompanyId = null;
      }

      console.log("🔍 Company ID validation - FINAL:", {
        original: companyId,
        valid: validCompanyId,
        type: typeof validCompanyId,
      });

      // Verify that the company_id actually exists in the companies table
      // This prevents foreign key constraint violations
      if (validCompanyId && validCompanyId !== 0) {
        const { data: companyCheck, error: companyCheckError } = await supabase
          .from("companies")
          .select("id")
          .eq("id", validCompanyId)
          .maybeSingle();

        if (companyCheckError || !companyCheck) {
          console.warn(
            "⚠️ Company ID does not exist in companies table, setting to NULL"
          );
          validCompanyId = null; // Set to NULL if company doesn't exist
        } else {
          console.log("✅ Company ID verified:", validCompanyId);
        }
      } else {
        // If no valid company_id, set to NULL
        validCompanyId = null;
        console.log("ℹ️ No company_id provided, setting to NULL");
      }

      // Get current user ID for posted_by field
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const postedByUserId = authUser?.id || null;

      // Get company name from form (required field)
      let companyName = formData.company_name?.trim() || "";
      
      // If company_name not provided in form, try to get from database (fallback only)
      if (!companyName && validCompanyId) {
        // Try to get company name from companies table
        const { data: companyInfo } = await supabase
          .from("companies")
          .select("company_name, name")
          .eq("id", validCompanyId)
          .maybeSingle();

        if (companyInfo) {
          companyName = companyInfo.company_name || companyInfo.name;
        }
      }

      // Validate company_name is provided
      if (!companyName || companyName.trim() === "") {
        setError("Company name is required");
        setIsSubmitting(false);
        return;
      }

      const jobData: any = {
        company_id: validCompanyId,
        posted_by: postedByUserId, // Track who posted this job
        company_name: companyName, // Use form value or fallback
        title: formData.title.trim(),
        description: formData.description.trim(),
        job_type: formData.job_type,
        category: formData.category.trim() || null,
        location: formData.location.trim(),
        salary_min: formData.salary_min
          ? parseFloat(formData.salary_min)
          : null,
        salary_max: formData.salary_max
          ? parseFloat(formData.salary_max)
          : null,
        salary_currency: formData.salary_currency || "USD",
        is_salary_disclosed:
          formData.is_salary_disclosed !== undefined
            ? formData.is_salary_disclosed
            : true,
        experience_level: formData.experience_level || null,
        education_level: formData.education_level || null,
        application_deadline: formData.application_deadline || null,
        start_date: formData.start_date || null,
        duration: formData.duration || null,
        requirements: formData.requirements.trim() || null,
        qualifications: formData.qualifications.trim() || null,
        tags: tags.length > 0 ? tags : [],
        benefits: benefits.length > 0 ? benefits : [],
        company_logo: formData.company_logo || null,
        application_method: formData.application_method || "platform",
        application_link: formData.application_link?.trim() || null,
        application_email: formData.application_email?.trim() || null,
        status: "open",
        is_featured: false,
        is_urgent: false,
        total_applications: 0,
        total_views: 0,
      };

      // Clean up empty strings - convert to null for optional fields
      if (jobData.category === "") jobData.category = null;
      if (jobData.duration === "") jobData.duration = null;
      if (jobData.requirements === "") jobData.requirements = null;
      if (jobData.qualifications === "") jobData.qualifications = null;
      if (jobData.application_link === "") jobData.application_link = null;
      if (jobData.application_email === "") jobData.application_email = null;

      // Try API first, then fallback to Supabase
      let apiSuccess = false;
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/v1/jobs/create/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(jobData),
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("API response data:", data);
          if (data.success) {
            apiSuccess = true;
            setSuccess(true);
            resetForm();
            console.log(
              "✅ Job posted successfully via API, company_id:",
              jobData.company_id
            );

            // Create notification for job posting
            const {
              data: { user: authUser },
            } = await supabase.auth.getUser();
            if (authUser && data.job?.id) {
              try {
                const { error: notifError } = await supabase
                  .from("job_post_notifications")
                  .insert({
                    user_id: authUser.id,
                    user_email: authUser.email || "",
                    type: "job_posted",
                    title: "Job Posted Successfully",
                    message: `Your job "${formData.title.trim()}" has been posted and is now visible to applicants.`,
                    job_id: data.job.id,
                    is_read: false,
                    expires_at: new Date(
                      Date.now() + 72 * 60 * 60 * 1000
                    ).toISOString(),
                    metadata: {
                      job_title: formData.title.trim(),
                      job_type: formData.job_type,
                      category: formData.category,
                    },
                  });

                if (notifError) {
                  console.error("Error creating notification:", notifError);
                } else {
                  console.log("✅ Notification created for job posting");
                }
              } catch (notifErr) {
                console.error("Error creating notification:", notifErr);
              }
            }

            // Send email notifications to subscribers
            try {
              const notificationResponse = await fetch("/api/send-job-notifications", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  jobId: data.job?.id || data.id,
                  jobTitle: formData.title,
                  companyName: companyName,
                  jobType: formData.job_type,
                  category: formData.category,
                  location: formData.location,
                  matchReason: `New ${formData.job_type} posted in ${formData.category}`,
                }),
              });

              if (notificationResponse.ok) {
                const notificationData = await notificationResponse.json();
                console.log("✅ Email notifications sent:", notificationData);
              }
            } catch (notificationError) {
              console.error("Error sending notifications:", notificationError);
              // Don't fail job posting if notifications fail
            }

            // Trigger refresh event for dashboard
            window.dispatchEvent(new CustomEvent("jobPosted"));
            if (onSuccess) onSuccess();
            // Don't auto-close - let user see success message
            // setTimeout(() => {
            //   onClose();
            //   setSuccess(false);
            // }, 2000);
            return;
          } else {
            console.error("API returned success=false:", data);
            const errorMsg = data.message || data.error || "API request failed";
            throw new Error(errorMsg);
          }
        } else {
          const errorText = await response.text();
          console.error(`API returned status ${response.status}:`, errorText);
          console.log(
            `API returned status ${response.status}, falling back to Supabase`
          );
        }
      } catch (apiError: any) {
        console.error("❌ API request failed:", apiError);
        console.error("Error details:", {
          message: apiError?.message,
          stack: apiError?.stack,
          name: apiError?.name,
        });
        // Don't throw here - let it fall through to Supabase fallback
      }

      // Fallback to Supabase if API didn't succeed
      if (!apiSuccess) {
        console.log("📤 Inserting job directly to Supabase...");
        console.log(
          "📋 Job data being sent:",
          JSON.stringify(jobData, null, 2)
        );

        // Ensure tags and benefits are JSONB compatible
        const supabaseJobData = {
          ...jobData,
          tags: Array.isArray(jobData.tags) ? jobData.tags : jobData.tags || [],
          benefits: Array.isArray(jobData.benefits)
            ? jobData.benefits
            : jobData.benefits || [],
        };

        console.log(
          "📊 Supabase job data (final):",
          JSON.stringify(supabaseJobData, null, 2)
        );
        console.log(
          "🏢 Company ID:",
          supabaseJobData.company_id,
          "Type:",
          typeof supabaseJobData.company_id
        );
        console.log(
          "🏷️ Tags:",
          supabaseJobData.tags,
          "Is Array:",
          Array.isArray(supabaseJobData.tags)
        );
        console.log(
          "🎁 Benefits:",
          supabaseJobData.benefits,
          "Is Array:",
          Array.isArray(supabaseJobData.benefits)
        );

        const { data, error: supabaseError } = await supabase
          .from("jobs")
          .insert([supabaseJobData])
          .select()
          .single();

        if (supabaseError) {
          console.error("❌ Supabase insert error:", supabaseError);
          console.error("Error code:", supabaseError.code);
          console.error("Error details:", supabaseError.details);
          console.error("Error hint:", supabaseError.hint);
          console.error("Job data that failed:", supabaseJobData);
          const errorMessage =
            supabaseError.message ||
            supabaseError.details ||
            "Failed to create job. Please check your connection and try again.";
          throw new Error(errorMessage);
        }

        console.log("✅ Job created successfully in Supabase:", data);
        console.log("📋 Job details:", {
          id: data?.id,
          title: data?.title,
          company_id: data?.company_id,
          posted_by: data?.posted_by,
          company_id_type: typeof data?.company_id,
        });
        console.log("✅ Job posted successfully via Supabase");
        console.log("📤 posted_by value:", postedByUserId);

        // Create notification for job posting
        if (authUser && data?.id) {
          try {
            const { error: notifError } = await supabase
              .from("job_post_notifications")
              .insert({
                user_id: authUser.id,
                user_email: authUser.email || "",
                type: "job_posted",
                title: "Job Posted Successfully",
                message: `Your job "${formData.title.trim()}" has been posted and is now visible to applicants.`,
                job_id: data.id,
                is_read: false,
                expires_at: new Date(
                  Date.now() + 72 * 60 * 60 * 1000
                ).toISOString(), // 72 hours from now
                metadata: {
                  job_title: formData.title.trim(),
                  job_type: formData.job_type,
                  category: formData.category,
                },
              });

            if (notifError) {
              console.error("Error creating notification:", notifError);
            } else {
              console.log("✅ Notification created for job posting");
            }
          } catch (notifErr) {
            console.error("Error creating notification:", notifErr);
          }
        }

        // Send email notifications to subscribers
        try {
          const notificationResponse = await fetch("/api/send-job-notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jobId: data?.id,
              jobTitle: formData.title,
              companyName: companyName,
              jobType: formData.job_type,
              category: formData.category,
              location: formData.location,
              matchReason: `New ${formData.job_type} posted in ${formData.category}`,
            }),
          });

          if (notificationResponse.ok) {
            const notificationData = await notificationResponse.json();
            console.log("✅ Email notifications sent:", notificationData);
          }
        } catch (notificationError) {
          console.error("Error sending notifications:", notificationError);
          // Don't fail job posting if notifications fail
        }

        setSuccess(true);
        resetForm();
        // Trigger refresh event for dashboard with a small delay to ensure DB is updated
        setTimeout(() => {
          console.log("🔄 Dispatching jobPosted event to refresh dashboard");
          window.dispatchEvent(new CustomEvent("jobPosted"));
        }, 500);
        if (onSuccess) {
          onSuccess();
        }

        // Don't auto-close - let user see success message and check logs
        // setTimeout(() => {
        //   onClose();
        //   setSuccess(false);
        // }, 2000);
      }
    } catch (error: any) {
      console.error("❌❌❌ ERROR CREATING JOB ❌❌❌");
      console.error("Error object:", error);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      console.error("Error name:", error?.name);
      console.error("Full error details:", JSON.stringify(error, null, 2));
      setError(
        error?.message ||
          error?.toString() ||
          "Failed to create job. Please check the console for details."
      );
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      job_type: "job",
      category: "",
      location: "Remote",
      salary_min: "",
      salary_max: "",
      salary_currency: "USD",
      is_salary_disclosed: true,
      experience_level: "",
      education_level: "",
      application_deadline: "",
      start_date: "",
      duration: "",
      requirements: "",
      qualifications: "",
      tags: "",
      benefits: "",
      company_logo: "",
      company_name: "",
      application_method: "platform",
      application_link: "",
      application_email: "",
    });
    setLogoFile(null);
    setLogoPreview(null);
  };

  // Set minimum date to today
  const today = new Date().toISOString().split("T")[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between z-10 border-b border-blue-800/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Post a Job</h2>
              </div>
              <button
                onClick={() => {
                  setSuccess(false);
                  onClose();
                }}
                className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                disabled={isSubmitting && !success}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {success ? (
                <div className="text-center py-16 px-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mx-auto mb-6 w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"
                  >
                    <CheckCircle className="h-12 w-12 text-green-600" />
                  </motion.div>
                  <p className="text-gray-900 text-xl mb-2 font-bold">
                    Job Posted Successfully!
                  </p>
                  <p className="text-gray-600 text-sm mb-6">
                    Your job posting has been created and is now visible to
                    applicants.
                  </p>
                  <button
                    onClick={() => {
                      setSuccess(false);
                      onClose();
                    }}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Company Logo Upload */}
                  <div className="space-y-3 pb-4 border-b border-gray-200">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-blue-600" />
                      Company Logo
                    </Label>
                    <div className="flex items-center gap-4">
                      {logoPreview ? (
                        <div className="relative">
                          <img
                            src={logoPreview}
                            alt="Company logo preview"
                            className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setLogoPreview(null);
                              setLogoFile(null);
                              setFormData((prev) => ({
                                ...prev,
                                company_logo: "",
                              }));
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                          <ImageIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <label
                          htmlFor="logo-upload"
                          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-sm font-medium border border-blue-200"
                        >
                          {uploadingLogo ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              {logoPreview ? "Change Logo" : "Upload Logo"}
                            </>
                          )}
                        </label>
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={isSubmitting || uploadingLogo}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Company Name */}
                  <div className="space-y-3 pb-4 border-b border-gray-200">
                    <Label
                      htmlFor="company_name"
                      className="text-sm font-semibold text-gray-700 mb-1.5 block flex items-center gap-2"
                    >
                      <Briefcase className="h-4 w-4 text-blue-600" />
                      Company Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="company_name"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      placeholder="e.g., Acme Corporation, Tech Solutions Inc."
                      className="h-10 text-sm"
                      disabled={isSubmitting}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Enter the name of the company posting this job
                    </p>
                  </div>

                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                      <div className="w-1 h-4 bg-blue-600 rounded"></div>
                      Basic Information
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label
                          htmlFor="title"
                          className="text-sm font-semibold text-gray-700 mb-1.5 block"
                        >
                          Job Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="title"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          placeholder="e.g., Software Developer, Marketing Intern"
                          className="h-10 text-sm"
                          disabled={isSubmitting}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label
                            htmlFor="job_type"
                            className="text-sm font-semibold text-gray-700 mb-1.5 block"
                          >
                            Job Type <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={formData.job_type}
                            onValueChange={(value) =>
                              handleSelectChange("job_type", value)
                            }
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue placeholder="Select job type" />
                            </SelectTrigger>
                            <SelectContent className="z-[10000] bg-white border shadow-lg">
                              <SelectItem value="job">
                                <div className="flex items-center gap-2">
                                  <Briefcase className="h-3.5 w-3.5" />
                                  Job
                                </div>
                              </SelectItem>
                              <SelectItem value="learnership">
                                <div className="flex items-center gap-2">
                                  <GraduationCap className="h-3.5 w-3.5" />
                                  Learnership
                                </div>
                              </SelectItem>
                              <SelectItem value="internship">
                                <div className="flex items-center gap-2">
                                  <Briefcase className="h-3.5 w-3.5" />
                                  Internship
                                </div>
                              </SelectItem>
                              <SelectItem value="bursary">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  Bursary
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label
                            htmlFor="category"
                            className="text-sm font-semibold text-gray-700 mb-1.5 block"
                          >
                            Category <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) =>
                              handleSelectChange("category", value)
                            }
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="z-[10000] bg-white border shadow-lg">
                              <SelectItem value="IT">IT</SelectItem>
                              <SelectItem value="Engineering">Engineering</SelectItem>
                              <SelectItem value="Finance">Finance</SelectItem>
                              <SelectItem value="Healthcare">Healthcare</SelectItem>
                              <SelectItem value="Marketing">Marketing</SelectItem>
                              <SelectItem value="Education">Education</SelectItem>
                              <SelectItem value="Sales">Sales</SelectItem>
                              <SelectItem value="Human Resources">Human Resources</SelectItem>
                              <SelectItem value="Legal">Legal</SelectItem>
                              <SelectItem value="Operations">Operations</SelectItem>
                              <SelectItem value="Customer Service">Customer Service</SelectItem>
                              <SelectItem value="Design">Design</SelectItem>
                              <SelectItem value="Media">Media</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label
                          htmlFor="description"
                          className="text-sm font-semibold text-gray-700 mb-1.5 block"
                        >
                          Description <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Describe the role, responsibilities, and what you're looking for..."
                          className="min-h-[100px] resize-none text-sm"
                          disabled={isSubmitting}
                          required
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="location"
                          className="text-sm font-semibold text-gray-700 mb-1.5 block flex items-center gap-1"
                        >
                          <MapPin className="h-3.5 w-3.5 text-blue-600" />
                          Location <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="location"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          placeholder="e.g., Remote, Johannesburg, Cape Town"
                          className="h-10 text-sm"
                          disabled={isSubmitting}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Compensation */}
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                      <div className="w-1 h-4 bg-blue-600 rounded"></div>
                      Compensation
                    </h3>

                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Switch
                        id="is_salary_disclosed"
                        checked={formData.is_salary_disclosed}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            is_salary_disclosed: checked,
                          }))
                        }
                        disabled={isSubmitting}
                      />
                      <Label
                        htmlFor="is_salary_disclosed"
                        className="cursor-pointer text-sm font-medium text-gray-700"
                      >
                        Disclose salary/stipend
                      </Label>
                    </div>

                    {formData.is_salary_disclosed && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label
                            htmlFor="salary_min"
                            className="text-sm font-semibold text-gray-700 mb-1.5 block"
                          >
                            Min Salary
                          </Label>
                          <Input
                            id="salary_min"
                            name="salary_min"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.salary_min}
                            onChange={handleInputChange}
                            placeholder="0.00"
                            className="h-10 text-sm"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor="salary_max"
                            className="text-sm font-semibold text-gray-700 mb-1.5 block"
                          >
                            Max Salary
                          </Label>
                          <Input
                            id="salary_max"
                            name="salary_max"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.salary_max}
                            onChange={handleInputChange}
                            placeholder="0.00"
                            className="h-10 text-sm"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor="salary_currency"
                            className="text-sm font-semibold text-gray-700 mb-1.5 block"
                          >
                            Currency
                          </Label>
                          <Select
                            value={formData.salary_currency}
                            onValueChange={(value) =>
                              handleSelectChange("salary_currency", value)
                            }
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="h-10 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="z-[10000] bg-white border shadow-lg">
                              <SelectItem value="USD">USD ($)</SelectItem>
                              <SelectItem value="ZAR">ZAR (R)</SelectItem>
                              <SelectItem value="EUR">EUR (€)</SelectItem>
                              <SelectItem value="GBP">GBP (£)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Requirements */}
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                      <div className="w-1 h-4 bg-blue-600 rounded"></div>
                      Requirements & Qualifications
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label
                          htmlFor="experience_level"
                          className="text-sm font-semibold text-gray-700 mb-1.5 block"
                        >
                          Experience Level
                        </Label>
                        <Select
                          value={formData.experience_level}
                          onValueChange={(value) =>
                            handleSelectChange("experience_level", value)
                          }
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder="Select experience level" />
                          </SelectTrigger>
                          <SelectContent className="z-[10000] bg-white" position="item-aligned">
                            <SelectItem value="entry">Entry Level</SelectItem>
                            <SelectItem value="mid">Mid Level</SelectItem>
                            <SelectItem value="senior">Senior Level</SelectItem>
                            <SelectItem value="executive">Executive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label
                          htmlFor="education_level"
                          className="text-sm font-semibold text-gray-700 mb-1.5 block"
                        >
                          Education Level
                        </Label>
                        <Select
                          value={formData.education_level}
                          onValueChange={(value) =>
                            handleSelectChange("education_level", value)
                          }
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder="Select education level" />
                          </SelectTrigger>
                          <SelectContent className="z-[10000] bg-white" position="item-aligned">
                            <SelectItem value="high_school">
                              High School
                            </SelectItem>
                            <SelectItem value="diploma">Diploma</SelectItem>
                            <SelectItem value="degree">Degree</SelectItem>
                            <SelectItem value="masters">Masters</SelectItem>
                            <SelectItem value="phd">PhD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label
                        htmlFor="requirements"
                        className="text-sm font-semibold text-gray-700 mb-1.5 block"
                      >
                        Requirements
                      </Label>
                      <Textarea
                        id="requirements"
                        name="requirements"
                        value={formData.requirements}
                        onChange={handleInputChange}
                        placeholder="List the key requirements for this position..."
                        className="min-h-[70px] resize-none text-sm"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="qualifications"
                        className="text-sm font-semibold text-gray-700 mb-1.5 block"
                      >
                        Qualifications
                      </Label>
                      <Textarea
                        id="qualifications"
                        name="qualifications"
                        value={formData.qualifications}
                        onChange={handleInputChange}
                        placeholder="Required qualifications, certifications, etc..."
                        className="min-h-[70px] resize-none text-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Application Method */}
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-blue-600" />
                      How to Apply
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-xs text-blue-800 font-medium mb-3">
                        💡 You're connecting applicants with companies. Choose
                        how applicants should apply:
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id="method-platform"
                            name="application_method"
                            value="platform"
                            checked={formData.application_method === "platform"}
                            onChange={(e) =>
                              handleSelectChange(
                                "application_method",
                                e.target.value
                              )
                            }
                            className="w-4 h-4 text-blue-600"
                            disabled={isSubmitting}
                          />
                          <Label
                            htmlFor="method-platform"
                            className="cursor-pointer text-sm font-medium text-gray-700"
                          >
                            Apply through our platform (we handle applications)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id="method-external"
                            name="application_method"
                            value="external_link"
                            checked={
                              formData.application_method === "external_link"
                            }
                            onChange={(e) =>
                              handleSelectChange(
                                "application_method",
                                e.target.value
                              )
                            }
                            className="w-4 h-4 text-blue-600"
                            disabled={isSubmitting}
                          />
                          <Label
                            htmlFor="method-external"
                            className="cursor-pointer text-sm font-medium text-gray-700"
                          >
                            Apply on company website (external link)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id="method-email"
                            name="application_method"
                            value="email"
                            checked={formData.application_method === "email"}
                            onChange={(e) =>
                              handleSelectChange(
                                "application_method",
                                e.target.value
                              )
                            }
                            className="w-4 h-4 text-blue-600"
                            disabled={isSubmitting}
                          />
                          <Label
                            htmlFor="method-email"
                            className="cursor-pointer text-sm font-medium text-gray-700"
                          >
                            Apply via email
                          </Label>
                        </div>
                      </div>
                    </div>

                    {formData.application_method === "external_link" && (
                      <div>
                        <Label
                          htmlFor="application_link"
                          className="text-sm font-semibold text-gray-700 mb-1.5 block flex items-center gap-1"
                        >
                          <LinkIcon className="h-3.5 w-3.5 text-blue-600" />
                          Application Link{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="application_link"
                          name="application_link"
                          type="url"
                          value={formData.application_link}
                          onChange={handleInputChange}
                          placeholder="https://company.com/careers/apply"
                          className="h-10 text-sm"
                          disabled={isSubmitting}
                          required={
                            formData.application_method === "external_link"
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Link to your company's application page
                        </p>
                      </div>
                    )}

                    {formData.application_method === "email" && (
                      <div>
                        <Label
                          htmlFor="application_email"
                          className="text-sm font-semibold text-gray-700 mb-1.5 block flex items-center gap-1"
                        >
                          <Mail className="h-3.5 w-3.5 text-blue-600" />
                          Application Email{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="application_email"
                          name="application_email"
                          type="email"
                          value={formData.application_email}
                          onChange={handleInputChange}
                          placeholder="careers@company.com"
                          className="h-10 text-sm"
                          disabled={isSubmitting}
                          required={formData.application_method === "email"}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Email address where applicants should send their
                          applications
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Dates & Duration */}
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      Dates & Duration
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label
                          htmlFor="application_deadline"
                          className="text-sm font-semibold text-gray-700 mb-1.5 block"
                        >
                          Application Deadline
                        </Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="application_deadline"
                            name="application_deadline"
                            type="date"
                            value={formData.application_deadline}
                            onChange={handleInputChange}
                            min={today}
                            className="h-10 text-sm pl-10"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      <div>
                        <Label
                          htmlFor="start_date"
                          className="text-sm font-semibold text-gray-700 mb-1.5 block"
                        >
                          Start Date
                        </Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="start_date"
                            name="start_date"
                            type="date"
                            value={formData.start_date}
                            onChange={handleInputChange}
                            min={today}
                            className="h-10 text-sm pl-10"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label
                        htmlFor="duration"
                        className="text-sm font-semibold text-gray-700 mb-1.5 block flex items-center gap-1"
                      >
                        <Clock className="h-3.5 w-3.5 text-blue-600" />
                        Duration (for internships/learnerships)
                      </Label>
                      <Input
                        id="duration"
                        name="duration"
                        value={formData.duration}
                        onChange={handleInputChange}
                        placeholder="e.g., 3 months, 1 year, 2 years"
                        className="h-10 text-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Additional Information
                    </h3>

                    <div>
                      <Label
                        htmlFor="tags"
                        className="text-sm font-semibold text-gray-700 mb-1.5 block"
                      >
                        Tags (comma-separated)
                      </Label>
                      <Input
                        id="tags"
                        name="tags"
                        value={formData.tags}
                        onChange={handleInputChange}
                        placeholder="e.g., remote, flexible, benefits"
                        className="h-10 text-sm"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Separate tags with commas
                      </p>
                    </div>

                    <div>
                      <Label
                        htmlFor="benefits"
                        className="text-sm font-semibold text-gray-700 mb-1.5 block"
                      >
                        Benefits (comma-separated)
                      </Label>
                      <Input
                        id="benefits"
                        name="benefits"
                        value={formData.benefits}
                        onChange={handleInputChange}
                        placeholder="e.g., health insurance, gym membership, training"
                        className="h-10 text-sm"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Separate benefits with commas
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Footer */}
            {!success && (
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 h-10 border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="job-form"
                  disabled={isSubmitting}
                  className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-md"
                  onClick={handleSubmit}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Briefcase className="mr-2 h-4 w-4" />
                      Post Job
                    </>
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
