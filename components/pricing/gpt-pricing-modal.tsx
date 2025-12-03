"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  TrendingUp,
  TrendingDown,
  Clock,
  MapPin,
  Star,
  Users,
  Zap,
  BookOpen,
  Info,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  calculateGPTPrice,
  GPTPriceBreakdown,
  getLatestMarketAnalysis,
  MarketAnalysis,
} from "@/lib/pricing-gpt-api";
import {
  calculateDynamicPricing,
  PricingFactors,
  PriceBreakdown,
} from "@/lib/pricing-calculator";

interface Testimonial {
  id: string | number;
  student_name: string;
  student_role?: string;
  student_company?: string;
  content: string;
  rating: number;
  avatar_url?: string;
  mentor_name?: string;
  created_at?: string;
}

interface GPTPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentor: {
    id: string | number;
    name: string;
    baseHourlyRate: number;
    experience: number;
    rating: number;
    totalReviews: number;
    totalBookings: number;
    subjects: string[];
    location: {
      country: string;
      city?: string;
    };
    availability: "high" | "medium" | "low";
    description?: string;
    avatar?: string;
    languages?: string[];
    title?: string;
    displayPrice?: number;
    displayCurrency?: string;
    dynamicPrice?: number;
  };
  sessionDetails: {
    subject: string;
    sessionType: "online" | "in-person";
    duration: number;
    dateTime: Date;
    isUrgent?: boolean;
    isRecurring?: boolean;
    studentLevel?: "beginner" | "intermediate" | "advanced";
  };
  onConfirm?: (priceBreakdown: PriceBreakdown) => void;
  onBookTutor?: () => void;
}

export function GPTPricingModal({
  isOpen,
  onClose,
  mentor,
  sessionDetails,
  onConfirm,
  onBookTutor,
}: GPTPricingModalProps) {
  const [gptPriceBreakdown, setGptPriceBreakdown] =
    React.useState<GPTPriceBreakdown | null>(null);
  const [fallbackPriceBreakdown, setFallbackPriceBreakdown] =
    React.useState<PriceBreakdown | null>(null);
  const [marketAnalysis, setMarketAnalysis] =
    React.useState<MarketAnalysis | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [useGPT, setUseGPT] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [testimonials, setTestimonials] = React.useState<Testimonial[]>([]);
  const [isLoadingTestimonials, setIsLoadingTestimonials] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && mentor && sessionDetails) {
      loadPricing();
      loadTestimonials();
    }
  }, [isOpen, mentor, sessionDetails]);

  const loadTestimonials = async () => {
    setIsLoadingTestimonials(true);
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/v1/mentors/testimonials/list/",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.testimonials) {
        // Filter testimonials for this mentor by name
        const mentorTestimonials = data.testimonials.filter(
          (t: any) =>
            t.mentor_name?.toLowerCase() === mentor.name.toLowerCase() ||
            t.mentor_id === mentor.id
        );
        setTestimonials(mentorTestimonials);
      }
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      setTestimonials([]);
    } finally {
      setIsLoadingTestimonials(false);
    }
  };

  const loadPricing = async () => {
    setIsLoading(true);
    setError(null);

    // Always calculate fallback first (so modal shows immediately)
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
      isHoliday: false,
      location: mentor.location,
      currentRequests: 0,
      mentorAvailability: mentor.availability,
      isUrgent: sessionDetails.isUrgent || false,
      isRecurring: sessionDetails.isRecurring || false,
      studentLevel: sessionDetails.studentLevel || "intermediate",
    };

    const breakdown = calculateDynamicPricing(factors);
    setFallbackPriceBreakdown(breakdown);
    setIsLoading(false); // Show modal immediately with fallback pricing

    // Try GPT pricing in background (non-blocking)
    try {
      // Try GPT pricing
      const gptResult = await calculateGPTPrice({
        mentorId: mentor.id,
        subject: sessionDetails.subject,
        sessionDuration: sessionDetails.duration,
        timeOfDay: sessionDetails.dateTime.getHours(),
        dayOfWeek: sessionDetails.dateTime.getDay(),
        isUrgent: sessionDetails.isUrgent || false,
      });

      if (gptResult.success && gptResult.priceBreakdown) {
        setGptPriceBreakdown(gptResult.priceBreakdown);
        setUseGPT(true);
      } else {
        // Fallback to rule-based pricing
        console.warn("GPT pricing failed, using fallback:", gptResult.error);
        setUseGPT(false);
        if (gptResult.error && !gptResult.error.includes("Network error")) {
          setError(
            `GPT pricing unavailable: ${gptResult.error}. Using standard pricing.`
          );
        }
      }

      // Load market analysis (non-blocking)
      try {
        const analysisResult = await getLatestMarketAnalysis();
        if (analysisResult.success && analysisResult.analysis) {
          setMarketAnalysis(analysisResult.analysis);
        }
      } catch (analysisErr) {
        // Market analysis is optional, don't show error
        console.log("Market analysis unavailable:", analysisErr);
      }
    } catch (err: any) {
      console.error("Error loading GPT pricing:", err);
      setUseGPT(false);
      // Don't set error for network issues - fallback pricing is already shown
      if (
        !err.message?.includes("fetch") &&
        !err.message?.includes("Network")
      ) {
        setError(`GPT pricing unavailable. Using standard pricing.`);
      }
    }
  };

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier > 1.0) return "text-green-600";
    if (multiplier < 1.0) return "text-red-600";
    return "text-gray-600";
  };

  const getMultiplierIcon = (multiplier: number) => {
    if (multiplier > 1.0)
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (multiplier < 1.0)
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    return null;
  };

  const formatMultiplier = (multiplier: number) => {
    if (multiplier === 1.0) return "No change";
    const percent = ((multiplier - 1) * 100).toFixed(0);
    return `${multiplier > 1 ? "+" : ""}${percent}%`;
  };

  // Use GPT price if available, otherwise use fallback
  const priceBreakdown =
    useGPT && gptPriceBreakdown
      ? {
          total: gptPriceBreakdown.total,
          basePrice: gptPriceBreakdown.base_price,
          subtotal: gptPriceBreakdown.subtotal,
          platformFee: gptPriceBreakdown.platform_fee,
          experienceMultiplier: gptPriceBreakdown.experience_multiplier,
          ratingMultiplier: gptPriceBreakdown.rating_multiplier,
          demandMultiplier: gptPriceBreakdown.subject_multiplier,
          timeMultiplier: gptPriceBreakdown.time_multiplier,
          locationMultiplier: fallbackPriceBreakdown?.locationMultiplier || 1.0,
          sessionTypeMultiplier:
            fallbackPriceBreakdown?.sessionTypeMultiplier || 1.0,
          urgencyMultiplier: gptPriceBreakdown.urgency_multiplier,
          studentLevelMultiplier:
            fallbackPriceBreakdown?.studentLevelMultiplier || 1.0,
        }
      : fallbackPriceBreakdown;

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Calculating Optimal Price
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-2">
              Analyzing market conditions with AI...
            </p>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Always show modal with fallback pricing if available
  if (!priceBreakdown && !fallbackPriceBreakdown) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Loading Pricing...
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-2">
              Calculating optimal price...
            </p>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Use fallback if GPT price not available
  const displayPriceBreakdown = priceBreakdown || fallbackPriceBreakdown;
  if (!displayPriceBreakdown) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
              <img
              src={mentor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name)}&background=3B82F6&color=fff&size=128`}
                alt={mentor.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name)}&background=3B82F6&color=fff&size=128`;
                }}
              />
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">
                {mentor.name}
              </DialogTitle>
              {mentor.title && (
                <p className="text-sm text-gray-600 mt-1">{mentor.title}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(mentor.rating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {mentor.rating.toFixed(1)}
                </span>
                <span className="text-sm text-gray-500">
                  ({mentor.totalReviews} reviews)
                </span>
                {mentor.experience && (
                  <span className="text-sm text-gray-500">
                    • {mentor.experience} years experience
                  </span>
            )}
              </div>
              {mentor.location && (
          <p className="text-xs text-gray-500 mt-1">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  {mentor.location.city
                    ? `${mentor.location.city}, ${mentor.location.country}`
                    : mentor.location.country}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">{error}</p>
          </div>
        )}

        {marketAnalysis && (
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 mb-4">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-purple-900 mb-1">
                    Market Analysis
                  </p>
                  <p className="text-xs text-purple-700">
                    Trend:{" "}
                    <span className="font-semibold capitalize">
                      {marketAnalysis.market_trend}
                    </span>
                    {marketAnalysis.average_price_usd && (
                      <>
                        {" "}
                        • Avg Price: $
                        {marketAnalysis.average_price_usd.toFixed(2)}
                      </>
                    )}
                  </p>
                  {marketAnalysis.analysis_summary && (
                    <p className="text-xs text-purple-600 mt-2 italic">
                      "{marketAnalysis.analysis_summary.substring(0, 150)}..."
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6 mt-4">
          {/* Mentor Information Section */}
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                  <img
                  src={mentor.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name)}&background=3B82F6&color=fff&size=128`}
                    alt={mentor.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name)}&background=3B82F6&color=fff&size=128`;
                    }}
                  />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {mentor.name}
                  </h3>
                  {mentor.title && (
                    <p className="text-sm text-gray-600 mb-2">{mentor.title}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(mentor.rating)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {mentor.rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({mentor.totalReviews} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {mentor.description && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    About
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {mentor.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                {mentor.experience && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Experience</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {mentor.experience} years
                    </p>
                  </div>
                )}
                {mentor.languages && mentor.languages.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Languages</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {mentor.languages.join(", ")}
                    </p>
                  </div>
                )}
                {mentor.location && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Location</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {mentor.location.city
                        ? `${mentor.location.city}, ${mentor.location.country}`
                        : mentor.location.country}
                    </p>
                  </div>
                )}
                {mentor.subjects && mentor.subjects.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Subjects</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {mentor.subjects.slice(0, 3).join(", ")}
                      {mentor.subjects.length > 3 && "..."}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reviews/Testimonials Section */}
          {testimonials.length > 0 && (
            <Card className="border border-gray-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Reviews & Testimonials
                </h3>
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {testimonials.map((testimonial) => (
                    <div
                      key={testimonial.id}
                      className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start gap-3">
                        {testimonial.avatar_url && (
                          <img
                            src={testimonial.avatar_url}
                            alt={testimonial.student_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 text-sm">
                              {testimonial.student_name}
                            </span>
                            {testimonial.student_role && (
                              <span className="text-xs text-gray-500">
                                {testimonial.student_role}
                              </span>
                            )}
                            <div className="flex items-center gap-1 ml-auto">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < testimonial.rating
                                      ? "text-yellow-400 fill-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {testimonial.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {/* Total Price Highlight */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Price</p>
                  <p className="text-4xl font-bold text-blue-600">
                    {(() => {
                      // Use the exact price from the mentor card
                      if (mentor.displayPrice && mentor.displayCurrency) {
                        return `${mentor.displayCurrency}${mentor.displayPrice.toFixed(2)}`;
                      }
                      return `$${displayPriceBreakdown.total.toFixed(2)}`;
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    for {sessionDetails.duration} minutes
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Base Price</p>
                  {(() => {
                    // Calculate base price from the card's display price
                    // If we have dynamicPrice (USD base) and displayPrice (local total), calculate local base
                    let displayBasePrice: number;
                    let currencySymbol = "$";
                    let adjustmentPercent = 16;
                    
                    if (mentor.displayPrice && mentor.displayCurrency && mentor.dynamicPrice && displayPriceBreakdown.basePrice) {
                      // Calculate conversion ratio from card's price
                      const conversionRatio = mentor.displayPrice / mentor.dynamicPrice;
                      // Convert USD base price to local currency
                      displayBasePrice = displayPriceBreakdown.basePrice * conversionRatio;
                      currencySymbol = mentor.displayCurrency;
                      // Calculate adjustment percentage
                      adjustmentPercent = displayPriceBreakdown.basePrice && displayPriceBreakdown.basePrice !== displayPriceBreakdown.total
                        ? Math.round(Math.abs(((displayPriceBreakdown.total - displayPriceBreakdown.basePrice) / displayPriceBreakdown.basePrice) * 100))
                        : 16;
                    } else {
                      // Fallback to USD calculation
                      displayBasePrice = displayPriceBreakdown.basePrice || displayPriceBreakdown.total;
                      adjustmentPercent = displayPriceBreakdown.basePrice && displayPriceBreakdown.basePrice !== displayPriceBreakdown.total
                        ? Math.round(Math.abs(((displayPriceBreakdown.total - displayPriceBreakdown.basePrice) / displayPriceBreakdown.basePrice) * 100))
                        : 16;
                    }
                    
                    return (
                      <>
                        <p className="text-2xl font-semibold text-red-500 line-through">
                          {currencySymbol}{displayBasePrice.toFixed(2)}
                        </p>
                        <Badge className="mt-2 bg-green-100 text-green-700">
                          {adjustmentPercent}% adjustment
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
                    <div
                      className={`flex items-center gap-1 ${getMultiplierColor(
                        displayPriceBreakdown.experienceMultiplier
                      )}`}
                    >
                      {getMultiplierIcon(
                        displayPriceBreakdown.experienceMultiplier
                      )}
                      <span className="text-sm font-semibold">
                        {formatMultiplier(
                          displayPriceBreakdown.experienceMultiplier
                        )}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {mentor.experience} years
                  </p>
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
                    <div
                      className={`flex items-center gap-1 ${getMultiplierColor(
                        displayPriceBreakdown.ratingMultiplier
                      )}`}
                    >
                      {getMultiplierIcon(
                        displayPriceBreakdown.ratingMultiplier
                      )}
                      <span className="text-sm font-semibold">
                        {formatMultiplier(
                          displayPriceBreakdown.ratingMultiplier
                        )}
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
                      <span className="text-sm font-medium">
                        Subject Demand
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-1 ${getMultiplierColor(
                        displayPriceBreakdown.demandMultiplier
                      )}`}
                    >
                      {getMultiplierIcon(
                        displayPriceBreakdown.demandMultiplier
                      )}
                      <span className="text-sm font-semibold">
                        {formatMultiplier(
                          displayPriceBreakdown.demandMultiplier
                        )}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {sessionDetails.subject}
                  </p>
                  {marketAnalysis?.subject_insights[sessionDetails.subject] && (
                    <p className="text-xs text-purple-600 mt-1 italic">
                      {marketAnalysis.subject_insights[
                        sessionDetails.subject
                      ].reasoning.substring(0, 60)}
                      ...
                    </p>
                  )}
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
                    <div
                      className={`flex items-center gap-1 ${getMultiplierColor(
                        displayPriceBreakdown.timeMultiplier
                      )}`}
                    >
                      {getMultiplierIcon(displayPriceBreakdown.timeMultiplier)}
                      <span className="text-sm font-semibold">
                        {formatMultiplier(displayPriceBreakdown.timeMultiplier)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {getTimeOfDay(sessionDetails.dateTime.getHours())},{" "}
                    {getDayType(sessionDetails.dateTime.getDay())}
                  </p>
                </CardContent>
              </Card>

              {/* Urgency */}
              {sessionDetails.isUrgent && (
                <Card className="border border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium">
                          Urgent Booking
                        </span>
                      </div>
                      <div
                        className={`flex items-center gap-1 ${getMultiplierColor(
                          displayPriceBreakdown.urgencyMultiplier
                        )}`}
                      >
                        {getMultiplierIcon(
                          displayPriceBreakdown.urgencyMultiplier
                        )}
                        <span className="text-sm font-semibold">
                          {formatMultiplier(
                            displayPriceBreakdown.urgencyMultiplier
                          )}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Last-minute booking
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => {
                onClose();
                if (onBookTutor) {
                  setTimeout(() => {
                    onBookTutor();
                  }, 150);
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
  );
}

// Helper functions
function getSubjectDemand(subject: string): "low" | "medium" | "high" {
  const highDemandSubjects = [
    "Mathematics",
    "Science",
    "Programming Languages",
    "Computer Engineering",
    "Artificial Intelligence",
    "Data Science",
    "Web Development",
    "React",
    "Python",
    "JavaScript",
    "Java",
    "Machine Learning",
  ];

  const mediumDemandSubjects = [
    "Business Analysis",
    "Physical Science",
    "Geography",
    "Life Science",
    "Chemistry",
    "Physics",
    "Economics",
    "Finance",
  ];

  if (
    highDemandSubjects.some((s) =>
      subject.toLowerCase().includes(s.toLowerCase())
    )
  ) {
    return "high";
  } else if (
    mediumDemandSubjects.some((s) =>
      subject.toLowerCase().includes(s.toLowerCase())
    )
  ) {
    return "medium";
  }

  return "low";
}

function getTimeOfDay(
  hour: number
): "morning" | "afternoon" | "evening" | "night" {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function getDayType(day: number): "weekday" | "weekend" {
  return day === 0 || day === 6 ? "weekend" : "weekday";
}
