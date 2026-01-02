"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  GraduationCap,
  AlertCircle,
  Shield,
  Lock,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface Question {
  id: number;
  question_text: string;
  question_type: string;
  options: string[];
  correct_answer: string;
  points: number;
  explanation: string | null;
  order: number;
}

interface Assessment {
  id: number;
  title: string;
  description: string;
  passing_score: number;
  time_limit_minutes: number;
  total_points: number;
  questions: Question[];
}

export default function TutorBaselineAssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id as string;

  const [userData, setUserData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [assessment, setAssessment] = React.useState<Assessment | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = React.useState<number | null>(null); // in seconds
  const [testStarted, setTestStarted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [showResults, setShowResults] = React.useState(false);
  const [testResults, setTestResults] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = React.useState(true);
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [tabSwitchCount, setTabSwitchCount] = React.useState(0);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [progressData, setProgressData] = React.useState<any>(null);
  const [alreadyCompleted, setAlreadyCompleted] = React.useState(false);

  // Prevent text selection and copying
  React.useEffect(() => {
    if (testStarted && !showResults) {
      // Disable text selection
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";
      document.body.style.mozUserSelect = "none";
      document.body.style.msUserSelect = "none";

      // Disable right-click context menu
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        return false;
      };

      // Disable copy, cut, paste shortcuts
      const handleKeyDown = (e: KeyboardEvent) => {
        if (
          (e.ctrlKey || e.metaKey) &&
          (e.key === "c" || e.key === "C" || e.key === "x" || e.key === "X" || e.key === "v" || e.key === "V")
        ) {
          e.preventDefault();
          return false;
        }
        // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (
          e.key === "F12" ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "J")) ||
          ((e.ctrlKey || e.metaKey) && e.key === "U")
        ) {
          e.preventDefault();
          return false;
        }
      };

      // Disable drag
      const handleDragStart = (e: DragEvent) => {
        e.preventDefault();
        return false;
      };

      document.addEventListener("contextmenu", handleContextMenu);
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("dragstart", handleDragStart);

      return () => {
        document.body.style.userSelect = "";
        document.body.style.webkitUserSelect = "";
        document.body.style.mozUserSelect = "";
        document.body.style.msUserSelect = "";
        document.removeEventListener("contextmenu", handleContextMenu);
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("dragstart", handleDragStart);
      };
    }
  }, [testStarted, showResults]);

  // Fullscreen mode
  React.useEffect(() => {
    if (testStarted && !showResults) {
      const enterFullscreen = async () => {
        try {
          const element = document.documentElement;
          if (element.requestFullscreen) {
            await element.requestFullscreen();
            setIsFullscreen(true);
          } else if ((element as any).webkitRequestFullscreen) {
            await (element as any).webkitRequestFullscreen();
            setIsFullscreen(true);
          } else if ((element as any).mozRequestFullScreen) {
            await (element as any).mozRequestFullScreen();
            setIsFullscreen(true);
          } else if ((element as any).msRequestFullscreen) {
            await (element as any).msRequestFullscreen();
            setIsFullscreen(true);
          }
        } catch (error) {
          console.error("Error entering fullscreen:", error);
        }
      };

      enterFullscreen();

      // Monitor fullscreen changes
      const handleFullscreenChange = () => {
        const isCurrentlyFullscreen =
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement;

        if (!isCurrentlyFullscreen && testStarted && !showResults) {
          setWarnings((prev) => [
            ...prev,
            `Warning ${tabSwitchCount + 1}: You left fullscreen mode. Please return to fullscreen immediately.`,
          ]);
          setTabSwitchCount((prev) => prev + 1);
          
          // Auto-submit after 3 warnings
          if (tabSwitchCount >= 2) {
            handleSubmit(true, "Multiple fullscreen violations detected");
          }
        }
        setIsFullscreen(!!isCurrentlyFullscreen);
      };

      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.addEventListener("mozfullscreenchange", handleFullscreenChange);
      document.addEventListener("msfullscreenchange", handleFullscreenChange);

      // Monitor visibility changes (tab switching)
      const handleVisibilityChange = () => {
        if (document.hidden && testStarted && !showResults) {
          setWarnings((prev) => [
            ...prev,
            `Warning ${tabSwitchCount + 1}: Tab switch detected. Please return to the assessment tab immediately.`,
          ]);
          setTabSwitchCount((prev) => prev + 1);
          
          // Auto-submit after 3 tab switches
          if (tabSwitchCount >= 2) {
            handleSubmit(true, "Multiple tab switch violations detected");
          }
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
        document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
        document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
        document.removeEventListener("msfullscreenchange", handleFullscreenChange);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
  }, [testStarted, showResults, tabSwitchCount]);

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
        setUserData(user);
      } catch (error) {
        console.error("Error fetching user data:", error);
        router.push("/dashboard");
      }
    };

    fetchUserData();
  }, [router]);

  React.useEffect(() => {
    if (assessmentId && userData) {
      checkProgressAndFetchAssessment();
    }
  }, [assessmentId, userData]);

  const checkProgressAndFetchAssessment = async () => {
    // First check if assessment is already completed
    if (userData?.id) {
      try {
        const { data: progress } = await supabase
          .from("mentor_application_progress")
          .select("*")
          .eq("user_id", userData.id)
          .maybeSingle();

        if (progress?.baseline_assessment_completed) {
          setAlreadyCompleted(true);
          setProgressData(progress);
          // Show results immediately
          setShowResults(true);
          setTestResults({
            score: progress.baseline_assessment_score || 0,
            total: 100,
            percentage: progress.baseline_assessment_score || 0,
            passed: progress.baseline_assessment_passed || false,
            answers: {},
            reason: "Previously completed",
          });
        }
      } catch (err) {
        console.error("Error checking progress:", err);
      }
    }
    
    // Fetch assessment details
    await fetchAssessment();
  };

  // Timer effect
  React.useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && testStarted && !showResults) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);

      if (timeRemaining === 0) {
        handleSubmit(true);
      }

      return () => clearTimeout(timer);
    }
  }, [timeRemaining, testStarted, showResults]);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `${API_BASE_URL}/baseline-assessments/${assessmentId}/`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch assessment");
      }

      const data = await response.json();
      if (data.success && data.assessment) {
        setAssessment(data.assessment);
        // Sort questions by order
        if (data.assessment.questions) {
          data.assessment.questions.sort((a: Question, b: Question) => a.order - b.order);
        }
      } else {
        throw new Error(data.error || "Assessment not found");
      }
    } catch (err: any) {
      console.error("Error fetching assessment:", err);
      setError(err.message || "Failed to load assessment");
    } finally {
      setLoading(false);
    }
  };

  const startAssessment = () => {
    if (!assessment || !termsAccepted) return;
    setShowTermsModal(false);
    setTestStarted(true);
    if (assessment.time_limit_minutes) {
      setTimeRemaining(assessment.time_limit_minutes * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async (autoSubmit = false, reason?: string) => {
    if (!assessment || !userData || submitting) return;

    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/baseline-assessments/${assessmentId}/submit/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userData.id,
            answers: answers,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit assessment");
      }

      const data = await response.json();
      if (data.success) {
        setTestResults({
          score: data.score,
          total: data.total,
          percentage: data.percentage,
          passed: data.passed,
          answers: data.answers,
          reason: reason || (autoSubmit ? "Time expired" : "Submitted"),
        });
        setShowResults(true);
        setTimeRemaining(null);
        setTestStarted(false);

        // Exit fullscreen safely
        try {
          const isFullscreen =
            document.fullscreenElement ||
            (document as any).webkitFullscreenElement ||
            (document as any).mozFullScreenElement ||
            (document as any).msFullscreenElement;

          if (isFullscreen) {
            if (document.exitFullscreen) {
              await document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
              await (document as any).webkitExitFullscreen();
            } else if ((document as any).mozCancelFullScreen) {
              await (document as any).mozCancelFullScreen();
            } else if ((document as any).msExitFullscreen) {
              await (document as any).msExitFullscreen();
            }
          }
        } catch (err) {
          // Silently handle fullscreen exit errors - it's okay if we can't exit fullscreen
          console.log("Could not exit fullscreen (this is okay):", err);
        }

        // Redirect to dashboard after 5 seconds if passed
        if (data.passed) {
          setTimeout(() => {
            router.push("/dashboard");
          }, 5000);
        }
      } else {
        throw new Error(data.error || "Failed to submit assessment");
      }
    } catch (err: any) {
      console.error("Error submitting assessment:", err);
      setError(err.message || "Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  };

  const allQuestionsAnswered = () => {
    if (!assessment) return false;
    return assessment.questions.every((q) => answers[q.id.toString()]?.trim());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !assessment) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 min-h-screen flex items-center">
        <Card className="border-red-200 bg-red-50 w-full">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800 mb-4">{error}</p>
            <Button onClick={() => router.push("/dashboard")} variant="outline">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!assessment) {
    return null;
  }

  // If already completed, show message and prevent retaking
  if (alreadyCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 flex-shrink-0">
                <Image
                  src="/images/logo1.png"
                  alt="BrightByt Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <CardTitle className="text-2xl">Assessment Already Completed</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {progressData && (
              <div className="text-center p-6 bg-white rounded-lg border-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Your Score</p>
                <p
                  className={`text-5xl font-bold mb-2 ${
                    progressData.baseline_assessment_passed
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {progressData.baseline_assessment_score || 0}%
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  {progressData.baseline_assessment_passed ? (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      <span className="text-green-600 font-bold">Passed</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-red-600" />
                      <span className="text-red-600 font-bold">Failed</span>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-900 font-semibold">
                ⚠️ You have already completed this assessment. You cannot retake it.
              </p>
            </div>
            <Button
              onClick={() => router.push("/dashboard")}
              className="w-full"
              variant="outline"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Terms Modal
  if (showTermsModal) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
        <Card className="max-w-2xl w-full bg-white shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 flex-shrink-0">
                <Image
                  src="/images/logo1.png"
                  alt="BrightByt Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <Shield className="w-8 h-8" />
              <CardTitle className="text-2xl">Assessment Terms & Conditions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h3 className="font-bold text-lg mb-2">Instructions:</h3>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>You have <strong>{assessment.time_limit_minutes} minutes</strong> to complete this assessment</li>
                  <li>You must score <strong>{assessment.passing_score}% or higher</strong> to pass</li>
                  <li>The assessment will be taken in <strong>fullscreen mode</strong></li>
                  <li>You <strong>cannot switch tabs</strong> or leave fullscreen during the assessment</li>
                  <li>Text selection, copying, and right-click are <strong>disabled</strong></li>
                  <li>You will receive warnings if you attempt to leave fullscreen or switch tabs</li>
                  <li>After <strong>3 violations</strong>, your assessment will be automatically submitted</li>
                  <li>Answer all questions before submitting</li>
                  <li>Once you start, the timer will begin immediately and cannot be paused</li>
                </ul>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-semibold text-yellow-900 mb-2">⚠️ Important:</p>
                <p className="text-yellow-800 text-sm">
                  By clicking "I Accept and Start Assessment", you agree to these terms and understand that
                  any violation of the assessment rules may result in automatic submission or disqualification.
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className="mt-1"
                />
                <Label
                  htmlFor="terms"
                  className="text-sm font-medium text-blue-900 cursor-pointer flex-1"
                >
                  I have read and understood all the terms and conditions. I agree to take this assessment
                  under the specified rules and conditions.
                </Label>
              </div>
            </div>
          </CardContent>
          <CardContent className="p-6 pt-0">
            <div className="flex gap-3">
              <Button
                onClick={() => router.push("/dashboard")}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={startAssessment}
                disabled={!termsAccepted}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold"
              >
                <Lock className="w-4 h-4 mr-2" />
                I Accept and Start Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Full-screen assessment view
  if (testStarted && !showResults) {
    return (
      <div className="fixed inset-0 bg-gray-900 text-white z-[100] overflow-y-auto">
        {/* Header Bar */}
        <div className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 flex-shrink-0">
              <Image
                src="/images/logo1.png"
                alt="BrightByt Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <GraduationCap className="w-6 h-6 text-blue-400" />
            <div>
              <h1 className="text-xl font-bold">{assessment.title}</h1>
              <p className="text-sm text-gray-400">{assessment.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Timer */}
            {timeRemaining !== null && (
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-xs text-gray-400">Time Remaining</p>
                  <p
                    className={`text-2xl font-bold ${
                      timeRemaining < 300 ? "text-red-400 animate-pulse" : "text-white"
                    }`}
                  >
                    {formatTime(timeRemaining)}
                  </p>
                </div>
              </div>
            )}
            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="flex items-center gap-2 text-yellow-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-semibold">
                  {warnings.length} Warning{warnings.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
            {/* Submit Button */}
            <Button
              onClick={() => handleSubmit(false)}
              disabled={!allQuestionsAnswered() || submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Assessment"
              )}
            </Button>
          </div>
        </div>

        {/* Warnings Display */}
        {warnings.length > 0 && (
          <div className="bg-yellow-900/50 border-b border-yellow-700 px-6 py-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-yellow-400 mb-1">Warnings:</p>
                <ul className="text-sm text-yellow-300 space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {assessment.questions.map((question, index) => (
            <Card key={question.id} className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white text-lg mb-2">
                      Question {index + 1} of {assessment.questions.length}
                      <Badge variant="outline" className="ml-3 text-gray-300 border-gray-600">
                        {question.points} points
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-base mt-2">
                      {question.question_text}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {question.question_type === "multiple_choice" && (
                  <RadioGroup
                    value={answers[question.id.toString()] || ""}
                    onValueChange={(value) => {
                      setAnswers({
                        ...answers,
                        [question.id.toString()]: value,
                      });
                    }}
                    className="space-y-3"
                  >
                    {question.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className="flex items-center space-x-3 p-4 hover:bg-gray-700 rounded-lg border border-gray-600 cursor-pointer"
                      >
                        <RadioGroupItem
                          value={option}
                          id={`q${question.id}-opt${optIndex}`}
                          className="border-gray-500"
                        />
                        <Label
                          htmlFor={`q${question.id}-opt${optIndex}`}
                          className="flex-1 cursor-pointer text-gray-200 text-base"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {question.question_type === "true_false" && (
                  <RadioGroup
                    value={answers[question.id.toString()] || ""}
                    onValueChange={(value) => {
                      setAnswers({
                        ...answers,
                        [question.id.toString()]: value,
                      });
                    }}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-3 p-4 hover:bg-gray-700 rounded-lg border border-gray-600 cursor-pointer">
                      <RadioGroupItem value="True" id={`q${question.id}-true`} className="border-gray-500" />
                      <Label htmlFor={`q${question.id}-true`} className="flex-1 cursor-pointer text-gray-200 text-base">
                        True
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 hover:bg-gray-700 rounded-lg border border-gray-600 cursor-pointer">
                      <RadioGroupItem value="False" id={`q${question.id}-false`} className="border-gray-500" />
                      <Label htmlFor={`q${question.id}-false`} className="flex-1 cursor-pointer text-gray-200 text-base">
                        False
                      </Label>
                    </div>
                  </RadioGroup>
                )}

                {question.question_type === "short_answer" && (
                  <Textarea
                    value={answers[question.id.toString()] || ""}
                    onChange={(e) => {
                      setAnswers({
                        ...answers,
                        [question.id.toString()]: e.target.value,
                      });
                    }}
                    placeholder="Type your answer here..."
                    className="min-h-[150px] bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                )}
              </CardContent>
            </Card>
          ))}

          {/* Submit Section */}
          <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-6 -mx-6">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="text-sm text-gray-400">
                {allQuestionsAnswered() ? (
                  <span className="text-green-400">✓ All questions answered</span>
                ) : (
                  <span>Please answer all questions before submitting</span>
                )}
              </div>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={!allQuestionsAnswered() || submitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-8 py-6 text-lg"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Submit Assessment
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results View
  if (showResults && testResults) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card
          className={`max-w-4xl w-full border-2 shadow-lg ${
            testResults.passed
              ? "bg-gradient-to-br from-green-50 via-emerald-50 to-white border-green-200"
              : "bg-gradient-to-br from-red-50 via-rose-50 to-white border-red-200"
          }`}
        >
          <CardHeader
            className={`border-b-2 ${
              testResults.passed
                ? "bg-gradient-to-r from-green-100 to-emerald-100 border-green-200"
                : "bg-gradient-to-r from-red-100 to-rose-100 border-red-200"
            }`}
          >
            <div className="flex items-center gap-3">
              {testResults.passed ? (
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600" />
              )}
              <CardTitle
                className={`text-2xl font-bold ${
                  testResults.passed ? "text-green-900" : "text-red-900"
                }`}
              >
                {testResults.passed ? "Assessment Passed!" : "Assessment Failed"}
              </CardTitle>
            </div>
            {testResults.reason && (
              <CardDescription className="text-sm text-gray-600 mt-2">
                Reason: {testResults.reason}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="text-center p-6 bg-white rounded-lg border-2 border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Your Score</p>
              <p
                className={`text-5xl font-bold mb-2 ${
                  testResults.passed ? "text-green-600" : "text-red-600"
                }`}
              >
                {testResults.percentage.toFixed(1)}%
              </p>
              <p className="text-gray-700">
                {testResults.score} out of {testResults.total} points
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Passing Score: {assessment.passing_score}%
              </p>
            </div>

            {testResults.passed && (
              <div className="p-4 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-green-900 font-semibold">
                  🎉 Congratulations! You have passed the baseline assessment. You will be redirected to your dashboard shortly.
                </p>
              </div>
            )}

            {!testResults.passed && (
              <div className="p-4 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-red-900 font-semibold">
                  Unfortunately, you did not meet the passing score. Please review your answers and try again when ready.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Question Review</h3>
              {assessment.questions.map((question, index) => {
                const questionResult = testResults.answers[question.id.toString()];
                const isCorrect = questionResult?.correct;
                const userAnswer = answers[question.id.toString()] || "(No answer)";
                const correctAnswer = question.correct_answer;

                return (
                  <Card
                    key={question.id}
                    className={`border-2 ${
                      isCorrect
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base font-bold text-gray-900">
                          Question {index + 1}: {question.question_text}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {isCorrect ? (
                            <Badge className="bg-green-600 text-white">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Correct
                            </Badge>
                          ) : (
                            <Badge className="bg-red-600 text-white">
                              <XCircle className="w-3 h-3 mr-1" />
                              Incorrect
                            </Badge>
                          )}
                          <Badge variant="outline">{question.points} points</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">Your Answer:</p>
                        <p className="text-sm text-gray-900 bg-white p-2 rounded border">{userAnswer}</p>
                      </div>
                      {!isCorrect && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">Correct Answer:</p>
                          <p className="text-sm text-green-900 bg-green-100 p-2 rounded border border-green-300">
                            {correctAnswer}
                          </p>
                        </div>
                      )}
                      {question.explanation && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">Explanation:</p>
                          <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                            {question.explanation}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => router.push("/dashboard")}
                className="flex-1"
                variant="outline"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

