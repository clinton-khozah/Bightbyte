"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  GraduationCap,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { DashboardLayout } from "@/components/dashboard/layout";

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

export default function BaselineAssessmentTakePage() {
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
        router.push("/");
      }
    };

    fetchUserData();
  }, [router]);

  React.useEffect(() => {
    if (assessmentId && userData) {
      fetchAssessment();
    }
  }, [assessmentId, userData]);

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
    if (!assessment) return;
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

  const handleSubmit = async (autoSubmit = false) => {
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
        });
        setShowResults(true);
        setTimeRemaining(null);

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
      <DashboardLayout role="mentor">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error && !assessment) {
    return (
      <DashboardLayout role="mentor">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-800 mb-4">{error}</p>
              <Button onClick={() => router.push("/dashboard")} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!assessment) {
    return null;
  }

  return (
    <DashboardLayout role="mentor">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {!testStarted ? (
          /* Pre-test View */
          <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-white border-2 border-blue-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b-2 border-blue-200">
              <div className="flex items-center gap-3 mb-2">
                <GraduationCap className="w-8 h-8 text-blue-600" />
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {assessment.title}
                </CardTitle>
              </div>
              {assessment.description && (
                <CardDescription className="text-base text-gray-700 font-medium">
                  {assessment.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {assessment.time_limit_minutes && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-gray-600 font-semibold uppercase mb-1">
                        Time Limit
                      </p>
                      <p className="text-xl font-bold text-blue-700">
                        {assessment.time_limit_minutes} minutes
                      </p>
                    </div>
                  )}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-1">
                      Passing Score
                    </p>
                    <p className="text-xl font-bold text-blue-700">
                      {assessment.passing_score}%
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-1">
                      Questions
                    </p>
                    <p className="text-xl font-bold text-blue-700">
                      {assessment.questions.length}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-1">
                      Total Points
                    </p>
                    <p className="text-xl font-bold text-blue-700">
                      {assessment.total_points}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-900 mb-2">
                    ⚠️ Important Instructions:
                  </p>
                  <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                    <li>You need to score {assessment.passing_score}% or higher to pass</li>
                    {assessment.time_limit_minutes && (
                      <li>
                        You have {assessment.time_limit_minutes} minutes to complete the
                        assessment
                      </li>
                    )}
                    <li>Answer all questions before submitting</li>
                    <li>Once you start, the timer will begin counting down</li>
                    <li>You cannot pause or restart the assessment</li>
                  </ul>
                </div>
              </div>

              <Button
                onClick={startAssessment}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-6 text-lg"
                size="lg"
              >
                <GraduationCap className="w-5 h-5 mr-2" />
                Start Baseline Assessment
              </Button>
            </CardContent>
          </Card>
        ) : showResults ? (
          /* Results View */
          <Card
            className={`border-2 shadow-lg ${
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
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
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
                      🎉 Congratulations! You have passed the baseline assessment. You
                      will be redirected to your dashboard shortly.
                    </p>
                  </div>
                )}

                {!testResults.passed && (
                  <div className="p-4 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-red-900 font-semibold">
                      Unfortunately, you did not meet the passing score. Please review
                      your answers and try again when ready.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    Question Review
                  </h3>
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
                            <div className="flex-1">
                              <CardTitle className="text-base font-bold text-gray-900">
                                Question {index + 1}: {question.question_text}
                              </CardTitle>
                              <div className="mt-2 flex items-center gap-2">
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
                                <Badge variant="outline">
                                  {question.points} points
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">
                              Your Answer:
                            </p>
                            <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                              {userAnswer}
                            </p>
                          </div>
                          {!isCorrect && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">
                                Correct Answer:
                              </p>
                              <p className="text-sm text-green-900 bg-green-100 p-2 rounded border border-green-300">
                                {correctAnswer}
                              </p>
                            </div>
                          )}
                          {question.explanation && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">
                                Explanation:
                              </p>
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
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Test View */
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-white border-2 border-blue-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b-2 border-blue-200">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {assessment.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Timer Display */}
                {timeRemaining !== null && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border-2 border-red-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="h-6 w-6 text-red-600" />
                        <div>
                          <p className="text-xs text-gray-600 font-semibold uppercase">
                            Time Remaining
                          </p>
                          <p
                            className={`text-3xl font-bold mt-1 ${
                              timeRemaining < 60
                                ? "text-red-600 animate-pulse"
                                : "text-gray-900"
                            }`}
                          >
                            {formatTime(timeRemaining)}
                          </p>
                        </div>
                      </div>
                      {timeRemaining < 300 && (
                        <Badge className="bg-red-100 text-red-700 border-red-300">
                          {timeRemaining < 60
                            ? "Less than 1 minute!"
                            : "Less than 5 minutes!"}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {assessment.questions.map((question, index) => (
                    <Card key={question.id} className="border-2 border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-lg font-bold text-gray-900">
                          Question {index + 1}
                          <Badge variant="outline" className="ml-2">
                            {question.points} points
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-base text-gray-700 mt-2">
                          {question.question_text}
                        </CardDescription>
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
                          >
                            {question.options.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className="flex items-center space-x-2 p-3 hover:bg-gray-50 rounded-lg border border-gray-200"
                              >
                                <RadioGroupItem
                                  value={option}
                                  id={`q${question.id}-opt${optIndex}`}
                                />
                                <Label
                                  htmlFor={`q${question.id}-opt${optIndex}`}
                                  className="flex-1 cursor-pointer text-gray-900"
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
                          >
                            <div className="flex items-center space-x-2 p-3 hover:bg-gray-50 rounded-lg border border-gray-200">
                              <RadioGroupItem value="True" id={`q${question.id}-true`} />
                              <Label
                                htmlFor={`q${question.id}-true`}
                                className="flex-1 cursor-pointer text-gray-900"
                              >
                                True
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 hover:bg-gray-50 rounded-lg border border-gray-200">
                              <RadioGroupItem value="False" id={`q${question.id}-false`} />
                              <Label
                                htmlFor={`q${question.id}-false`}
                                className="flex-1 cursor-pointer text-gray-900"
                              >
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
                            className="min-h-[100px]"
                          />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <Button
                    onClick={() => handleSubmit(false)}
                    disabled={!allQuestionsAnswered() || submitting}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-6"
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

                {!allQuestionsAnswered() && (
                  <p className="text-sm text-yellow-600 text-center mt-2">
                    Please answer all questions before submitting
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

