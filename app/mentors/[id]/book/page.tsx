"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Calendar, Clock, Shield, CheckCircle, FileText } from "lucide-react"
import { PayFastPaymentForm } from "@/components/payment/payfast-payment-form"

interface Mentor {
  id: string
  name: string
  title: string
  avatar: string
  hourly_rate: number
  rating: number
  total_reviews: number
  specialization: string[]
  experience: string
  languages: string[]
  availability: string
}

interface SessionBooking {
  date: string
  time: string
  duration: number
  topic: string
  notes: string
  meetingType: "teams" | "google-meet" | "in-person"
  meetingLink?: string
}

export default function BookSessionPage() {
  const params = useParams()
  const router = useRouter()
  const mentorId = params?.id as string

  const [mentor, setMentor] = React.useState<Mentor | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string>("")
  const [currentStep, setCurrentStep] = React.useState(1)
  const [isCreatingPayment, setIsCreatingPayment] = React.useState(false)

  const [sessionData, setSessionData] = React.useState<SessionBooking>({
    date: "",
    time: "",
    duration: 60,
    topic: "",
    notes: "",
    meetingType: "google-meet",
  })

  // PayFast doesn't require pre-loading like Stripe

  // Fetch mentor details
  React.useEffect(() => {
    const fetchMentor = async () => {
      if (!mentorId) return

      try {
        setLoading(true)
        const response = await fetch(`http://127.0.0.1:8000/api/v1/mentors/detail/${mentorId}/`)

        if (!response.ok) {
          throw new Error("Mentor not found")
        }

        const data = await response.json()

        if (data.success && data.mentor) {
          setMentor(data.mentor)
        } else {
          throw new Error("Failed to load mentor details")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load mentor")
      } finally {
        setLoading(false)
      }
    }

    fetchMentor()
  }, [mentorId])

  const generateMeetingLink = async (meetingType: string, sessionData: SessionBooking): Promise<string> => {
    if (meetingType === "in-person") {
      return ""
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/ai/meetings/session/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mentor_id: mentorId,
          meeting_type: meetingType,
          session_data: sessionData,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create meeting")
      }

      const data = await response.json()

      if (data.success && data.meeting?.join_url) {
        return data.meeting.join_url
      } else {
        // Fallback to demo links
        const sessionId = Math.random().toString(36).substring(2, 15)
        const timestamp = Date.now()

        switch (meetingType) {
          case "teams":
            return `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${sessionId}${timestamp}%40thread.v2/0?context=%7b%22Tid%22%3a%22${timestamp}%22%2c%22Oid%22%3a%22${sessionId}%22%7d`
          case "google-meet":
            return `https://meet.google.com/${sessionId}-${timestamp.toString().slice(-6)}`
          default:
            return ""
        }
      }
    } catch (error) {
      console.error("Error creating meeting:", error)
      // Fallback to demo links
      const sessionId = Math.random().toString(36).substring(2, 15)
      const timestamp = Date.now()

      switch (meetingType) {
        case "teams":
          return `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${sessionId}${timestamp}%40thread.v2/0?context=%7b%22Tid%22%3a%22${timestamp}%22%2c%22Oid%22%3a%22${sessionId}%22%7d`
        case "google-meet":
          return `https://meet.google.com/${sessionId}-${timestamp.toString().slice(-6)}`
        default:
          return ""
      }
    }
  }

  const handleSessionDataChange = async (field: keyof SessionBooking, value: string | number) => {
    const newData = {
      ...sessionData,
      [field]: value,
    }

    // Generate meeting link if meeting type changes
    if (field === "meetingType" && typeof value === "string") {
      const meetingLink = await generateMeetingLink(value, newData)
      newData.meetingLink = meetingLink
    }

    setSessionData(newData)
  }

  const calculateTotal = () => {
    if (!mentor) return 0
    return (mentor.hourly_rate * sessionData.duration) / 60
  }

  const handleNextStep = async () => {
    if (currentStep === 1) {
      // For PayFast, we just move to the payment step
      // The payment form will create the payment URL when it loads
      setCurrentStep(2)
    } else if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      const { data: { user } } = await import('@/lib/supabase').then(m => m.supabase.auth.getUser())
      const userEmail = user?.email || "user@example.com"
      const userName = user?.user_metadata?.full_name || "Valued Learner"

      // Save booking
      await fetch("http://127.0.0.1:8000/api/v1/ai/bookings/save/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mentor_id: mentorId,
          learner_name: userName,
          learner_email: userEmail,
          session_data: sessionData,
          payment_intent_id: paymentIntentId,
          amount: calculateTotal(),
        }),
      })

      // Send confirmation email
      await fetch("http://127.0.0.1:8000/api/v1/ai/send-booking-confirmation/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mentor_name: mentor?.name,
          session_data: sessionData,
          amount: calculateTotal(),
          user_email: userEmail,
        }),
      })

      setCurrentStep(3)
    } catch (error) {
      console.error("Error in post-payment process:", error)
      setCurrentStep(3)
    }
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 17; hour++) {
      for (const minutes of [0, 30]) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
        slots.push(timeString)
      }
    }
    return slots
  }

  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split("T")[0]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Mentor Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/dashboard/learner")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <button
              onClick={() => router.push("/dashboard/learner")}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {[
              { num: 1, label: "Session Details" },
              { num: 2, label: "Payment" },
              { num: 3, label: "Confirmation" },
            ].map((step, index) => (
              <React.Fragment key={step.num}>
                <div className="flex flex-col items-center flex-1 relative">
                  <div className="relative z-10">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-500 ${
                        currentStep >= step.num
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-500/50 scale-110 ring-4 ring-blue-500/20"
                          : "bg-gray-200 text-gray-500 ring-2 ring-gray-300"
                      }`}
                    >
                      {currentStep > step.num ? (
                        <CheckCircle className="w-8 h-8" />
                      ) : (
                        <span className="text-xl">{step.num}</span>
                      )}
                    </div>
                    {currentStep === step.num && (
                      <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20"></div>
                    )}
                  </div>
                  <div
                    className={`mt-4 text-sm font-semibold text-center transition-all duration-300 ${
                      currentStep >= step.num ? "text-blue-600 scale-105" : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </div>
                </div>
                {index < 2 && (
                  <div className="flex-1 h-1.5 relative -mt-8 -mx-8">
                    <div className="absolute inset-0 rounded-full overflow-hidden bg-gray-200">
                      <div
                        className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700 ease-out ${
                          currentStep > step.num
                            ? "w-full"
                            : currentStep === step.num
                            ? "w-1/2"
                            : "w-0"
                        }`}
                      />
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {currentStep === 1 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Session Details</h2>

                  {/* Date Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Select Date
                    </label>
                    <input
                      type="date"
                      min={getMinDate()}
                      value={sessionData.date}
                      onChange={(e) => handleSessionDataChange("date", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Time Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Select Time
                    </label>
                    <select
                      value={sessionData.time}
                      onChange={(e) => handleSessionDataChange("time", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select a time</option>
                      {generateTimeSlots().map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duration */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                    <select
                      value={sessionData.duration}
                      onChange={(e) => handleSessionDataChange("duration", parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={90}>1.5 hours</option>
                      <option value={120}>2 hours</option>
                    </select>
                  </div>

                  {/* Meeting Type */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleSessionDataChange("meetingType", "google-meet")}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          sessionData.meetingType === "google-meet"
                            ? "border-blue-500 bg-blue-50 text-blue-600"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <div className="text-sm font-medium">Google Meet</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSessionDataChange("meetingType", "teams")}
                        disabled
                        className="p-3 rounded-lg border text-center border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
                      >
                        <div className="text-sm font-medium">Microsoft Teams</div>
                        <div className="text-xs text-yellow-600 mt-1">Coming Soon</div>
                      </button>
                    </div>
                  </div>

                  {/* Topic */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session Topic</label>
                    <input
                      type="text"
                      value={sessionData.topic}
                      onChange={(e) => handleSessionDataChange("topic", e.target.value)}
                      placeholder="What would you like to discuss?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes (Optional)</label>
                    <textarea
                      value={sessionData.notes}
                      onChange={(e) => handleSessionDataChange("notes", e.target.value)}
                      placeholder="Any specific questions or topics you'd like to cover?"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleNextStep}
                    disabled={!sessionData.date || !sessionData.time || !sessionData.topic || isCreatingPayment}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    {isCreatingPayment ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Preparing Payment...</span>
                      </div>
                    ) : (
                      "Continue to Payment"
                    )}
                  </button>
                </div>
              )}

              {currentStep === 2 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Information</h2>
                  <PayFastPaymentForm
                    amount={calculateTotal()}
                    itemName={`Mentoring Session: ${sessionData.topic}`}
                    metadata={{
                      mentor_id: mentorId,
                      session_date: sessionData.date,
                      session_time: sessionData.time,
                      session_topic: sessionData.topic,
                    }}
                    onSuccess={handlePaymentSuccess}
                    onError={(error) => {
                      console.error("Payment error:", error)
                      alert("Payment failed. Please try again.")
                    }}
                    onBack={handlePrevStep}
                  />
                </div>
              )}

              {currentStep === 3 && (
                <div>
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 -m-6 mb-6 p-6 text-white">
                    <div className="flex items-center space-x-3">
                      <div className="bg-white bg-opacity-20 p-2 rounded-full">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Booking Confirmed!</h2>
                        <p className="text-green-100 text-sm">Payment successful</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-green-800">
                      🎉 Your session with <span className="font-semibold">{mentor?.name}</span> has been successfully booked!
                    </p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <h3 className="font-semibold text-gray-900 text-lg">Session Details</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(sessionData.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Time:</span>
                        <span className="font-medium text-gray-900">{sessionData.time}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium text-gray-900">{sessionData.duration} minutes</span>
                      </div>
                      <div className="flex items-start space-x-3 text-sm">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-gray-600">Topic:</span>
                        <span className="font-medium text-gray-900 flex-1">{sessionData.topic}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push("/dashboard/learner")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Got it, Thanks!
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-8 sticky top-6">
              <div className="mb-8">
                <div className="flex items-center space-x-5 mb-6">
                  <img
                    src={mentor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name)}&background=3B82F6&color=fff&size=128`}
                    alt={mentor.name}
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-500/20 shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name)}&background=3B82F6&color=fff&size=128`
                    }}
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{mentor.name}</h3>
                    <p className="text-sm font-medium text-gray-600 mb-2">{mentor.title}</p>
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-400 text-lg">★</span>
                      <span className="text-sm font-semibold text-gray-900 ml-1">{mentor.rating}</span>
                      <span className="text-sm text-gray-500">({mentor.total_reviews} reviews)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-5">Pricing</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Hourly Rate:</span>
                    <span className="text-base font-semibold text-gray-900">${mentor.hourly_rate}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Duration:</span>
                    <span className="text-base font-semibold text-gray-900">{sessionData.duration} min</span>
                  </div>
                  <div className="flex justify-between items-center border-t-2 border-gray-300 pt-4 mt-4">
                    <span className="text-base font-bold text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-blue-600">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-green-900 font-semibold mb-2 text-base">Secure Payment</p>
                    <p className="text-sm text-green-800 leading-relaxed">
                      Your payment is protected. If your session doesn't happen, you'll receive a full refund.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

