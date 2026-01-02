"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  Shield,
  CheckCircle,
  FileText,
  ArrowLeft,
  Check,
  Tag,
} from "lucide-react";
import { PayFastPaymentForm } from "@/components/payment/payfast-payment-form";
import { convertAndFormatPrice } from "@/lib/currency";
import { fetchTutorPricing, findMatchingPricing } from "@/lib/tutor-pricing";
import { supabase } from "@/lib/supabase";
import { LoadingLogo } from "@/components/loading-logo";

interface Mentor {
  id: number | string;
  name: string;
  title: string;
  avatar: string;
  hourly_rate: number;
  rating: number;
  total_reviews: number;
  specialization?: string[] | string;
  level?: string;
  education_level?: string;
  category?: string;
  sub_level?: string;
  grade_level?: string;
}

interface SessionBooking {
  date: string;
  time: string;
  duration: number;
  topic: string;
  notes: string;
  meetingType: "teams" | "google-meet" | "in-person";
  meetingLink?: string;
}

interface TutorRequest {
  id?: number;
  subject?: string;
  preferred_time?: string;
  description?: string;
  grade_level?: string;
  created_at?: string;
}

interface BookingModalProps {
  mentor: Mentor | null;
  isOpen: boolean;
  onClose: () => void;
  userLocation?: { lat: number; lng: number } | null;
  requestData?: TutorRequest | null;
  onPaymentSuccess?: (requestId?: number, meetingLink?: string) => void;
}

export function BookingModal({
  mentor,
  isOpen,
  onClose,
  userLocation,
  requestData,
  onPaymentSuccess,
}: BookingModalProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [isCreatingPayment, setIsCreatingPayment] = React.useState(false);
  const [convertedRate, setConvertedRate] = useState<string>("");
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [originalRate, setOriginalRate] = useState<number>(0);
  const [discountCode, setDiscountCode] = useState<string>("");
  const [appliedDiscount, setAppliedDiscount] = useState<number | null>(null);
  const [discountError, setDiscountError] = useState<string>("");
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [convertedTotal, setConvertedTotal] = useState<string>("");
  const [convertedSubtotal, setConvertedSubtotal] = useState<string>("");
  const [convertedDiscountAmount, setConvertedDiscountAmount] =
    useState<string>("");
  const [currencySymbol, setCurrencySymbol] = useState<string>("$");

  // Helper function to parse time from preferred_time (e.g., "10:10 AM" -> "10:10")
  const parseTimeFromPreferred = (preferredTime?: string): string => {
    if (!preferredTime) return "";
    
    // Try to parse formats like "10:10 AM", "10:10 PM", "10:10"
    const timeMatch = preferredTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2];
      const period = timeMatch[3]?.toUpperCase();
      
      if (period === "PM" && hours !== 12) {
        hours += 12;
      } else if (period === "AM" && hours === 12) {
        hours = 0;
      }
      
      // Round minutes to nearest 30 (0 or 30) to match available time slots
      const roundedMinutes = parseInt(minutes) >= 30 ? "30" : "00";
      
      return `${hours.toString().padStart(2, "0")}:${roundedMinutes}`;
    }
    
    // If already in 24-hour format, round to nearest 30 minutes
    if (preferredTime.match(/^\d{2}:\d{2}$/)) {
      const [hours, minutes] = preferredTime.split(":");
      const roundedMinutes = parseInt(minutes) >= 30 ? "30" : "00";
      return `${hours}:${roundedMinutes}`;
    }
    
    return "";
  };
  
  // Helper function to find closest matching time slot
  const findClosestTimeSlot = (
    targetTime: string,
    availableSlots: string[]
  ): string => {
    if (!targetTime || availableSlots.length === 0) return "";
    
    // If exact match exists, return it
    if (availableSlots.includes(targetTime)) {
      return targetTime;
    }
    
    // Find closest match
    const [targetHours, targetMinutes] = targetTime.split(":").map(Number);
    const targetTotalMinutes = targetHours * 60 + targetMinutes;
    
    let closestSlot = availableSlots[0];
    let minDiff = Infinity;
    
    for (const slot of availableSlots) {
      const [slotHours, slotMinutes] = slot.split(":").map(Number);
      const slotTotalMinutes = slotHours * 60 + slotMinutes;
      const diff = Math.abs(slotTotalMinutes - targetTotalMinutes);
      
      if (diff < minDiff) {
        minDiff = diff;
        closestSlot = slot;
      }
    }
    
    return closestSlot;
  };

  // Generate time slots (memoized since it's a pure function)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (const minutes of [0, 30]) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}`;
        slots.push(timeString);
      }
    }
    return slots;
  };
  
  const timeSlots = React.useMemo(() => generateTimeSlots(), []);

  const [sessionData, setSessionData] = React.useState<SessionBooking>({
    date: "",
    time: requestData?.preferred_time
      ? parseTimeFromPreferred(requestData.preferred_time)
      : "",
    duration: 60,
    topic: requestData?.subject || "",
    notes: requestData?.description || "",
    meetingType: "google-meet",
  });

  // PayFast doesn't require pre-loading like Stripe

  // Generate meeting link when date/time/topic are filled and meeting type is selected
  React.useEffect(() => {
    const initializeMeetingLink = async () => {
      if (
        sessionData.meetingType && 
        sessionData.meetingType !== "in-person" &&
        sessionData.date &&
        sessionData.time &&
        sessionData.topic
      ) {
        // Only generate if we don't already have a link
        if (!sessionData.meetingLink) {
          const meetingLink = await generateMeetingLink(
            sessionData.meetingType,
            sessionData
          );
          setSessionData((prev) => ({
            ...prev,
            meetingLink,
          }));
        }
      }
    };

    if (isOpen) {
      initializeMeetingLink();
    }
  }, [
    isOpen,
    sessionData.meetingType,
    sessionData.date,
    sessionData.time,
    sessionData.topic,
  ]);

  // Helper function to format date to YYYY-MM-DD for date input
  const formatDateForInput = (dateString?: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return "";
      
      // Format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  // Initialize session data from request when modal opens
  React.useEffect(() => {
    if (isOpen && requestData) {
      let parsedTime = requestData.preferred_time
        ? parseTimeFromPreferred(requestData.preferred_time)
        : "";
      
      // Find closest matching time slot if parsed time doesn't match exactly
      if (parsedTime && timeSlots.length > 0) {
        parsedTime = findClosestTimeSlot(parsedTime, timeSlots);
      }
      
      // Parse date from created_at, but use tomorrow as minimum (since bookings can't be in the past)
      let parsedDate = "";
      if (requestData.created_at) {
        const requestDate = new Date(requestData.created_at);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Use the request date if it's in the future, otherwise use tomorrow
        const dateToUse = requestDate > tomorrow ? requestDate : tomorrow;
        parsedDate = formatDateForInput(dateToUse.toISOString());
      } else {
        // Default to tomorrow if no date provided
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        parsedDate = formatDateForInput(tomorrow.toISOString());
      }
      
      setSessionData({
        date: parsedDate,
        time: parsedTime,
        duration: 60,
        topic: requestData.subject || "",
        notes: requestData.description || "",
        meetingType: "google-meet",
      });
    }
  }, [isOpen, requestData, timeSlots]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setSessionData({
        date: "",
        time: "",
        duration: 60,
        topic: "",
        notes: "",
        meetingType: "google-meet",
      });
    }
  }, [isOpen]);

  const generateMeetingLink = async (
    meetingType: string,
    sessionData: SessionBooking
  ): Promise<string> => {
    if (meetingType === "in-person") {
      return "";
    }

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/v1/ai/meetings/session/create/",
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mentor_id: mentor?.id,
          meeting_type: meetingType,
          session_data: sessionData,
        }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create meeting");
      }

      const data = await response.json();

      if (data.success && data.meeting?.join_url) {
        return data.meeting.join_url;
      } else {
        // Fallback to demo links
        const sessionId = Math.random().toString(36).substring(2, 15);
        const timestamp = Date.now();

        switch (meetingType) {
          case "teams":
            return `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${sessionId}${timestamp}%40thread.v2/0?context=%7b%22Tid%22%3a%22${timestamp}%22%2c%22Oid%22%3a%22${sessionId}%22%7d`;
          case "google-meet":
            return `https://meet.google.com/${sessionId}-${timestamp
              .toString()
              .slice(-6)}`;
          default:
            return "";
        }
      }
    } catch (error) {
      console.error("Error creating meeting:", error);
      // Fallback to demo links
      const sessionId = Math.random().toString(36).substring(2, 15);
      const timestamp = Date.now();

      switch (meetingType) {
        case "teams":
          return `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${sessionId}${timestamp}%40thread.v2/0?context=%7b%22Tid%22%3a%22${timestamp}%22%2c%22Oid%22%3a%22${sessionId}%22%7d`;
        case "google-meet":
          return `https://meet.google.com/${sessionId}-${timestamp
            .toString()
            .slice(-6)}`;
        default:
          return "";
      }
    }
  };

  const handleSessionDataChange = async (
    field: keyof SessionBooking,
    value: string | number
  ) => {
    const newData = {
      ...sessionData,
      [field]: value,
    };

    // Generate meeting link if meeting type changes
    if (field === "meetingType" && typeof value === "string") {
      const meetingLink = await generateMeetingLink(value, newData);
      newData.meetingLink = meetingLink;
    }

    setSessionData(newData);
  };

  useEffect(() => {
    // Fetch pricing from database if mentor's hourly_rate is 0 or missing
    const fetchPricing = async () => {
      if (!mentor) return;

      let hourlyRateUSD =
        mentor.hourly_rate && mentor.hourly_rate > 0 ? mentor.hourly_rate : 0;

      // If hourly_rate is 0 or missing, fetch from pricing table
      if (hourlyRateUSD === 0) {
        try {
          const pricingData = await fetchTutorPricing();
          
          // Get mentor's primary subject from specialization
          let primarySubject = "General";
          if (
            mentor.specialization &&
            Array.isArray(mentor.specialization) &&
            mentor.specialization.length > 0
          ) {
            primarySubject = mentor.specialization[0];
          } else if (typeof mentor.specialization === "string") {
            try {
              const parsed = JSON.parse(mentor.specialization);
              if (Array.isArray(parsed) && parsed.length > 0) {
                primarySubject = parsed[0];
              }
            } catch {
              // Keep default
            }
          }

          // Determine level from mentor data
          const mentorLevel =
            (mentor as any).level ||
            (mentor as any).education_level ||
            "Secondary";
          const mentorCategory = (mentor as any).category || undefined;
          const mentorSubLevel =
            (mentor as any).sub_level ||
            (mentor as any).grade_level ||
            undefined;

          // Find matching pricing
          const matchedPricing = findMatchingPricing(
            pricingData,
            primarySubject,
            mentorLevel,
            mentorCategory,
            mentorSubLevel
          );

          // Get hourly rate in USD (use matched pricing or default to $10)
          hourlyRateUSD = matchedPricing
            ? parseFloat(matchedPricing.hourly_rate_usd.toString())
            : 10.0;
        } catch (error) {
          console.error("Error fetching tutor pricing:", error);
          hourlyRateUSD = 10.0; // Default fallback
        }
      }

      // Apply 25% discount if booking from a tutor request
      const isFromRequest = !!requestData;
      const originalRateValue = hourlyRateUSD;
      const discountedRate = isFromRequest
        ? hourlyRateUSD * 0.75
        : hourlyRateUSD;

      // Store original rate (always in USD)
      setOriginalRate(originalRateValue);

      // Convert rate to local currency if userLocation is available
      if (userLocation) {
        convertAndFormatPrice(discountedRate, userLocation)
          .then((result) => {
            setConvertedRate(result.formatted);
          })
          .catch(() => {
            // Fallback to USD if conversion fails
            setConvertedRate(`$${discountedRate.toFixed(2)}`);
          });
      } else {
        // No location, use USD
        setConvertedRate(`$${discountedRate.toFixed(2)}`);
      }
      setExchangeRate(1); // Always use 1 for USD
    };

    fetchPricing();
  }, [mentor, requestData, userLocation]);

  const calculateTotal = () => {
    if (!mentor) return 0;

    // Use originalRate (in USD) for calculations, or fallback to mentor rate
    // originalRate is set when pricing is fetched and is always in USD
    const hourlyRateUSD =
      originalRate > 0
        ? originalRate
        : mentor.hourly_rate && mentor.hourly_rate > 0
        ? mentor.hourly_rate
        : 10.0;

    // Calculate total in USD
    let totalUSD = (hourlyRateUSD * sessionData.duration) / 60;

    // Apply discount code if valid (discount is applied to USD amount)
    if (appliedDiscount && appliedDiscount > 0) {
      totalUSD = totalUSD * (1 - appliedDiscount / 100);
    }

    return totalUSD;
  };

  const validateDiscountCode = async (code: string) => {
    if (!code.trim()) {
      setDiscountError("");
      setAppliedDiscount(null);
      return;
    }

    setIsValidatingDiscount(true);
    setDiscountError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setDiscountError("Please log in to use discount codes");
        setIsValidatingDiscount(false);
        return;
      }

      // Check if discount code exists and is valid
      const { data: discountData, error } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", code.toUpperCase().trim())
        .eq("user_id", user.id)
        .eq("is_used", false)
        .single();

      if (error || !discountData) {
        setDiscountError("Invalid or expired discount code");
        setAppliedDiscount(null);
        setIsValidatingDiscount(false);
        return;
      }

      // Check if code has expired
      const expiresAt = new Date(discountData.expires_at);
      const now = new Date();
      if (now > expiresAt) {
        setDiscountError("This discount code has expired");
        setAppliedDiscount(null);
        setIsValidatingDiscount(false);
        return;
      }

      // Valid discount code
      setAppliedDiscount(discountData.discount_percentage);
      setDiscountError("");
    } catch (error) {
      console.error("Error validating discount code:", error);
      setDiscountError("Error validating discount code. Please try again.");
      setAppliedDiscount(null);
    } finally {
      setIsValidatingDiscount(false);
    }
  };

  const handleDiscountCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setDiscountCode(code);
    setDiscountError("");
    if (!code.trim()) {
      setAppliedDiscount(null);
    }
  };

  // Debounce discount code validation
  React.useEffect(() => {
    if (!discountCode.trim()) {
      setAppliedDiscount(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      validateDiscountCode(discountCode);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [discountCode]);

  const applyDiscountCode = async () => {
    if (discountCode.trim()) {
      await validateDiscountCode(discountCode);
    }
  };

  const formatTotal = (total: number) => {
    // Return the converted total if available, otherwise format in USD
    return convertedTotal || `$${total.toFixed(2)}`;
  };

  // Convert amounts to local currency when userLocation or amounts change
  React.useEffect(() => {
    const convertAmounts = async () => {
      if (!userLocation) {
        // No location, use USD
        const total = calculateTotal();
        setConvertedTotal(`$${total.toFixed(2)}`);
        setCurrencySymbol("$");
        return;
      }

      try {
        const total = calculateTotal();
        const totalResult = await convertAndFormatPrice(total, userLocation);
        setConvertedTotal(totalResult.formatted);
        setCurrencySymbol(totalResult.symbol);

        // Convert subtotal and discount amount if discount is applied
        if (appliedDiscount) {
          // Use originalRate (USD) for calculations
          const hourlyRateUSD =
            originalRate > 0
              ? originalRate
              : mentor?.hourly_rate && mentor.hourly_rate > 0
              ? mentor.hourly_rate
              : 10.0;
          const subtotalUSD = (hourlyRateUSD * sessionData.duration) / 60;
          const discountAmountUSD = subtotalUSD * (appliedDiscount / 100);

          const subtotalResult = await convertAndFormatPrice(
            subtotalUSD,
            userLocation
          );
          const discountResult = await convertAndFormatPrice(
            discountAmountUSD,
            userLocation
          );

          setConvertedSubtotal(subtotalResult.formatted);
          setConvertedDiscountAmount(discountResult.formatted);
        } else {
          setConvertedSubtotal("");
          setConvertedDiscountAmount("");
        }
      } catch (error) {
        console.error("Error converting amounts:", error);
        // Fallback to USD
        const total = calculateTotal();
        setConvertedTotal(`$${total.toFixed(2)}`);
        setCurrencySymbol("$");
  }
    };

    convertAmounts();
  }, [
    userLocation,
    originalRate,
    sessionData.duration,
    appliedDiscount,
    mentor,
  ]);

  const handleNextStep = async () => {
    if (currentStep === 1) {
      // For PayFast, we just move to the payment step
      // The payment form will create the payment URL when it loads
      setCurrentStep(2);
    } else if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userEmail = user?.email || "user@example.com";
      const userName = user?.user_metadata?.full_name || "Valued Learner";

      // Mark discount code as used if applied
      if (appliedDiscount && discountCode.trim() && user) {
        try {
          await supabase
            .from("discount_codes")
            .update({ is_used: true, used_at: new Date().toISOString() })
            .eq("code", discountCode.toUpperCase().trim())
            .eq("user_id", user.id);
        } catch (error) {
          console.error("Error marking discount code as used:", error);
          // Don't block payment success if this fails
        }
      }

      // Ensure meeting link is generated before saving
      let finalSessionData = { ...sessionData };
      if (sessionData.meetingType !== "in-person" && !sessionData.meetingLink) {
        const meetingLink = await generateMeetingLink(
          sessionData.meetingType,
          sessionData
        );
        finalSessionData = {
          ...sessionData,
          meetingLink,
        };
        setSessionData(finalSessionData);
      }

      // Save booking with meeting link
      const bookingResponse = await fetch(
        "http://127.0.0.1:8000/api/v1/ai/bookings/save/",
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mentor_id: mentor?.id,
          learner_name: userName,
          learner_email: userEmail,
          session_data: finalSessionData,
          payment_intent_id: paymentIntentId,
          amount: calculateTotal(),
        }),
        }
      );

      const bookingData = await bookingResponse.json();
      console.log("Booking saved:", bookingData);

      // Send confirmation email with meeting link
      await fetch(
        "http://127.0.0.1:8000/api/v1/ai/send-booking-confirmation/",
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mentor_name: mentor?.name,
          session_data: finalSessionData,
          amount: calculateTotal(),
          user_email: userEmail,
          meeting_link: finalSessionData.meetingLink || "",
        }),
        }
      );

      // Update payment status in tutor request if requestData is provided
      if (requestData?.id && onPaymentSuccess) {
        onPaymentSuccess(requestData.id, finalSessionData.meetingLink);
      }

      setCurrentStep(3);
    } catch (error) {
      console.error("Error in post-payment process:", error);
      setCurrentStep(3);
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col my-8">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 relative flex-shrink-0">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold text-white">
                  Book a Session
                </h2>
              </div>

              {/* Progress Steps */}
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                  {[
                    { num: 1, label: "Session Details" },
                    { num: 2, label: "Payment" },
                    { num: 3, label: "Confirmation" },
                  ].map((step, index) => (
                    <React.Fragment key={step.num}>
                      <div className="flex flex-col items-center flex-1 relative">
                        <div className="relative z-10">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                              currentStep >= step.num
                                ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50 scale-110 ring-4 ring-blue-500/20"
                                : "bg-gray-200 text-gray-500 ring-2 ring-gray-300"
                            }`}
                          >
                            {currentStep > step.num ? (
                              <CheckCircle className="w-6 h-6" />
                            ) : (
                              <span>{step.num}</span>
                            )}
                          </div>
                          {currentStep === step.num && (
                            <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20"></div>
                          )}
                        </div>
                        <div
                          className={`mt-2 text-xs font-semibold text-center transition-all duration-300 ${
                            currentStep >= step.num
                              ? "text-blue-600 scale-105"
                              : "text-gray-500"
                          }`}
                        >
                          {step.label}
                        </div>
                      </div>
                      {index < 2 && (
                        <div className="flex-1 h-1 relative -mt-6 -mx-4">
                          <div className="absolute inset-0 rounded-full overflow-hidden bg-gray-200">
                            <div
                              className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700 ease-out ${
                                currentStep > step.num
                                  ? "w-full"
                                  : currentStep === step.num
                                  ? "w-1/2"
                                  : "w-0"
                              }`}
                            />
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Main Content */}
                  <div className="lg:col-span-3">
                    {currentStep === 1 && (
                      <div className="space-y-6">
                        {/* Date Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Calendar className="w-4 h-4 inline mr-2" />
                            Select Date
                          </label>
                          <input
                            type="date"
                            min={getMinDate()}
                            value={sessionData.date}
                            onChange={(e) =>
                              handleSessionDataChange("date", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>

                        {/* Time Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Clock className="w-4 h-4 inline mr-2" />
                            Select Time
                          </label>
                          <select
                            value={sessionData.time}
                            onChange={(e) =>
                              handleSessionDataChange("time", e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Select a time</option>
                            {timeSlots.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Duration */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Duration
                          </label>
                          <select
                            value={sessionData.duration}
                            onChange={(e) =>
                              handleSessionDataChange(
                                "duration",
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={90}>1.5 hours</option>
                            <option value={120}>2 hours</option>
                          </select>
                        </div>

                        {/* Meeting Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Meeting Type
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleSessionDataChange(
                                  "meetingType",
                                  "google-meet"
                                )
                              }
                              className={`p-3 rounded-lg border text-center transition-colors relative ${
                                sessionData.meetingType === "google-meet"
                                  ? "border-blue-500 bg-blue-50 text-blue-600"
                                  : "border-gray-300 hover:border-gray-400"
                              }`}
                            >
                              <div className="flex justify-center mb-1">
                                <svg
                                  className="w-8 h-8"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M6 9.5L12 5l6 4.5v9L12 19l-6-4.5v-9z"
                                    fill="#00832D"
                                  />
                                  <path
                                    d="M12 5l6 4.5v9L12 19l-6-4.5v-9L12 5z"
                                    fill="#34A853"
                                  />
                                  <path
                                    d="M12 5v14l6-4.5v-9L12 5z"
                                    fill="#EA4335"
                                  />
                                  <path
                                    d="M6 9.5v9l6-4.5v-9L6 9.5z"
                                    fill="#FBBC04"
                                  />
                                </svg>
                              </div>
                              <div className="text-sm font-medium">
                                Google Meet
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleSessionDataChange("meetingType", "teams")
                              }
                              disabled
                              className="p-3 rounded-lg border text-center border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed relative"
                            >
                              <div className="text-sm font-medium">
                                Microsoft Teams
                              </div>
                              <div className="absolute top-1 right-1 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">
                                Coming Soon
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Topic */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Session Topic
                          </label>
                          <input
                            type="text"
                            value={sessionData.topic}
                            onChange={(e) =>
                              handleSessionDataChange("topic", e.target.value)
                            }
                            placeholder="What would you like to discuss?"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Additional Notes (Optional)
                          </label>
                          <textarea
                            value={sessionData.notes}
                            onChange={(e) =>
                              handleSessionDataChange("notes", e.target.value)
                            }
                            placeholder="Any specific questions or topics you'd like to cover?"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <button
                          onClick={handleNextStep}
                          disabled={
                            !sessionData.date ||
                            !sessionData.time ||
                            !sessionData.topic ||
                            isCreatingPayment
                          }
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
                        >
                          {isCreatingPayment ? (
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Preparing Payment...</span>
                            </div>
                          ) : (
                            "Continue to Payment"
                          )}
                        </button>
                      </div>
                    )}

                    {currentStep === 2 && (
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                          Payment Information
                        </h2>
                        <PayFastPaymentForm
                          amount={calculateTotal()}
                          itemName={`Mentoring Session: ${sessionData.topic}`}
                          metadata={{
                            mentor_id: mentor?.id,
                            mentor_name: mentor?.name,
                            session_date: sessionData.date,
                            session_time: sessionData.time,
                            session_topic: sessionData.topic,
                          }}
                          onSuccess={handlePaymentSuccess}
                          onError={(error) => {
                            console.error("Payment error:", error);
                            alert("Payment failed. Please try again.");
                          }}
                          onBack={handlePrevStep}
                        />
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div>
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 -m-6 mb-6 p-6 text-white">
                          <div className="flex items-center space-x-3">
                            <div className="bg-white bg-opacity-20 p-2 rounded-full">
                              <CheckCircle className="w-8 h-8" />
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold">
                                Booking Confirmed!
                              </h2>
                              <p className="text-green-100 text-sm">
                                Payment successful
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                          <p className="text-sm text-green-800">
                            🎉 Your session with{" "}
                            <span className="font-semibold">
                              {mentor?.name}
                            </span>{" "}
                            has been successfully booked!
                          </p>
                        </div>

                        <div className="space-y-4 mb-6">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            Session Details
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3 text-sm">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">Date:</span>
                              <span className="font-medium text-gray-900">
                                {new Date(sessionData.date).toLocaleDateString(
                                  "en-US",
                                  {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  }
                                )}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 text-sm">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">Time:</span>
                              <span className="font-medium text-gray-900">
                                {sessionData.time}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 text-sm">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">Duration:</span>
                              <span className="font-medium text-gray-900">
                                {sessionData.duration} minutes
                              </span>
                            </div>
                            <div className="flex items-start space-x-3 text-sm">
                              <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                              <span className="text-gray-600">Topic:</span>
                              <span className="font-medium text-gray-900 flex-1">
                                {sessionData.topic}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Meeting Link */}
                        {sessionData.meetingLink && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <label className="block text-sm font-medium text-blue-900 mb-2">
                              Meeting Link
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={sessionData.meetingLink}
                                readOnly
                                className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-lg text-sm text-gray-700"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    sessionData.meetingLink || ""
                                  );
                                  alert("Meeting link copied to clipboard!");
                                }}
                                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                Copy
                              </button>
                            </div>
                            <p className="text-xs text-blue-600 mt-2">
                              This link has been sent to your email. You can
                              also copy it here.
                            </p>
                          </div>
                        )}

                        <button
                          onClick={onClose}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                        >
                          Got it, Thanks!
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sidebar */}
                  <div className="lg:col-span-2">
                    <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 sticky top-6">
                      <div className="mb-6">
                        <div className="flex items-center space-x-4 mb-4">
                          <img
                            src={
                              mentor.avatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                mentor.name
                              )}&background=3B82F6&color=fff&size=128`
                            }
                            alt={mentor.name}
                            className="w-16 h-16 rounded-full object-cover ring-4 ring-blue-500/20 shadow-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                mentor.name
                              )}&background=3B82F6&color=fff&size=128`;
                            }}
                          />
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                              {mentor.name}
                            </h3>
                            <p className="text-sm font-medium text-gray-600 mb-2">
                              {mentor.title}
                            </p>
                            <div className="flex items-center space-x-2">
                              <span className="text-yellow-400 text-lg">★</span>
                              <span className="text-sm font-semibold text-gray-900 ml-1">
                                {mentor.rating}
                              </span>
                              <span className="text-sm text-gray-500">
                                ({mentor.total_reviews} reviews)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-6 mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          Pricing
                        </h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-600">
                              Hourly Rate:
                            </span>
                            <div className="flex flex-col items-end">
                              {requestData && originalRate > 0 ? (
                                <>
                                  <span className="text-base font-semibold text-gray-900 line-through text-gray-400">
                                    ${originalRate.toFixed(2)}
                                  </span>
                                  <span className="text-base font-semibold text-green-600">
                                    {convertedRate}{" "}
                                    <span className="text-xs text-green-600 font-normal">
                                      (25% off)
                                    </span>
                                  </span>
                                </>
                              ) : (
                                <span className="text-base font-semibold text-gray-900">
                                  {convertedRate ||
                                    (mentor?.hourly_rate
                                      ? `$${mentor.hourly_rate.toFixed(2)}`
                                      : "$0.00")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-600">
                              Duration:
                            </span>
                            <span className="text-base font-semibold text-gray-900">
                              {sessionData.duration} min
                            </span>
                          </div>

                          {/* Discount Code Section */}
                          <div className="border-t border-gray-200 pt-4 mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Discount Code
                            </label>
                            <div className="flex gap-2">
                              <div className="flex-1 relative">
                                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="text"
                                  value={discountCode}
                                  onChange={handleDiscountCodeChange}
                                  placeholder="Enter discount code"
                                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                    discountError
                                      ? "border-red-300 bg-red-50"
                                      : appliedDiscount
                                      ? "border-green-300 bg-green-50"
                                      : "border-gray-300"
                                  }`}
                                />
                                {isValidatingDiscount && (
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                  </div>
                                )}
                                {!isValidatingDiscount && appliedDiscount && (
                                  <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                                )}
                                {!isValidatingDiscount && discountError && (
                                  <X className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500" />
                                )}
                              </div>
                              <button
                                onClick={applyDiscountCode}
                                disabled={
                                  !discountCode.trim() || isValidatingDiscount
                                }
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                              >
                                Apply
                              </button>
                            </div>
                            {discountError && (
                              <p className="text-red-600 text-xs mt-1">
                                {discountError}
                              </p>
                            )}
                            {appliedDiscount && !discountError && (
                              <p className="text-green-600 text-xs mt-1 font-medium">
                                ✓ {appliedDiscount}% discount applied!
                              </p>
                            )}
                          </div>

                          {appliedDiscount &&
                            convertedSubtotal &&
                            convertedDiscountAmount && (
                              <>
                                <div className="flex justify-between items-center py-2 border-t border-gray-200">
                                  <span className="text-sm text-gray-600">
                                    Subtotal:
                                  </span>
                                  <span className="text-base font-semibold text-gray-900">
                                    {convertedSubtotal}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                  <span className="text-sm text-green-600 font-medium">
                                    Discount ({appliedDiscount}%):
                                  </span>
                                  <span className="text-base font-semibold text-green-600">
                                    -{convertedDiscountAmount}
                                  </span>
                                </div>
                              </>
                            )}

                          <div className="flex justify-between items-center border-t-2 border-gray-300 pt-4 mt-4">
                            <span className="text-base font-bold text-gray-900">
                              Total:
                            </span>
                            <span className="text-2xl font-bold text-blue-600">
                              {formatTotal(calculateTotal())}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                              <Shield className="w-6 h-6 text-green-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-green-900 font-semibold mb-1 text-sm">
                              Secure Payment
                            </p>
                            <p className="text-xs text-green-800 leading-relaxed">
                              Your payment is protected. If your session doesn't
                              happen, you'll receive a full refund.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
