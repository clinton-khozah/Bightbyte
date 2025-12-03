"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  BookOpen,
  GraduationCap,
  FileText,
  Mail,
  User,
  Send,
  Loader2,
  Phone,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import Image from "next/image";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllSubjects } from "@/lib/pricing-gpt-api";
import { fetchTutorPricing } from "@/lib/tutor-pricing";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface TutorRequestPopupProps {
  onClose?: () => void;
  onRequestSubmitted?: () => void;
  isOpen?: boolean; // Optional prop for controlled visibility
  userData?: {
    full_name?: string;
    name?: string;
    email?: string;
    phone_number?: string;
    phone?: string;
    current_level?: string;
    grade_level?: string;
  } | null; // Optional user data for auto-filling form
}

export function TutorRequestPopup({
  onClose,
  onRequestSubmitted,
  isOpen,
  userData,
}: TutorRequestPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    grade: "",
    subject: "",
    description: "",
    preferredTime: "",
    preferredTimeHour: "00",
    preferredTimeMinute: "00",
    preferredTimePeriod: "AM",
  });

  useEffect(() => {
    // If isOpen prop is provided, use it for controlled visibility
    // Otherwise, auto-show after a short delay (for landing page)
    if (isOpen !== undefined) {
      setIsVisible(isOpen);
    } else {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Auto-fill form with user data when popup opens and userData is provided
  useEffect(() => {
    // Only auto-fill when popup becomes visible and userData is available
    const shouldShow = isOpen !== undefined ? isOpen : isVisible;
    if (userData && shouldShow) {
      setFormData((prev) => {
        // Only auto-fill if fields are empty (form was reset)
        if (!prev.name && !prev.email && !prev.phone && !prev.grade) {
          return {
            ...prev,
            name: userData.full_name || userData.name || "",
            email: userData.email || "",
            phone: userData.phone_number || userData.phone || "",
            grade: userData.grade_level || userData.current_level || "",
          };
        }
        return prev;
      });
    }
  }, [userData, isOpen, isVisible]);

  useEffect(() => {
    // Fetch subjects from multiple sources
    const fetchSubjects = async () => {
      setIsLoadingSubjects(true);
      const allSubjectsSet = new Set<string>();

      try {
        // Try fetching from pricing API first
        try {
          const result = await getAllSubjects();
          if (result.success && result.subjects) {
            const subjectNames = result.subjects
              .map((s: any) => s.name || s.subject_name)
              .filter(Boolean);
            subjectNames.forEach((name: string) => allSubjectsSet.add(name));
          }
        } catch (error) {
          console.log(
            "Pricing API subjects not available, trying alternatives..."
          );
        }

        // Fallback: Fetch from tutor_pricing table
        try {
          const pricingData = await fetchTutorPricing();
          if (pricingData && pricingData.length > 0) {
            const subjectsFromPricing = pricingData
              .map((p: any) => p.subject)
              .filter((s: string) => s && s.trim() !== "");
            subjectsFromPricing.forEach((subject: string) =>
              allSubjectsSet.add(subject)
            );
          }
        } catch (error) {
          console.log("Tutor pricing table subjects not available");
        }

        // Fallback: Fetch from mentors' specialization
        try {
          const { data: mentorsData } = await supabase
            .from("mentors")
            .select("specialization")
            .not("specialization", "is", null);

          if (mentorsData) {
            mentorsData.forEach((mentor: any) => {
              let specializations: string[] = [];
              if (Array.isArray(mentor.specialization)) {
                specializations = mentor.specialization;
              } else if (typeof mentor.specialization === "string") {
                try {
                  specializations = JSON.parse(mentor.specialization || "[]");
                } catch {
                  specializations = [];
                }
              }
              specializations.forEach((subj: string) => {
                if (subj && subj.trim()) allSubjectsSet.add(subj);
              });
            });
          }
        } catch (error) {
          console.log("Mentors specialization not available");
        }

        // If still no subjects, add common fallback subjects
        if (allSubjectsSet.size === 0) {
          const commonSubjects = [
            "Mathematics",
            "Science",
            "English",
            "Physics",
            "Chemistry",
            "Biology",
            "Computer Science",
            "Programming",
            "Web Development",
            "Data Science",
            "Business Analysis",
            "Accounting",
            "Economics",
            "History",
            "Geography",
            "Languages",
            "Spanish",
            "French",
            "German",
            "Art",
            "Music",
          ];
          commonSubjects.forEach((subj) => allSubjectsSet.add(subj));
        }

        const sortedSubjects = Array.from(allSubjectsSet).sort();
        setSubjects(sortedSubjects);
        console.log(
          `Loaded ${sortedSubjects.length} subjects:`,
          sortedSubjects.slice(0, 10)
        );
      } catch (error) {
        console.error("Error fetching subjects:", error);
        // Set fallback subjects
        const fallbackSubjects = [
          "Mathematics",
          "Science",
          "English",
          "Physics",
          "Chemistry",
          "Biology",
          "Computer Science",
          "Programming",
          "Web Development",
          "Business Analysis",
        ];
        setSubjects(fallbackSubjects);
      } finally {
        setIsLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Reset form when closing
    setFormData({
      name: "",
      email: "",
      phone: "",
      grade: "",
      subject: "",
      description: "",
      preferredTime: "",
      preferredTimeHour: "00",
      preferredTimeMinute: "00",
      preferredTimePeriod: "AM",
    });
    if (onClose) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (
      !formData.subject ||
      !formData.name ||
      !formData.email ||
      !formData.phone
    ) {
      alert(
        "Please fill in all required fields (Name, Email, Phone, and Subject)."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine time fields if provided
      const timeString =
        formData.preferredTimeHour && formData.preferredTimeMinute
          ? `${formData.preferredTimeHour.padStart(
              2,
              "0"
            )}:${formData.preferredTimeMinute.padStart(2, "0")} ${
              formData.preferredTimePeriod
            }`
          : "";

      // Check if user is authenticated (but don't require it)
      let studentId = null;
      let user = null;
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        user = authUser;
        studentId = authUser?.id || null;
      } catch (error) {
        // User not authenticated, that's fine - continue without student_id
        console.log(
          "User not authenticated, submitting request without student_id"
        );
      }

      // Save request to database (works for both authenticated and unauthenticated users)
      // For unauthenticated users, student_id will be null
      const insertPayload: any = {
        student_id: studentId,
        student_name: formData.name,
        student_email: formData.email,
        student_phone: formData.phone,
        grade_level: formData.grade,
        subject: formData.subject,
        description: formData.description,
        preferred_time: timeString,
        status: "pending",
      };

      // Try using the database function first (for unauthenticated users)
      let requestData;
      let insertError;

      if (!user) {
        // For unauthenticated users, use the database function that bypasses RLS
        const { data: functionData, error: functionError } = await supabase.rpc(
          "insert_tutor_request",
          {
            p_student_id: null,
            p_student_name: formData.name,
            p_student_email: formData.email,
            p_student_phone: formData.phone || null,
            p_grade_level: formData.grade || null,
            p_subject: formData.subject,
            p_description: formData.description || null,
            p_preferred_time: timeString || null,
          }
        );

        if (functionError) {
          console.error(
            "Error saving tutor request (function):",
            functionError
          );
          insertError = functionError;
        } else {
          requestData = functionData;
        }
      }

      // If function didn't work or user is authenticated, try direct insert
      if (!requestData) {
        const { data: insertData, error: directError } = await supabase
          .from("tutor_requests")
          .insert(insertPayload)
          .select()
          .single();

        if (directError) {
          console.error("Error saving tutor request:", directError);
          insertError = directError;
        } else {
          requestData = insertData;
        }
      }

      if (insertError) {
        throw insertError;
      }

      console.log("Tutor request saved:", requestData);

      // Close popup
      handleClose();

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        grade: "",
        subject: "",
        description: "",
        preferredTime: "",
        preferredTimeHour: "00",
        preferredTimeMinute: "00",
        preferredTimePeriod: "AM",
      });

      // Show sign-in modal if user is not authenticated
      if (!user && onRequestSubmitted) {
        onRequestSubmitted();
      } else {
        // Show success message and redirect to dashboard
        alert(
          "Thank you! Your request has been submitted. We'll match you with a tutor within 24 hours. You can view your requests in your dashboard."
        );
        // Redirect to learner requests page if authenticated
        if (user) {
          window.location.href = "/dashboard/learner/requests";
        }
      }
    } catch (error) {
      console.error("Error submitting tutor request:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use isOpen prop if provided, otherwise use internal state
  const shouldShow = isOpen !== undefined ? isOpen : isVisible;
  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-4 top-32 z-50 w-80 max-w-[calc(100vw-2rem)]"
      >
        <div
          className="relative p-[3px] rounded-xl animate-border-rotate"
          style={{
            background:
              "conic-gradient(from 0deg, #3b82f6, #a855f7, #ec4899, #f59e0b, #3b82f6)",
          }}
        >
          <Card className="bg-white shadow-2xl border-2 border-blue-200 rounded-xl overflow-hidden relative z-10">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white pb-2 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1">
                    <Image
                      src="/images/logo1.png"
                      alt="Brightbyt Logo"
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                  <CardTitle className="text-sm font-bold">
                    Request a Tutor
                  </CardTitle>
                </div>
                <button
                  onClick={handleClose}
                  className="text-white hover:bg-white/20 rounded-full p-0.5 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-blue-100 mt-0.5 leading-tight">
                Tell us which subjects or module you need help with
              </p>
            </CardHeader>

            <CardContent className="p-2.5">
              <form onSubmit={handleSubmit} className="space-y-2">
                {/* Name */}
                <div className="space-y-0.5">
                  <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <User className="w-2.5 h-2.5" />
                    Your Name
                  </label>
                  <Input
                    type="text"
                    placeholder=""
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2"
                  />
                </div>

                {/* Email */}
                <div className="space-y-0.5">
                  <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <Mail className="w-2.5 h-2.5" />
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder=""
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-0.5">
                  <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5" />
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    placeholder=""
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    required
                    className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2"
                  />
                </div>

                {/* Grade */}
                <div className="space-y-0.5">
                  <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <GraduationCap className="w-2.5 h-2.5" />
                    Grade/Level
                  </label>
                  <Select
                    value={formData.grade}
                    onValueChange={(value) =>
                      setFormData({ ...formData, grade: value })
                    }
                    required
                  >
                    <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2">
                      <SelectValue placeholder="" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="elementary">
                        Elementary School
                      </SelectItem>
                      <SelectItem value="middle">Middle School/Primary School</SelectItem>
                      <SelectItem value="high">High School</SelectItem>
                      <SelectItem value="undergraduate">
                        Undergraduate
                      </SelectItem>
                      <SelectItem value="graduate">Graduate</SelectItem>
                      <SelectItem value="professional">
                        Professional Development
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject */}
                <div className="space-y-0.5">
                  <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <BookOpen className="w-2.5 h-2.5" />
                    Subject/Module
                  </label>
                  <Popover
                    open={subjectOpen}
                    onOpenChange={(open) => {
                      setSubjectOpen(open);
                      if (!open) {
                        setSubjectSearch("");
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={subjectOpen}
                        className="w-full justify-between h-7 text-xs bg-white border-gray-300 focus:border-blue-500 py-0.5 px-2"
                      >
                        {formData.subject || "Select or type subject..."}
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search or type your subject..."
                          className="h-8 text-sm"
                          value={subjectSearch}
                          onValueChange={setSubjectSearch}
                          onKeyDown={(e) => {
                            // Allow Enter key to use the typed subject if it doesn't match
                            if (e.key === "Enter" && subjectSearch.trim()) {
                              const exactMatch = subjects.find(
                                s => s.toLowerCase() === subjectSearch.trim().toLowerCase()
                              );
                              if (!exactMatch) {
                                // No exact match, use the typed value
                                e.preventDefault();
                                setFormData({
                                  ...formData,
                                  subject: subjectSearch.trim(),
                                });
                                setSubjectOpen(false);
                                setSubjectSearch("");
                              }
                            }
                          }}
                        />
                        <CommandList className="max-h-[200px]">
                          {isLoadingSubjects ? (
                            <div className="py-4 text-center text-sm text-gray-500">
                              Loading subjects...
                            </div>
                          ) : (
                            <>
                              {/* Always show custom subject option at the top when user types something */}
                              {subjectSearch.trim() && (
                                <CommandGroup>
                                  <div cmdk-group-heading="" className="px-2 py-1.5 text-xs font-semibold text-gray-700">
                                    {!subjects.some(s => s.toLowerCase() === subjectSearch.trim().toLowerCase()) 
                                      ? "Add Custom Subject" 
                                      : "Or Use Custom Subject"}
                                  </div>
                                  <CommandItem
                                    value={`__custom__${subjectSearch.trim()}`}
                                    keywords={[subjectSearch.trim(), "custom", "add", "new", "type"]}
                                    onSelect={() => {
                                      setFormData({
                                        ...formData,
                                        subject: subjectSearch.trim(),
                                      });
                                      setSubjectOpen(false);
                                      setSubjectSearch("");
                                    }}
                                    className="text-sm cursor-pointer bg-blue-50 hover:bg-blue-100 font-medium border-b border-blue-200 mb-1"
                                  >
                                    <Check className="mr-2 h-3 w-3 opacity-100 text-blue-600" />
                                    <span className="font-semibold">Use "{subjectSearch.trim()}"</span>
                                    <span className="ml-2 text-xs text-blue-600">(Custom Subject)</span>
                                  </CommandItem>
                                </CommandGroup>
                              )}
                              
                              {/* Show matching subjects */}
                              {subjects.length > 0 && (
                                <CommandGroup>
                                  {(() => {
                                    const filteredSubjects = subjects.filter((subject) => {
                                      if (!subjectSearch.trim()) return true;
                                      return subject.toLowerCase().includes(subjectSearch.toLowerCase());
                                    });
                                    
                                    if (filteredSubjects.length === 0 && subjectSearch.trim()) {
                                      return (
                                        <div className="py-4 px-2 text-center">
                                          <p className="text-xs text-gray-500 mb-2">
                                            No matching subjects found.
                                          </p>
                                          <p className="text-xs text-blue-600 font-medium">
                                            Use the custom subject option above ↑
                                          </p>
                                        </div>
                                      );
                                    }
                                    
                                    return filteredSubjects.map((subject) => (
                                      <CommandItem
                                        key={subject}
                                        value={subject}
                                        onSelect={(currentValue) => {
                                          setFormData({
                                            ...formData,
                                            subject: currentValue,
                                          });
                                          setSubjectOpen(false);
                                          setSubjectSearch("");
                                        }}
                                        className="text-sm cursor-pointer"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-3 w-3",
                                            formData.subject === subject
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        {subject}
                                      </CommandItem>
                                    ));
                                  })()}
                                </CommandGroup>
                              )}
                              
                              {/* Show message if no subjects loaded and user hasn't typed */}
                              {subjects.length === 0 && !subjectSearch.trim() && (
                                <div className="py-4 px-2 text-center text-sm">
                                  <p className="text-gray-600 mb-2">
                                    No subjects available.
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Type your subject above and press Enter to use it
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Description */}
                <div className="space-y-0.5">
                  <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    What do you need help with?
                  </label>
                  <Textarea
                    placeholder=""
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                    rows={2}
                    className="bg-white border-gray-300 focus:border-blue-500 resize-none text-xs py-1 px-2"
                  />
                </div>

                {/* Preferred Time */}
                <div className="space-y-0.5">
                  <label className="text-xs font-medium text-gray-700">
                    Preferred Time (Optional)
                  </label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      placeholder="00"
                      value={formData.preferredTimeHour}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 2);
                        if (
                          value === "" ||
                          (parseInt(value) >= 0 && parseInt(value) <= 12)
                        ) {
                          setFormData({
                            ...formData,
                            preferredTimeHour: value,
                          });
                        }
                      }}
                      maxLength={2}
                      className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-1 text-center w-10"
                    />
                    <span className="text-xs text-gray-500">:</span>
                    <Input
                      type="text"
                      placeholder="00"
                      value={formData.preferredTimeMinute}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 2);
                        if (
                          value === "" ||
                          (parseInt(value) >= 0 && parseInt(value) <= 59)
                        ) {
                          setFormData({
                            ...formData,
                            preferredTimeMinute: value,
                          });
                        }
                      }}
                      maxLength={2}
                      className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-1 text-center w-10"
                    />
                    <Select
                      value={formData.preferredTimePeriod}
                      onValueChange={(value) =>
                        setFormData({ ...formData, preferredTimePeriod: value })
                      }
                    >
                      <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-1 w-14">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-7 text-xs mt-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3 mr-1.5" />
                      Request Tutor
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center mt-0.5 leading-tight">
                  We'll match you with a tutor within 24 hours
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
