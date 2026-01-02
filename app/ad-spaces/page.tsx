"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MapPin, Video, Users, Star, Heart, MessageSquare, Calendar, Clock, Globe, CheckCircle, CheckCircle2, Filter, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { LoadingLogo } from "@/components/loading-logo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar-client"
import { PageContainer } from "@/components/page-container"
import { AnimatePresence, motion } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"

// Tutor/Mentor interface
interface Tutor {
  id: number
  name: string
  avatar: string
  verified: boolean
  rating: number
  reviews: number
  subjects: string[]
  location: {
    city: string
    country: string
    coordinates: { lat: number; lng: number }
  }
  distance?: number // in km
  sessionTypes: ("contact" | "online")[]
  price: {
    contact: number
    online: number
    currency: string
  }
  availability: string
  description: string
  experience: string
  languages: string[]
}

// Sample tutor data (fallback)
const tutorsFallback: Tutor[] = []

export default function FindTutorsPage() {
  const [search, setSearch] = useState("")
  const [sessionType, setSessionType] = useState<"all" | "contact" | "online">("all")
  const [sortBy, setSortBy] = useState<"distance" | "rating" | "price">("distance")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const cardsPerView = 3

  // Fetch mentors from database
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        setLoading(true)
        
        // Try Django API first
        try {
          const response = await fetch('http://127.0.0.1:8000/api/v1/mentors/')
          if (response.ok) {
            const data = await response.json()
            if (data && data.length > 0) {
              const mappedTutors = data.map((mentor: any) => mapMentorToTutor(mentor))
              setTutors(mappedTutors)
              setLoading(false)
              return
            }
          }
        } catch (apiError) {
          console.log("API fetch failed, trying Supabase directly:", apiError)
        }

        // Fallback to Supabase
        const { data: mentorsData, error } = await supabase
          .from('mentors')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.error("Error fetching mentors:", error)
          setTutors([])
        } else if (mentorsData && mentorsData.length > 0) {
          const mappedTutors = mentorsData.map((mentor: any) => mapMentorToTutor(mentor))
          setTutors(mappedTutors)
        } else {
          setTutors([])
        }
      } catch (error) {
        console.error("Error fetching mentors:", error)
        setTutors([])
      } finally {
        setLoading(false)
      }
    }

    fetchMentors()
  }, [])

  // Map mentor data to Tutor interface
  const mapMentorToTutor = (mentor: any): Tutor => {
    // Parse specialization
    let specializations: string[] = []
    if (Array.isArray(mentor.specialization)) {
      specializations = mentor.specialization
    } else if (typeof mentor.specialization === 'string') {
      try {
        specializations = JSON.parse(mentor.specialization || '[]')
      } catch {
        specializations = []
      }
    }

    // Parse languages
    let languages: string[] = []
    if (Array.isArray(mentor.languages)) {
      languages = mentor.languages
    } else if (typeof mentor.languages === 'string') {
      try {
        languages = JSON.parse(mentor.languages || '[]')
      } catch {
        languages = []
      }
    }

    // Determine session types (assume both if available)
    const sessionTypes: ("contact" | "online")[] = ["contact", "online"]

    // Get hourly rate
    const hourlyRate = parseFloat(mentor.hourly_rate) || 0

    return {
      id: parseInt(mentor.id) || 0,
      name: mentor.name || 'Unknown Mentor',
      avatar: mentor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name || 'Mentor')}&background=3B82F6&color=fff&size=128`,
      verified: mentor.is_verified || false,
      rating: parseFloat(mentor.rating) || 0,
      reviews: mentor.total_reviews || 0,
      subjects: specializations.length > 0 ? specializations : ['General'],
      location: {
        city: mentor.country || 'Unknown',
        country: mentor.country || 'South Africa',
        coordinates: {
          lat: parseFloat(mentor.latitude) || -33.9249,
          lng: parseFloat(mentor.longitude) || 18.4241
        }
      },
      sessionTypes,
      price: {
        contact: hourlyRate,
        online: hourlyRate * 0.8, // Online is 80% of contact price
        currency: "R"
      },
      availability: mentor.availability || 'Available now',
      description: mentor.description || 'Experienced mentor ready to help you learn.',
      experience: `${mentor.experience || 0}+ years`,
      languages: languages.length > 0 ? languages : ['English']
    }
  }

  // Get user location (simulated - in real app, use geolocation API)
  useEffect(() => {
    // Simulate user location (Cape Town center)
    setUserLocation({ lat: -33.9249, lng: 18.4241 })
  }, [])

  // Calculate distance for tutors
  const calculateDistance = (tutor: Tutor): number => {
    if (!userLocation) return 0
    const R = 6371 // Earth's radius in km
    const dLat = (tutor.location.coordinates.lat - userLocation.lat) * Math.PI / 180
    const dLon = (tutor.location.coordinates.lng - userLocation.lng) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(tutor.location.coordinates.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Filter and sort tutors
  const filteredTutors = tutors
    .map(tutor => ({
      ...tutor,
      distance: calculateDistance(tutor)
    }))
    .filter(tutor => {
      const matchesSearch = 
        tutor.name.toLowerCase().includes(search.toLowerCase()) ||
        tutor.subjects.some(subject => subject.toLowerCase().includes(search.toLowerCase())) ||
        tutor.location.city.toLowerCase().includes(search.toLowerCase())
      
      const matchesSessionType = 
        sessionType === "all" || tutor.sessionTypes.includes(sessionType)
      
      return matchesSearch && matchesSessionType
    })
    .sort((a, b) => {
      if (sortBy === "distance") return a.distance! - b.distance!
      if (sortBy === "rating") return b.rating - a.rating
      if (sortBy === "price") {
        const priceA = sessionType === "contact" ? a.price.contact : a.price.online
        const priceB = sessionType === "contact" ? b.price.contact : b.price.online
        return priceA - priceB
      }
      return 0
    })

  // Carousel navigation
  const maxIndex = Math.max(0, filteredTutors.length - cardsPerView)
  
  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))
  }

  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < maxIndex

  // Reset to first card when search/filters change
  useEffect(() => {
    setCurrentIndex(0)
  }, [search, sessionType, sortBy])

  // Get visible tutors based on current index
  const visibleTutors = filteredTutors.slice(currentIndex, currentIndex + cardsPerView)

  const handleViewDetails = (tutor: Tutor) => {
    setSelectedTutor(tutor)
    setIsModalOpen(true)
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: "url('/images/adspace.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 0,
        }}
        aria-hidden="true"
      />
      <Navbar />
      <main className="flex-1 relative z-10">
        <div className="container py-12 max-w-7xl mx-auto px-4">
          <div className="text-center py-5 mb-8 mt-16">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Find Tutors
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Search for nearby tutors or online mentors for contact and online sessions
            </p>
            
            {/* Search and Filters */}
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex gap-4">
                <Input
                  type="text"
                  placeholder="Search by name, subject, or location..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-white/90 text-gray-900 border-blue-200"
                />
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  className="bg-white/90 border-blue-200 text-gray-900"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>

              {/* Filter Panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white/90 rounded-lg p-4 border border-blue-200"
                  >
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Session Type</label>
                        <Select value={sessionType} onValueChange={(value: any) => setSessionType(value)}>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Sessions</SelectItem>
                            <SelectItem value="contact">Contact Sessions</SelectItem>
                            <SelectItem value="online">Online Sessions</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
                        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="distance">Distance (Nearest)</SelectItem>
                            <SelectItem value="rating">Highest Rating</SelectItem>
                            <SelectItem value="price">Lowest Price</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Tutors Carousel */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <LoadingLogo size={32} />
            </div>
          ) : filteredTutors.length === 0 ? (
            <div className="text-center text-white py-20">
              <p className="text-2xl font-bold">No tutors found. Try a different search!</p>
            </div>
          ) : (
            <div className="relative flex items-center gap-4 max-w-7xl mx-auto">
              {/* Left Arrow */}
              {canGoPrevious && (
                <button
                  onClick={handlePrevious}
                  className="flex-shrink-0 bg-white rounded-full p-3 shadow-lg border border-gray-200 hover:bg-gray-50 transition-all hover:scale-110 z-10"
                  aria-label="Previous tutors"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>
              )}

              <div className="flex-1 overflow-hidden relative">
                <motion.div
                  className="flex gap-8"
                  animate={{
                    x: `-${currentIndex * (100 / cardsPerView)}%`
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8
                  }}
                >
                  {filteredTutors.map((tutor) => (
                    <div
                      key={tutor.id}
                      className="flex-shrink-0"
                      style={{
                        width: `calc((100% - ${(cardsPerView - 1) * 2}rem) / ${cardsPerView})`
                      }}
                    >
                      <motion.div
                        key={tutor.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full bg-white rounded-2xl border-2 border-blue-200 shadow-xl p-6 flex flex-col"
                      >
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <Avatar className="h-20 w-20 rounded-full border-2 border-blue-300 shadow-md ring-2 ring-blue-100 overflow-hidden flex-shrink-0">
                        <AvatarImage 
                          src={tutor.avatar} 
                          alt={tutor.name}
                          className="object-cover w-full h-full rounded-full"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-semibold text-lg rounded-full flex items-center justify-center">
                          {tutor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {tutor.verified && (
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-white shadow-lg z-10">
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{tutor.name}</span>
                        {tutor.verified && (
                          <Badge className="bg-blue-500 text-white border-blue-600 text-xs px-2 py-0.5">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-gray-600">{tutor.rating.toFixed(1)} ({tutor.reviews} reviews)</span>
                      </div>
                    </div>
                  </div>

                  {/* Location & Distance */}
                  <div className="flex items-center gap-2 mb-3 text-sm text-gray-700">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span>{tutor.location.city}, {tutor.location.country}</span>
                    {tutor.distance && (
                      <span className="text-blue-600 font-medium">• {tutor.distance.toFixed(1)} km away</span>
                    )}
                        </div>

                  {/* Subjects */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tutor.subjects.slice(0, 3).map((subject, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-blue-100 text-blue-700 border border-blue-200">
                        {subject}
                      </Badge>
                          ))}
                        </div>

                  {/* Session Types */}
                  <div className="flex gap-2 mb-3">
                    {tutor.sessionTypes.includes("contact") && (
                      <Badge className="bg-green-100 text-green-700 border border-green-200">
                        <Users className="h-3 w-3 mr-1" />
                        Contact
                      </Badge>
                    )}
                    {tutor.sessionTypes.includes("online") && (
                      <Badge className="bg-purple-100 text-purple-700 border border-purple-200">
                        <Video className="h-3 w-3 mr-1" />
                        Online
                      </Badge>
                    )}
                  </div>

                  {/* Pricing */}
                  <div className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-100">
                    <div className="text-xs text-gray-600 mb-1">Starting from</div>
                    <div className="text-xl font-bold text-gray-900">
                      {tutor.currency}
                      {sessionType === "contact" && tutor.price.contact > 0
                        ? tutor.price.contact
                        : sessionType === "online" && tutor.price.online > 0
                        ? tutor.price.online
                        : tutor.price.contact > 0
                        ? tutor.price.contact
                        : tutor.price.online}
                      <span className="text-sm font-normal text-gray-600">/session</span>
                    </div>
                        </div>

                  {/* Availability */}
                  <div className="flex items-center gap-2 mb-4 text-sm text-gray-700">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span>{tutor.availability}</span>
                        </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    <Button
                      variant="outline"
                      size="icon"
                      className="hover:bg-red-50 text-gray-500 hover:text-red-500"
                    >
                      <Heart className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="hover:bg-blue-50 text-gray-500 hover:text-blue-500"
                    >
                      <MessageSquare className="h-5 w-5" />
                    </Button>
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleViewDetails(tutor)}
                    >
                      View Details
                    </Button>
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right Arrow */}
              {canGoNext && (
                <button
                  onClick={handleNext}
                  className="flex-shrink-0 bg-white rounded-full p-3 shadow-lg border border-gray-200 hover:bg-gray-50 transition-all hover:scale-110 z-10"
                  aria-label="Next tutors"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700" />
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Tutor Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-full max-w-2xl bg-white">
          {selectedTutor && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedTutor.avatar} alt={selectedTutor.name} />
                    <AvatarFallback>{selectedTutor.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-2xl flex items-center gap-2">
                      {selectedTutor.name}
                      {selectedTutor.verified && (
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      )}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-gray-600">{selectedTutor.rating} ({selectedTutor.reviews} reviews)</span>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                    <div className="flex items-center gap-2 text-gray-700">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span>{selectedTutor.location.city}, {selectedTutor.location.country}</span>
                      {selectedTutor.distance && (
                        <span className="text-blue-600">• {selectedTutor.distance.toFixed(1)} km away</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Subjects</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTutor.subjects.map((subject, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-blue-100 text-blue-700">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Session Types</h3>
                    <div className="flex gap-2">
                      {selectedTutor.sessionTypes.includes("contact") && (
                        <Badge className="bg-green-100 text-green-700">
                          <Users className="h-3 w-3 mr-1" />
                          Contact Sessions: {selectedTutor.currency}{selectedTutor.price.contact}/session
                        </Badge>
                      )}
                      {selectedTutor.sessionTypes.includes("online") && (
                        <Badge className="bg-purple-100 text-purple-700">
                          <Video className="h-3 w-3 mr-1" />
                          Online Sessions: {selectedTutor.currency}{selectedTutor.price.online}/session
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">About</h3>
                    <p className="text-gray-700 text-sm">{selectedTutor.description}</p>
                      </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Experience</h3>
                    <p className="text-gray-700">{selectedTutor.experience}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Languages</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTutor.languages.map((lang, idx) => (
                        <Badge key={idx} variant="outline">{lang}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Availability</h3>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock className="h-4 w-4 text-green-600" />
                      <span>{selectedTutor.availability}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Close
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Session
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  )
}
