"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  GraduationCap,
  Video,
  Rocket,
  LogOut,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LogoutConfirmationModal } from "./logout-confirmation-modal";

interface ApplicationProgress {
  id: number;
  mentor_id: number;
  user_id: string;
  current_step: string;
  status: string;
  application_submitted: boolean;
  application_submitted_at: string | null;
  baseline_assessment_started: boolean;
  baseline_assessment_started_at: string | null;
  baseline_assessment_completed: boolean;
  baseline_assessment_completed_at: string | null;
  baseline_assessment_score: number | null;
  baseline_assessment_passed: boolean;
  baseline_assessment_link: string | null;
  profile_reviewed: boolean;
  profile_reviewed_at: string | null;
  profile_video_url: string | null;
  profile_video_uploaded: boolean;
  profile_video_uploaded_at: string | null;
  profile_approved: boolean;
  profile_approved_at: string | null;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
}

interface MentorApplicationStatusPopupProps {
  isOpen: boolean;
  mentorId: number | null;
  userId: string | null;
  onClose?: () => void;
}

const STEPS = [
  {
    id: "application_submitted",
    title: "Application Submitted",
    description: "Your application has been received and is being processed",
    icon: FileText,
    number: 1,
  },
  {
    id: "baseline_assessment",
    title: "Baseline Assessment",
    description:
      "Complete the assessment test (Pass mark: 75%). Click the button below to start.",
    icon: GraduationCap,
    number: 2,
  },
  {
    id: "profile_review",
    title: "Profile Review",
    description: "Record a self video tutoring on a topic in your profession",
    icon: Video,
    number: 3,
  },
  {
    id: "onboarding",
    title: "Onboarding",
    description: "Complete your onboarding to start tutoring",
    icon: Rocket,
    number: 4,
  },
];

export function MentorApplicationStatusPopup({
  isOpen,
  mentorId,
  userId,
  onClose,
}: MentorApplicationStatusPopupProps) {
  const router = useRouter();
  const [progress, setProgress] = React.useState<ApplicationProgress | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);
  const [videoSubmissionsCount, setVideoSubmissionsCount] =
    React.useState<number>(0);
  const [totalQuestionsCount, setTotalQuestionsCount] =
    React.useState<number>(0);
  // Use refs to store counts immediately (before state updates)
  const videoSubmissionsCountRef = React.useRef<number>(0);
  const totalQuestionsCountRef = React.useRef<number>(0);
  // Onboarding video URL from introduction_video bucket
  const [onboardingVideoUrl, setOnboardingVideoUrl] = React.useState<
    string | null
  >(null);
  const [passedInterview, setPassedInterview] = React.useState<boolean | null>(
    null
  );
  const [isComplete, setIsComplete] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen && mentorId && userId) {
      fetchProgress();
      fetchOnboardingVideo();
      fetchMentorData();
    }
  }, [isOpen, mentorId, userId]);

  // Auto-close popup if is_complete becomes true
  React.useEffect(() => {
    if (isComplete && onClose && isOpen) {
      console.log("✅ is_complete is true, closing popup immediately");
      setLoading(false); // Stop loading
      onClose();
    }
  }, [isComplete, onClose, isOpen]);

  // Check if popup should be closed on mount or when isComplete changes
  React.useEffect(() => {
    if (isOpen && isComplete && onClose) {
      console.log("✅ Popup opened but is_complete is true, closing immediately");
      setLoading(false);
      // Use setTimeout to avoid state update during render
      setTimeout(() => {
        onClose();
      }, 0);
    }
  }, [isOpen, isComplete, onClose]);

  // Fetch mentor data to check passed_interview status
  const fetchMentorData = async () => {
    try {
      const authUserId = await getAuthUserId();
      if (!authUserId) return;

      const { data: mentorData, error } = await supabase
        .from("mentors")
        .select("passed_interview, is_complete, is_verified")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching mentor data:", error);
        return;
      }

      if (mentorData) {
        const isCompleteValue = mentorData.is_complete === true || mentorData.is_complete === "true";
        setPassedInterview(mentorData.passed_interview);
        setIsComplete(isCompleteValue);
        console.log("📋 Mentor data fetched:", {
          passed_interview: mentorData.passed_interview,
          is_complete: mentorData.is_complete,
          is_verified: mentorData.is_verified,
          isCompleteValue,
        });
        
        // If is_complete is true, close popup immediately
        if (isCompleteValue && onClose && isOpen) {
          console.log("✅ Mentor is_complete is true, closing popup");
          setLoading(false);
          setTimeout(() => {
            onClose();
          }, 100);
        }
      }
    } catch (error) {
      console.error("Error fetching mentor data:", error);
    }
  };

  // Fetch onboarding video from course-media bucket (introduction_video folder)
  const fetchOnboardingVideo = async () => {
    try {
      console.log("🎥 Fetching onboarding video from course-media bucket...");

      // Try multiple possible paths (including with trailing space)
      const possiblePaths = [
        "introduction_video ", // Folder path with trailing space (actual path)
        "introduction_video", // Folder path without trailing space
        "", // Root of bucket
      ];

      let videoFile: any = null;
      let videoPath: string = "";

      for (const path of possiblePaths) {
        console.log(`🔍 Checking path: ${path || "root"}...`);

        const { data: files, error } = await supabase.storage
          .from("course-media")
          .list(path, {
            limit: 100,
            offset: 0,
          });

        if (error) {
          console.warn(`⚠️ Error listing ${path || "root"}:`, error);
          continue;
        }

        console.log(`📁 Files found in ${path || "root"}:`, files);

        // Check if any file is a video
        const foundVideo = files?.find(
          (file) =>
            file.name.match(/\.(mp4|webm|ogg|mov)$/i) &&
            !file.name.startsWith(".")
        );

        if (foundVideo) {
          videoFile = foundVideo;
          // Handle path - always add slash, Supabase will handle URL encoding
          videoPath = path ? `${path}/${foundVideo.name}` : foundVideo.name;
          console.log(`✅ Found video file: ${videoPath}`);
          break;
        }

        // Also check subfolders if we're at root
        if (!path && files) {
          for (const item of files) {
            if (item.id === null) {
              // It's a folder, check inside
              console.log(`🔍 Checking subfolder: ${item.name}...`);
              const { data: subFiles, error: subError } = await supabase.storage
                .from("course-media")
                .list(item.name, {
                  limit: 100,
                  offset: 0,
                });

              if (!subError && subFiles) {
                const subVideo = subFiles.find(
                  (file) =>
                    file.name.match(/\.(mp4|webm|ogg|mov)$/i) &&
                    !file.name.startsWith(".")
                );

                if (subVideo) {
                  videoFile = subVideo;
                  videoPath = `${item.name}/${subVideo.name}`;
                  console.log(`✅ Found video file in subfolder: ${videoPath}`);
                  break;
                }
              }
            }
          }
        }

        if (videoFile) break;
      }

      if (videoFile && videoPath) {
        // Get public URL for the video
        const { data: urlData } = supabase.storage
          .from("course-media")
          .getPublicUrl(videoPath);

        console.log("🔗 URL data:", urlData);

        if (urlData?.publicUrl) {
          setOnboardingVideoUrl(urlData.publicUrl);
          console.log("✅ Onboarding video URL set:", urlData.publicUrl);
        } else {
          console.error("❌ No public URL returned for video");
          console.error("URL data structure:", urlData);
        }
      } else {
        console.warn(
          "⚠️ No video file found in course-media bucket. Please ensure a video file exists in the introduction_video folder."
        );
      }
    } catch (error) {
      console.error("❌ Error fetching onboarding video:", error);
    }
  };

  // Refresh progress when window regains focus (e.g., returning from assessment)
  React.useEffect(() => {
    const handleFocus = () => {
      if (isOpen && userId) {
        console.log("🔄 Window focused - refreshing progress");
        fetchProgress();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isOpen, userId]);

  // Also refresh when component becomes visible (e.g., after navigation)
  React.useEffect(() => {
    if (isOpen && userId) {
      console.log("🔄 Component opened - fetching progress");
      fetchProgress();
    }
  }, [isOpen]);

  // Helper function to get auth user UUID
  const getAuthUserId = async (): Promise<string | null> => {
    // If userId is a valid UUID, use it
    if (
      userId &&
      typeof userId === "string" &&
      userId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    ) {
      return userId;
    }
    // Otherwise, get it from auth
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("No authenticated user found");
      return null;
    }
    return user.id;
  };

  const fetchProgress = async () => {
    try {
      setLoading(true);

      // Get the auth user UUID
      const authUserId = await getAuthUserId();
      if (!authUserId) {
        setLoading(false);
        return;
      }

      // Local variables to store counts (before state updates)
      let videoSubmissionsCountLocal = 0;
      let totalQuestionsCountLocal = 0;

      // First, check actual video submissions from the API (source of truth)
      try {
        console.log("🔍 Fetching video submissions for user:", authUserId);
        // Use correct URL format: /submissions/<user_id>/ (path parameter, not query)
        const submissionsUrl = `http://localhost:8000/api/v1/interview-videos/submissions/${authUserId}/`;
        console.log("📡 Submissions URL:", submissionsUrl);
        const submissionsResponse = await fetch(submissionsUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        console.log("📡 Submissions API Response:", {
          status: submissionsResponse.status,
          ok: submissionsResponse.ok,
          statusText: submissionsResponse.statusText,
        });

        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          console.log("📦 Submissions Data:", submissionsData);
          const submissions = submissionsData.submissions || [];

          console.log("🔍 Fetching questions...");
          const questionsResponse = await fetch(
            "http://localhost:8000/api/v1/interview-videos/questions/"
          );

          console.log("📡 Questions API Response:", {
            status: questionsResponse.status,
            ok: questionsResponse.ok,
            statusText: questionsResponse.statusText,
          });

          if (questionsResponse.ok) {
            const questionsData = await questionsResponse.json();
            console.log("📦 Questions Data:", questionsData);
            const questions = questionsData.questions || [];

            // Extract question IDs from submissions
            // Note: question_id is write_only in serializer, so we need to get it from question.id
            const submittedQuestionIds = new Set(
              submissions
                .map((s: any) => {
                  // question_id is write_only, so get ID from question object
                  const qId =
                    s.question?.id ||
                    s.question_id ||
                    (typeof s.question === "number" ? s.question : null);
                  console.log("📝 Submission question ID:", {
                    submission_id: s.id,
                    question_object: s.question,
                    question_id_field: s.question_id,
                    extracted_id: qId,
                  });
                  return qId;
                })
                .filter((id: any) => id !== null && id !== undefined)
            );
            const allQuestionIds = new Set(questions.map((q: any) => q.id));
            const allQuestionsSubmitted =
              submittedQuestionIds.size === allQuestionIds.size &&
              submittedQuestionIds.size > 0 &&
              Array.from(allQuestionIds).every((id) =>
                submittedQuestionIds.has(id)
              );

            // Store counts for status checking - DO THIS IMMEDIATELY
            videoSubmissionsCountLocal = submissions.length;
            totalQuestionsCountLocal = questions.length;

            // Update refs immediately (available synchronously)
            videoSubmissionsCountRef.current = videoSubmissionsCountLocal;
            totalQuestionsCountRef.current = totalQuestionsCountLocal;

            console.log("💾 Setting state and refs:", {
              videoSubmissionsCount: videoSubmissionsCountLocal,
              totalQuestionsCount: totalQuestionsCountLocal,
              ref_videoSubmissionsCount: videoSubmissionsCountRef.current,
              ref_totalQuestionsCount: totalQuestionsCountRef.current,
            });
            setVideoSubmissionsCount(videoSubmissionsCountLocal);
            setTotalQuestionsCount(totalQuestionsCountLocal);

            console.log("📹 Video Submissions Check (Source of Truth):", {
              submissions_count: videoSubmissionsCountLocal,
              questions_count: totalQuestionsCountLocal,
              submitted_question_ids: Array.from(submittedQuestionIds),
              all_question_ids: Array.from(allQuestionIds),
              all_submitted: allQuestionsSubmitted,
              submissions: submissions.map((s: any) => ({
                id: s.id,
                question_id: s.question_id,
                question: s.question,
                question_id_from_question: s.question?.id,
              })),
            });

            // If all videos are submitted, update progress table if needed
            // But wait until we have progress data first
          } else {
            const errorText = await questionsResponse.text();
            console.error(
              "❌ Failed to fetch questions:",
              questionsResponse.status,
              errorText
            );
          }
        } else {
          const errorText = await submissionsResponse.text();
          console.error(
            "❌ Failed to fetch submissions:",
            submissionsResponse.status,
            errorText
          );
        }
      } catch (submissionError) {
        console.error("❌ Could not check video submissions:", submissionError);
      }

      const { data, error } = await supabase
        .from("mentor_application_progress")
        .select("*")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching progress:", error);
        // If no progress record exists, create one
        if (error.code === "PGRST116") {
          await createProgressRecord();
        }
        setLoading(false);
        return;
      }

      if (data) {
        console.log("📊 Progress Data Fetched:", {
          profile_video_uploaded: data.profile_video_uploaded,
          profile_reviewed: data.profile_reviewed,
          current_step: data.current_step,
          status: data.status,
        });

        // Now check if we need to update based on video submissions
        // Use local variables since state might not be updated yet
        const currentSubmissionsCount =
          videoSubmissionsCountLocal || videoSubmissionsCount;
        const currentQuestionsCount =
          totalQuestionsCountLocal || totalQuestionsCount;

        console.log("🔄 Checking if update needed:", {
          currentSubmissionsCount,
          currentQuestionsCount,
          videoSubmissionsCount,
          totalQuestionsCount,
          profile_video_uploaded: data.profile_video_uploaded,
          profile_reviewed: data.profile_reviewed,
        });

        if (
          currentQuestionsCount > 0 &&
          currentSubmissionsCount >= currentQuestionsCount
        ) {
          const needsUpdate =
            !data.profile_video_uploaded || !data.profile_reviewed;
          if (needsUpdate) {
            console.log(
              "🔄 All videos submitted but progress table not updated - updating now"
            );
            try {
              const { data: updatedData } = await supabase
                .from("mentor_application_progress")
                .update({
                  profile_video_uploaded: true,
                  profile_video_uploaded_at: new Date().toISOString(),
                  profile_reviewed: true,
                  profile_reviewed_at: new Date().toISOString(),
                })
                .eq("user_id", authUserId)
                .select()
                .single();

              if (updatedData) {
                console.log(
                  "✅ Progress table updated based on video submissions"
                );
                setProgress(updatedData);
                setLoading(false);
                return;
              }
            } catch (updateError) {
              console.error("Error updating progress table:", updateError);
            }
          }
        }

        setProgress(data);
        // Debug: Log the assessment link and current step
        console.log("Progress data:", {
          current_step: data.current_step,
          assessment_link: data.baseline_assessment_link,
          baseline_assessment_completed: data.baseline_assessment_completed,
          baseline_assessment_passed: data.baseline_assessment_passed,
          baseline_assessment_score: data.baseline_assessment_score,
          currentStepIndex: STEPS.findIndex(
            (step) => step.id === data.current_step
          ),
        });

        // If on baseline assessment step and no link exists, try to fetch/generate one
        if (
          data.current_step === "baseline_assessment" &&
          !data.baseline_assessment_link
        ) {
          console.log("Fetching/generating assessment link...");
          await fetchOrGenerateAssessmentLink(data);
        }
      } else {
        // Create initial progress record
        await createProgressRecord();
      }
    } catch (error) {
      console.error("Error fetching application progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrGenerateAssessmentLink = async (
    progressData: ApplicationProgress
  ) => {
    try {
      // Try to fetch the first available assessment from the API
      const response = await fetch(
        "http://localhost:8000/api/v1/baseline-assessments/"
      );
      if (response.ok) {
        const data = await response.json();
        if (data.assessments && data.assessments.length > 0) {
          // Get the first active assessment
          const firstAssessment = data.assessments[0];
          if (firstAssessment.assessment_link) {
            // Get auth user ID
            const authUserId = await getAuthUserId();
            if (!authUserId) return;

            // Update the progress record with the assessment link
            const { error: updateError } = await supabase
              .from("mentor_application_progress")
              .update({
                baseline_assessment_link: firstAssessment.assessment_link,
              })
              .eq("user_id", authUserId);

            if (!updateError) {
              // Refresh progress data
              const { data: updatedData } = await supabase
                .from("mentor_application_progress")
                .select("*")
                .eq("user_id", authUserId)
                .maybeSingle();

              if (updatedData) {
                setProgress(updatedData);
              }
            }
          } else if (firstAssessment.id) {
            // Get auth user ID
            const authUserId = await getAuthUserId();
            if (!authUserId) return;

            // Generate link for the assessment
            const generateResponse = await fetch(
              `http://localhost:8000/api/v1/baseline-assessments/${firstAssessment.id}/generate-link/`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ user_id: authUserId }),
              }
            );

            if (generateResponse.ok) {
              const generateData = await generateResponse.json();
              if (generateData.assessment_link) {
                // Update progress with the generated link
                const { error: updateError } = await supabase
                  .from("mentor_application_progress")
                  .update({
                    baseline_assessment_link: generateData.assessment_link,
                  })
                  .eq("user_id", authUserId);

                if (!updateError) {
                  // Refresh progress data
                  const { data: updatedData } = await supabase
                    .from("mentor_application_progress")
                    .select("*")
                    .eq("user_id", authUserId)
                    .maybeSingle();

                  if (updatedData) {
                    setProgress(updatedData);
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching/generating assessment link:", error);
    }
  };

  const createProgressRecord = async () => {
    if (!mentorId) return;

    try {
      // Get the auth user UUID
      const authUserId = await getAuthUserId();
      if (!authUserId) {
        console.error(
          "No authenticated user found for creating progress record"
        );
        return;
      }

      const { data, error } = await supabase
        .from("mentor_application_progress")
        .insert({
          mentor_id: mentorId,
          user_id: authUserId,
          current_step: "application_submitted",
          status: "pending",
          application_submitted: true,
          application_submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      if (data) setProgress(data);
    } catch (error) {
      console.error("Error creating progress record:", error);
    }
  };

  const getStepStatus = (stepId: string) => {
    if (!progress) return "pending";

    switch (stepId) {
      case "application_submitted":
        return progress.application_submitted ? "completed" : "pending";
      case "baseline_assessment":
        // Debug logging
        if (stepId === "baseline_assessment") {
          console.log("Getting baseline assessment status:", {
            completed: progress.baseline_assessment_completed,
            passed: progress.baseline_assessment_passed,
            score: progress.baseline_assessment_score,
            started: progress.baseline_assessment_started,
          });
        }
        if (progress.baseline_assessment_completed) {
          const status = progress.baseline_assessment_passed
            ? "completed"
            : "failed";
          console.log("Baseline assessment status:", status);
          return status;
        }
        return progress.baseline_assessment_started ? "in_progress" : "pending";
      case "profile_review":
        // Check passed_interview status first (source of truth for interview result)
        if (passedInterview === true) return "completed";
        if (passedInterview === false) return "failed";
        // If passedInterview is null, check if videos are submitted (under review)
        if (progress.profile_approved) return "completed";
        // Check video submissions table (source of truth) OR progress table
        // Use refs for immediate access (state might not be updated yet)
        const currentVideoCount =
          videoSubmissionsCountRef.current || videoSubmissionsCount;
        const currentTotalCount =
          totalQuestionsCountRef.current || totalQuestionsCount;
        // Show "in_progress" if ANY videos are submitted (not just all)
        const hasAnyVideos = currentVideoCount > 0;
        const allVideosSubmitted =
          currentTotalCount > 0 && currentVideoCount >= currentTotalCount;
        console.log("🔍 Profile Review Status Check:", {
          currentVideoCount,
          currentTotalCount,
          hasAnyVideos,
          allVideosSubmitted,
          profile_video_uploaded: progress.profile_video_uploaded,
          profile_reviewed: progress.profile_reviewed,
          passed_interview: passedInterview,
        });
        if (
          allVideosSubmitted ||
          progress.profile_video_uploaded ||
          progress.profile_reviewed ||
          hasAnyVideos
        )
          return "in_progress";
        return "pending";
      case "onboarding":
        // Only allow onboarding if passed_interview is true
        if (passedInterview !== true) return "pending";
        return progress.onboarding_completed ? "completed" : "pending";
      default:
        return "pending";
    }
  };

  const getCurrentStepIndex = () => {
    if (!progress) return 0;
    return STEPS.findIndex((step) => step.id === progress.current_step);
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return CheckCircle;
      case "in_progress":
        return Loader2;
      case "failed":
        return XCircle;
      default:
        return Clock;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "in_progress":
        return "text-blue-600 bg-blue-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-400 bg-gray-100";
    }
  };

  // Debug logging - must be before any early returns
  React.useEffect(() => {
    if (progress && isOpen) {
      const currentStepIndex = getCurrentStepIndex();
      const baselineStatus = getStepStatus("baseline_assessment");
      console.log("Application Status Popup Debug:", {
        isOpen,
        current_step: progress.current_step,
        currentStepIndex,
        stepId: STEPS[currentStepIndex]?.id,
        hasLink: !!progress.baseline_assessment_link,
        link: progress.baseline_assessment_link,
        baseline_assessment_completed: progress.baseline_assessment_completed,
        baseline_assessment_passed: progress.baseline_assessment_passed,
        baseline_assessment_score: progress.baseline_assessment_score,
        baselineStatus: baselineStatus,
      });
    }
  }, [progress, isOpen]);

  // Don't render if is_complete is true
  if (isComplete) {
    console.log("✅ is_complete is true, not rendering popup");
    return null;
  }

  if (!isOpen) return null;

  const currentStepIndex = getCurrentStepIndex();

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              style={{ pointerEvents: "none" }}
              // Prevent closing - no onClick handler
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50"
              style={{ pointerEvents: "auto" }}
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
                      <div className="flex items-center justify-center gap-2 flex-1">
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
                          Application Status
                        </CardTitle>
                      </div>
                      <button
                        onClick={() => setIsLogoutModalOpen(true)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white hover:bg-white/20 rounded-lg transition-colors"
                        title="Logout"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Logout</span>
                      </button>
                    </div>
                    <p className="text-xs text-blue-100 mt-0.5 leading-tight text-center">
                      Track your progress to becoming a tutor
                    </p>
                  </CardHeader>

                  <CardContent className="p-4">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Linear Progress Steps */}
                        <div className="relative">
                          {/* Progress Line */}
                          <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 -z-10">
                            <motion.div
                              className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                              initial={{ width: "0%" }}
                              animate={{
                                width: progress
                                  ? `${
                                      (currentStepIndex / (STEPS.length - 1)) *
                                      100
                                    }%`
                                  : "0%",
                              }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>

                          {/* Steps */}
                          <div className="flex items-start justify-between relative">
                            {STEPS.map((step, index) => {
                              const status = getStepStatus(step.id);
                              const Icon = getStepIcon(status);
                              const isCurrentStep = index === currentStepIndex;
                              const isCompleted = status === "completed";
                              const isFailed = status === "failed";
                              const isPending = status === "pending";
                              const isPast = index < currentStepIndex;

                              return (
                                <div
                                  key={step.id}
                                  className={`flex flex-col items-center flex-1 relative transition-all ${
                                    (step.id === "baseline_assessment" &&
                                      !progress?.baseline_assessment_completed) ||
                                    (step.id === "profile_review" &&
                                      progress?.baseline_assessment_completed &&
                                      progress?.baseline_assessment_passed &&
                                      !progress?.profile_video_uploaded)
                                      ? "cursor-pointer hover:scale-105"
                                      : ""
                                  } ${
                                    // Add red border/background when failed
                                    step.id === "baseline_assessment" &&
                                    progress?.baseline_assessment_completed &&
                                    !progress?.baseline_assessment_passed
                                      ? "p-2 rounded-lg bg-red-50 border-2 border-red-300"
                                      : step.id === "baseline_assessment" &&
                                        progress?.baseline_assessment_completed &&
                                        progress?.baseline_assessment_passed
                                      ? "p-2 rounded-lg bg-green-50 border-2 border-green-300"
                                      : ""
                                  }`}
                                onClick={
                                  step.id === "profile_review" &&
                                  progress?.baseline_assessment_completed &&
                                  progress?.baseline_assessment_passed &&
                                  !progress?.profile_video_uploaded
                                    ? (e) => {
                                          router.push(
                                            "/dashboard/tutor/profile-review"
                                          );
                                      }
                                    : step.id === "baseline_assessment" &&
                                  !progress?.baseline_assessment_completed
                                    ? async (e) => {
                                          console.log(
                                            "=== STEP 2 CLICKED ===",
                                            {
                                              stepId: step.id,
                                              hasProgress: !!progress,
                                              completed:
                                                progress?.baseline_assessment_completed,
                                              hasLink:
                                                !!progress?.baseline_assessment_link,
                                              link: progress?.baseline_assessment_link,
                                            }
                                          );

                                          // If no progress, try to fetch it first
                                          let currentProgress = progress;
                                          if (!currentProgress) {
                                            console.log(
                                              "No progress found, fetching..."
                                            );
                                            try {
                                              const authUserId =
                                                await getAuthUserId();
                                              if (!authUserId) return;

                                              const { data: progressData } =
                                                await supabase
                                                  .from(
                                                    "mentor_application_progress"
                                                  )
                                                  .select("*")
                                                  .eq("user_id", authUserId)
                                                  .maybeSingle();

                                              if (progressData) {
                                                currentProgress = progressData;
                                                setProgress(progressData);
                                                console.log(
                                                  "Progress fetched:",
                                                  progressData
                                                );
                                              }
                                            } catch (err) {
                                              console.error(
                                                "Error fetching progress:",
                                                err
                                              );
                                            }
                                          }

                                          // Check if already completed
                                          if (
                                            currentProgress?.baseline_assessment_completed
                                          ) {
                                            console.log(
                                              "Assessment already completed"
                                            );
                                            return;
                                          }

                                          // Helper function to extract assessment ID
                                          const extractAssessmentId = (
                                            link: string
                                          ): string | null => {
                                            const patterns = [
                                              /\/baseline-assessment\/(\d+)\/take/,
                                              /\/baseline-assessment\/(\d+)\//,
                                              /\/baseline-assessment\/(\d+)$/,
                                              /baseline-assessment\/(\d+)/,
                                            ];

                                            for (const pattern of patterns) {
                                              const match = link.match(pattern);
                                              if (match && match[1]) {
                                                return match[1];
                                              }
                                            }
                                            return null;
                                          };

                                          // Try to get assessment ID from link
                                          let assessmentId: string | null =
                                            null;

                                          if (
                                            currentProgress?.baseline_assessment_link
                                          ) {
                                            assessmentId = extractAssessmentId(
                                              currentProgress.baseline_assessment_link
                                            );
                                            console.log(
                                              "Found assessment ID from link:",
                                              assessmentId
                                            );
                                          }

                                          // If no ID from link, try to fetch first assessment from API
                                          if (!assessmentId) {
                                            try {
                                              console.log(
                                                "Fetching assessments from API..."
                                              );
                                              const response = await fetch(
                                                "http://localhost:8000/api/v1/baseline-assessments/"
                                              );
                                              if (response.ok) {
                                                const data =
                                                  await response.json();
                                                if (
                                                  data.assessments &&
                                                  data.assessments.length > 0
                                                ) {
                                                  assessmentId =
                                                    data.assessments[0].id.toString();
                                                  console.log(
                                                    "Found assessment ID from API:",
                                                    assessmentId
                                                  );

                                                  // Update progress with the link
                                                  const authUserId =
                                                    await getAuthUserId();
                                                  if (authUserId) {
                                                    const assessmentLink = `/dashboard/tutor/baseline-assessment/${assessmentId}/take`;
                                                    console.log(
                                                      "Updating progress with link:",
                                                      assessmentLink
                                                    );
                                                    const {
                                                      error: updateError,
                                                    } = await supabase
                                                      .from(
                                                        "mentor_application_progress"
                                                      )
                                                      .update({
                                                        baseline_assessment_link:
                                                          assessmentLink,
                                                      })
                                                      .eq(
                                                        "user_id",
                                                        authUserId
                                                      );

                                                    if (updateError) {
                                                      console.error(
                                                        "Error updating progress:",
                                                        updateError
                                                      );
                                                    } else {
                                                      console.log(
                                                        "Progress updated successfully"
                                                      );
                                                    }
                                                  }
                                                }
                                              }
                                            } catch (err) {
                                              console.error(
                                                "Error fetching assessments:",
                                                err
                                              );
                                            }
                                          }

                                          // Navigate to assessment
                                          if (assessmentId) {
                                            console.log(
                                              "Navigating to assessment page:",
                                              `/dashboard/tutor/baseline-assessment/${assessmentId}/take`
                                            );
                                            router.push(
                                              `/dashboard/tutor/baseline-assessment/${assessmentId}/take`
                                            );
                                          } else {
                                            console.error(
                                              "Could not find assessment ID. Please try again."
                                            );
                                            alert(
                                              "Unable to load assessment. Please try again or contact support."
                                            );
                                          }
                                        }
                                      : undefined
                                  }
                                >
                                  {/* Step Circle */}
                                  <motion.div
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                                      step.id === "baseline_assessment" &&
                                      !progress?.baseline_assessment_completed
                                        ? "hover:scale-110 hover:shadow-lg"
                                        : ""
                                    } ${
                                      // For baseline assessment, check completion status directly - PRIORITY CHECK
                                      step.id === "baseline_assessment" &&
                                      progress?.baseline_assessment_completed
                                        ? progress.baseline_assessment_passed
                                          ? "border-green-500 bg-green-500 shadow-md"
                                          : "border-red-600 bg-red-600 shadow-md shadow-red-500/50"
                                        : // For profile review, show green when ANY video is uploaded (under review)
                                        step.id === "profile_review" &&
                                          progress &&
                                          ((videoSubmissionsCountRef.current ||
                                            videoSubmissionsCount) > 0 ||
                                            ((totalQuestionsCountRef.current ||
                                              totalQuestionsCount) > 0 &&
                                              (videoSubmissionsCountRef.current ||
                                                videoSubmissionsCount) >=
                                                (totalQuestionsCountRef.current ||
                                                  totalQuestionsCount)) ||
                                            progress.profile_video_uploaded ||
                                            progress.profile_reviewed)
                                        ? "border-green-500 bg-green-500 shadow-md"
                                        : // Priority: completed/failed status over current step
                                        isCompleted
                                        ? "border-green-500 bg-green-500 shadow-md"
                                        : isFailed
                                        ? "border-red-600 bg-red-600 shadow-md shadow-red-500/50"
                                        : isCurrentStep
                                        ? "border-blue-500 bg-blue-500 shadow-lg shadow-blue-500/50 scale-110"
                                        : "border-gray-300 bg-white"
                                    }`}
                                  >
                                    {(() => {
                                      // For baseline assessment, check completion status directly - PRIORITY CHECK
                                      if (
                                        step.id === "baseline_assessment" &&
                                        progress
                                      ) {
                                        if (
                                          progress.baseline_assessment_completed
                                        ) {
                                          console.log(
                                            "Baseline assessment icon check:",
                                            {
                                              completed:
                                                progress.baseline_assessment_completed,
                                              passed:
                                                progress.baseline_assessment_passed,
                                              score:
                                                progress.baseline_assessment_score,
                                            }
                                          );
                                          return progress.baseline_assessment_passed ? (
                                            <CheckCircle className="w-6 h-6 text-white" />
                                          ) : (
                                            <XCircle className="w-6 h-6 text-white" />
                                          );
                                        }
                                      }
                                      // For profile review, show checkmark when video is uploaded (under review)
                                      // Check video submissions table (source of truth) OR progress table
                                      if (
                                        step.id === "profile_review" &&
                                        progress
                                      ) {
                                        const hasAnyVideos =
                                          videoSubmissionsCount > 0;
                                        const allVideosSubmitted =
                                          totalQuestionsCount > 0 &&
                                          videoSubmissionsCount >=
                                            totalQuestionsCount;
                                        const hasVideo =
                                          hasAnyVideos ||
                                          allVideosSubmitted ||
                                          progress.profile_video_uploaded ||
                                          progress.profile_reviewed;
                                        console.log(
                                          "Profile Review Icon Check:",
                                          {
                                            stepId: step.id,
                                            videoSubmissionsCount,
                                            totalQuestionsCount,
                                            hasAnyVideos,
                                            allVideosSubmitted,
                                            profile_video_uploaded:
                                              progress.profile_video_uploaded,
                                            profile_reviewed:
                                              progress.profile_reviewed,
                                            hasVideo: hasVideo,
                                          }
                                        );
                                        if (hasVideo) {
                                          return (
                                            <CheckCircle className="w-6 h-6 text-white" />
                                          );
                                        }
                                      }
                                      // For profile review with "in_progress" status, show checkmark (videos submitted)
                                      if (
                                        step.id === "profile_review" &&
                                        status === "in_progress" &&
                                        progress &&
                                        (videoSubmissionsCount > 0 ||
                                          progress.profile_video_uploaded ||
                                          progress.profile_reviewed)
                                      ) {
                                        return (
                                          <CheckCircle className="w-6 h-6 text-white" />
                                        );
                                      }
                                      // Default behavior for other steps
                                      if (isCompleted) {
                                        return (
                                          <CheckCircle className="w-6 h-6 text-white" />
                                        );
                                      }
                                      if (isFailed) {
                                        return (
                                          <XCircle className="w-6 h-6 text-white" />
                                        );
                                      }
                                      if (
                                        isCurrentStep &&
                                        !isCompleted &&
                                        !isFailed &&
                                        status !== "in_progress"
                                      ) {
                                        return (
                                          <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{
                                              duration: 2,
                                              repeat: Infinity,
                                              ease: "linear",
                                            }}
                                          >
                                            <Icon className="w-6 h-6 text-white" />
                                          </motion.div>
                                        );
                                      }
                                      // For in_progress status, show checkmark (not spinner)
                                      if (status === "in_progress") {
                                        return (
                                          <CheckCircle className="w-6 h-6 text-white" />
                                        );
                                      }
                                      return (
                                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                                          <span className="text-xs font-bold text-white">
                                            {step.number}
                                          </span>
                                        </div>
                                      );
                                    })()}

                                    {/* Status indicator badge for baseline assessment */}
                                    {step.id === "baseline_assessment" &&
                                      progress?.baseline_assessment_completed && (
                                        <div className="absolute -bottom-1 -right-1 z-20">
                                          {progress.baseline_assessment_passed ? (
                                            <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center shadow-lg">
                                              <CheckCircle className="w-4 h-4 text-white" />
                                            </div>
                                          ) : (
                                            <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-white flex items-center justify-center shadow-lg">
                                              <XCircle className="w-4 h-4 text-white" />
                                            </div>
                                          )}
                                        </div>
                                      )}
                                  </motion.div>

                                  {/* Step Content */}
                                  <div
                                    className="mt-3 text-center w-full max-w-[140px]"
                                    style={{
                                      pointerEvents:
                                        step.id === "baseline_assessment" &&
                                        !progress?.baseline_assessment_completed
                                          ? "none"
                                          : "auto",
                                    }}
                                  >
                                    <h3
                                      className={`text-xs font-bold mb-1 ${
                                        step.id === "baseline_assessment" &&
                                        !progress?.baseline_assessment_completed
                                          ? "hover:text-blue-700"
                                          : ""
                                      } ${
                                        // Priority: completed/failed status over current step - PRIORITY CHECK
                                        step.id === "baseline_assessment" &&
                                        progress?.baseline_assessment_completed
                                          ? progress.baseline_assessment_passed
                                            ? "text-green-600"
                                            : "text-red-600 font-extrabold"
                                          : step.id === "profile_review" &&
                                            progress &&
                                            ((videoSubmissionsCountRef.current ||
                                              videoSubmissionsCount) > 0 ||
                                              ((totalQuestionsCountRef.current ||
                                                totalQuestionsCount) > 0 &&
                                                (videoSubmissionsCountRef.current ||
                                                  videoSubmissionsCount) >=
                                                  (totalQuestionsCountRef.current ||
                                                    totalQuestionsCount)) ||
                                              progress.profile_video_uploaded ||
                                              progress.profile_reviewed)
                                          ? "text-green-600"
                                          : isCurrentStep
                                          ? "text-blue-600"
                                          : isCompleted
                                          ? "text-green-600"
                                          : isFailed
                                          ? "text-red-600 font-extrabold"
                                          : "text-gray-500"
                                      }`}
                                    >
                                      {step.title}
                                    </h3>
                                    <p
                                      className={`text-[10px] leading-tight ${
                                        step.id === "baseline_assessment" &&
                                        !progress?.baseline_assessment_completed
                                          ? "text-gray-600 hover:text-gray-700"
                                          : step.id === "baseline_assessment" &&
                                            progress?.baseline_assessment_completed
                                          ? progress.baseline_assessment_passed
                                            ? "text-green-700 font-semibold"
                                            : "text-red-700 font-semibold"
                                          : step.id === "profile_review" &&
                                            progress
                                          ? passedInterview === true
                                            ? "text-green-700 font-semibold"
                                            : passedInterview === false
                                            ? "text-red-700 font-semibold"
                                            : ((videoSubmissionsCountRef.current ||
                                                videoSubmissionsCount) > 0 ||
                                                ((totalQuestionsCountRef.current ||
                                                  totalQuestionsCount) > 0 &&
                                                  (videoSubmissionsCountRef.current ||
                                                    videoSubmissionsCount) >=
                                                    (totalQuestionsCountRef.current ||
                                                      totalQuestionsCount)) ||
                                                progress.profile_video_uploaded ||
                                                progress.profile_reviewed)
                                            ? "text-green-700 font-semibold"
                                            : "text-gray-600"
                                          : "text-gray-600"
                                      }`}
                                    >
                                      {step.id === "baseline_assessment" &&
                                      progress?.baseline_assessment_completed
                                        ? progress.baseline_assessment_passed
                                          ? "✓ Assessment Passed"
                                          : "✗ Assessment Failed"
                                        : step.id === "profile_review" &&
                                          progress
                                        ? passedInterview === true
                                          ? "✓ Interview Passed"
                                          : passedInterview === false
                                          ? "✗ Interview Failed"
                                          : (videoSubmissionsCountRef.current ||
                                              videoSubmissionsCount) > 0 ||
                                            ((totalQuestionsCountRef.current ||
                                              totalQuestionsCount) > 0 &&
                                              (videoSubmissionsCountRef.current ||
                                                videoSubmissionsCount) >=
                                                (totalQuestionsCountRef.current ||
                                                  totalQuestionsCount)) ||
                                            progress.profile_video_uploaded ||
                                            progress.profile_reviewed
                                          ? (videoSubmissionsCountRef.current ||
                                              videoSubmissionsCount) >=
                                              (totalQuestionsCountRef.current ||
                                                totalQuestionsCount) &&
                                            (totalQuestionsCountRef.current ||
                                              totalQuestionsCount) > 0
                                            ? "✓ Under Review"
                                            : `✓ ${
                                                videoSubmissionsCountRef.current ||
                                                videoSubmissionsCount
                                              }/${
                                                totalQuestionsCountRef.current ||
                                                totalQuestionsCount
                                              } Videos Submitted`
                                          : step.description
                                        : step.description}
                                    </p>
                                    {step.id === "baseline_assessment" &&
                                      progress && (
                                        <>
                                          {/* Show score and result if assessment is completed */}
                                          {progress.baseline_assessment_completed && (
                                            <div className="mt-2 space-y-1">
                                              {progress.baseline_assessment_score !==
                                                null && (
                                                <p
                                                  className={`text-[10px] font-bold ${
                                                    progress.baseline_assessment_passed
                                                      ? "text-green-600"
                                                      : "text-red-600"
                                                  }`}
                                                >
                                                  Score:{" "}
                                                  {
                                                    progress.baseline_assessment_score
                                                  }
                                                  %
                                                </p>
                                              )}
                                              <div className="flex items-center justify-center gap-1">
                                                {progress.baseline_assessment_passed ? (
                                                  <div className="flex items-center gap-1 text-green-600">
                                                    <CheckCircle className="w-3 h-3" />
                                                    <span className="text-[10px] font-semibold">
                                                      Passed
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <div className="flex items-center gap-1 text-red-600">
                                                    <XCircle className="w-3 h-3" />
                                                    <span className="text-[10px] font-semibold">
                                                      Failed
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                          {/* Always show button for baseline assessment step if not completed */}
                                          {step.id === "baseline_assessment" &&
                                            !progress.baseline_assessment_completed && (
                                              <div className="mt-2">
                                                <button
                                                  onClick={async (e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();

                                                    console.log(
                                                      "Button clicked - Baseline Assessment"
                                                    );

                                                    // Use the same logic as the card click
                                                    const extractAssessmentId =
                                                      (
                                                        link: string
                                                      ): string | null => {
                                                        const patterns = [
                                                          /\/baseline-assessment\/(\d+)\/take/,
                                                          /\/baseline-assessment\/(\d+)\//,
                                                          /\/baseline-assessment\/(\d+)$/,
                                                          /baseline-assessment\/(\d+)/,
                                                        ];

                                                        for (const pattern of patterns) {
                                                          const match =
                                                            link.match(pattern);
                                                          if (
                                                            match &&
                                                            match[1]
                                                          ) {
                                                            return match[1];
                                                          }
                                                        }
                                                        return null;
                                                      };

                                                    let assessmentId:
                                                      | string
                                                      | null = null;

                                                    if (
                                                      progress.baseline_assessment_link
                                                    ) {
                                                      assessmentId =
                                                        extractAssessmentId(
                                                          progress.baseline_assessment_link
                                                        );
                                                    }

                                                    if (!assessmentId) {
                                                      try {
                                                        const response =
                                                          await fetch(
                                                            "http://localhost:8000/api/v1/baseline-assessments/"
                                                          );
                                                        if (response.ok) {
                                                          const data =
                                                            await response.json();
                                                          if (
                                                            data.assessments &&
                                                            data.assessments
                                                              .length > 0
                                                          ) {
                                                            assessmentId =
                                                              data.assessments[0].id.toString();

                                                            if (
                                                              progress &&
                                                              userId
                                                            ) {
                                                              const assessmentLink = `/dashboard/tutor/baseline-assessment/${assessmentId}/take`;
                                                              await supabase
                                                                .from(
                                                                  "mentor_application_progress"
                                                                )
                                                                .update({
                                                                  baseline_assessment_link:
                                                                    assessmentLink,
                                                                })
                                                                .eq(
                                                                  "user_id",
                                                                  userId
                                                                );
                                                            }
                                                          }
                                                        }
                                                      } catch (err) {
                                                        console.error(
                                                          "Error fetching assessments:",
                                                          err
                                                        );
                                                      }
                                                    }

                                                    if (assessmentId) {
                                                      console.log(
                                                        "Navigating to:",
                                                        `/dashboard/tutor/baseline-assessment/${assessmentId}/take`
                                                      );
                                                      router.push(
                                                        `/dashboard/tutor/baseline-assessment/${assessmentId}/take`
                                                      );
                                                    } else {
                                                      alert(
                                                        "Unable to load assessment. Please try again."
                                                      );
                                                    }
                                                  }}
                                                  className="inline-flex items-center gap-2 text-xs bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all cursor-pointer border-2 border-blue-700"
                                                  style={{
                                                    pointerEvents: "auto",
                                                    zIndex: 50,
                                                    minWidth: "200px",
                                                  }}
                                                >
                                                  <GraduationCap className="w-4 h-4" />
                                                  {progress.baseline_assessment_link
                                                    ? "Start Assessment"
                                                    : "Get Link"}
                                                </button>
                                              </div>
                                            )}
                                        </>
                                      )}
                                    {step.id === "profile_review" &&
                                      progress &&
                                      progress.baseline_assessment_completed &&
                                      progress.baseline_assessment_passed &&
                                      !progress.profile_video_uploaded &&
                                      !progress.profile_reviewed &&
                                      !(
                                        (videoSubmissionsCountRef.current ||
                                          videoSubmissionsCount) > 0
                                      ) &&
                                      !(
                                        (totalQuestionsCountRef.current ||
                                          totalQuestionsCount) > 0 &&
                                        (videoSubmissionsCountRef.current ||
                                          videoSubmissionsCount) >=
                                          (totalQuestionsCountRef.current ||
                                            totalQuestionsCount)
                                      ) && (
                                        <div className="mt-2">
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              router.push(
                                                "/dashboard/tutor/profile-review"
                                              );
                                            }}
                                            className="inline-flex items-center gap-2 text-xs bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all cursor-pointer border-2 border-blue-700"
                                            style={{
                                              pointerEvents: "auto",
                                              zIndex: 50,
                                              minWidth: "200px",
                                            }}
                                          >
                                            <Video className="w-4 h-4" />
                                            Start Interview
                                          </button>
                                        </div>
                                      )}
                                    {/* Don't show "Current" badge if profile review video is uploaded (it's under review) */}
                                    {isCurrentStep &&
                                      !(
                                        step.id === "profile_review" &&
                                        progress &&
                                        ((videoSubmissionsCountRef.current ||
                                          videoSubmissionsCount) > 0 ||
                                          ((totalQuestionsCountRef.current ||
                                            totalQuestionsCount) > 0 &&
                                            (videoSubmissionsCountRef.current ||
                                              videoSubmissionsCount) >=
                                              (totalQuestionsCountRef.current ||
                                                totalQuestionsCount)) ||
                                          progress.profile_video_uploaded ||
                                          progress.profile_reviewed)
                                      ) && (
                                      <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-1"
                                      >
                                        <span className="inline-block text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">
                                          Current
                                        </span>
                                      </motion.div>
                                    )}
                                    {/* Show "Under Review" or progress badge for profile review when video is uploaded */}
                                    {step.id === "profile_review" &&
                                      progress &&
                                      ((videoSubmissionsCountRef.current ||
                                        videoSubmissionsCount) > 0 ||
                                        ((totalQuestionsCountRef.current ||
                                          totalQuestionsCount) > 0 &&
                                          (videoSubmissionsCountRef.current ||
                                            videoSubmissionsCount) >=
                                            (totalQuestionsCountRef.current ||
                                              totalQuestionsCount)) ||
                                        progress.profile_video_uploaded ||
                                        progress.profile_reviewed) && (
                                        <motion.div
                                          initial={{ opacity: 0, y: -5 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          className="mt-1"
                                        >
                                          <span className="inline-block text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold">
                                            {(videoSubmissionsCountRef.current ||
                                              videoSubmissionsCount) >=
                                              (totalQuestionsCountRef.current ||
                                                totalQuestionsCount) &&
                                            (totalQuestionsCountRef.current ||
                                              totalQuestionsCount) > 0
                                              ? "Under Review"
                                              : `${
                                                  videoSubmissionsCountRef.current ||
                                                  videoSubmissionsCount
                                                }/${
                                                  totalQuestionsCountRef.current ||
                                                  totalQuestionsCount
                                                } Submitted`}
                                          </span>
                                        </motion.div>
                                      )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Current Step Info - Always show when progress exists */}
                        {progress && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-blue-900 mb-1">
                                  Current Step: {STEPS[currentStepIndex]?.title}
                                </p>
                                <div className="text-xs text-blue-800 leading-relaxed">
                                  {/* Always show baseline assessment button section */}
                                  {/* Show if: not completed OR on baseline assessment step OR current step index is 1 */}
                                  {/* Always show baseline assessment section if application is submitted and not completed */}
                                  {progress.application_submitted &&
                                    !progress.baseline_assessment_completed && (
                                      <>
                                        <p className="mb-3 font-semibold text-base">
                                          Complete the baseline assessment to
                                          proceed. You need to score 75% or
                                          higher to pass.
                                        </p>
                                        {/* Always show the link section for baseline assessment step */}
                                        <div className="mt-4 space-y-2">
                                          {/* Always show the button - make it prominent and visible */}
                                          <button
                                            type="button"
                                            onClick={async (e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              if (
                                                progress.baseline_assessment_link
                                              ) {
                                                // Extract assessment ID from the link
                                                const linkMatch =
                                                  progress.baseline_assessment_link.match(
                                                    /\/baseline-assessment\/(\d+)\/take/
                                                  );
                                                if (linkMatch && linkMatch[1]) {
                                                  router.push(
                                                    `/dashboard/tutor/baseline-assessment/${linkMatch[1]}/take`
                                                  );
                                                } else {
                                                  // Fallback: try to navigate directly if link format is different
                                                  router.push(
                                                    progress.baseline_assessment_link
                                                  );
                                                }
                                              } else {
                                                // Try to fetch/generate the link
                                                if (progress) {
                                                  await fetchOrGenerateAssessmentLink(
                                                    progress
                                                  );
                                                  // Wait a bit then refresh
                                                  setTimeout(async () => {
                                                    const {
                                                      data: updatedData,
                                                    } = await supabase
                                                      .from(
                                                        "mentor_application_progress"
                                                      )
                                                      .select("*")
                                                      .eq("user_id", userId)
                                                      .maybeSingle();
                                                    if (updatedData) {
                                                      setProgress(updatedData);
                                                      if (
                                                        updatedData.baseline_assessment_link
                                                      ) {
                                                        const linkMatch =
                                                          updatedData.baseline_assessment_link.match(
                                                            /\/baseline-assessment\/(\d+)\/take/
                                                          );
                                                        if (
                                                          linkMatch &&
                                                          linkMatch[1]
                                                        ) {
                                                          router.push(
                                                            `/dashboard/tutor/baseline-assessment/${linkMatch[1]}/take`
                                                          );
                                                        } else {
                                                          router.push(
                                                            updatedData.baseline_assessment_link
                                                          );
                                                        }
                                                      }
                                                    }
                                                  }, 1000);
                                                }
                                              }
                                            }}
                                            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 active:scale-95 text-white px-6 py-4 rounded-lg text-base font-bold shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer border-2 border-blue-700"
                                            style={{
                                              pointerEvents: "auto",
                                              zIndex: 9999,
                                              position: "relative",
                                              display: "flex",
                                              minHeight: "48px",
                                            }}
                                          >
                                            <GraduationCap className="w-6 h-6" />
                                            <span>
                                              {progress.baseline_assessment_link
                                                ? "Start Baseline Assessment"
                                                : "Get Assessment Link"}
                                            </span>
                                          </button>

                                          {progress.baseline_assessment_link ? (
                                            <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                                              <div className="text-[10px] text-gray-500 mb-1 font-semibold">
                                                Assessment Link:
                                              </div>
                                              <button
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  const linkMatch =
                                                    progress.baseline_assessment_link?.match(
                                                      /\/baseline-assessment\/(\d+)\/take/
                                                    );
                                                  if (
                                                    linkMatch &&
                                                    linkMatch[1]
                                                  ) {
                                                    router.push(
                                                      `/dashboard/tutor/baseline-assessment/${linkMatch[1]}/take`
                                                    );
                                                  } else if (
                                                    progress.baseline_assessment_link
                                                  ) {
                                                    router.push(
                                                      progress.baseline_assessment_link
                                                    );
                                                  }
                                                }}
                                                className="text-xs text-blue-600 hover:underline break-all cursor-pointer relative z-50 text-left"
                                                style={{
                                                  pointerEvents: "auto",
                                                  zIndex: 50,
                                                }}
                                              >
                                                {
                                                  progress.baseline_assessment_link
                                                }
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                              <span className="block text-yellow-800 font-semibold text-xs">
                                                ⚠️ Link will be generated when
                                                you click the button above
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  {progress.current_step === "profile_review" &&
                                    progress.baseline_assessment_completed && (
                                      <>
                                        Record a self video of yourself tutoring
                                        on a topic in your profession. Upload
                                        the video for review. This helps us
                                        assess your teaching style and
                                        expertise.
                                        {(progress.profile_video_uploaded ||
                                          progress.profile_reviewed) && (
                                          <span className="block mt-1 text-green-700 font-semibold">
                                            ✓ Video uploaded - Under review
                                          </span>
                                        )}
                                      </>
                                    )}
                                  {/* Also show "Under review" when on onboarding step but profile video was uploaded */}
                                  {progress.current_step === "onboarding" &&
                                    progress.baseline_assessment_completed &&
                                    (progress.profile_video_uploaded ||
                                      progress.profile_reviewed) && (
                                      <>
                                        Your profile video has been submitted
                                        and is under review.
                                        <span className="block mt-1 text-green-700 font-semibold">
                                          ✓ Under Review
                                        </span>
                                      </>
                                    )}
                                  {(progress.current_step === "onboarding" ||
                                    (progress.current_step ===
                                      "profile_review" &&
                                      progress.baseline_assessment_completed &&
                                      passedInterview === true &&
                                      (progress.profile_video_uploaded ||
                                        progress.profile_reviewed ||
                                        (videoSubmissionsCountRef.current ||
                                          videoSubmissionsCount) >=
                                          (totalQuestionsCountRef.current ||
                                            totalQuestionsCount)))) &&
                                    progress.baseline_assessment_completed &&
                                    passedInterview === true && (
                                      <>
                                        <div className="mb-4">
                                          <p className="text-sm text-gray-700 mb-3">
                                            {progress.current_step ===
                                            "onboarding"
                                              ? "Complete your onboarding to start tutoring and earning! You're almost there!"
                                              : "Watch this onboarding video to prepare for the next step:"}
                                          </p>
                                          {(() => {
                                            console.log(
                                              "📊 Onboarding section render:",
                                              {
                                                current_step:
                                                  progress.current_step,
                                                onboarding_completed:
                                                  progress.onboarding_completed,
                                                onboardingVideoUrl:
                                                  !!onboardingVideoUrl,
                                                baseline_assessment_completed:
                                                  progress.baseline_assessment_completed,
                                              }
                                            );
                                            return null;
                                          })()}
                                          {onboardingVideoUrl ? (
                                            <>
                                              <div className="mt-4 rounded-lg overflow-hidden shadow-lg">
                                                <video
                                                  controls
                                                  className="w-full max-w-2xl mx-auto"
                                                  style={{
                                                    maxHeight: "500px",
                                                    backgroundColor: "#000",
                                                  }}
                                                  preload="metadata"
                                                  id="onboarding-video"
                                                >
                                                  <source
                                                    src={onboardingVideoUrl}
                                                    type="video/mp4"
                                                  />
                                                  <source
                                                    src={onboardingVideoUrl}
                                                    type="video/webm"
                                                  />
                                                  Your browser does not support
                                                  the video tag.
                                                </video>
                                              </div>
                                            </>
                                          ) : (
                                            <div className="mt-4 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
                                              Loading onboarding video... (Check
                                              browser console for details)
                                            </div>
                                          )}
                                          {/* Show button when on onboarding step - always show if not completed, or show completion message if completed */}
                                          {progress.current_step ===
                                            "onboarding" && (
                                            <>
                                              {progress.onboarding_completed ? (
                                                <div className="mt-4 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                                                  <div className="flex items-center justify-center gap-2 text-green-700 font-bold">
                                                    <CheckCircle className="w-5 h-5" />
                                                    <span>
                                                      Onboarding Completed!
                                                    </span>
                                                  </div>
                                                  <div className="mt-2 flex justify-center">
                                                    <button
                                                      onClick={async () => {
                                                        try {
                                                          const authUserId =
                                                            await getAuthUserId();
                                                          if (!authUserId) {
                                                            console.error(
                                                              "No user ID found"
                                                            );
                                                            return;
                                                          }

                                                          // Update mentors table: set is_complete = true, is_verified = false
                                                          const {
                                                            error: mentorUpdateError,
                                                          } = await supabase
                                                            .from("mentors")
                                                            .update({
                                                              is_complete: true,
                                                              is_verified: false,
                                                            })
                                                            .eq("user_id", authUserId);

                                                          if (mentorUpdateError) {
                                                            console.error(
                                                              "Error updating mentor:",
                                                              mentorUpdateError
                                                            );
                                                            alert(
                                                              "Failed to update mentor status. Please try again."
                                                            );
                                                            return;
                                                          }

                                                          console.log(
                                                            "✅ Mentor marked as complete (is_verified = false)"
                                                          );

                                                          // Update local state
                                                          setIsComplete(true);

                                                          // Close popup and redirect to dashboard
                                                          if (onClose) {
                                                            onClose();
                                                          }
                                                          router.push("/dashboard");
                                                        } catch (error) {
                                                          console.error(
                                                            "Error updating mentor:",
                                                            error
                                                          );
                                                          alert(
                                                            "An error occurred. Please try again."
                                                          );
                                                        }
                                                      }}
                                                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                                    >
                                                      Go to Dashboard
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="mt-4 flex justify-center">
                                                  <button
                                                    onClick={async () => {
                                                      try {
                                                        const authUserId =
                                                          await getAuthUserId();
                                                        if (!authUserId) {
                                                          console.error(
                                                            "No user ID found"
                                                          );
                                                          return;
                                                        }

                                                        // Update onboarding_completed in Supabase
                                                        const {
                                                          error: updateError,
                                                        } = await supabase
                                                          .from(
                                                            "mentor_application_progress"
                                                          )
                                                          .update({
                                                            onboarding_completed:
                                                              true,
                                                            onboarding_completed_at:
                                                              new Date().toISOString(),
                                                            current_step:
                                                              "onboarding",
                                                            status: "completed",
                                                          })
                                                          .eq(
                                                            "user_id",
                                                            authUserId
                                                          );

                                                        if (updateError) {
                                                          console.error(
                                                            "Error updating onboarding:",
                                                            updateError
                                                          );
                                                          alert(
                                                            "Failed to mark onboarding as complete. Please try again."
                                                          );
                                                          return;
                                                        }

                                                        console.log(
                                                          "✅ Onboarding marked as complete"
                                                        );

                                                        // Update local state immediately for instant UI feedback
                                                        if (progress) {
                                                          setProgress({
                                                            ...progress,
                                                            onboarding_completed:
                                                              true,
                                                            onboarding_completed_at:
                                                              new Date().toISOString(),
                                                            current_step:
                                                              "onboarding",
                                                            status: "completed",
                                                          });
                                                        }

                                                        // Update mentors table: set is_complete = true, is_verified = false
                                                        const {
                                                          error: mentorUpdateError,
                                                        } = await supabase
                                                          .from("mentors")
                                                          .update({
                                                            is_complete: true,
                                                            is_verified: false,
                                                          })
                                                          .eq("user_id", authUserId);

                                                        if (mentorUpdateError) {
                                                          console.error(
                                                            "Error updating mentor:",
                                                            mentorUpdateError
                                                          );
                                                          alert(
                                                            "Failed to update mentor status. Please try again."
                                                          );
                                                          return;
                                                        }

                                                        console.log(
                                                          "✅ Mentor marked as complete (is_verified = false)"
                                                        );

                                                        // Update local state
                                                        setIsComplete(true);

                                                        // Refresh progress to ensure consistency
                                                        await fetchProgress();
                                                        await fetchMentorData();

                                                        // Close popup and redirect to dashboard
                                                        if (onClose) {
                                                          onClose();
                                                        }
                                                        router.push("/dashboard");
                                                      } catch (error) {
                                                        console.error(
                                                          "Error completing onboarding:",
                                                          error
                                                        );
                                                        alert(
                                                          "An error occurred. Please try again."
                                                        );
                                                      }
                                                    }}
                                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                                                  >
                                                    <CheckCircle className="w-5 h-5" />
                                                    Mark as Complete
                                                  </button>
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  {progress.current_step ===
                                    "application_submitted" &&
                                    progress.baseline_assessment_completed && (
                                      <>
                                        Check your email for the baseline
                                        assessment link. Complete it to proceed
                                        to the next step.
                                      </>
                                    )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal - Outside AnimatePresence to avoid key conflicts */}
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </>
  );
}
