"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Video,
  Play,
  Square,
  Upload,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Pause,
  RotateCcw,
  Mic,
  Camera,
} from "lucide-react";
import Image from "next/image";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface InterviewQuestion {
  id: number;
  question_text: string;
  order: number;
}

interface VideoSubmission {
  question_id: number;
  videoBlob: Blob | null;
  videoUrl: string | null;
  isUploaded: boolean;
  duration?: number;
  retryCount?: number;
  maxRetries?: number;
}

export default function ProfileReviewPage() {
  const router = useRouter();
  const [userData, setUserData] = React.useState<any>(null);
  const [mentorData, setMentorData] = React.useState<any>(null);
  const [questions, setQuestions] = React.useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [videoSubmissions, setVideoSubmissions] = React.useState<
    VideoSubmission[]
  >([]);
  const [isRecording, setIsRecording] = React.useState(false);
  const [mediaRecorder, setMediaRecorder] =
    React.useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = React.useState<Blob[]>([]);
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = React.useState(0); // in seconds
  const [cheatingWarnings, setCheatingWarnings] = React.useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const analysisIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isPaused, setIsPaused] = React.useState(false);
  const [cameraTested, setCameraTested] = React.useState(false);
  const [micTested, setMicTested] = React.useState(false);
  const [showDeviceTest, setShowDeviceTest] = React.useState(true);
  const [deviceTestStream, setDeviceTestStream] =
    React.useState<MediaStream | null>(null);
  const pauseStartTimeRef = React.useRef<number | null>(null);
  const pausedDurationRef = React.useRef<number>(0);
  const durationIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Get authenticated user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/");
          return;
        }

        setUserData({ id: user.id, email: user.email });

        // Fetch mentor data
        const { data: mentor } = await supabase
          .from("mentors")
          .select("*")
          .or(`email.ilike.${user.email},user_id.eq.${user.id}`)
          .maybeSingle();

        if (mentor) {
          setMentorData(mentor);
        }

        // Fetch interview questions with retry logic
        let response: Response | null = null;
        const maxRetries = 3;
        const timeoutMs = 10000; // 10 second timeout

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(
              `🔄 Fetching questions (attempt ${attempt}/${maxRetries})...`
            );

            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            try {
              response = await fetch(
                `${API_BASE_URL}/interview-videos/questions/`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  signal: controller.signal,
                }
              );
              clearTimeout(timeoutId);
            } catch (fetchError: any) {
              clearTimeout(timeoutId);
              throw fetchError;
            }

            if (response.ok) {
              break; // Success, exit retry loop
            }

            // If not the last attempt, wait before retrying
            if (attempt < maxRetries) {
              console.log(`⏳ Waiting ${attempt} second(s) before retry...`);
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * attempt)
              );
            }
          } catch (fetchError: any) {
            console.error(`❌ Fetch attempt ${attempt} failed:`, fetchError);

            // Check if it's a network error or timeout
            const isNetworkError =
              fetchError.name === "AbortError" ||
              fetchError.message?.includes("Failed to fetch") ||
              fetchError.message?.includes("network");

            if (isNetworkError && attempt < maxRetries) {
              console.log(`⏳ Retrying in ${attempt} second(s)...`);
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * attempt)
              );
              continue;
            }

            // If it's the last attempt or not a network error, throw
            if (attempt === maxRetries || !isNetworkError) {
              if (isNetworkError) {
                throw new Error(
                  `Unable to connect to the server. Please ensure the Django server is running at ${API_BASE_URL}. Error: ${
                    fetchError.message || "Network error"
                  }`
                );
              }
              throw fetchError;
            }
          }
        }

        if (!response || !response.ok) {
          const errorText = response
            ? await response.text()
            : "No response received";
          console.error("Failed to fetch questions:", errorText);

          let errorMessage = `Failed to fetch questions: ${
            response?.status || "Network Error"
          } ${response?.statusText || ""}`;

          if (!response) {
            errorMessage = `Unable to connect to the API server at ${API_BASE_URL}. Please ensure the Django server is running.`;
          } else if (response.status === 404) {
            errorMessage =
              "Questions endpoint not found. Please check the API configuration.";
          } else if (response.status >= 500) {
            errorMessage =
              "Server error. Please try again later or contact support.";
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log("✅ Questions API response:", data);

        if (data.success && data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          // Initialize video submissions array
          setVideoSubmissions(
            data.questions.map((q: InterviewQuestion) => ({
              question_id: q.id,
              videoBlob: null,
              videoUrl: null,
              isUploaded: false,
              retryCount: 0,
              maxRetries: 5,
            }))
          );
        } else {
          throw new Error("No questions found. Please contact support.");
        }

        // Fetch existing submissions
        if (user.id) {
          const submissionsResponse = await fetch(
            `${API_BASE_URL}/interview-videos/submissions/${user.id}/`
          );
          if (submissionsResponse.ok) {
            const submissionsData = await submissionsResponse.json();
            if (submissionsData.success && submissionsData.submissions) {
              // Update videoSubmissions with existing videos
              setVideoSubmissions((prev) =>
                prev.map((sub) => {
                  const existing = submissionsData.submissions.find(
                    (s: any) => s.question.id === sub.question_id
                  );
                  if (existing) {
                    return {
                      ...sub,
                      videoUrl: existing.video_url,
                      isUploaded: true,
                    };
                  }
                  return sub;
                })
              );
            }
          }
        }
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message || "Failed to load interview questions");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Real-time frame analysis for cheating detection
  // Track detection history for accuracy
  const detectionHistoryRef = React.useRef<{
    multiplePeople: number[];
    noFace: number[];
    phone: number[];
  }>({
    multiplePeople: [],
    noFace: [],
    phone: [],
  });

  const analyzeFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !isRecording) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;

      // Set canvas dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob (JPEG format) and send to backend for real-time analysis
      canvas.toBlob(
        async (blob) => {
          if (!blob) return;

          try {
            // Convert blob to base64 for API call
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64data = reader.result as string;

              try {
                // Send frame to backend for real-time analysis
                const response = await fetch(
                  `${API_BASE_URL}/interview-videos/analyze-frame/`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      frame: base64data,
                    }),
                  }
                );

                if (response.ok) {
                  const data = await response.json();
                  console.log("🔍 [Real-time Analysis] Response:", data);

                  if (data.success && data.analysis) {
                    const analysis = data.analysis;
                    console.log(
                      "🔍 [Real-time Analysis] Analysis data:",
                      analysis
                    );
                    const warnings: string[] = [];
                    const timestamp = Date.now();

                    // Track detections
                    if (analysis.multiple_people) {
                      detectionHistoryRef.current.multiplePeople.push(
                        timestamp
                      );
                      if (
                        detectionHistoryRef.current.multiplePeople.length >= 3
                      ) {
                        warnings.push(
                          `Multiple people detected (${
                            analysis.people_count || 2
                          }). Please record alone.`
                        );
                      }
                    }

                    if (!analysis.has_face) {
                      detectionHistoryRef.current.noFace.push(timestamp);
                      if (detectionHistoryRef.current.noFace.length >= 3) {
                        warnings.push(
                          "Face not clearly visible. Please ensure your face is visible."
                        );
                      }
                    }

                    if (analysis.phone_detected) {
                      detectionHistoryRef.current.phone.push(timestamp);
                      if (detectionHistoryRef.current.phone.length >= 3) {
                        warnings.push(
                          "Phone detected. Please put your phone away."
                        );
                      }
                    }

                    // Clean old detection history (keep last 10 seconds)
                    const tenSecondsAgo = timestamp - 10000;
                    detectionHistoryRef.current.noFace =
                      detectionHistoryRef.current.noFace.filter(
                        (t) => t > tenSecondsAgo
                      );
                    detectionHistoryRef.current.multiplePeople =
                      detectionHistoryRef.current.multiplePeople.filter(
                        (t) => t > tenSecondsAgo
                      );
                    detectionHistoryRef.current.phone =
                      detectionHistoryRef.current.phone.filter(
                        (t) => t > tenSecondsAgo
                      );

                    // Update warnings
                    if (warnings.length > 0) {
                      setCheatingWarnings((prev) => {
                        const newWarnings = [
                          ...new Set([...prev, ...warnings]),
                        ];
                        return newWarnings.slice(-5); // Keep last 5 warnings
                      });

                      // If cheating is detected persistently, show error
                      if (
                        analysis.cheating_detected &&
                        (detectionHistoryRef.current.multiplePeople.length >=
                          5 ||
                          detectionHistoryRef.current.phone.length >= 5)
                      ) {
                        setError(
                          "Cheating detected! Please fix the issues before continuing."
                        );
                      }
                    } else {
                      // Clear warnings if no issues detected
                      setCheatingWarnings([]);
                      if (!analysis.cheating_detected) {
                        setError(null);
                      }
                    }
                  } else {
                    console.warn(
                      "⚠️ [Real-time Analysis] No analysis data in response:",
                      data
                    );
                  }
                } else {
                  console.error(
                    "❌ [Real-time Analysis] API error:",
                    response.status,
                    response.statusText
                  );
                  const errorText = await response.text();
                  console.error("Error details:", errorText);
                }
              } catch (err) {
                console.error(
                  "❌ [Real-time Analysis] Error calling analysis API:",
                  err
                );
                // Don't block recording if analysis fails
              }
            };
            reader.readAsDataURL(blob);
          } catch (err) {
            console.error("Error processing frame:", err);
          }
        },
        "image/jpeg",
        0.8
      );
    } catch (err) {
      console.error("Error analyzing frame:", err);
    }
  };

  // Test camera and microphone
  const testDevices = async () => {
    try {
      setError(null);
      const testStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      });

      // Check camera
      const videoTracks = testStream.getVideoTracks();
      const cameraWorking =
        videoTracks.length > 0 && videoTracks[0].readyState === "live";
      setCameraTested(cameraWorking);
      console.log(
        "📹 Camera test:",
        cameraWorking ? "✅ Working" : "❌ Not working"
      );

      // Check microphone
      const audioTracks = testStream.getAudioTracks();
      const micWorking =
        audioTracks.length > 0 && audioTracks[0].readyState === "live";
      setMicTested(micWorking);
      console.log(
        "🎤 Microphone test:",
        micWorking ? "✅ Working" : "❌ Not working"
      );

      // Show preview
      setDeviceTestStream(testStream);
      if (videoRef.current) {
        videoRef.current.srcObject = testStream;
      }

      if (!cameraWorking || !micWorking) {
        setError(
          "Camera or microphone is not working. Please check your device settings."
        );
      }
    } catch (err: any) {
      console.error("Error testing devices:", err);
      setError("Failed to access camera/microphone. Please check permissions.");
      setCameraTested(false);
      setMicTested(false);
    }
  };

  const startRecording = async () => {
    try {
      setCheatingWarnings([]);
      setRecordingDuration(0);
      setError(null);
      setIsPaused(false);
      pausedDurationRef.current = 0;
      pauseStartTimeRef.current = null;

      // Stop device test stream if running
      if (deviceTestStream) {
        deviceTestStream.getTracks().forEach((track) => track.stop());
        setDeviceTestStream(null);
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(mediaStream, {
        mimeType: "video/webm;codecs=vp8,opus",
      });

      const startTime = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        // Calculate actual recording duration (excluding paused time)
        const actualDuration =
          (Date.now() - startTime - pausedDurationRef.current) / 1000;

        setVideoSubmissions((prev) =>
          prev.map((sub, idx) =>
            idx === currentQuestionIndex
              ? {
                  ...sub,
                  videoBlob: blob,
                  videoUrl: url,
                  duration: actualDuration,
                }
              : sub
          )
        );
        setRecordedChunks([]);
        setRecordingDuration(0);
        pausedDurationRef.current = 0;

        // Stop analysis interval
        if (analysisIntervalRef.current) {
          clearInterval(analysisIntervalRef.current);
          analysisIntervalRef.current = null;
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordedChunks(chunks);
      setShowDeviceTest(false);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        if (!isPaused) {
          setRecordingDuration((prev) => {
            const newDuration = prev + 1;
            // Show warning but allow recording
            if (newDuration < 60) {
              setError(
                `Please record for at least 1 minute. Current: ${Math.floor(
                  newDuration
                )}s / 60s`
              );
            } else {
              setError(null);
            }
            return newDuration;
          });
        }
      }, 1000);

      // Start frame analysis (every 2 seconds)
      analysisIntervalRef.current = setInterval(() => {
        if (!isPaused) {
          analyzeFrame();
        }
      }, 2000);
    } catch (err: any) {
      console.error("Error starting recording:", err);
      setError("Failed to access camera/microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      // Resume if paused before stopping
      if (isPaused) {
        resumeRecording();
      }

      // Check minimum duration but allow stopping (will show error on upload)
      mediaRecorder.stop();
      setIsRecording(false);
      setIsPaused(false);

      // Clear duration interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    // Stop analysis interval
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder && isRecording && !isPaused) {
      mediaRecorder.pause();
      setIsPaused(true);
      pauseStartTimeRef.current = Date.now();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder && isRecording && isPaused) {
      mediaRecorder.resume();
      setIsPaused(false);
      if (pauseStartTimeRef.current) {
        pausedDurationRef.current += Date.now() - pauseStartTimeRef.current;
        pauseStartTimeRef.current = null;
      }
    }
  };

  const retryRecording = () => {
    const currentSubmission = videoSubmissions[currentQuestionIndex];
    const retryCount = currentSubmission.retryCount || 0;
    const maxRetries = currentSubmission.maxRetries || 5;

    if (retryCount >= maxRetries) {
      setError(
        `Maximum retry attempts (${maxRetries}) reached for this question.`
      );
      return;
    }

    // Stop current recording if active
    if (isRecording) {
      stopRecording();
    }

    // Increment retry count
    setVideoSubmissions((prev) =>
      prev.map((sub, idx) =>
        idx === currentQuestionIndex
          ? {
              ...sub,
              retryCount: (sub.retryCount || 0) + 1,
              videoBlob: null,
              videoUrl: null,
              isUploaded: false,
            }
          : sub
      )
    );

    // Reset states
    setRecordingDuration(0);
    setError(null);
    setCheatingWarnings([]);
    pausedDurationRef.current = 0;
    pauseStartTimeRef.current = null;

    // Start new recording
    setTimeout(() => {
      startRecording();
    }, 500);
  };

  const uploadVideo = async (
    questionId: number,
    videoBlob: Blob,
    duration: number
  ) => {
    if (!userData?.id) {
      throw new Error("User not authenticated");
    }

    // Show warning for short videos but allow upload
    if (duration < 60) {
      console.warn(
        `Video duration is ${Math.floor(
          duration
        )} seconds. Recommended: at least 1 minute.`
      );
    }

    setUploading(true);
    setIsAnalyzing(true);
    try {
      // Upload video to Supabase Storage
      const timestamp = Date.now();
      const sanitizedUserId = userData.id.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `${sanitizedUserId}_question_${questionId}_${timestamp}.webm`;
      const filePath = `interview-videos/${sanitizedUserId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("course-media")
        .upload(filePath, videoBlob, {
          cacheControl: "3600",
          upsert: false,
          contentType: "video/webm",
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("course-media").getPublicUrl(filePath);

      // Submit video to API (with analysis and transcription)
      const requestPayload = {
        user_id: userData.id,
        question_id: questionId,
        video_url: publicUrl,
        video_file_path: filePath,
        mentor_id: mentorData?.id || null,
        video_duration: duration,
      };

      console.log(
        "🚀 [Frontend] Submitting video to API:",
        `${API_BASE_URL}/interview-videos/submit/`
      );
      console.log("📦 [Frontend] Request payload:", requestPayload);
      console.log("📹 [Frontend] Video URL:", publicUrl);
      console.log("⏱️ [Frontend] Video duration:", duration, "seconds");

      const response = await fetch(`${API_BASE_URL}/interview-videos/submit/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      console.log(
        "📡 [Frontend] API Response status:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get("content-type");

        try {
          if (contentType && contentType.includes("application/json")) {
            errorData = await response.json();
          } else {
            // If response is HTML (error page), get text instead
            const errorText = await response.text();
            console.error(
              "❌ [Frontend] Server returned HTML error page:",
              errorText.substring(0, 500)
            );
            throw new Error(
              `Server error (${response.status}): Please check Django server logs for details.`
            );
          }
        } catch (parseError: any) {
          if (parseError.message.includes("Server error")) {
            throw parseError;
          }
          throw new Error(
            `Failed to parse error response: ${parseError.message}`
          );
        }

        console.error("❌ [Frontend] API Error:", errorData);

        // Check if cheating was detected
        if (errorData.cheating_detected) {
          const warnings = errorData.warnings || [];
          throw new Error(
            `Cheating detected: ${warnings.join(
              ". "
            )}. Please record again following the guidelines.`
          );
        }

        throw new Error(
          errorData.error ||
            `Failed to submit video: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("✅ [Frontend] API Response data:", data);

      if (data.success) {
        // Log analysis results for debugging
        if (data.analysis) {
          console.log("=".repeat(80));
          console.log("📊 [Frontend] Video Analysis Results:");
          console.log("   Cheating Detected:", data.analysis.cheating_detected);
          console.log(
            "   Cheating Percentage:",
            data.analysis.cheating_percentage,
            "%"
          );
          console.log("   Phone Detections:", data.analysis.phone_detections);
          console.log(
            "   Reading Detections:",
            data.analysis.reading_detections
          );
          console.log(
            "   Multiple People:",
            data.analysis.multiple_people_detections
          );
          console.log(
            "   Total Frames Analyzed:",
            data.analysis.total_frames_analyzed
          );
          console.log("   Warnings:", data.analysis.warnings);
          console.log("   Full Analysis:", data.analysis);
          console.log("=".repeat(80));
        } else {
          console.warn("⚠️ [Frontend] No analysis data in response!");
        }

        // Update submission status
        setVideoSubmissions((prev) =>
          prev.map((sub) =>
            sub.question_id === questionId
              ? { ...sub, videoUrl: publicUrl, isUploaded: true }
              : sub
          )
        );
        setCheatingWarnings([]);
        setError(null); // Clear any errors
        console.log("✅ [Frontend] Video uploaded successfully!");
        return true;
      }

      throw new Error("Failed to submit video");
    } catch (err: any) {
      console.error("Error uploading video:", err);
      throw err;
    } finally {
      setUploading(false);
      setIsAnalyzing(false);
    }
  };

  const handleUpload = async () => {
    const currentSubmission = videoSubmissions[currentQuestionIndex];
    if (!currentSubmission.videoBlob) {
      setError("Please record a video first");
      return;
    }

    // Get duration from submission or calculate from blob
    const duration = (currentSubmission as any).duration || recordingDuration;

    // Show warning but allow upload
    if (duration < 60) {
      console.warn(
        `Video is only ${Math.floor(
          duration
        )} seconds. Recommended: at least 1 minute.`
      );
    }

    try {
      setError(null); // Clear any previous errors
      await uploadVideo(
        currentSubmission.question_id,
        currentSubmission.videoBlob,
        duration
      );
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload video");
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setError(null);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setError(null);
    }
  };

  const handleComplete = async () => {
    // Check if all videos are uploaded
    const allUploaded = videoSubmissions.every((sub) => sub.isUploaded);
    if (!allUploaded) {
      setError("Please upload videos for all questions before completing");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/interview-videos/complete/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userData?.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to complete interview");
      }

      const data = await response.json();
      console.log("✅ Complete Interview Response:", data);
      if (data.success) {
        // Wait a moment for backend to update, then refresh and redirect
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Trigger a page refresh to update the status popup
        console.log("🔄 Redirecting to dashboard...");
        window.location.href = "/dashboard";
      } else {
        console.error("❌ Complete Interview failed:", data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete interview");
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentSubmission = videoSubmissions[currentQuestionIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading interview questions...</p>
        </div>
      </div>
    );
  }

  if (error && !questions.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 border-2 border-blue-600">
                <Image
                  src="/images/logo1.png"
                  alt="BrightByt Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <CardTitle>Error Loading Questions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">{error}</p>
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 border-2 border-blue-600">
              <Image
                src="/images/logo1.png"
                alt="BrightByt Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Profile Review Interview
            </h1>
          </div>
          <p className="text-gray-600">
            Record video answers for {questions.length} interview questions
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm text-gray-500">
              {videoSubmissions.filter((s) => s.isUploaded).length} /{" "}
              {questions.length} uploaded
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${
                  ((currentQuestionIndex + 1) / questions.length) * 100
                }%`,
              }}
            />
          </div>
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-600" />
              Question {currentQuestion?.order || currentQuestionIndex + 1}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-gray-800 mb-6">
              {currentQuestion?.question_text}
            </p>

            {/* Video Preview/Recording */}
            <div className="mb-6">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                {currentSubmission.videoUrl ? (
                  <video
                    src={currentSubmission.videoUrl}
                    controls
                    className="w-full h-full"
                  />
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    {/* Recording Duration Overlay */}
                    {isRecording && (
                      <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isPaused
                              ? "bg-yellow-500 animate-pulse"
                              : recordingDuration >= 60
                              ? "bg-green-500"
                              : "bg-red-500 animate-pulse"
                          }`}
                        />
                        <span className="text-sm font-mono">
                          {isPaused && "⏸ "}
                          {Math.floor(recordingDuration / 60)}:
                          {(recordingDuration % 60).toString().padStart(2, "0")}{" "}
                          / 1:00
                        </span>
                      </div>
                    )}
                  </>
                )}
                {!isRecording && !currentSubmission.videoUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
                    <div className="text-center">
                      <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Camera preview will appear here</p>
                      <p className="text-xs mt-2 text-gray-400">
                        Minimum recording time: 1 minute
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Cheating Warnings */}
              {cheatingWarnings.length > 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">
                    ⚠️ Warning:
                  </p>
                  {cheatingWarnings.map((warning, idx) => (
                    <p key={idx} className="text-xs text-yellow-700">
                      {warning}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Device Test Section */}
            {showDeviceTest && !isRecording && !currentSubmission.videoUrl && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">
                  Test Your Devices Before Recording
                </h3>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <Camera
                      className={`w-4 h-4 ${
                        cameraTested ? "text-green-600" : "text-gray-400"
                      }`}
                    />
                    <span className="text-xs">
                      Camera: {cameraTested ? "✅ Working" : "❌ Not tested"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mic
                      className={`w-4 h-4 ${
                        micTested ? "text-green-600" : "text-gray-400"
                      }`}
                    />
                    <span className="text-xs">
                      Microphone: {micTested ? "✅ Working" : "❌ Not tested"}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={testDevices}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Camera className="w-3.5 h-3.5 mr-2" />
                  Test Camera & Microphone
                </Button>
                {cameraTested && micTested && (
                  <p className="text-xs text-green-700 mt-2 text-center">
                    ✅ Devices are working! You can start recording.
                  </p>
                )}
              </div>
            )}

            {/* Retry Counter */}
            {currentSubmission.retryCount !== undefined &&
              currentSubmission.retryCount > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-yellow-800">
                      Retry Attempt: {currentSubmission.retryCount} /{" "}
                      {currentSubmission.maxRetries || 5}
                    </span>
                    {currentSubmission.retryCount >=
                      (currentSubmission.maxRetries || 5) && (
                      <span className="text-xs text-red-600 font-bold">
                        Maximum retries reached
                      </span>
                    )}
                  </div>
                </div>
              )}

            {/* Recording Controls */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              {!isRecording && !currentSubmission.videoUrl && (
                <>
                  <Button
                    onClick={startRecording}
                    disabled={showDeviceTest && (!cameraTested || !micTested)}
                    className="flex-1 px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Start Recording
                  </Button>
                </>
              )}
              {!isRecording &&
                currentSubmission.videoUrl &&
                !currentSubmission.isUploaded && (
                  <>
                    <Button
                      onClick={retryRecording}
                      disabled={
                        (currentSubmission.retryCount || 0) >=
                        (currentSubmission.maxRetries || 5)
                      }
                      variant="outline"
                      className="px-4 py-2 text-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Retry Recording (
                      {(currentSubmission.maxRetries || 5) -
                        (currentSubmission.retryCount || 0)}{" "}
                      left)
                    </Button>
                  </>
                )}
              {isRecording && (
                <>
                  {!isPaused ? (
                    <Button
                      onClick={pauseRecording}
                      variant="outline"
                      className="flex-1 px-4 py-2 text-sm"
                    >
                      <Pause className="w-3.5 h-3.5 mr-1.5" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      onClick={resumeRecording}
                      className="flex-1 px-4 py-2 text-sm font-medium bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-lg shadow-sm transition-all"
                    >
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                      Resume
                    </Button>
                  )}
                  <Button
                    onClick={stopRecording}
                    className="flex-1 px-4 py-2 text-sm font-medium bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-lg shadow-sm transition-all"
                  >
                    <Square className="w-3.5 h-3.5 mr-1.5" />
                    Stop Recording
                  </Button>
                </>
              )}
              {currentSubmission.videoUrl && !currentSubmission.isUploaded && (
                <>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || isAnalyzing}
                    className="flex-1 px-4 py-2 text-sm font-medium bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading || isAnalyzing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        {isAnalyzing ? "Analyzing..." : "Uploading..."}
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Upload Video
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={retryRecording}
                    disabled={
                      (currentSubmission.retryCount || 0) >=
                      (currentSubmission.maxRetries || 5)
                    }
                    variant="outline"
                    className="px-4 py-2 text-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Retry (
                    {(currentSubmission.maxRetries || 5) -
                      (currentSubmission.retryCount || 0)}{" "}
                    left)
                  </Button>
                </>
              )}
              {currentSubmission.isUploaded && (
                <div className="flex items-center gap-2 text-green-600 px-4 py-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Video Uploaded</span>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-2 justify-end">
              <Button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                variant="outline"
                className="px-3 py-1.5 text-xs font-medium border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </Button>
              {currentQuestionIndex < questions.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!currentSubmission.isUploaded}
                  className="px-4 py-1.5 text-xs font-medium bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next Question
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!currentSubmission.isUploaded || submitting}
                  className="px-4 py-1.5 text-xs font-medium bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Complete Interview"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
