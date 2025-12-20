"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Search, 
  MapPin, 
  Navigation, 
  Star, 
  CheckCircle2, 
  Eye,
  Users,
  BookOpen,
  GraduationCap,
  Heart,
  Sparkles
} from "lucide-react"
import { LoadingLogo } from "@/components/loading-logo"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { convertAndFormatPrice } from "@/lib/currency"

interface Mentor {
  id: number
  supabase_id: string
  name: string
  title: string
  description: string
  specialization: string[]
  rating: number
  total_reviews: number
  hourly_rate: number
  avatar: string
  experience: string
  languages: string[]
  availability: string
  country?: string
  city?: string
  latitude?: number
  longitude?: number
  is_verified?: boolean
  is_online?: boolean
}

type MentorCategory = "all" | "tutor" | "lecturer" | "therapist"

interface AvailableTutorsProps {
  mentors: Mentor[]
  mentorsLoading: boolean
  mentorsWithAds: Set<number>
  userLocation: { lat: number; lng: number } | null
  convertedHourlyRates: Record<number, string>
  onViewMore: (mentor: Mentor) => void
  onBookSession: (mentor: Mentor) => void
  onProfilePictureClick: (mentor: Mentor) => void
  onFindNearby: () => void
}

export function AvailableTutors({
  mentors,
  mentorsLoading,
  mentorsWithAds,
  userLocation,
  convertedHourlyRates,
  onViewMore,
  onBookSession,
  onProfilePictureClick,
  onFindNearby,
}: AvailableTutorsProps) {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<MentorCategory>("all")
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([])

  // Helper function to determine mentor category
  const getMentorCategory = (mentor: Mentor): MentorCategory => {
    const titleLower = mentor.title?.toLowerCase() || ""
    const descLower = mentor.description?.toLowerCase() || ""
    let specializationArray = mentor.specialization || []
    if (typeof specializationArray === 'string') {
      try {
        specializationArray = JSON.parse(specializationArray)
      } catch {
        specializationArray = []
      }
    }
    if (!Array.isArray(specializationArray)) {
      specializationArray = []
    }
    const specializationLower = Array.isArray(specializationArray) ? specializationArray.join(" ").toLowerCase() : ""
    const combined = `${titleLower} ${descLower} ${specializationLower}`

    if (combined.includes("therapist") || combined.includes("therapy") || combined.includes("counseling") || combined.includes("counselor")) {
      return "therapist"
    }
    if (combined.includes("lecturer") || combined.includes("lecture") || combined.includes("professor") || combined.includes("university")) {
      return "lecturer"
    }
    if (combined.includes("tutor") || combined.includes("tutoring") || combined.includes("teaching")) {
      return "tutor"
    }
    return "tutor"
  }


  // Filter and search mentors
  useEffect(() => {
    let filtered = mentors

    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(mentor => getMentorCategory(mentor) === selectedCategory)
    }

    // Apply search filter
    if (search.trim()) {
      const searchTerm = search.toLowerCase()
      filtered = filtered.filter(mentor => {
        let specializationArray = mentor.specialization || []
        if (typeof specializationArray === 'string') {
          try {
            specializationArray = JSON.parse(specializationArray)
          } catch {
            specializationArray = []
          }
        }
        if (!Array.isArray(specializationArray)) {
          specializationArray = []
        }
        
        return (
          mentor.name.toLowerCase().includes(searchTerm) ||
          mentor.title.toLowerCase().includes(searchTerm) ||
          mentor.description?.toLowerCase().includes(searchTerm) ||
          specializationArray.some((skill: string) => skill.toLowerCase().includes(searchTerm)) ||
          mentor.country?.toLowerCase().includes(searchTerm) ||
          mentor.city?.toLowerCase().includes(searchTerm)
        )
      })
    }

    setFilteredMentors(filtered)
  }, [search, selectedCategory, mentors])

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating)
            ? "fill-yellow-400 text-yellow-400"
            : "fill-gray-200 text-gray-200"
        }`}
      />
    ))
  }

  const categories = [
    { id: "all" as MentorCategory, label: "All", icon: Users },
    { id: "tutor" as MentorCategory, label: "Tutors", icon: BookOpen },
    { id: "lecturer" as MentorCategory, label: "Lecturers", icon: GraduationCap },
    { id: "therapist" as MentorCategory, label: "Therapists", icon: Heart },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Tutors</h2>
        <p className="text-gray-600">Browse and connect with verified tutors, lecturers, and therapists</p>
      </div>

      {/* Category Filters */}
      <div>
        <div className="flex flex-wrap gap-3">
          {categories.map((category) => {
            const Icon = category.icon
            const isActive = selectedCategory === category.id
            return (
              <Button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                variant={isActive ? "default" : "outline"}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md hover:shadow-lg hover:bg-blue-700"
                    : "bg-white border-2 border-gray-200 hover:border-blue-300 text-gray-700 hover:bg-blue-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{category.label}</span>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Search and Find Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative group">
            <div className="absolute inset-0 bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
            <Input
              type="search"
              placeholder="Search by name, subject, specialization, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-4 w-full h-14 text-base border-2 border-gray-200 focus:border-blue-500 rounded-lg transition-colors shadow-sm"
            />
          </div>
          <Button
            onClick={onFindNearby}
            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            <Navigation className="w-5 h-5" />
            Find Nearby
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-semibold text-gray-700">
            {filteredMentors.length} {filteredMentors.length === 1 ? 'tutor' : 'tutors'} found
            {selectedCategory !== "all" && ` (${categories.find(c => c.id === selectedCategory)?.label})`}
          </span>
        </div>
      </div>

      {/* Mentors Grid */}
      {mentorsLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingLogo size={32} />
        </div>
      ) : filteredMentors.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg mb-4">No tutors found</p>
          <p className="text-gray-400 text-sm">
            {search || selectedCategory !== "all" || userLocation ? "Try adjusting your search terms or filters" : "Check back later for available tutors"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.map((mentor, index) => {
            const category = getMentorCategory(mentor)
            const categoryInfo = categories.find(c => c.id === category)
            return (
              <motion.div
                key={mentor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border flex flex-col h-full relative ${
                  mentorsWithAds.has(mentor.id) 
                    ? 'border-yellow-400 border-2 shadow-yellow-100' 
                    : 'border-gray-200'
                }`}
              >
                {/* Sponsored Badge */}
                {mentorsWithAds.has(mentor.id) && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="absolute top-3 right-3 z-10"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-yellow-400 blur-md opacity-50 rounded-full"></div>
                      <div className="relative bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-full p-2 shadow-lg border-2 border-yellow-300">
                        <Star className="w-5 h-5 text-white fill-white" />
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {/* Header with Avatar and Price */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <button
                        onClick={() => onProfilePictureClick(mentor)}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={mentor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name)}&background=3B82F6&color=fff&size=128`}
                          alt={mentor.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-blue-200 hover:border-blue-400 transition-colors"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name)}&background=3B82F6&color=fff&size=128`
                          }}
                        />
                      </button>
                      {mentor.is_online && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-gray-900 font-semibold text-base">
                          {mentor.name}
                        </h3>
                        {mentorsWithAds.has(mentor.id) && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-xs font-bold border-2 border-yellow-300 shadow-lg"
                            title="This tutor has active advertising"
                          >
                            <Sparkles className="w-3 h-3 fill-white" />
                            <span className="font-semibold">Sponsored</span>
                          </motion.span>
                        )}
                        {mentor.is_verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                            <CheckCircle2 className="w-3 h-3 fill-blue-600 text-blue-600" />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {mentor.title}
                      </p>
                      {categoryInfo && (
                        <Badge variant="secondary" className="mt-1 text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {categoryInfo.icon && <categoryInfo.icon className="w-3 h-3 mr-1" />}
                          {categoryInfo.label}
                        </Badge>
                      )}
                      {mentor.is_online && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1 ml-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          Online
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">
                      Starting from
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {convertedHourlyRates[mentor.id] || (mentor.hourly_rate && mentor.hourly_rate > 0 
                        ? `$${mentor.hourly_rate.toFixed(2)}` 
                        : 'Loading...')}
                    </div>
                    <div className="text-xs text-gray-500">
                      per hour
                    </div>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    {renderStars(mentor.rating)}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {mentor.rating}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({mentor.total_reviews})
                  </span>
                </div>

                {/* Description/About */}
                {mentor.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {mentor.description}
                  </p>
                )}

                {/* Specializations */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(() => {
                    let specializationArray = mentor.specialization || []
                    if (typeof specializationArray === 'string') {
                      try {
                        specializationArray = JSON.parse(specializationArray)
                      } catch {
                        specializationArray = []
                      }
                    }
                    if (!Array.isArray(specializationArray)) {
                      specializationArray = []
                    }
                    return specializationArray.slice(0, 3).map((skill, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs bg-blue-50 text-blue-700"
                      >
                        {skill}
                      </Badge>
                    ))
                  })()}
                  {(() => {
                    let specializationArray = mentor.specialization || []
                    if (typeof specializationArray === 'string') {
                      try {
                        specializationArray = JSON.parse(specializationArray)
                      } catch {
                        specializationArray = []
                      }
                    }
                    if (!Array.isArray(specializationArray)) {
                      specializationArray = []
                    }
                    return specializationArray.length > 3 ? (
                      <Badge variant="outline" className="text-xs">
                        +{specializationArray.length - 3} more
                      </Badge>
                    ) : null
                  })()}
                </div>

                {/* Location */}
                {(mentor.city || mentor.country) && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {mentor.city && mentor.country
                        ? `${mentor.city}, ${mentor.country}`
                        : mentor.country || mentor.city}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-auto pt-4 border-t border-gray-200 space-y-2">
                  <Button
                    onClick={() => onViewMore(mentor)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View More
                  </Button>
                  <Button
                    onClick={() => onBookSession(mentor)}
                    variant="outline"
                    className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    Book Session
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

