// Real-time dynamic pricing factors that change every minute
// These factors simulate market conditions, demand, and competition

export interface DynamicPricingState {
  realTimeDemand: number // 0-100, fluctuates based on market conditions
  marketVolatility: number // 0-1, how much prices are fluctuating
  peakHourMultiplier: number // 1.0-1.5, based on current hour demand
  competitionLevel: number // 0-1, how many tutors are available
  activeBookings: number // number of active bookings right now
  lastUpdate: number // timestamp of last update
}

/**
 * Calculate real-time demand based on current time and market conditions
 * Demand fluctuates throughout the day
 */
export function calculateRealTimeDemand(): number {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  
  // Base demand varies by hour (peak hours: 6-9 PM, 9-11 AM)
  let baseDemand = 50 // Default medium demand
  
  // Morning peak (9 AM - 11 AM)
  if (hour >= 9 && hour < 11) {
    baseDemand = 65 + (hour - 9) * 5 // 65-75
  }
  // Afternoon (11 AM - 3 PM)
  else if (hour >= 11 && hour < 15) {
    baseDemand = 55 - (hour - 11) * 2 // 55-47
  }
  // Evening peak (6 PM - 9 PM) - highest demand
  else if (hour >= 18 && hour < 21) {
    baseDemand = 80 + (hour - 18) * 3 // 80-89
  }
  // Night (9 PM - 12 AM)
  else if (hour >= 21 || hour < 24) {
    baseDemand = 60 - (hour >= 21 ? (hour - 21) * 2 : 0) // 60-54
  }
  // Early morning (12 AM - 9 AM) - lowest demand
  else {
    baseDemand = 30 + hour * 2 // 30-48
  }
  
  // Add minute-based micro-fluctuations (±5%)
  const minuteVariation = Math.sin((minute / 60) * Math.PI * 2) * 5
  baseDemand += minuteVariation
  
  // Add random market volatility (±10%)
  const volatility = (Math.random() - 0.5) * 20
  
  // Clamp between 20 and 95
  return Math.max(20, Math.min(95, baseDemand + volatility))
}

/**
 * Calculate peak hour multiplier based on current time
 */
export function calculatePeakHourMultiplier(): number {
  const now = new Date()
  const hour = now.getHours()
  const dayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday
  
  // Peak hours: 6-9 PM on weekdays, 10 AM - 2 PM on weekends
  let multiplier = 1.0
  
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    // Weekdays: evening peak (6-9 PM)
    if (hour >= 18 && hour < 21) {
      multiplier = 1.3 + ((hour - 18) / 3) * 0.2 // 1.3 to 1.5
    }
    // Morning rush (8-10 AM)
    else if (hour >= 8 && hour < 10) {
      multiplier = 1.1 + ((hour - 8) / 2) * 0.1 // 1.1 to 1.2
    }
  } else {
    // Weekends: midday peak (10 AM - 2 PM)
    if (hour >= 10 && hour < 14) {
      multiplier = 1.2 + ((hour - 10) / 4) * 0.2 // 1.2 to 1.4
    }
  }
  
  return multiplier
}

/**
 * Calculate market volatility (how much prices fluctuate)
 * Higher volatility = more price changes
 */
export function calculateMarketVolatility(): number {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  
  // Volatility is higher during peak hours and at minute transitions
  let volatility = 0.1 // Base volatility
  
  // Peak hours have higher volatility
  if ((hour >= 18 && hour < 21) || (hour >= 9 && hour < 11)) {
    volatility = 0.2
  }
  
  // Higher volatility at the start of each hour
  if (minute < 5) {
    volatility += 0.1
  }
  
  // Add random component
  volatility += (Math.random() - 0.5) * 0.1
  
  return Math.max(0.05, Math.min(0.3, volatility))
}

/**
 * Calculate competition level (how many tutors are available)
 * Simulated based on time and day
 */
export function calculateCompetitionLevel(totalTutors: number): number {
  const now = new Date()
  const hour = now.getHours()
  const dayOfWeek = now.getDay()
  
  // More tutors available during business hours
  let availability = 0.5 // Base availability
  
  // Business hours (9 AM - 9 PM) have more tutors
  if (hour >= 9 && hour < 21) {
    availability = 0.7
  }
  
  // Weekends have slightly fewer tutors
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    availability *= 0.8
  }
  
  // Scale by total tutors (more tutors = more competition)
  const competition = Math.min(1.0, (totalTutors / 50) * availability)
  
  return competition
}

/**
 * Simulate active bookings count
 * Based on time, day, and demand
 */
export function calculateActiveBookings(realTimeDemand: number): number {
  // Active bookings correlate with demand
  // Higher demand = more active bookings
  const baseBookings = Math.floor((realTimeDemand / 100) * 15) // 0-15
  
  // Add random variation
  const variation = Math.floor(Math.random() * 5)
  
  return Math.max(0, Math.min(20, baseBookings + variation))
}

/**
 * Get all dynamic pricing factors for current moment
 */
export function getDynamicPricingFactors(totalTutors: number = 10): DynamicPricingState {
  const realTimeDemand = calculateRealTimeDemand()
  const peakHourMultiplier = calculatePeakHourMultiplier()
  const marketVolatility = calculateMarketVolatility()
  const competitionLevel = calculateCompetitionLevel(totalTutors)
  const activeBookings = calculateActiveBookings(realTimeDemand)
  
  return {
    realTimeDemand,
    marketVolatility,
    peakHourMultiplier,
    competitionLevel,
    activeBookings,
    lastUpdate: Date.now(),
  }
}
