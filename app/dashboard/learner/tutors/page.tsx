"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/layout"
import { supabase } from '@/lib/supabase'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  MapPin, 
  Navigation, 
  Star, 
  CheckCircle2, 
  Eye,
  Loader2,
  AlertCircle,
  ArrowLeft,
  GraduationCap,
  BookOpen,
  Heart,
  Users,
  Sparkles
} from "lucide-react"
import { motion } from "framer-motion"
import { MentorDetailsModal } from "@/components/mentors/mentor-details-modal"
import { BookingModal } from "@/components/mentors/booking-modal"
import { ProfilePictureModal } from "@/components/mentors/profile-picture-modal"
import { GlobeViewer } from "@/components/mentors/globe-viewer"
import { convertAndFormatPrice } from "@/lib/currency"
import { fetchTutorPricing, findMatchingPricing } from "@/lib/tutor-pricing"

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
  email?: string
  phone_number?: string
  qualifications?: string
  linkedin_profile?: string
  github_profile?: string
  twitter_profile?: string
  facebook_profile?: string
  instagram_profile?: string
  personal_website?: string
  sessions_conducted?: number
}

type MentorCategory = "all" | "tutor" | "lecturer" | "therapist"

export default function TutorsPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([])
  const [mentorsLoading, setMentorsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<MentorCategory>("all")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isFindingNearby, setIsFindingNearby] = useState(false)
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [bookingMentor, setBookingMentor] = useState<Mentor | null>(null)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [profilePictureMentor, setProfilePictureMentor] = useState<Mentor | null>(null)
  const [isProfilePictureModalOpen, setIsProfilePictureModalOpen] = useState(false)
  const [isGlobeViewerOpen, setIsGlobeViewerOpen] = useState(false)
  const [currencyRates, setCurrencyRates] = useState<Map<number, string>>(new Map())
  const [mentorsWithAds, setMentorsWithAds] = useState<Set<number>>(new Set())

  // Helper function to determine mentor category
  const getMentorCategory = (mentor: Mentor): MentorCategory => {
    const titleLower = mentor.title?.toLowerCase() || ""
    const descLower = mentor.description?.toLowerCase() || ""
    // Handle specialization - could be array or JSON string
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
    // Default to tutor if unclear
    return "tutor"
  }

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/')
          return
        }

        // Fetch student data
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('id', user.id)
          .single()

        if (studentError) {
          // If not a student, check if they're a mentor
          const { data: mentorData, error: mentorError } = await supabase
            .from('mentors')
            .select('*')
            .eq('id', user.id)
            .single()

          if (mentorError) {
            // Create a new student record if doesn't exist
            const { data: newStudent, error: createError } = await supabase
              .from('students')
              .insert({
                id: user.id,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                avatar_url: user.user_metadata?.avatar_url || null,
              })
              .select()
              .single()

            if (createError) {
              console.error('Error creating student record:', createError)
              router.push('/')
              return
            }

            setUserData(newStudent)
          } else {
            router.push('/dashboard')
            return
          }
        } else {
          setUserData(studentData)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  // Fetch mentors from API or Supabase directly
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        setMentorsLoading(true)
        
        // Try API first, fallback to Supabase if API fails
        let mentorsData: any[] = []
        
        try {
          const response = await fetch('http://127.0.0.1:8000/api/v1/mentors/list/', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.mentors) {
              mentorsData = data.mentors
            }
          }
        } catch (apiError) {
          console.warn('API fetch failed, trying Supabase directly:', apiError)
          // Fallback to Supabase
          const { data, error } = await supabase
            .from('mentors')
            .select('*')
          
          if (error) {
            throw error
          }
          
          if (data) {
            mentorsData = data
          }
        }

        if (mentorsData.length > 0) {
          // Process mentors to parse JSON strings for specialization and languages
          const processedMentors = mentorsData.map((mentor: any) => {
            // Parse specialization from JSON string if needed
            let specialization = mentor.specialization || []
            if (typeof specialization === 'string') {
              try {
                specialization = JSON.parse(specialization)
              } catch {
                specialization = []
              }
            }
            if (!Array.isArray(specialization)) {
              specialization = []
            }

            // Parse languages from JSON string if needed
            let languages = mentor.languages || []
            if (typeof languages === 'string') {
              try {
                languages = JSON.parse(languages)
              } catch {
                languages = []
              }
            }
            if (!Array.isArray(languages)) {
              languages = []
            }

            return {
              ...mentor,
              latitude: mentor.latitude ? Number(mentor.latitude) : undefined,
              longitude: mentor.longitude ? Number(mentor.longitude) : undefined,
              specialization,
              languages,
            }
          })
          setMentors(processedMentors)
          setFilteredMentors(processedMentors)
          console.log(`Loaded ${processedMentors.length} mentors`)
        } else {
          console.warn('No mentors found in database')
          setMentors([])
          setFilteredMentors([])
        }
      } catch (error) {
        console.error('Error fetching mentors:', error)
        setMentors([])
        setFilteredMentors([])
      } finally {
        setMentorsLoading(false)
      }
    }

    fetchMentors()
  }, [])

  // Fetch active ad campaigns for mentors
  useEffect(() => {
    const fetchActiveCampaigns = async () => {
      if (mentors.length === 0) return

      try {
        // Fetch all active campaigns from Supabase
        const { data: campaigns, error } = await supabase
          .from('ad_campaigns')
          .select('mentor_id')
          .eq('status', 'active')

        if (error) {
          console.error('Error fetching active campaigns:', error)
          return
        }

        if (campaigns && campaigns.length > 0) {
          // Create a set of mentor IDs with active campaigns
          const mentorIdsWithAds = new Set(campaigns.map((campaign: any) => Number(campaign.mentor_id)))
          setMentorsWithAds(mentorIdsWithAds)
        }
      } catch (error) {
        console.error('Error fetching active campaigns:', error)
      }
    }

    fetchActiveCampaigns()
  }, [mentors])

  // Auto-detect user location on page load for currency conversion
  useEffect(() => {
    if (!userLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error("Error getting location for currency conversion:", error)
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 3600000 // Cache for 1 hour
        }
      )
    }
  }, [userLocation])

  // Search and filter mentors
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
        // Ensure specialization is an array for the search
        const specializationArray = Array.isArray(mentor.specialization) 
          ? mentor.specialization 
          : typeof mentor.specialization === 'string'
          ? (() => {
              try {
                const parsed = JSON.parse(mentor.specialization)
                return Array.isArray(parsed) ? parsed : []
              } catch {
                return []
              }
            })()
          : []
        
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

  // Convert hourly rates to local currency using API-based conversion
  useEffect(() => {
    const convertRates = async () => {
      if (filteredMentors.length === 0) {
        return
      }

      const newRates = new Map<number, string>()

      try {
        // Fetch pricing data from database
        const pricingData = await fetchTutorPricing()

        // Convert rates for all filtered mentors
        await Promise.all(
          filteredMentors.map(async (mentor) => {
            let hourlyRateUSD = mentor.hourly_rate && mentor.hourly_rate > 0 
              ? mentor.hourly_rate 
              : 0

            // If hourly_rate is 0 or missing, fetch from pricing table
            if (hourlyRateUSD === 0) {
              // Get mentor's primary subject from specialization
              let primarySubject = "General"
              if (mentor.specialization && Array.isArray(mentor.specialization) && mentor.specialization.length > 0) {
                primarySubject = mentor.specialization[0]
              } else if (typeof mentor.specialization === "string") {
                try {
                  const parsed = JSON.parse(mentor.specialization)
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    primarySubject = parsed[0]
                  }
                } catch {
                  // Keep default
                }
              }

              // Determine level from mentor data
              const mentorLevel = (mentor as any).level || (mentor as any).education_level || "Secondary"
              const mentorCategory = (mentor as any).category || undefined
              const mentorSubLevel = (mentor as any).sub_level || (mentor as any).grade_level || undefined

              // Find matching pricing
              const matchedPricing = findMatchingPricing(
                pricingData,
                primarySubject,
                mentorLevel,
                mentorCategory,
                mentorSubLevel
              )

              // Get hourly rate in USD (use matched pricing or default to $10)
              hourlyRateUSD = matchedPricing
                ? parseFloat(matchedPricing.hourly_rate_usd.toString())
                : 10.0
            }

            // Convert to local currency using API-based conversion
            // Works even without userLocation (defaults to USD)
            const converted = await convertAndFormatPrice(hourlyRateUSD, userLocation)
            newRates.set(mentor.id, converted.formatted)
          })
        )

        setCurrencyRates(newRates)
      } catch (error) {
        console.error('Error converting rates:', error)
      }
    }

    convertRates()
  }, [userLocation, filteredMentors])

  // Get user's current location
  const getCurrentLocation = () => {
    setIsFindingNearby(true)
    setLocationError(null)
    
    // First, filter mentors with coordinates and open map
    const mentorsWithCoordinates = mentors.filter(mentor => 
      mentor.latitude !== null && mentor.latitude !== undefined &&
      mentor.longitude !== null && mentor.longitude !== undefined
    )
    
    if (mentorsWithCoordinates.length === 0) {
      setLocationError("No mentors with location coordinates found in the database.")
      setIsFindingNearby(false)
      return
    }

    // Open globe viewer immediately with all mentors that have coordinates
    setIsGlobeViewerOpen(true)

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser. Showing all mentors with coordinates.")
      // Still show mentors with coordinates even without user location
      setFilteredMentors(mentorsWithCoordinates)
      setIsFindingNearby(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setUserLocation(location)
        findNearbyMentors(location)
        setIsFindingNearby(false)
      },
      (error) => {
        console.error("Error getting location:", error)
        setLocationError("Unable to retrieve your location. Showing all mentors with coordinates.")
        // Still show mentors with coordinates even if we can't get user location
        setFilteredMentors(mentorsWithCoordinates)
        setIsFindingNearby(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  // Refresh and search for mentors
  const handleRefreshMentors = () => {
    if (userLocation) {
      setIsFindingNearby(true)
      findNearbyMentors(userLocation)
      setTimeout(() => {
        setIsFindingNearby(false)
      }, 1000)
    } else {
      // If no location, get it first
      getCurrentLocation()
    }
  }

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Find nearby mentors with coordinates
  const findNearbyMentors = (location: { lat: number; lng: number }) => {
    // Get all mentors that have coordinates (latitude and longitude)
    const mentorsWithCoordinates = mentors
      .filter(mentor => {
        // Include all mentors that have location coordinates
        return mentor.latitude !== null && mentor.latitude !== undefined &&
               mentor.longitude !== null && mentor.longitude !== undefined
      })
      .map(mentor => {
        // Calculate distance for all mentors with coordinates
        if (mentor.latitude && mentor.longitude) {
          const distance = calculateDistance(
            location.lat,
            location.lng,
            mentor.latitude,
            mentor.longitude
          )
          return { ...mentor, distance }
        }
        return mentor
      })
      .sort((a, b) => {
        // Sort by distance if available, then by online status
        const distA = (a as any).distance || Infinity
        const distB = (b as any).distance || Infinity
        if (distA !== distB) {
          return distA - distB
        }
        // If same distance, prioritize online mentors
        if (a.is_online && !b.is_online) return -1
        if (!a.is_online && b.is_online) return 1
        return 0
      })

    setFilteredMentors(mentorsWithCoordinates)

    if (mentorsWithCoordinates.length === 0) {
      setLocationError("No mentors with location data found. Mentors need to have coordinates set in their profile.")
    } else {
      setLocationError(null)
    }
  }

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

  const handleViewMore = async (mentor: Mentor) => {
    try {
      // Fetch full mentor details
      const response = await fetch(`http://127.0.0.1:8000/api/v1/mentors/detail/${mentor.id}/`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.mentor) {
          setSelectedMentor(data.mentor)
          setIsModalOpen(true)
        }
      }
    } catch (error) {
      console.error("Error fetching mentor details:", error)
    }
  }

  const categories = [
    { id: "all" as MentorCategory, label: "All", icon: Users },
    { id: "tutor" as MentorCategory, label: "Tutors", icon: BookOpen },
    { id: "lecturer" as MentorCategory, label: "Lecturers", icon: GraduationCap },
    { id: "therapist" as MentorCategory, label: "Therapists", icon: Heart },
  ]

  if (loading) {
    return (
      <DashboardLayout userData={userData} role="student">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userData={userData} role="student">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/learner')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>
          
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-12 bg-gradient-to-b from-blue-600 to-blue-700 rounded-full"></div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-blue-900 bg-clip-text text-transparent mb-2">
                  Find Tutors, Lecturers & Therapists
                </h1>
                <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full"></div>
              </div>
            </div>
            <p className="text-lg text-gray-600 ml-4 leading-relaxed max-w-2xl">
              Connect with verified tutors, lecturers, and therapists who can help you achieve your goals
            </p>
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-6">
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
        <div className="mb-8">
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
                onClick={getCurrentLocation}
                disabled={isFindingNearby}
                className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFindingNearby ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Finding...
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5" />
                    Find Nearby
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Location Error */}
          {locationError && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-yellow-800">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{locationError}</span>
            </div>
          )}

          {/* Results Count */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700">
                {filteredMentors.length} {filteredMentors.length === 1 ? 'mentor' : 'mentors'} found
                {selectedCategory !== "all" && ` (${categories.find(c => c.id === selectedCategory)?.label})`}
                {userLocation && <span className="text-blue-600"> nearby</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Mentors Grid */}
        {mentorsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredMentors.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 text-lg mb-4">No mentors found</p>
            <p className="text-gray-400 text-sm mb-6">
              {search || selectedCategory !== "all" || userLocation ? "Try adjusting your search terms or filters" : "Check back later for available mentors"}
            </p>
            {(search || userLocation) && (
              <Button
                onClick={() => setIsGlobeViewerOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg flex items-center gap-2 mx-auto"
              >
                <Navigation className="w-5 h-5" />
                Explore on Globe
              </Button>
            )}
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
                  {/* Sponsored Badge - Top Right Corner */}
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
                          onClick={() => {
                            setProfilePictureMentor(mentor)
                            setIsProfilePictureModalOpen(true)
                          }}
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
                              title="This mentor has active advertising"
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
                      <div className="text-lg font-bold text-blue-600">
                        {currencyRates.get(mentor.id) || (mentor.hourly_rate && mentor.hourly_rate > 0 
                          ? `$${mentor.hourly_rate.toFixed(2)}` 
                          : 'Loading...')}
                      </div>
                      <div className="text-xs text-gray-500">
                        /hour
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
                      // Ensure specialization is always an array
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
                      // Ensure specialization is always an array for length check
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

                  {/* Location and Distance */}
                  {(mentor.city || mentor.country || (mentor as any).distance) && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {mentor.city && mentor.country
                          ? `${mentor.city}, ${mentor.country}`
                          : mentor.country || mentor.city}
                        {(mentor as any).distance && (
                          <span className="ml-2 font-medium text-blue-600">
                            • {(mentor as any).distance.toFixed(1)} km away
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-auto pt-4 border-t border-gray-200 space-y-2">
                    <Button
                      onClick={() => handleViewMore(mentor)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View More
                    </Button>
                    <Button
                      onClick={() => {
                        setBookingMentor(mentor)
                        setIsBookingModalOpen(true)
                      }}
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

      {/* Modals */}
      {selectedMentor && (
        <MentorDetailsModal
          mentor={selectedMentor}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedMentor(null)
          }}
          onBookSession={(mentorId) => {
            const mentorToBook = mentors.find(m => m.id === mentorId)
            if (mentorToBook) {
              setBookingMentor(mentorToBook)
              setIsBookingModalOpen(true)
              setIsModalOpen(false)
            }
          }}
          userLocation={userLocation}
        />
      )}

      {bookingMentor && (
        <BookingModal
          mentor={bookingMentor}
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false)
            setBookingMentor(null)
          }}
          userLocation={userLocation}
        />
      )}

      {profilePictureMentor && (
        <ProfilePictureModal
          isOpen={isProfilePictureModalOpen}
          onClose={() => {
            setIsProfilePictureModalOpen(false)
            setProfilePictureMentor(null)
          }}
          imageUrl={profilePictureMentor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profilePictureMentor.name)}&background=3B82F6&color=fff&size=128`}
          mentorName={profilePictureMentor.name}
        />
      )}

      {/* Globe Viewer */}
      <GlobeViewer
        isOpen={isGlobeViewerOpen}
        onClose={() => setIsGlobeViewerOpen(false)}
        userLocation={userLocation}
        mentors={filteredMentors.map(m => ({
          id: m.id,
          name: m.name,
          latitude: m.latitude,
          longitude: m.longitude,
          city: m.city,
          country: m.country,
          is_online: m.is_online,
          distance: (m as any).distance,
          avatar: m.avatar,
          specialization: m.specialization,
          title: m.title,
          rating: m.rating,
          total_reviews: m.total_reviews
        }))}
        onMentorClick={(mentor) => {
          const fullMentor = mentors.find(m => m.id === mentor.id)
          if (fullMentor) {
            handleViewMore(fullMentor)
            setIsGlobeViewerOpen(false)
          }
        }}
        userAvatar={userData?.avatar_url || userData?.avatar || null}
        userName={userData?.full_name || userData?.name || null}
        isSearching={isFindingNearby}
        onRefresh={handleRefreshMentors}
      />
    </DashboardLayout>
  )
}

