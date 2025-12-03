/**
 * GPT-Powered Pricing API Service
 * Connects to backend for AI-driven pricing analysis
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

export interface GPTPriceBreakdown {
  base_price: number
  subject_multiplier: number
  time_multiplier: number
  urgency_multiplier: number
  experience_multiplier: number
  rating_multiplier: number
  subtotal: number
  platform_fee: number
  total: number
  currency: string
}

export interface MarketAnalysis {
  timestamp: string
  market_trend: 'rising' | 'falling' | 'stable'
  average_price_usd: number | null
  peak_hours: number[]
  subject_insights: Record<string, {
    demand_level: string
    recommended_multiplier: number
    reasoning: string
    priority_slots: string[]
  }>
  inflection_points: Array<{
    subject: string
    time_of_day: number
    day_of_week: number
    demand_spike_percentage: number
    price_impact_percentage: number
    duration_minutes: number
    explanation: string
  }>
  mentor_slot_priorities: Record<string, {
    peak_times: string[]
    recommended_price_adjustment: number
    reasoning: string
  }>
  recommendations: string[]
  analysis_summary: string
}

export interface SubjectDemand {
  name: string
  demand_level: 'low' | 'medium' | 'high' | 'critical'
  demand_score: number
  base_multiplier: number
  trend: 'rising' | 'falling' | 'stable'
}

/**
 * Calculate optimal price using GPT analysis
 */
export async function calculateGPTPrice(params: {
  mentorId: string | number
  subject: string
  sessionDuration?: number
  timeOfDay?: number
  dayOfWeek?: number
  isUrgent?: boolean
}): Promise<{ success: boolean; priceBreakdown?: GPTPriceBreakdown; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/pricing/calculate-price/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mentor_id: params.mentorId,
        subject: params.subject,
        session_duration: params.sessionDuration || 60,
        time_of_day: params.timeOfDay,
        day_of_week: params.dayOfWeek,
        is_urgent: params.isUrgent || false,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to calculate price',
      }
    }

    return {
      success: true,
      priceBreakdown: data.price_breakdown,
    }
  } catch (error: any) {
    console.error('Error calculating GPT price:', error)
    return {
      success: false,
      error: error.message || 'Network error',
    }
  }
}

/**
 * Get latest market analysis
 */
export async function getLatestMarketAnalysis(): Promise<{
  success: boolean
  analysis?: MarketAnalysis
  error?: string
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/pricing/analysis/latest/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to get market analysis',
      }
    }

    return {
      success: true,
      analysis: data.analysis,
    }
  } catch (error: any) {
    console.error('Error getting market analysis:', error)
    return {
      success: false,
      error: error.message || 'Network error',
    }
  }
}

/**
 * Get demand data for a specific subject
 */
export async function getSubjectDemandData(
  subjectName: string
): Promise<{
  success: boolean
  subject?: SubjectDemand
  error?: string
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/pricing/subjects/${encodeURIComponent(subjectName)}/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to get subject demand',
      }
    }

    return {
      success: true,
      subject: data.subject,
    }
  } catch (error: any) {
    console.error('Error getting subject demand:', error)
    return {
      success: false,
      error: error.message || 'Network error',
    }
  }
}

/**
 * Get all subjects with demand levels
 */
export async function getAllSubjects(): Promise<{
  success: boolean
  subjects?: SubjectDemand[]
  error?: string
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/pricing/subjects/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to get subjects',
      }
    }

    return {
      success: true,
      subjects: data.subjects,
    }
  } catch (error: any) {
    console.error('Error getting all subjects:', error)
    return {
      success: false,
      error: error.message || 'Network error',
    }
  }
}

/**
 * Get recent inflection points
 */
export async function getInflectionPoints(hours: number = 24): Promise<{
  success: boolean
  inflectionPoints?: Array<{
    detected_at: string
    subject: string | null
    time_of_day: number | null
    day_of_week: number | null
    demand_spike_percentage: number
    price_impact_percentage: number
    duration_minutes: number
    gpt_analysis: string
  }>
  error?: string
}> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/pricing/inflection-points/?hours=${hours}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to get inflection points',
      }
    }

    return {
      success: true,
      inflectionPoints: data.inflection_points,
    }
  } catch (error: any) {
    console.error('Error getting inflection points:', error)
    return {
      success: false,
      error: error.message || 'Network error',
    }
  }
}

