"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  Clock,
  Video,
  ExternalLink,
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
} from "lucide-react"
import { DashboardLayout } from "@/components/dashboard/layout"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { SessionsCalendar } from "@/components/dashboard/sessions-calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { convertAndFormatPrice } from '@/lib/currency'

interface BookedSession {
  id: string
  mentor_id: number
  mentor_name?: string
  mentor_avatar?: string
  mentor_title?: string
  learner_name: string
  learner_email: string
  date: string
  time: string
  duration: number
  topic: string
  notes?: string
  meeting_type: string
  meeting_link?: string
  status: string
  amount: number
  created_at: string
}

export default function BookingsPage() {
  const [userData, setUserData] = React.useState<any>(null)
  const [bookedSessions, setBookedSessions] = React.useState<BookedSession[]>([])
  const [loading, setLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<"upcoming" | "past" | "cancelled">("upcoming")
  const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number } | null>(null)
  const [convertedAmounts, setConvertedAmounts] = React.useState<Record<string, string>>({})
  const router = useRouter()

  // Fetch user data
  React.useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/")
          return
        }

        const { data: studentData } = await supabase
          .from("students")
          .select("*")
          .eq("id", user.id)
          .single()

        if (studentData) {
          setUserData(studentData)
        } else {
          setUserData({
            id: user.id,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          })
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    fetchUserData()
  }, [router])

  // Fetch booked sessions
  React.useEffect(() => {
    const fetchBookedSessions = async () => {
      if (!userData?.email) return

      try {
        setLoading(true)
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("sessions")
          .select(
            `
            *,
            mentors (
              id,
              name,
              avatar,
              title
            )
          `
          )
          .eq("learner_email", userData.email)
          .order("date", { ascending: false })
          .order("time", { ascending: false })

        if (sessionsError) {
          console.error("Error fetching sessions:", sessionsError)
          setBookedSessions([])
          return
        }

        const transformedSessions: BookedSession[] = (sessionsData || []).map((session: any) => ({
          id: session.id,
          mentor_id: session.mentor_id,
          mentor_name: session.mentors?.name || "Unknown Mentor",
          mentor_avatar: session.mentors?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.mentors?.name || 'User')}&background=3B82F6&color=fff&size=128`,
          mentor_title: session.mentors?.title || "",
          learner_name: session.learner_name,
          learner_email: session.learner_email,
          date: session.date,
          time: session.time,
          duration: session.duration,
          topic: session.topic,
          notes: session.notes || "",
          meeting_type: session.meeting_type,
          meeting_link: session.meeting_link || "",
          status: session.status,
          amount: parseFloat(session.amount) || 0,
          created_at: session.created_at,
        }))

        setBookedSessions(transformedSessions)
      } catch (error) {
        console.error("Error fetching sessions:", error)
        setBookedSessions([])
      } finally {
        setLoading(false)
      }
    }

    fetchBookedSessions()
  }, [userData?.email])

  // Auto-detect user location on page load for currency conversion
  // DISABLED: Removed automatic location request to prevent permission popup
  // Location will only be requested when user explicitly clicks a button
  React.useEffect(() => {
    // Location detection disabled to prevent permission popup
  }, [])

  // Convert all session amounts when sessions or user location changes
  React.useEffect(() => {
    const convertAllAmounts = async () => {
      if (bookedSessions.length === 0) {
        setConvertedAmounts({})
        return
      }
      
      const conversions: Record<string, string> = {}
      
      for (const session of bookedSessions) {
        try {
          // Assume amount in database is in USD
          const usdAmount = session.amount
          if (userLocation) {
            const result = await convertAndFormatPrice(usdAmount, userLocation)
            conversions[session.id] = result.formatted
          } else {
            // No location, use USD
            conversions[session.id] = `$${usdAmount.toFixed(2)}`
          }
        } catch (error) {
          console.error(`Error converting currency for session ${session.id}:`, error)
          // Fallback to USD
          conversions[session.id] = `$${session.amount.toFixed(2)}`
        }
      }
      
      setConvertedAmounts(conversions)
    }
    
    convertAllAmounts()
  }, [bookedSessions, userLocation])

  // Categorize sessions
  const categorizeSessions = () => {
    const now = new Date()
    const upcoming: BookedSession[] = []
    const past: BookedSession[] = []
    const cancelled: BookedSession[] = []

    bookedSessions.forEach((session) => {
      if (session.status === "cancelled") {
        cancelled.push(session)
      } else {
        const sessionDateTime = new Date(`${session.date}T${session.time}`)
        if (sessionDateTime > now) {
          upcoming.push(session)
        } else {
          past.push(session)
        }
      }
    })

    return { upcoming, past, cancelled }
  }

  const { upcoming, past, cancelled } = categorizeSessions()

  const getSessionsForTab = () => {
    switch (activeTab) {
      case "upcoming":
        return upcoming
      case "past":
        return past
      case "cancelled":
        return cancelled
      default:
        return []
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "completed":
        return "bg-green-100 text-green-700 border-green-200"
      case "cancelled":
        return "bg-red-100 text-red-700 border-red-200"
      case "in-progress":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  if (loading) {
    return (
      <DashboardLayout role="learner">
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your bookings...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const sessionsToShow = getSessionsForTab()

  return (
    <DashboardLayout role="learner">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-600">View and manage your learning sessions</p>
        </div>

        {/* Calendar and List View Tabs */}
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              List View
            </TabsTrigger>
          </TabsList>

          {/* Calendar View */}
          <TabsContent value="calendar" className="space-y-6">
            <SessionsCalendar
              sessions={bookedSessions.map((session) => ({
                id: session.id,
                date: session.date,
                time: session.time,
                topic: session.topic,
                mentor_name: session.mentor_name,
                mentor_avatar: session.mentor_avatar,
                mentor_title: session.mentor_title,
                status: session.status,
                duration: session.duration,
                notes: session.notes,
                meeting_type: session.meeting_type,
                meeting_link: session.meeting_link,
                amount: session.amount,
              }))}
            />
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="space-y-6">
            {/* Tabs */}
            <div className="bg-white border border-gray-200 rounded-lg p-1 mb-6 inline-flex gap-2 shadow-sm">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`relative px-6 py-3 rounded-md font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
              activeTab === "upcoming"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Calendar className={`w-4 h-4 ${activeTab === "upcoming" ? "text-white" : "text-gray-400"}`} />
            <span>Upcoming</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === "upcoming"
                  ? "bg-white/20 text-white"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {upcoming.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`relative px-6 py-3 rounded-md font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
              activeTab === "past"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${activeTab === "past" ? "text-white" : "text-gray-400"}`} />
            <span>Past</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === "past"
                  ? "bg-white/20 text-white"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {past.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("cancelled")}
            className={`relative px-6 py-3 rounded-md font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
              activeTab === "cancelled"
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <XCircle className={`w-4 h-4 ${activeTab === "cancelled" ? "text-white" : "text-gray-400"}`} />
            <span>Cancelled</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === "cancelled"
                  ? "bg-white/20 text-white"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {cancelled.length}
            </span>
          </button>
        </div>

        {/* Sessions List */}
        {sessionsToShow.length > 0 ? (
          <div className="space-y-4">
            {sessionsToShow.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Left Section - Session Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      {/* Mentor Avatar */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={session.mentor_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.mentor_name || 'User')}&background=3B82F6&color=fff&size=128`}
                          alt={session.mentor_name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(session.mentor_name || 'User')}&background=3B82F6&color=fff&size=128`
                          }}
                        />
                        {session.status === "scheduled" && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>

                      {/* Session Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900">{session.topic}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              session.status
                            )}`}
                          >
                            {session.status.charAt(0).toUpperCase() + session.status.slice(1).replace("-", " ")}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{session.mentor_name}</span>
                            {session.mentor_title && (
                              <span className="text-gray-500">• {session.mentor_title}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <span>{formatDate(session.date)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-gray-400" />
                            <span>
                              {formatTime(session.time)} • {session.duration} minutes
                            </span>
                          </div>

                          {session.notes && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Notes: </span>
                                {session.notes}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-2">
                            <span className="font-semibold text-gray-900">{convertedAmounts[session.id] || `$${session.amount.toFixed(2)}`}</span>
                            <span className="text-xs text-gray-500">paid</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Meeting Link & Actions */}
                  <div className="flex flex-col gap-3 md:items-end">
                    {session.meeting_link && session.meeting_type !== "in-person" ? (
                      <a
                        href={session.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
                      >
                        <Video className="w-4 h-4" />
                        Join Meeting
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : session.meeting_type === "in-person" ? (
                      <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                        <MapPin className="w-4 h-4 inline-block mr-2" />
                        In-Person Session
                      </div>
                    ) : (
                      <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm">
                        No meeting link available
                      </div>
                    )}

                    {session.meeting_link && (
                      <button
                        onClick={() => copyToClipboard(session.meeting_link || "")}
                        className="inline-flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        <Copy className="w-3 h-3" />
                        Copy meeting link
                      </button>
                    )}

                    <div className="text-xs text-gray-500 mt-2">
                      Meeting Type: <span className="font-medium capitalize">{session.meeting_type.replace("-", " ")}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            {activeTab === "upcoming" && (
              <>
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming sessions</h3>
                <p className="text-gray-600 mb-4">You don't have any upcoming sessions scheduled</p>
                <button
                  onClick={() => router.push("/dashboard/learner/tutors")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  <Users className="w-4 h-4" />
                  Find Tutors
                </button>
              </>
            )}
            {activeTab === "past" && (
              <>
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No past sessions</h3>
                <p className="text-gray-600">You haven't completed any sessions yet</p>
              </>
            )}
            {activeTab === "cancelled" && (
              <>
                <XCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No cancelled sessions</h3>
                <p className="text-gray-600">You don't have any cancelled sessions</p>
              </>
            )}
          </div>
        )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

