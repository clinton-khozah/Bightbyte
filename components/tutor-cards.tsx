"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar-client";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LoadingLogo } from "@/components/loading-logo";
import dynamic from "next/dynamic";

// Dynamically import modals to avoid SSR issues
const SignInModal = dynamic(
  () => import("@/components/auth/sign-in-modal").then((mod) => ({ default: mod.SignInModal })),
  { ssr: false }
);

const SignUpModal = dynamic(
  () => import("@/components/auth/sign-up-modal").then((mod) => ({ default: mod.SignUpModal })),
  { ssr: false }
);

const GPTPricingModal = dynamic(
  () => import("@/components/pricing/gpt-pricing-modal").then((mod) => ({ default: mod.GPTPricingModal })),
  { ssr: false }
);
import {
  calculateDynamicPricing,
  PricingFactors,
  PriceBreakdown,
  getSubjectDemand,
  getTimeOfDay,
  getDayType,
} from "@/lib/pricing-calculator";
import { updateMentorPrice, calculateAIPrice } from "@/lib/pricing-api";
import {
  getDynamicPricingFactors,
  DynamicPricingState,
} from "@/lib/dynamic-pricing-factors";
import {
  convertUSDToLocal,
  getCurrencyForCountry,
} from "@/lib/currency-exchange";
import { getTutorPricing } from "@/lib/tutor-pricing";

interface Tutor {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  description: string;
  followers: string;
  engagement: string;
  categories: string[];
  languages: string[];
  status: "trending" | "verified";
  rating: number;
  // Pricing data
  baseHourlyRate: number;
  experience: number;
  totalReviews: number;
  totalBookings: number;
  location: {
    country: string;
    city?: string;
  };
  availability: "high" | "medium" | "low";
  // Calculated dynamic price (for 60 min session) - stored in USD
  dynamicPrice?: number;
  currency?: string;
  // Display price in local currency (converted from USD)
  displayPrice?: number;
  displayCurrency?: string;
}

interface TutorCardsProps {
  searchQuery?: string;
  selectedCategory?: string | null;
}

export function TutorCards({
  searchQuery = "",
  selectedCategory = null,
}: TutorCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [allTutors, setAllTutors] = useState<Tutor[]>([]); // Store all tutors
  const [loading, setLoading] = useState(true);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [dynamicFactors, setDynamicFactors] =
    useState<DynamicPricingState | null>(null);
  const cardsPerView = 3;
  const containerRef = useRef<HTMLDivElement>(null);

  // Note: Pricing is now fetched from database and doesn't need dynamic updates
  // Database pricing is static and based on level, category, subject, and sub_level
  // Currency conversion happens automatically based on tutor's country

  // Fetch mentors from database
  useEffect(() => {
    const fetchMentors = async () => {
      try {
        setLoading(true);

        // Try API first
        try {
          const response = await fetch(
            "http://127.0.0.1:8000/api/v1/mentors/list/",
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.mentors) {
              // Use async map to calculate AI prices for all tutors
              const mappedTutors: Tutor[] = await Promise.all(
                data.mentors.map(async (mentor: any) => {
                  // Parse specialization
                  let specializations: string[] = [];
                  if (Array.isArray(mentor.specialization)) {
                    specializations = mentor.specialization;
                  } else if (typeof mentor.specialization === "string") {
                    try {
                      specializations = JSON.parse(
                        mentor.specialization || "[]"
                      );
                    } catch {
                      specializations = [];
                    }
                  }

                  // Parse languages
                  let languages: string[] = [];
                  if (Array.isArray(mentor.languages)) {
                    languages = mentor.languages;
                  } else if (typeof mentor.languages === "string") {
                    try {
                      languages = JSON.parse(mentor.languages || "[]");
                    } catch {
                      languages = [];
                    }
                  }

                  // Generate handle from name
                  const handle = `@${mentor.name
                    .toLowerCase()
                    .replace(/\s+/g, "")}`;

                  // Calculate followers (sessions conducted * 1000 for demo)
                  const followers = mentor.sessions_conducted
                    ? `${(mentor.sessions_conducted * 1000).toLocaleString()}`
                    : "0";

                  // Calculate engagement (rating * 3 for demo)
                  const engagement = mentor.rating
                    ? `${(mentor.rating * 3).toFixed(1)}%`
                    : "0%";

                  // Determine status
                  const status: "trending" | "verified" = mentor.is_verified
                    ? "verified"
                    : mentor.rating >= 4.5
                    ? "trending"
                    : "trending";

                  // Get pricing from database based on tutor's subject, level, category, and sub_level
                  const experience = parseFloat(mentor.experience) || 0;
                  const rating = parseFloat(mentor.rating) || 4.0;
                  const totalReviews = mentor.total_reviews || 0;
                  const totalBookings = mentor.sessions_conducted || 0;
                  const primarySubject =
                    specializations.length > 0
                      ? specializations[0]
                      : mentor.title || "General";

                  // Extract level, category, and sub_level from mentor data if available
                  // These might be in the mentor object or need to be inferred
                  const tutorLevel =
                    mentor.level || mentor.education_level || undefined;
                  const tutorCategory = mentor.category || undefined;
                  const tutorSubLevel =
                    mentor.sub_level || mentor.grade_level || undefined;
                  const tutorCountry = mentor.country || "South Africa";

                  // Debug: Log subject and mentor info
                  console.log(
                    `Tutor: ${mentor.name}, Subject: "${primarySubject}", Country: ${tutorCountry}`
                  );

                  // Fetch pricing from database
                  const pricingMatch = await getTutorPricing(
                    primarySubject,
                    tutorCountry,
                    tutorLevel,
                    tutorCategory,
                    tutorSubLevel
                  );

                  console.log(`Pricing for ${mentor.name}:`, {
                    subject: primarySubject,
                    matched: pricingMatch.pricing ? "YES" : "NO",
                    usd: pricingMatch.hourlyRateUSD,
                    local: pricingMatch.hourlyRateLocal,
                    currency: pricingMatch.currencySymbol,
                  });

                  // Use database pricing (hourly rate in USD)
                  const baseRate = pricingMatch.hourlyRateUSD;
                  const priceBreakdown = {
                    basePrice: baseRate,
                    total: baseRate, // For 60-minute session, hourly rate = session price
                    breakdown: {
                      base: baseRate,
                      experience: 0,
                      rating: 0,
                      subjectDemand: 0,
                      timeOfDay: 0,
                      location: 0,
                      urgency: 0,
                      sessionType: 0,
                      studentLevel: 0,
                      realTimeDemand: 0,
                    },
                  };

                  const tutorData: Tutor = {
                    id: mentor.id,
                    name: mentor.name,
                    handle: handle,
                    avatar:
                      mentor.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        mentor.name
                      )}&background=3B82F6&color=fff&size=128`,
                    description:
                      mentor.description ||
                      mentor.title ||
                      "Experienced mentor ready to help you learn.",
                    followers: followers,
                    engagement: engagement,
                    categories:
                      specializations.length > 0
                        ? specializations
                        : [mentor.title || "General"],
                    languages: languages || [],
                    status: status,
                    rating: rating,
                    baseHourlyRate: baseRate,
                    experience: experience,
                    totalReviews: totalReviews,
                    totalBookings: totalBookings,
                    location: {
                      country: mentor.country || "South Africa",
                      city: mentor.city,
                    },
                    availability:
                      totalBookings > 100
                        ? "low"
                        : totalBookings > 50
                        ? "medium"
                        : "high",
                    dynamicPrice: priceBreakdown.total, // USD price
                    currency: "USD", // Always USD in database
                    // Convert to local currency for display
                    displayPrice: pricingMatch.hourlyRateLocal,
                    displayCurrency: pricingMatch.currencySymbol,
                  };

                  // Debug: Log languages for each tutor
                  if (languages && languages.length > 0) {
                    console.log(
                      `Tutor ${mentor.name} has languages:`,
                      languages
                    );
                  }

                  return tutorData;
                })
              );
              console.log(`Mapped ${mappedTutors.length} tutors from API`);

              // Sort by rating (descending)
              const sortedTutors = mappedTutors.sort(
                (a, b) => b.rating - a.rating
              );

              // Store all tutors
              setAllTutors(sortedTutors);

              // Only show top 10 if no search/category filter is active
              const displayTutors =
                searchQuery.trim() || selectedCategory
                  ? sortedTutors
                  : sortedTutors.slice(0, 10);

              console.log(
                `Displaying ${displayTutors.length} tutors (${
                  searchQuery.trim() || selectedCategory
                    ? "all matching"
                    : "top 10"
                })`
              );
              setTutors(displayTutors);
              setLoading(false);
              return;
            } else {
              console.log("API returned data but no mentors found");
            }
          } else {
            console.log("API response not OK:", response.status);
          }
        } catch (apiError) {
          console.log("API fetch failed, trying Supabase directly:", apiError);
        }

        // Fallback to Supabase
        const { data: mentorsData, error } = await supabase
          .from("mentors")
          .select("*")
          .limit(20);

        console.log("Supabase fetch result:", { mentorsData, error });

        if (error) {
          console.error("Error fetching mentors from Supabase:", error);
          setTutors([]);
        } else if (mentorsData && mentorsData.length > 0) {
          console.log(`Found ${mentorsData.length} mentors from Supabase`);
          // Use async map to calculate AI prices for all tutors
          const mappedTutors: Tutor[] = await Promise.all(
            mentorsData.map(async (mentor: any) => {
              // Parse specialization
              let specializations: string[] = [];
              if (Array.isArray(mentor.specialization)) {
                specializations = mentor.specialization;
              } else if (typeof mentor.specialization === "string") {
                try {
                  specializations = JSON.parse(mentor.specialization || "[]");
                } catch {
                  specializations = [];
                }
              }

              // Parse languages
              let languages: string[] = [];
              if (Array.isArray(mentor.languages)) {
                languages = mentor.languages;
              } else if (typeof mentor.languages === "string") {
                try {
                  languages = JSON.parse(mentor.languages || "[]");
                } catch {
                  languages = [];
                }
              }

              // Generate handle from name
              const handle = `@${mentor.name
                .toLowerCase()
                .replace(/\s+/g, "")}`;

              // Calculate followers (sessions conducted * 1000 for demo)
              const followers = mentor.sessions_conducted
                ? `${(mentor.sessions_conducted * 1000).toLocaleString()}`
                : "0";

              // Calculate engagement (rating * 3 for demo)
              const engagement = mentor.rating
                ? `${(mentor.rating * 3).toFixed(1)}%`
                : "0%";

              // Determine status
              const status: "trending" | "verified" = mentor.is_verified
                ? "verified"
                : mentor.rating >= 4.5
                ? "trending"
                : "trending";

              // Get pricing from database based on tutor's subject, level, category, and sub_level
              const experience = parseFloat(mentor.experience) || 0;
              const rating = parseFloat(mentor.rating) || 4.0;
              const totalReviews = mentor.total_reviews || 0;
              const totalBookings = mentor.sessions_conducted || 0;
              const primarySubject =
                specializations.length > 0
                  ? specializations[0]
                  : mentor.title || "General";

              // Extract level, category, and sub_level from mentor data if available
              const tutorLevel =
                mentor.level || mentor.education_level || undefined;
              const tutorCategory = mentor.category || undefined;
              const tutorSubLevel =
                mentor.sub_level || mentor.grade_level || undefined;
              const tutorCountry = mentor.country || "South Africa";

              // Fetch pricing from database
              const pricingMatch = await getTutorPricing(
                primarySubject,
                tutorCountry,
                tutorLevel,
                tutorCategory,
                tutorSubLevel
              );

              // Use database pricing (hourly rate in USD)
              const baseRate = pricingMatch.hourlyRateUSD;
              const priceBreakdown = {
                basePrice: baseRate,
                total: baseRate, // For 60-minute session, hourly rate = session price
                breakdown: {
                  base: baseRate,
                  experience: 0,
                  rating: 0,
                  subjectDemand: 0,
                  timeOfDay: 0,
                  location: 0,
                  urgency: 0,
                  sessionType: 0,
                  studentLevel: 0,
                  realTimeDemand: 0,
                },
              };

              const tutorData: Tutor = {
                id: mentor.id,
                name: mentor.name,
                handle: handle,
                avatar:
                  mentor.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    mentor.name
                  )}&background=3B82F6&color=fff&size=128`,
                description:
                  mentor.description ||
                  mentor.title ||
                  "Experienced mentor ready to help you learn.",
                followers: followers,
                engagement: engagement,
                categories:
                  specializations.length > 0
                    ? specializations
                    : [mentor.title || "General"],
                languages: languages || [],
                status: status,
                rating: rating,
                baseHourlyRate: baseRate,
                experience: experience,
                totalReviews: totalReviews,
                totalBookings: totalBookings,
                location: {
                  country: mentor.country || "South Africa",
                  city: mentor.city,
                },
                availability:
                  totalBookings > 100
                    ? "low"
                    : totalBookings > 50
                    ? "medium"
                    : "high",
                dynamicPrice: priceBreakdown.total, // USD price
                currency: "USD", // Always USD in database
                // Convert to local currency for display
                displayPrice: pricingMatch.hourlyRateLocal,
                displayCurrency: pricingMatch.currencySymbol,
              };

              // Debug: Log languages for each tutor
              if (languages && languages.length > 0) {
                console.log(`Tutor ${mentor.name} has languages:`, languages);
              }

              return tutorData;
            })
          );
          console.log(`Mapped ${mappedTutors.length} tutors from Supabase`);

          // Sort by rating (descending)
          const sortedTutors = mappedTutors.sort((a, b) => b.rating - a.rating);

          // Store all tutors
          setAllTutors(sortedTutors);

          // Only show top 10 if no search/category filter is active
          const displayTutors =
            searchQuery.trim() || selectedCategory
              ? sortedTutors
              : sortedTutors.slice(0, 10);

          console.log(
            `Displaying ${displayTutors.length} tutors (${
              searchQuery.trim() || selectedCategory ? "all matching" : "top 10"
            })`
          );
          setTutors(displayTutors);
        } else {
          console.log("No mentors data found in Supabase");
          setTutors([]);
        }
      } catch (error) {
        console.error("Error fetching mentors:", error);
        setTutors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMentors();
  }, []);

  // Filter tutors based on search query and selected category
  const filteredTutors = useMemo(() => {
    // Use all tutors for filtering when searching, otherwise use the limited tutors list
    const tutorsToFilter =
      searchQuery.trim() || selectedCategory ? allTutors : tutors;
    let filtered = tutorsToFilter;

    console.log(
      "Filtering tutors. Total tutors:",
      tutorsToFilter.length,
      "Search query:",
      searchQuery,
      "Category:",
      selectedCategory
    );

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tutor) =>
          tutor.name.toLowerCase().includes(query) ||
          tutor.handle.toLowerCase().includes(query) ||
          tutor.description.toLowerCase().includes(query) ||
          tutor.categories.some((cat) => cat.toLowerCase().includes(query))
      );
      console.log("After search filter:", filtered.length);
    }

    // Filter by selected category
    if (selectedCategory) {
      filtered = filtered.filter((tutor) =>
        tutor.categories.some(
          (cat) =>
            cat.toLowerCase() === selectedCategory.toLowerCase() ||
            (selectedCategory === "Mathematics" &&
              (cat.toLowerCase().includes("math") ||
                cat.toLowerCase().includes("mathematics"))) ||
            (selectedCategory === "Science" &&
              cat.toLowerCase().includes("science")) ||
            (selectedCategory === "Programming" &&
              (cat.toLowerCase().includes("programming") ||
                cat.toLowerCase().includes("tech") ||
                cat.toLowerCase().includes("technology"))) ||
            (selectedCategory === "Languages" &&
              (cat.toLowerCase().includes("language") ||
                cat.toLowerCase().includes("languages"))) ||
            (selectedCategory === "Physical Science" &&
              (cat.toLowerCase().includes("physical") ||
                cat.toLowerCase().includes("physics") ||
                cat.toLowerCase().includes("chemistry"))) ||
            (selectedCategory === "Geography" &&
              cat.toLowerCase().includes("geography")) ||
            (selectedCategory === "Computer Engineering" &&
              (cat.toLowerCase().includes("computer") ||
                cat.toLowerCase().includes("engineering") ||
                cat.toLowerCase().includes("software"))) ||
            (selectedCategory === "Artificial Intelligence" &&
              (cat.toLowerCase().includes("ai") ||
                cat.toLowerCase().includes("artificial") ||
                cat.toLowerCase().includes("intelligence") ||
                cat.toLowerCase().includes("machine learning"))) ||
            (selectedCategory === "Life Science" &&
              (cat.toLowerCase().includes("life") ||
                cat.toLowerCase().includes("biology") ||
                cat.toLowerCase().includes("biochemistry") ||
                cat.toLowerCase().includes("biomedical")))
        )
      );
      console.log("After category filter:", filtered.length);
    }

    console.log("Final filtered tutors:", filtered.length);
    return filtered;
  }, [tutors, allTutors, searchQuery, selectedCategory]);

  const maxIndex = Math.max(0, filteredTutors.length - cardsPerView);

  // Reset to first card when filters change
  useEffect(() => {
    setCurrentIndex(0);
  }, [searchQuery, selectedCategory]);

  const handlePrevious = () => {
    setDirection(-1);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < maxIndex;

  // Get visible tutors based on current index
  const visibleTutors = filteredTutors.slice(
    currentIndex,
    currentIndex + cardsPerView
  );

  if (loading) {
    return (
      <div className="w-full py-8 flex items-center justify-center">
        <LoadingLogo size={32} />
      </div>
    );
  }

  return (
    <div className="w-full py-8">
      {filteredTutors.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center py-12"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.2,
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            className="text-6xl mb-4"
          >
            🔍
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-white text-lg font-['Verdana',sans-serif] drop-shadow-md"
          >
            {tutors.length === 0
              ? "No tutors available at the moment. Please check back later."
              : "😊 Sign in to find more tutors"}
          </motion.p>
          {tutors.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-sm text-gray-400 mt-2 font-['Verdana',sans-serif]"
            >
              Check the browser console for details.
            </motion.p>
          )}
        </motion.div>
      ) : (
        <div
          className={`relative flex items-center gap-4 ${
            filteredTutors.length === 1 ? "justify-center" : ""
          }`}
        >
          {/* Left Arrow */}
          {canGoPrevious && filteredTutors.length > 1 && (
            <button
              onClick={handlePrevious}
              className="flex-shrink-0 bg-white rounded-full p-3 shadow-lg border border-gray-200 hover:bg-gray-50 transition-all hover:scale-110 z-10"
              aria-label="Previous tutors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
          )}

          <div
            ref={containerRef}
            className={`flex-1 overflow-hidden relative ${
              filteredTutors.length === 1 ? "flex justify-center" : ""
            }`}
          >
            <motion.div
              className={`flex gap-6 mb-6 ${
                filteredTutors.length === 1 ? "justify-center" : ""
              }`}
              animate={{
                x:
                  filteredTutors.length === 1
                    ? 0
                    : `-${currentIndex * (100 / cardsPerView)}%`,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8,
              }}
            >
              {filteredTutors.map((tutor, index) => (
                <motion.div
                  key={tutor.id}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                    ease: "easeOut",
                  }}
                  className="flex-shrink-0"
                  style={{
                    width:
                      filteredTutors.length === 1
                        ? "380px"
                        : `calc((100% - ${
                            (cardsPerView - 1) * 1.5
                          }rem) / ${cardsPerView})`,
                  }}
                >
                  <Card className="min-h-[550px] bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col">
                    <CardContent className="p-5 flex flex-col flex-grow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-20 w-20 border-2 border-gray-200">
                              <AvatarImage
                                src={tutor.avatar}
                                alt={tutor.name}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-gray-100 text-gray-600 text-base font-semibold">
                                {tutor.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            {tutor.status === "verified" && (
                              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 border-3 border-white shadow-lg z-10">
                                <CheckCircle2 className="w-6 h-6 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-semibold text-gray-900">
                              {tutor.name}
                            </h3>
                            {tutor.status === "verified" && (
                              <Badge className="bg-blue-500 text-white border-blue-600 text-xs px-2 py-0.5">
                                Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                        {tutor.status === "trending" && (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                            Trending
                          </Badge>
                        )}
                      </div>

                      <div className="mb-4 flex-grow">
                        <h4 className="text-lg font-semibold text-gray-900 mb-1 break-words">
                          {tutor.name}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2 break-words">
                          {tutor.handle}
                        </p>

                        {/* Specializations above stars */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {tutor.categories.map((category) => (
                            <Badge
                              key={category}
                              variant="secondary"
                              className="bg-gray-100 text-gray-700 border-gray-200 text-xs font-['Verdana',sans-serif]"
                            >
                              {category}
                            </Badge>
                          ))}
                        </div>

                        {/* Stars rating */}
                        <div className="flex items-center gap-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(tutor.rating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : i < tutor.rating
                                  ? "fill-yellow-200 text-yellow-400"
                                  : "fill-gray-200 text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="text-sm text-gray-600 ml-1">
                            ({tutor.rating})
                          </span>
                        </div>

                        <p className="text-sm text-gray-700 leading-relaxed break-words">
                          {tutor.description}
                        </p>
                      </div>

                      {tutor.languages && tutor.languages.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-2 font-medium font-['Verdana',sans-serif]">
                            Tutoring Languages:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {tutor.languages.map((language, idx) => (
                              <Badge
                                key={`${tutor.id}-lang-${idx}`}
                                variant="secondary"
                                className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-['Verdana',sans-serif]"
                              >
                                {language}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pricing Display */}
                      <div className="mb-4 mt-auto p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">
                              Starting from
                            </p>
                            <p className="text-2xl font-bold text-blue-600">
                              {tutor.displayCurrency || tutor.currency || "$"}
                              {tutor.displayPrice?.toFixed(2) ||
                                tutor.dynamicPrice?.toFixed(2) ||
                                "0.00"}
                            </p>
                            <p className="text-xs text-gray-500">per hour</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTutor(tutor);
                              setIsPricingModalOpen(true);
                            }}
                            className="border-blue-300 text-blue-700 hover:bg-blue-100"
                          >
                            View More
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={async () => {
                            // Check if user is authenticated
                            const { data: { user } } = await supabase.auth.getUser();
                            if (user) {
                              // User is authenticated, store tutor ID and redirect to dashboard
                              localStorage.setItem('tutorToBookId', tutor.id.toString());
                              window.location.href = '/dashboard/learner';
                            } else {
                              // User not authenticated, store tutor ID in localStorage and open sign-in modal
                              // This ensures we can restore it after redirect
                              localStorage.setItem('tutorToBookId', tutor.id.toString());
                              setIsSignInOpen(true);
                            }
                          }}
                          className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Book Tutor
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right Arrow */}
          {canGoNext && filteredTutors.length > 1 && (
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

      {/* Sign In Modal */}
      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => {
          setIsSignInOpen(false);
        }}
        onSignUp={() => {
          setIsSignInOpen(false);
          setIsSignUpOpen(true);
        }}
      />

      {/* Sign Up Modal */}
      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
      />

      {/* Pricing Modal */}
      {selectedTutor && (
        <>
          <GPTPricingModal
            isOpen={isPricingModalOpen}
            onClose={() => {
              setIsPricingModalOpen(false);
              setSelectedTutor(null);
            }}
            mentor={{
              id: selectedTutor.id,
              name: selectedTutor.name,
              baseHourlyRate: selectedTutor.baseHourlyRate,
              experience: selectedTutor.experience,
              rating: selectedTutor.rating,
              totalReviews: selectedTutor.totalReviews,
              totalBookings: selectedTutor.totalBookings,
              subjects: selectedTutor.categories,
              location: selectedTutor.location,
              availability: selectedTutor.availability,
              description: selectedTutor.description,
              avatar: selectedTutor.avatar,
              languages: selectedTutor.languages,
              displayPrice: selectedTutor.displayPrice,
              displayCurrency: selectedTutor.displayCurrency,
              dynamicPrice: selectedTutor.dynamicPrice,
            }}
            sessionDetails={{
              subject: selectedTutor.categories[0] || "General",
              sessionType: "online",
              duration: 60,
              dateTime: new Date(),
              isUrgent: false,
              studentLevel: "intermediate",
            }}
            onBookTutor={() => {
              setIsSignInOpen(true);
            }}
            onConfirm={async (priceBreakdown) => {
              // Update price in database if needed
              console.log("Price confirmed:", priceBreakdown);
              // You can add logic here to save the booking with this price
            }}
          />

        </>
      )}

    </div>
  );
}
