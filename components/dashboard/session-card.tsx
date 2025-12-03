"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { 
  Users, 
  Clock,
  Calendar as CalendarIcon,
  Video,
  ExternalLink,
  Eye,
  MapPin,
  BookOpen,
  DollarSign
} from "lucide-react"
import { convertAndFormatPrice } from '@/lib/currency'

interface SessionCardProps {
  session: {
    id: string
    topic: string
    status: string
    learner_name: string
    learner_email: string
    mentor_name: string
    mentor_avatar?: string
    mentor_title?: string
    mentor_data?: any
    date: string
    time: string
    duration: number
    amount: number
    meeting_type: string
    meeting_link?: string
    notes?: string
    is_paid?: boolean
  }
  userData: any
  userLocation: { lat: number; lng: number } | null
  index: number
  onViewMentor: (mentor: any) => void
  onBookSession: (mentor: any) => void
}

export function SessionCard({ 
  session, 
  userData, 
  userLocation, 
  index,
  onViewMentor,
  onBookSession
}: SessionCardProps) {
  const [convertedAmount, setConvertedAmount] = React.useState<string | null>(null)
  
  const sessionDate = new Date(session.date)
  const sessionDateTime = new Date(`${session.date}T${session.time}`)
  const isUpcoming = sessionDateTime > new Date()
  const isPast = sessionDateTime < new Date()
  const isMySession = session.learner_email === userData?.email
  const isAvailableSession = !isMySession && (session.learner_name === 'TBD' || session.learner_email === 'tbd@example.com')
  
  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-green-100 text-green-700 border-green-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    'in-progress': 'bg-yellow-100 text-yellow-700 border-yellow-200'
  }
  
  const cardBgClass = isUpcoming && isAvailableSession 
    ? 'bg-gradient-to-br from-blue-50 via-white to-blue-50 border-2 border-blue-200 hover:!border-green-400' 
    : 'bg-white border border-gray-200 hover:!border-green-400 hover:!border-2'
  
  // Convert amount based on user location (assume amount in DB is USD)
  React.useEffect(() => {
    const convertAmount = async () => {
      // Assume amount in database is in USD
      const usdAmount = session.amount
      if (userLocation) {
        try {
          const result = await convertAndFormatPrice(usdAmount, userLocation)
          setConvertedAmount(result.formatted)
        } catch (error) {
          console.error('Error converting currency:', error)
          // Fallback to USD
          setConvertedAmount(`$${usdAmount.toFixed(2)}`)
        }
      } else {
        // No location, use USD
        setConvertedAmount(`$${usdAmount.toFixed(2)}`)
      }
    }
    convertAmount()
  }, [session.amount, userLocation])
  
  return (
    <motion.div
      key={session.id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.4, 0, 0.2, 1]
      }}
      whileHover={{ 
        transition: { duration: 0.2 }
      }}
      className={`${cardBgClass} rounded-xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden`}
    >
      {/* Blue accent bar for upcoming available sessions */}
      {isUpcoming && isAvailableSession && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500"
        />
      )}
      
      {/* Subtle pulse animation for available sessions */}
      {isUpcoming && isAvailableSession && (
        <motion.div
          animate={{ 
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full"
        />
      )}

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Left Section - Session Info */}
        <div className="flex-1">
          <div className="flex items-start gap-4 mb-4">
            {/* Mentor Avatar */}
            <motion.div 
              className="relative flex-shrink-0"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <img
                  src={session.mentor_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.mentor_name || 'User')}&background=3B82F6&color=fff&size=128`}
                  alt={session.mentor_name}
                  className={`w-16 h-16 rounded-full object-cover border-2 ${
                    isUpcoming && isAvailableSession 
                      ? 'border-blue-400 shadow-lg shadow-blue-200' 
                      : 'border-blue-200'
                  }`}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(session.mentor_name || 'User')}&background=3B82F6&color=fff&size=128`
                  }}
                />
                {isUpcoming && isAvailableSession && (
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        '0 0 0 0 rgba(59, 130, 246, 0.7)',
                        '0 0 0 8px rgba(59, 130, 246, 0)',
                      ]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                    className="absolute inset-0 rounded-full border-2 border-blue-400"
                  />
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>
            </motion.div>

            {/* Session Details */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <motion.h3 
                  className={`text-xl font-bold ${
                    isUpcoming && isAvailableSession 
                      ? 'text-blue-900' 
                      : 'text-gray-900'
                  }`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {session.topic}
                </motion.h3>
                <motion.span 
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm ${
                    statusColors[session.status] || 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  {session.status.charAt(0).toUpperCase() + session.status.slice(1).replace('-', ' ')}
                </motion.span>
              </div>
              
              {/* Mentor Name */}
              <motion.div 
                className="flex items-center gap-2 mb-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Users className={`w-4 h-4 ${
                  isUpcoming && isAvailableSession 
                    ? 'text-blue-600' 
                    : 'text-gray-500'
                }`} />
                <span className={`font-semibold ${
                  isUpcoming && isAvailableSession 
                    ? 'text-blue-800' 
                    : 'text-gray-700'
                }`}>
                  {session.mentor_name}
                </span>
                {session.mentor_title && (
                  <span className={`text-sm ${
                    isUpcoming && isAvailableSession 
                      ? 'text-blue-600' 
                      : 'text-gray-500'
                  }`}>
                    • {session.mentor_title}
                  </span>
                )}
              </motion.div>

              <div className="space-y-3 text-sm">
                {/* Payment Status Badge */}
                <motion.div 
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  {session.learner_email === userData?.email ? (
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${session.is_paid ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-orange-100 text-orange-700 border border-orange-300'}`}>
                      {session.is_paid ? 'Paid' : 'Awaiting Payment'}
                    </span>
                  ) : (
                    <motion.span 
                      className="px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-400 shadow-md"
                      animate={isUpcoming && isAvailableSession ? {
                        boxShadow: [
                          '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                          '0 4px 12px -1px rgba(59, 130, 246, 0.5)',
                          '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                        ]
                      } : {}}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      ✨ Available
                    </motion.span>
                  )}
                </motion.div>

                {/* Student Info for Available Sessions */}
                {session.learner_name === 'TBD' || session.learner_email === 'tbd@example.com' ? (
                  <motion.div 
                    className={`p-4 rounded-lg border ${
                      isUpcoming && isAvailableSession
                        ? 'bg-blue-50/80 border-blue-200 shadow-sm'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className={`text-xs font-bold mb-1 ${
                      isUpcoming && isAvailableSession
                        ? 'text-blue-800'
                        : 'text-gray-700'
                    }`}>
                      No student assigned yet
                    </p>
                    <p className={`text-xs ${
                      isUpcoming && isAvailableSession
                        ? 'text-blue-600'
                        : 'text-gray-500'
                    }`}>
                      Waiting for a student to book this session
                    </p>
                  </motion.div>
                ) : session.learner_email === userData?.email ? (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Your Session</p>
                    <p className="text-xs text-blue-700">You have booked this session</p>
                  </div>
                ) : null}

                {/* Date */}
                <motion.div 
                  className={`flex items-center gap-2 ${
                    isUpcoming && isAvailableSession
                      ? 'text-blue-800'
                      : 'text-gray-700'
                  }`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <CalendarIcon className={`w-4 h-4 ${
                    isUpcoming && isAvailableSession
                      ? 'text-blue-600'
                      : 'text-gray-500'
                  }`} />
                  <span className="font-medium">
                    {sessionDate.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </motion.div>

                {/* Time & Duration */}
                <motion.div 
                  className={`flex items-center gap-2 ${
                    isUpcoming && isAvailableSession
                      ? 'text-blue-800'
                      : 'text-gray-700'
                  }`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Clock className={`w-4 h-4 ${
                    isUpcoming && isAvailableSession
                      ? 'text-blue-600'
                      : 'text-gray-500'
                  }`} />
                  <span className="font-medium">
                    {new Date(`2000-01-01T${session.time}`).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    })} • {session.duration} min
                  </span>
                </motion.div>

                {/* Amount */}
                <motion.div 
                  className={`flex items-center gap-2 ${
                    isUpcoming && isAvailableSession
                      ? 'text-blue-800'
                      : 'text-gray-700'
                  }`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <DollarSign className={`w-4 h-4 ${
                    isUpcoming && isAvailableSession
                      ? 'text-blue-600'
                      : 'text-gray-500'
                  }`} />
                  <span className={`font-bold text-lg ${
                    isUpcoming && isAvailableSession
                      ? 'text-blue-900'
                      : 'text-gray-900'
                  }`}>
                    {convertedAmount || `$${session.amount.toFixed(2)}`}
                  </span>
                </motion.div>

                {/* Meeting Type */}
                {session.meeting_type && (
                  <motion.div 
                    className={`flex items-center gap-2 ${
                      isUpcoming && isAvailableSession
                        ? 'text-blue-800'
                        : 'text-gray-700'
                    }`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Video className={`w-4 h-4 ${
                      isUpcoming && isAvailableSession
                        ? 'text-blue-600'
                        : 'text-gray-500'
                    }`} />
                    <span className="font-medium capitalize">{session.meeting_type.replace('-', ' ')}</span>
                  </motion.div>
                )}

                {/* Notes */}
                {session.notes && (
                  <motion.div 
                    className={`mt-4 pt-4 border-t ${
                      isUpcoming && isAvailableSession
                        ? 'border-blue-200'
                        : 'border-gray-200'
                    }`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.55 }}
                  >
                    <p className={`text-xs font-bold mb-2 ${
                      isUpcoming && isAvailableSession
                        ? 'text-blue-800'
                        : 'text-gray-700'
                    }`}>
                      Notes
                    </p>
                    <p className={`text-sm ${
                      isUpcoming && isAvailableSession
                        ? 'text-blue-700'
                        : 'text-gray-600'
                    }`}>
                      {session.notes}
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Meeting Link & Actions */}
        <div className="flex flex-col gap-3 md:items-end">
          {/* View Mentor Details Button */}
          {session.mentor_data && (
            <button
              onClick={() => onViewMentor(session.mentor_data)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-sm"
            >
              <Eye className="w-4 h-4" />
              View Mentor Details
            </button>
          )}

          {/* Join Meeting / Pay / Book Button */}
          {(() => {
            const meetingEndTime = new Date(sessionDateTime.getTime() + (session.duration * 60000))
            const isMeetingActive = new Date() >= sessionDateTime && new Date() <= meetingEndTime

            // If it's my session and I've paid
            if (isMySession && session.is_paid) {
              if (isMeetingActive && session.meeting_link && session.meeting_type !== 'in-person') {
                return (
                  <a
                    href={session.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
                  >
                    <Video className="w-4 h-4" />
                    Join Meeting Now
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )
              } else if (isUpcoming && session.meeting_link && session.meeting_type !== 'in-person') {
                return (
                  <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                    <Clock className="w-4 h-4 inline-block mr-2" />
                    Starts {sessionDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {sessionDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </div>
                )
              } else if (session.meeting_type === 'in-person') {
                return (
                  <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                    <MapPin className="w-4 h-4 inline-block mr-2" />
                    In-Person Session
                  </div>
                )
              }
            }
            
            // If it's an available session (not booked by me)
            if (!isMySession && (session.learner_name === 'TBD' || session.learner_email === 'tbd@example.com')) {
              return (
                <motion.button
                  onClick={() => onBookSession(session.mentor_data)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/50 relative overflow-hidden"
                  whileHover={{ 
                    boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.5)"
                  }}
                  whileTap={{ scale: 0.95 }}
                  animate={isUpcoming ? {
                    boxShadow: [
                      '0 10px 25px -5px rgba(59, 130, 246, 0.4)',
                      '0 10px 30px -5px rgba(59, 130, 246, 0.6)',
                      '0 10px 25px -5px rgba(59, 130, 246, 0.4)',
                    ]
                  } : {}}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{
                      x: ['-100%', '100%']
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                  <BookOpen className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Book This Session</span>
                </motion.button>
              )
            }

            // If I haven't paid yet
            if (isMySession && !session.is_paid) {
              return (
                <button
                  onClick={() => onBookSession(session.mentor_data)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  <DollarSign className="w-4 h-4" />
                  Pay & Join Meeting
                </button>
              )
            }

            return null
          })()}

          {session.meeting_link && session.is_paid && session.learner_email === userData?.email && (() => {
            const meetingEndTime = new Date(sessionDateTime.getTime() + (session.duration * 60000))
            const isMeetingActive = new Date() >= sessionDateTime && new Date() <= meetingEndTime
            
            if (isMeetingActive) {
              return (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(session.meeting_link || '')
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Copy meeting link
                </button>
              )
            }
            return null
          })()}

          <div className="text-xs text-gray-500 mt-2">
            Meeting Type: <span className="font-medium capitalize">{session.meeting_type.replace('-', ' ')}</span>
          </div>
          {session.learner_email === userData?.email && !session.is_paid && (
            <div className="text-xs text-orange-600 font-medium">
              Payment Required
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

