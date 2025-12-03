"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, TrendingUp, TrendingDown, Clock, MapPin, Star, Users, Zap, BookOpen, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { calculateDynamicPricing, PricingFactors, PriceBreakdown } from "@/lib/pricing-calculator"
import { Card, CardContent } from "@/components/ui/card"

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
  mentor: {
    id: string | number
    name: string
    baseHourlyRate: number
    experience: number
    rating: number
    totalReviews: number
    totalBookings: number
    subjects: string[]
    location: {
      country: string
      city?: string
    }
    availability: 'high' | 'medium' | 'low'
  }
  sessionDetails: {
    subject: string
    sessionType: 'online' | 'in-person'
    duration: number
    dateTime: Date
    isUrgent?: boolean
    isRecurring?: boolean
    studentLevel?: 'beginner' | 'intermediate' | 'advanced'
  }
  onConfirm?: (priceBreakdown: PriceBreakdown) => void
  onBookTutor?: () => void // Callback when "Book Tutor" is clicked
}

export function PricingModal({
  isOpen,
  onClose,
  mentor,
  sessionDetails,
  onConfirm,
  onBookTutor,
}: PricingModalProps) {
  const [priceBreakdown, setPriceBreakdown] = React.useState<PriceBreakdown | null>(null)

  React.useEffect(() => {
    if (isOpen && mentor && sessionDetails) {
      const factors: PricingFactors = {
        baseHourlyRate: mentor.baseHourlyRate,
        experience: mentor.experience,
        rating: mentor.rating,
        totalReviews: mentor.totalReviews,
        totalBookings: mentor.totalBookings,
        subject: sessionDetails.subject,
        subjectDemand: getSubjectDemand(sessionDetails.subject),
        sessionType: sessionDetails.sessionType,
        duration: sessionDetails.duration,
        timeOfDay: getTimeOfDay(sessionDetails.dateTime.getHours()),
        dayOfWeek: getDayType(sessionDetails.dateTime.getDay()),
        isHoliday: false, // You can add holiday detection logic
        location: mentor.location,
        currentRequests: 0, // You can fetch this from API
        mentorAvailability: mentor.availability,
        isUrgent: sessionDetails.isUrgent || false,
        isRecurring: sessionDetails.isRecurring || false,
        studentLevel: sessionDetails.studentLevel || 'intermediate',
      }

      const breakdown = calculateDynamicPricing(factors)
      setPriceBreakdown(breakdown)
    }
  }, [isOpen, mentor, sessionDetails])

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier > 1.0) return "text-green-600"
    if (multiplier < 1.0) return "text-red-600"
    return "text-gray-600"
  }

  const getMultiplierIcon = (multiplier: number) => {
    if (multiplier > 1.0) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (multiplier < 1.0) return <TrendingDown className="w-4 h-4 text-red-600" />
    return null
  }

  const formatMultiplier = (multiplier: number) => {
    if (multiplier === 1.0) return "No change"
    const percent = ((multiplier - 1) * 100).toFixed(0)
    return `${multiplier > 1 ? '+' : ''}${percent}%`
  }

  if (!priceBreakdown) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Dynamic Pricing Breakdown</DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Price calculated based on multiple factors for {mentor.name}
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Total Price Highlight */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Price</p>
                  <p className="text-4xl font-bold text-blue-600">
                    ${priceBreakdown.total.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    for {sessionDetails.duration} minutes
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Base Price</p>
                  {/* Calculate original price (16% higher) to show discount */}
                  {(() => {
                    // Calculate original price that makes current price look like a 16% discount
                    const discountPercent = 16;
                    const originalPrice = priceBreakdown.total / (1 - discountPercent / 100);
                    return (
                      <>
                        <p className="text-2xl font-semibold text-gray-700 line-through">
                          ${originalPrice.toFixed(2)}
                        </p>
                        <Badge className="mt-2 bg-green-100 text-green-700">
                          {discountPercent}% adjustment
                        </Badge>
                      </>
                    );
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Factors */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Price Factors
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Experience */}
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">Experience</span>
                    </div>
                    <div className={`flex items-center gap-1 ${getMultiplierColor(priceBreakdown.experienceMultiplier)}`}>
                      {getMultiplierIcon(priceBreakdown.experienceMultiplier)}
                      <span className="text-sm font-semibold">
                        {formatMultiplier(priceBreakdown.experienceMultiplier)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{mentor.experience} years</p>
                </CardContent>
              </Card>

              {/* Rating */}
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">Rating</span>
                    </div>
                    <div className={`flex items-center gap-1 ${getMultiplierColor(priceBreakdown.ratingMultiplier)}`}>
                      {getMultiplierIcon(priceBreakdown.ratingMultiplier)}
                      <span className="text-sm font-semibold">
                        {formatMultiplier(priceBreakdown.ratingMultiplier)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {mentor.rating.toFixed(1)} ({mentor.totalReviews} reviews)
                  </p>
                </CardContent>
              </Card>

              {/* Subject Demand */}
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Subject Demand</span>
                    </div>
                    <div className={`flex items-center gap-1 ${getMultiplierColor(priceBreakdown.demandMultiplier)}`}>
                      {getMultiplierIcon(priceBreakdown.demandMultiplier)}
                      <span className="text-sm font-semibold">
                        {formatMultiplier(priceBreakdown.demandMultiplier)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{sessionDetails.subject}</p>
                </CardContent>
              </Card>

              {/* Time of Day */}
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium">Time & Day</span>
                    </div>
                    <div className={`flex items-center gap-1 ${getMultiplierColor(priceBreakdown.timeMultiplier)}`}>
                      {getMultiplierIcon(priceBreakdown.timeMultiplier)}
                      <span className="text-sm font-semibold">
                        {formatMultiplier(priceBreakdown.timeMultiplier)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {getTimeOfDay(sessionDetails.dateTime.getHours())}, {getDayType(sessionDetails.dateTime.getDay())}
                  </p>
                </CardContent>
              </Card>

              {/* Location */}
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium">Location</span>
                    </div>
                    <div className={`flex items-center gap-1 ${getMultiplierColor(priceBreakdown.locationMultiplier)}`}>
                      {getMultiplierIcon(priceBreakdown.locationMultiplier)}
                      <span className="text-sm font-semibold">
                        {formatMultiplier(priceBreakdown.locationMultiplier)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{mentor.location.country}</p>
                </CardContent>
              </Card>

              {/* Session Type */}
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Session Type</span>
                    </div>
                    <div className={`flex items-center gap-1 ${getMultiplierColor(priceBreakdown.sessionTypeMultiplier)}`}>
                      {getMultiplierIcon(priceBreakdown.sessionTypeMultiplier)}
                      <span className="text-sm font-semibold">
                        {formatMultiplier(priceBreakdown.sessionTypeMultiplier)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 capitalize">{sessionDetails.sessionType}</p>
                </CardContent>
              </Card>

              {/* Urgency */}
              {sessionDetails.isUrgent && (
                <Card className="border border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium">Urgent Booking</span>
                      </div>
                      <div className={`flex items-center gap-1 ${getMultiplierColor(priceBreakdown.urgencyMultiplier)}`}>
                        {getMultiplierIcon(priceBreakdown.urgencyMultiplier)}
                        <span className="text-sm font-semibold">
                          {formatMultiplier(priceBreakdown.urgencyMultiplier)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Last-minute booking</p>
                  </CardContent>
                </Card>
              )}

              {/* Availability */}
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm font-medium">Availability</span>
                    </div>
                    <div className={`flex items-center gap-1 ${getMultiplierColor(priceBreakdown.studentLevelMultiplier)}`}>
                      {getMultiplierIcon(priceBreakdown.studentLevelMultiplier)}
                      <span className="text-sm font-semibold capitalize">
                        {mentor.availability}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{mentor.totalBookings} total bookings</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                onClose() // Close pricing modal first
                // Call the callback to open sign-in modal in parent component
                if (onBookTutor) {
                  setTimeout(() => {
                    onBookTutor()
                  }, 150)
                }
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Book Tutor
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper functions
function getSubjectDemand(subject: string): 'low' | 'medium' | 'high' {
  const highDemandSubjects = [
    'Mathematics', 'Science', 'Programming Languages', 'Computer Engineering',
    'Artificial Intelligence', 'Data Science', 'Web Development', 'React',
    'Python', 'JavaScript', 'Java', 'Machine Learning'
  ]
  
  const mediumDemandSubjects = [
    'Business Analysis', 'Physical Science', 'Geography', 'Life Science',
    'Chemistry', 'Physics', 'Economics', 'Finance'
  ]

  if (highDemandSubjects.some(s => subject.toLowerCase().includes(s.toLowerCase()))) {
    return 'high'
  } else if (mediumDemandSubjects.some(s => subject.toLowerCase().includes(s.toLowerCase()))) {
    return 'medium'
  }
  
  return 'low'
}

function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

function getDayType(day: number): 'weekday' | 'weekend' {
  return (day === 0 || day === 6) ? 'weekend' : 'weekday'
}

