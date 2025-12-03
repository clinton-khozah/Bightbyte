"use client"

import * as React from "react"
import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Video, ExternalLink, Users, MapPin, Copy, X } from "lucide-react"
import { format, parseISO, startOfYear, endOfYear, eachMonthOfInterval, getDaysInMonth, startOfMonth, getDay, isSameDay, isToday } from "date-fns"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface Session {
  id: string
  date: string
  time: string
  topic: string
  mentor_name?: string
  mentor_avatar?: string
  mentor_title?: string
  status: string
  duration: number
  notes?: string
  meeting_type?: string
  meeting_link?: string
  amount?: number
}

interface SessionsCalendarProps {
  sessions: Session[]
}

export function SessionsCalendar({ sessions }: SessionsCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)

  // Group sessions by date
  const sessionsByDate = React.useMemo(() => {
    const grouped: Record<string, Session[]> = {}
    sessions.forEach((session) => {
      const dateKey = session.date
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(session)
    })
    return grouped
  }, [sessions])

  // Get sessions for a specific date
  const getSessionsForDate = (date: Date): Session[] => {
    const dateKey = format(date, "yyyy-MM-dd")
    return sessionsByDate[dateKey] || []
  }

  // Get sessions for a month
  const getSessionsForMonth = (month: Date): Session[] => {
    const monthSessions: Session[] = []
    Object.keys(sessionsByDate).forEach((dateKey) => {
      const date = parseISO(dateKey)
      if (date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear()) {
        monthSessions.push(...sessionsByDate[dateKey])
      }
    })
    return monthSessions
  }

  // Get status counts for a month
  const getStatusCounts = (month: Date) => {
    const monthSessions = getSessionsForMonth(month)
    return {
      scheduled: monthSessions.filter(s => s.status.toLowerCase() === 'scheduled').length,
      completed: monthSessions.filter(s => s.status.toLowerCase() === 'completed').length,
      cancelled: monthSessions.filter(s => s.status.toLowerCase() === 'cancelled').length,
      total: monthSessions.length
    }
  }

  // Format time
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":")
      const hour = parseInt(hours, 10)
      const ampm = hour >= 12 ? "PM" : "AM"
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minutes} ${ampm}`
    } catch {
      return timeString
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  // Handle session click
  const handleSessionClick = (session: Session) => {
    setSelectedSession(session)
    setIsSessionModalOpen(true)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-blue-500"
      case "completed":
        return "bg-green-500"
      case "cancelled":
        return "bg-red-500"
      case "in-progress":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  // Generate months for the year
  const yearStart = startOfYear(new Date(currentYear, 0, 1))
  const yearEnd = endOfYear(new Date(currentYear, 11, 31))
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd })

  const selectedDateSessions = selectedDate ? getSessionsForDate(selectedDate) : []

  // Render a custom month calendar
  const renderMonthCalendar = (month: Date) => {
    const daysInMonth = getDaysInMonth(month)
    const startDay = getDay(startOfMonth(month))
    const days: (Date | null)[] = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(month.getFullYear(), month.getMonth(), day))
    }
    
    // Ensure all months have exactly 6 rows (42 cells) for consistent card height
    const totalCells = 42 // 6 rows × 7 days
    while (days.length < totalCells) {
      days.push(null)
    }

    const monthSessions = getSessionsForMonth(month)
    const statusCounts = getStatusCounts(month)

    return (
      <Card key={month.toString()} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white/90 backdrop-blur-sm relative h-full flex flex-col">
        {/* Subtle logo background on each month card */}
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: 'url(/images/logoName.png)',
            backgroundSize: '80%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />
        <CardHeader className="pb-3 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm border-b relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                {format(month, "MMMM")}
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                {statusCounts.total} {statusCounts.total === 1 ? "session" : "sessions"}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {format(month, "MMMM yyyy")}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 relative z-10">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => {
              const isWeekend = index === 0 || index === 6 // Sunday (0) or Saturday (6)
              return (
                <div 
                  key={day} 
                  className={cn(
                    "text-center text-xs font-semibold py-1 rounded",
                    isWeekend ? "bg-gray-200 text-gray-700" : "text-gray-500"
                  )}
                >
                  {day}
                </div>
              )
            })}
          </div>

          {/* Calendar grid - Fixed height to ensure consistent card sizes */}
          <div className="grid grid-cols-7 gap-1 min-h-[240px]">
            {days.map((date, index) => {
              if (!date) {
                // Check if this empty cell is in a weekend column (Sunday = 0, Saturday = 6)
                const columnIndex = index % 7
                const isWeekendColumn = columnIndex === 0 || columnIndex === 6
                return (
                  <div 
                    key={`empty-${index}`} 
                    className={cn(
                      "aspect-square",
                      isWeekendColumn && "bg-gray-200"
                    )}
                  />
                )
              }

              const dateSessions = getSessionsForDate(date)
              const hasSessions = dateSessions.length > 0
              const isSelected = selectedDate && isSameDay(date, selectedDate)
              const isCurrentDay = isToday(date)
              const dayOfWeek = getDay(date)
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 // Sunday (0) or Saturday (6)

              // Check if session has passed (date and time) or is completed
              const isSessionPassed = dateSessions.length > 0 && dateSessions.every((session) => {
                const sessionDateTime = new Date(`${session.date}T${session.time}`)
                const now = new Date()
                // Check if session time has passed or status is completed/cancelled
                return sessionDateTime < now || 
                       session.status.toLowerCase() === 'completed' || 
                       session.status.toLowerCase() === 'cancelled'
              })

              // Get primary status for the day (if multiple sessions, use the first one's status)
              const primaryStatus = dateSessions.length > 0 ? dateSessions[0].status.toLowerCase() : null

              return (
                <button
                  key={date.toString()}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "aspect-square relative flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all hover:scale-105",
                    // Blinking animation for days with upcoming sessions
                    hasSessions && !isSessionPassed && "animate-pulse",
                    // Selected date
                    isSelected && "bg-blue-600 text-white shadow-lg ring-2 ring-blue-300 ring-offset-2",
                    // Past/completed sessions - green
                    !isSelected && hasSessions && isSessionPassed && isWeekend && "bg-green-200 text-green-800 hover:bg-green-300",
                    !isSelected && hasSessions && isSessionPassed && !isWeekend && "bg-green-100 text-green-700 hover:bg-green-200",
                    // Current day
                    !isSelected && isCurrentDay && !isSessionPassed && "bg-blue-100 text-blue-700 font-bold",
                    // Weekend with upcoming sessions
                    !isSelected && !isCurrentDay && isWeekend && hasSessions && !isSessionPassed && "bg-gray-200 text-gray-900 hover:bg-gray-300",
                    // Weekend without sessions
                    !isSelected && !isCurrentDay && isWeekend && !hasSessions && "bg-gray-200 text-gray-700 hover:bg-gray-300",
                    // Weekday with upcoming sessions
                    !isSelected && !isCurrentDay && !isWeekend && hasSessions && !isSessionPassed && "bg-gray-50 text-gray-900 hover:bg-gray-100",
                    // Weekday without sessions
                    !isSelected && !isCurrentDay && !isWeekend && !hasSessions && "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <span className={cn(
                    "text-xs",
                    isSelected && "text-white",
                    !isSelected && isCurrentDay && "text-blue-700",
                    !isSelected && !isCurrentDay && "text-gray-900"
                  )}>
                    {format(date, "d")}
                  </span>
                  
                  {/* Status indicator dots */}
                  {hasSessions && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dateSessions.map((session, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isSelected ? "bg-white/80" : getStatusColor(session.status)
                          )}
                          title={`${session.status} - ${formatTime(session.time)}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Status summary */}
          {statusCounts.total > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center gap-4 text-xs">
              {statusCounts.scheduled > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">{statusCounts.scheduled} Scheduled</span>
                </div>
              )}
              {statusCounts.completed > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">{statusCounts.completed} Completed</span>
                </div>
              )}
              {statusCounts.cancelled > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-gray-600">{statusCounts.cancelled} Cancelled</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 relative min-h-screen">
      {/* Blurred Logo Background - Main Container */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] blur-2xl"
        style={{
          backgroundImage: 'url(/images/logoName.png)',
          backgroundSize: '60%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      />
      
      <div className="relative z-10">
      {/* Year Navigation */}
      <div className="flex items-center justify-between mb-6 bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentYear(currentYear - 1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {currentYear}
          </h2>
          <button
            onClick={() => setCurrentYear(currentYear + 1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-300"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="font-medium text-blue-700">Scheduled</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="font-medium text-green-700">Completed</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="font-medium text-red-700">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Year Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {months.map((month, index) => (
          <motion.div
            key={month.toString()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="relative"
          >
            {renderMonthCalendar(month)}
          </motion.div>
        ))}
      </div>

      {/* Selected Date Sessions */}
      {selectedDate && selectedDateSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-2 border-blue-200 shadow-lg bg-white/90 backdrop-blur-sm relative">
            <div 
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: 'url(/images/logoName.png)',
                backgroundSize: '70%',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            />
            <CardHeader className="bg-gradient-to-r from-blue-50/80 to-purple-50/80 backdrop-blur-sm border-b relative z-10">
              <CardTitle className="flex items-center gap-2 text-xl">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
                Sessions on {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </CardTitle>
              <CardDescription className="text-base">
                {selectedDateSessions.length} {selectedDateSessions.length === 1 ? "session" : "sessions"} scheduled
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 relative z-10">
              <div className="space-y-4">
                {selectedDateSessions
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleSessionClick(session)}
                      className="flex items-start justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="font-bold text-lg text-gray-900">{session.topic}</h4>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-semibold",
                              session.status === "scheduled" && "border-blue-300 text-blue-700 bg-blue-100",
                              session.status === "completed" && "border-green-300 text-green-700 bg-green-100",
                              session.status === "cancelled" && "border-red-300 text-red-700 bg-red-100"
                            )}
                          >
                            {session.status.charAt(0).toUpperCase() + session.status.slice(1).replace("-", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-700">
                          <div className="flex items-center gap-2 font-medium">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span>{formatTime(session.time)}</span>
                          </div>
                          <span className="text-gray-400">•</span>
                          <span className="font-medium">{session.duration} minutes</span>
                          {session.mentor_name && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="font-medium">{session.mentor_name}</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Click to view full details</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {selectedDate && selectedDateSessions.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-2 border-gray-200 bg-white/90 backdrop-blur-sm relative">
            <div 
              className="absolute inset-0 opacity-[0.02] pointer-events-none"
              style={{
                backgroundImage: 'url(/images/logoName.png)',
                backgroundSize: '60%',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            />
            <CardContent className="py-12 text-center relative z-10">
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-600">
                No sessions scheduled for {format(selectedDate, "MMMM d, yyyy")}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
      </div>

      {/* Session Details Modal */}
      {isSessionModalOpen && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-purple-50 border-b p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Session Details</h2>
                <p className="text-sm text-gray-600 mt-1">{formatDate(selectedSession.date)}</p>
              </div>
              <button
                onClick={() => {
                  setIsSessionModalOpen(false)
                  setSelectedSession(null)
                }}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Topic and Status */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedSession.topic}</h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-sm font-semibold",
                      selectedSession.status === "scheduled" && "border-blue-300 text-blue-700 bg-blue-100",
                      selectedSession.status === "completed" && "border-green-300 text-green-700 bg-green-100",
                      selectedSession.status === "cancelled" && "border-red-300 text-red-700 bg-red-100"
                    )}
                  >
                    {selectedSession.status.charAt(0).toUpperCase() + selectedSession.status.slice(1).replace("-", " ")}
                  </Badge>
                </div>
              </div>

              {/* Mentor Info */}
              {selectedSession.mentor_name && (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <img
                    src={selectedSession.mentor_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedSession.mentor_name || 'User')}&background=3B82F6&color=fff&size=128`}
                    alt={selectedSession.mentor_name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedSession.mentor_name || 'User')}&background=3B82F6&color=fff&size=128`
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-gray-400" />
                      <span className="font-semibold text-gray-900">{selectedSession.mentor_name}</span>
                    </div>
                    {selectedSession.mentor_title && (
                      <p className="text-sm text-gray-600 mt-1">{selectedSession.mentor_title}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Time and Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">Time</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{formatTime(selectedSession.time)}</p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 mb-1">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">Duration</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{selectedSession.duration} minutes</p>
                </div>
              </div>

              {/* Meeting Type and Link */}
              {selectedSession.meeting_type && (
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    {selectedSession.meeting_type !== "in-person" ? (
                      <Video className="w-5 h-5" />
                    ) : (
                      <MapPin className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium">Meeting Type</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {selectedSession.meeting_type.replace("-", " ")}
                  </p>
                  {selectedSession.meeting_link && selectedSession.meeting_type !== "in-person" && (
                    <div className="mt-4 space-y-2">
                      <a
                        href={selectedSession.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
                      >
                        <Video className="w-4 h-4" />
                        Join Meeting
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => copyToClipboard(selectedSession.meeting_link || "")}
                        className="ml-2 inline-flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors font-medium text-sm"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {selectedSession.notes && (
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
                  <p className="text-gray-600">{selectedSession.notes}</p>
                </div>
              )}

              {/* Amount */}
              {selectedSession.amount && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Amount Paid</span>
                    <span className="text-2xl font-bold text-blue-600">${selectedSession.amount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
