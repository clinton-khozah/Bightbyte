// Dynamic Pricing Calculator for Mentors/Tutors
// Similar to Uber/Nolt pricing system

export interface PricingFactors {
  // Base mentor data
  baseHourlyRate: number;
  experience: number; // years
  rating: number; // 0-5
  totalReviews: number;
  totalBookings: number; // total sessions completed

  // Session-specific factors
  subject: string;
  subjectDemand: "low" | "medium" | "high"; // demand level for this subject
  sessionType: "online" | "in-person";
  duration: number; // minutes

  // Time-based factors
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  dayOfWeek: "weekday" | "weekend";
  isHoliday: boolean;

  // Location factors
  location: {
    country: string;
    city?: string;
    isRemote?: boolean;
  };

  // Demand factors
  currentRequests: number; // number of pending requests
  mentorAvailability: "high" | "medium" | "low"; // how busy the mentor is

  // Special factors
  isUrgent: boolean; // urgent booking
  isRecurring: boolean; // recurring session
  studentLevel: "beginner" | "intermediate" | "advanced";

  // Real-time dynamic factors (change every minute)
  realTimeDemand: number; // 0-100, fluctuates based on market conditions
  marketVolatility: number; // 0-1, how much prices are fluctuating
  peakHourMultiplier: number; // 1.0-1.5, based on current hour demand
  competitionLevel: number; // 0-1, how many tutors are available
  activeBookings: number; // number of active bookings right now
}

export interface PriceBreakdown {
  basePrice: number;
  experienceMultiplier: number;
  ratingMultiplier: number;
  demandMultiplier: number;
  timeMultiplier: number;
  locationMultiplier: number;
  urgencyMultiplier: number;
  sessionTypeMultiplier: number;
  studentLevelMultiplier: number;
  subtotal: number;
  platformFee: number; // 16% platform fee
  total: number;
  currency: string;
}

export function calculateDynamicPricing(
  factors: PricingFactors
): PriceBreakdown {
  const {
    baseHourlyRate,
    experience,
    rating,
    totalReviews,
    totalBookings,
    subjectDemand,
    sessionType,
    duration,
    timeOfDay,
    dayOfWeek,
    isHoliday,
    currentRequests,
    mentorAvailability,
    isUrgent,
    isRecurring,
    studentLevel,
    realTimeDemand = 50, // Default to medium demand
    marketVolatility = 0.1, // Default to low volatility
    peakHourMultiplier = 1.0, // Default to no peak
    competitionLevel = 0.5, // Default to medium competition
    activeBookings = 0, // Default to no active bookings
  } = factors;

  // Base price calculation (per hour, converted to duration)
  // Minimum cap only (no maximum - allow dynamic pricing based on market)
  // Ensure minimum of $5/hour for affordability
  const cappedBaseRate = Math.max(baseHourlyRate, 5.0);
  const basePrice = (cappedBaseRate * duration) / 60;

  // 1. Experience Multiplier (0.9x to 1.4x) - Creates price variation
  // More experience = higher price
  let experienceMultiplier = 1.0;
  if (experience < 1) experienceMultiplier = 0.9;
  else if (experience < 2) experienceMultiplier = 0.95;
  else if (experience < 3) experienceMultiplier = 1.0;
  else if (experience < 5) experienceMultiplier = 1.15;
  else if (experience < 7) experienceMultiplier = 1.25;
  else if (experience < 10) experienceMultiplier = 1.35;
  else experienceMultiplier = 1.4;

  // 2. Rating Multiplier (0.85x to 1.3x) - Creates price variation
  // Higher rating = higher price
  let ratingMultiplier = 1.0;
  if (rating >= 4.5 && totalReviews >= 20) ratingMultiplier = 1.3;
  else if (rating >= 4.5 && totalReviews >= 10) ratingMultiplier = 1.2;
  else if (rating >= 4.0 && totalReviews >= 10) ratingMultiplier = 1.1;
  else if (rating >= 4.0) ratingMultiplier = 1.05;
  else if (rating >= 3.5) ratingMultiplier = 1.0;
  else if (rating >= 3.0) ratingMultiplier = 0.95;
  else if (rating >= 2.0) ratingMultiplier = 0.9;
  else ratingMultiplier = 0.85;

  // 3. Demand Multiplier (0.9x to 1.3x) - Creates price variation
  // Higher demand = higher price
  let demandMultiplier = 1.0;
  if (subjectDemand === "high") demandMultiplier = 1.3;
  else if (subjectDemand === "medium") demandMultiplier = 1.1;
  else demandMultiplier = 0.9;

  // Apply real-time demand fluctuations (0.95x to 1.15x) - Creates variation
  // Real-time demand affects pricing dynamically
  const realTimeDemandMultiplier = 0.95 + (realTimeDemand / 100) * 0.2; // 0.95 to 1.15
  demandMultiplier *= realTimeDemandMultiplier;

  // Apply peak hour multiplier (1.0x to 1.2x) - Creates variation
  const adjustedPeakMultiplier = 1.0 + (peakHourMultiplier - 1.0) * 0.4; // Scale peak multiplier
  demandMultiplier *= adjustedPeakMultiplier;

  // Apply competition level (more competition = lower prices, 0.9x to 1.1x)
  const competitionMultiplier = 1.1 - competitionLevel * 0.2; // 1.1 to 0.9
  demandMultiplier *= competitionMultiplier;

  // Apply active bookings pressure (more active = higher price, 1.0x to 1.15x)
  const activeBookingsMultiplier = 1.0 + Math.min(activeBookings / 15, 0.15); // 1.0 to 1.15
  demandMultiplier *= activeBookingsMultiplier;

  // 4. Time Multiplier (0.9x to 1.3x) - Creates price variation
  // Peak times = higher price
  let timeMultiplier = 1.0;
  if (dayOfWeek === "weekend") {
    timeMultiplier = 1.15;
  }
  if (isHoliday) {
    timeMultiplier = 1.2;
  }

  // Time of day adjustments - Creates variation
  if (timeOfDay === "evening" && dayOfWeek === "weekday") {
    timeMultiplier = 1.3; // Peak evening hours
  } else if (timeOfDay === "afternoon" && dayOfWeek === "weekday") {
    timeMultiplier = 1.1;
  } else if (timeOfDay === "morning") {
    timeMultiplier = 0.95;
  } else if (timeOfDay === "night") {
    timeMultiplier = 1.05;
  }

  // 5. Location Multiplier (0.8x to 1.2x) - Economic-based pricing with variation
  // African countries get discounts, premium locations get premium pricing
  let locationMultiplier = 1.0;

  // African countries - discount for affordability
  const africanCountries = [
    "South Africa",
    "Nigeria",
    "Kenya",
    "Ghana",
    "Egypt",
    "Tanzania",
    "Uganda",
    "Ethiopia",
    "Angola",
    "Mozambique",
    "Botswana",
    "Zimbabwe",
    "Namibia",
    "Lesotho",
    "Swaziland",
    "Malawi",
    "Zambia",
    "Rwanda",
    "Senegal",
    "Cameroon",
    "Ivory Coast",
    "Morocco",
    "Tunisia",
    "Algeria",
  ];

  // Developing countries - small discount
  const developingCountries = [
    "India",
    "Brazil",
    "Mexico",
    "Philippines",
    "Indonesia",
    "Vietnam",
    "Thailand",
    "Bangladesh",
    "Pakistan",
    "Sri Lanka",
    "Colombia",
    "Peru",
  ];

  // Premium locations - premium pricing
  const premiumLocations = [
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "Switzerland",
    "Germany",
    "France",
    "Japan",
    "Singapore",
  ];

  if (africanCountries.includes(factors.location.country)) {
    locationMultiplier = 0.8; // 20% discount for African countries
  } else if (developingCountries.includes(factors.location.country)) {
    locationMultiplier = 0.9; // 10% discount for developing countries
  } else if (premiumLocations.includes(factors.location.country)) {
    locationMultiplier = 1.2; // 20% premium for premium locations
  } else if (factors.location.isRemote) {
    locationMultiplier = 0.95; // Slight discount for remote
  } else {
    locationMultiplier = 1.0; // Standard pricing
  }

  // 6. Urgency Multiplier (1.0x to 1.3x) - Creates price variation
  // Urgent bookings = higher price
  let urgencyMultiplier = 1.0;
  if (isUrgent) {
    urgencyMultiplier = 1.3;
  }

  // 7. Session Type Multiplier (0.9x to 1.2x) - Creates price variation
  // In-person typically costs more
  let sessionTypeMultiplier = 1.0;
  if (sessionType === "in-person") {
    sessionTypeMultiplier = 1.2;
  } else {
    sessionTypeMultiplier = 0.9; // Online is cheaper
  }

  // 8. Student Level Multiplier (0.9x to 1.2x) - Creates price variation
  // Advanced students may pay more for specialized expertise
  let studentLevelMultiplier = 1.0;
  if (studentLevel === "advanced") {
    studentLevelMultiplier = 1.2;
  } else if (studentLevel === "beginner") {
    studentLevelMultiplier = 0.9;
  }

  // 9. Availability Multiplier (0.85x to 1.3x) - Creates price variation
  // Busy mentors = higher price (supply/demand)
  let availabilityMultiplier = 1.0;
  if (mentorAvailability === "low") {
    availabilityMultiplier = 1.3; // High demand, low availability
  } else if (mentorAvailability === "medium") {
    availabilityMultiplier = 1.1;
  } else {
    availabilityMultiplier = 0.85; // High availability
  }

  // 10. Recurring Session Discount
  if (isRecurring) {
    // Apply 15% discount for recurring sessions
    availabilityMultiplier *= 0.85;
  }

  // Calculate subtotal with all multipliers
  let subtotal =
    basePrice *
    experienceMultiplier *
    ratingMultiplier *
    demandMultiplier *
    timeMultiplier *
    locationMultiplier *
    urgencyMultiplier *
    sessionTypeMultiplier *
    studentLevelMultiplier *
    availabilityMultiplier;

  // Minimum cap only (no maximum - allow dynamic pricing)
  // For 60-minute sessions: ensure minimum of $4.31 subtotal (becomes $5 with fee)
  if (duration >= 60) {
    const minSubtotal = 4.31; // $5 / 1.16
    if (subtotal < minSubtotal) {
      subtotal = minSubtotal;
    }
  } else {
    // For other durations, scale minimum proportionally
    const minSubtotal = (4.31 * duration) / 60;
    if (subtotal < minSubtotal) {
      subtotal = minSubtotal;
    }
  }

  // Platform fee (16%)
  let platformFee = subtotal * 0.16;

  // Total price
  let total = subtotal + platformFee;

  // Final safety check: Enforce strict $5-$30 USD range for 60-minute sessions
  if (duration >= 60) {
    // Minimum: $5 USD (including all fees)
    if (total < 5.0) {
      total = 5.0;
      subtotal = total / 1.16;
      platformFee = total - subtotal;
    }
  }

  // For other durations, ensure minimum is proportional
  if (duration < 60) {
    const minTotal = (5.0 * duration) / 60;
    if (total < minTotal) {
      total = minTotal;
      subtotal = total / 1.16;
      platformFee = total - subtotal;
    }
  }

  // All prices are calculated in USD (database stores USD)
  // Currency conversion happens at display time
  const currency = "USD"; // Always USD for calculations

  return {
    basePrice,
    experienceMultiplier,
    ratingMultiplier,
    demandMultiplier,
    timeMultiplier,
    locationMultiplier,
    urgencyMultiplier,
    sessionTypeMultiplier,
    studentLevelMultiplier,
    subtotal: Number(subtotal.toFixed(2)),
    platformFee: Number(platformFee.toFixed(2)),
    total: Number(total.toFixed(2)),
    currency, // USD - conversion happens at display
  };
}

// Helper function to determine subject demand
export function getSubjectDemand(subject: string): "low" | "medium" | "high" {
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

// Helper function to get time of day
export function getTimeOfDay(
  hour: number
): "morning" | "afternoon" | "evening" | "night" {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

// Helper function to get day type
export function getDayType(day: number): "weekday" | "weekend" {
  // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6 ? "weekend" : "weekday";
}
