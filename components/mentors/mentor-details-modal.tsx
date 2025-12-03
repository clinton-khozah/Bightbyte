"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Star,
  CheckCircle2,
  MapPin,
  Globe,
  Mail,
  Phone,
  Calendar,
  Clock,
  Award,
  BookOpen,
} from "lucide-react";
import { convertAndFormatPrice } from "@/lib/currency";
import { fetchTutorPricing, findMatchingPricing } from "@/lib/tutor-pricing";
import { RatingModal } from "./rating-modal";

interface Mentor {
  id: number;
  supabase_id: string;
  name: string;
  title: string;
  description: string;
  specialization: string[] | string;
  rating: number;
  total_reviews: number;
  hourly_rate: number;
  level?: string;
  education_level?: string;
  category?: string;
  sub_level?: string;
  grade_level?: string;
  avatar: string;
  experience: string;
  languages: string[];
  availability: string;
  country?: string;
  is_verified?: boolean;
  email?: string;
  phone_number?: string;
  qualifications?: string;
  linkedin_profile?: string;
  github_profile?: string;
  twitter_profile?: string;
  facebook_profile?: string;
  instagram_profile?: string;
  personal_website?: string;
  sessions_conducted?: number;
}

interface TutorRequest {
  id: number;
  status: string;
  payment_status: string;
  meeting_link?: string | null;
  meetingLink?: string | null;
}

interface MentorDetailsModalProps {
  mentor: Mentor | null;
  isOpen: boolean;
  onClose: () => void;
  onBookSession: (mentorId: number) => void;
  userLocation?: { lat: number; lng: number } | null;
  relatedRequest?: TutorRequest | null;
}

export function MentorDetailsModal({
  mentor,
  isOpen,
  onClose,
  onBookSession,
  userLocation,
  relatedRequest,
}: MentorDetailsModalProps) {
  const [convertedRate, setConvertedRate] = useState<string>("");
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState<string>("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  useEffect(() => {
    const convertRate = async () => {
      if (!mentor) return;

      let hourlyRateUSD = mentor.hourly_rate && mentor.hourly_rate > 0 
        ? mentor.hourly_rate 
        : 0

      // If hourly_rate is 0 or missing, fetch from pricing table
      if (hourlyRateUSD === 0) {
        try {
          const pricingData = await fetchTutorPricing()
          
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
          const mentorLevel = mentor.level || mentor.education_level || "Secondary"
          const mentorCategory = mentor.category || undefined
          const mentorSubLevel = mentor.sub_level || mentor.grade_level || undefined

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
        } catch (error) {
          console.error("Error fetching tutor pricing:", error)
          hourlyRateUSD = 10.0 // Default fallback
        }
      }

      // Convert to local currency using API-based conversion
      const converted = await convertAndFormatPrice(
        hourlyRateUSD,
        userLocation || null
      );
      setConvertedRate(converted.formatted);
    };
    convertRate();
  }, [mentor, userLocation]);

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <Star
          key="half"
          className="w-4 h-4 text-yellow-400 fill-yellow-400 opacity-50"
        />
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star
          key={`empty-${i}`}
          className="w-4 h-4 text-gray-300 fill-gray-300"
        />
      );
    }

    return stars;
  };

  if (!mentor) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-4 pr-16">
                  <img
                    src={mentor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name)}&background=3B82F6&color=fff&size=128`}
                    alt={mentor.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name)}&background=3B82F6&color=fff&size=128`;
                    }}
                  />
                  <div className="flex-1 text-white">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-2xl font-bold">{mentor.name}</h2>
                      {mentor.is_verified && (
                        <CheckCircle2 className="w-5 h-5 fill-white text-blue-600" />
                      )}
                    </div>
                    <p className="text-blue-100 mb-2">{mentor.title}</p>
                    <button
                      onClick={() => setIsRatingModalOpen(true)}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer group"
                      title="Click to rate this tutor"
                    >
                      <div className="flex items-center gap-1">
                        {renderStars(mentor.rating)}
                      </div>
                      <span className="font-medium">{mentor.rating}</span>
                      <span className="text-blue-100">
                        ({mentor.total_reviews} reviews)
                      </span>
                      <span className="text-xs text-blue-200 opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to rate
                      </span>
                    </button>
                  </div>
                  <div className="text-right text-white ml-auto">
                    <div className="text-2xl font-bold">
                      {convertedRate || (mentor.hourly_rate && mentor.hourly_rate > 0 
                        ? `$${mentor.hourly_rate.toFixed(2)}` 
                        : 'Loading...')}
                    </div>
                    <div className="text-sm text-blue-100">per hour</div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* About Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      About
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {mentor.description}
                    </p>
                  </div>

                  {/* Specializations */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Specializations
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {mentor.specialization?.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-full border border-blue-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Experience, Languages, Availability, Location - Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Experience */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <Award className="w-4 h-4" />
                        <span className="text-sm font-medium">Experience</span>
                      </div>
                      <p className="text-gray-900 font-semibold text-base">
                        {mentor.experience}
                      </p>
                    </div>

                    {/* Languages */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <Globe className="w-4 h-4" />
                        <span className="text-sm font-medium">Languages</span>
                      </div>
                      <p className="text-gray-900 font-semibold text-base">
                        {mentor.languages?.join(", ") || "N/A"}
                      </p>
                    </div>

                    {/* Availability */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Availability
                        </span>
                      </div>
                      <div className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium border border-green-200">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>
                        {mentor.availability}
                      </div>
                    </div>

                    {/* Location */}
                    {mentor.country && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm font-medium">Location</span>
                        </div>
                        <p className="text-gray-900 font-semibold text-base">
                          {mentor.country}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Statistics and Social Links - Side by Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Statistics */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Statistics
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="text-2xl font-bold text-blue-600">
                            {mentor.total_reviews}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Total Reviews
                          </div>
                        </div>
                        {mentor.sessions_conducted !== undefined && (
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <div className="text-2xl font-bold text-blue-600">
                              {mentor.sessions_conducted}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              Sessions
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Social Links */}
                    {(mentor.linkedin_profile ||
                      mentor.github_profile ||
                      mentor.twitter_profile ||
                      mentor.facebook_profile ||
                      mentor.instagram_profile ||
                      mentor.personal_website) && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">
                          Social Links
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {mentor.linkedin_profile && (
                            <a
                              href={mentor.linkedin_profile}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                              title="LinkedIn"
                            >
                              <svg
                                className="w-5 h-5 text-blue-600"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                              </svg>
                            </a>
                          )}
                          {mentor.github_profile && (
                            <a
                              href={mentor.github_profile}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              title="GitHub"
                            >
                              <svg
                                className="w-5 h-5 text-gray-700"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                              </svg>
                            </a>
                          )}
                          {mentor.personal_website && (
                            <a
                              href={mentor.personal_website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Website"
                            >
                              <Globe className="w-5 h-5 text-blue-600" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-white hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
                >
                  Close
                </button>
                {/* Hide Book Session button if request is paid and has meeting link */}
                {!(
                  relatedRequest &&
                  relatedRequest.status === "accepted" &&
                  relatedRequest.payment_status === "paid" &&
                  (relatedRequest.meeting_link || relatedRequest.meetingLink)
                ) && (
                  <button
                    onClick={async () => {
                      // Check if user is authenticated
                      const { supabase } = await import('@/lib/supabase');
                      const { data: { user } } = await supabase.auth.getUser();
                      
                      if (user) {
                        // User is authenticated, store mentor ID and redirect to dashboard
                        localStorage.setItem('tutorToBookId', mentor.id.toString());
                        onClose();
                        window.location.href = '/dashboard/learner';
                      } else {
                        // User not authenticated, store mentor ID and open sign-in
                        localStorage.setItem('tutorToBookId', mentor.id.toString());
                        onClose();
                        // Redirect to home page with sign-in
                        window.location.href = '/?signin=true';
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    Book Session
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Rating Modal */}
          {mentor && (
            <RatingModal
              isOpen={isRatingModalOpen}
              onClose={() => setIsRatingModalOpen(false)}
              mentorId={mentor.id}
              mentorName={mentor.name}
              onRatingSubmitted={() => {
                setIsRatingModalOpen(false)
                // Parent component should refresh mentor data
              }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
