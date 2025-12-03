// API functions for updating mentor prices in database
import { PricingFactors, PriceBreakdown, calculateDynamicPricing } from './pricing-calculator'
import { OpenAI } from 'openai'

export interface UpdatePriceRequest {
  mentorId: string | number
  baseHourlyRate: number
  dynamicPrice?: number
  priceFactors?: {
    experienceMultiplier: number
    ratingMultiplier: number
    demandMultiplier: number
    timeMultiplier: number
    locationMultiplier: number
    urgencyMultiplier: number
    sessionTypeMultiplier: number
    studentLevelMultiplier: number
  }
  lastUpdated: string
}

/**
 * Update mentor's base hourly rate in the database
 */
export async function updateMentorPrice(
  mentorId: string | number,
  newBaseRate: number
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Try API first
    const response = await fetch(
      `http://127.0.0.1:8000/api/v1/mentors/${mentorId}/update-price/`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hourly_rate: newBaseRate,
        }),
      }
    )

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        return { success: true, message: 'Price updated successfully' }
      } else {
        return { success: false, error: data.message || 'Failed to update price' }
      }
    } else {
      // Fallback to Supabase
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase
        .from('mentors')
        .update({ hourly_rate: newBaseRate })
        .eq('id', mentorId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, message: 'Price updated successfully' }
    }
  } catch (error: any) {
    console.error('Error updating mentor price:', error)
    return { success: false, error: error.message || 'Failed to update price' }
  }
}

/**
 * Update mentor's dynamic pricing factors
 */
export async function updateDynamicPricingFactors(
  mentorId: string | number,
  factors: UpdatePriceRequest['priceFactors']
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Store pricing factors (you might want to create a separate table for this)
    const { supabase } = await import('@/lib/supabase')
    
    // Store in a JSON column or separate pricing_factors table
    const { error } = await supabase
      .from('mentors')
      .update({
        pricing_factors: factors,
        pricing_updated_at: new Date().toISOString(),
      })
      .eq('id', mentorId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, message: 'Pricing factors updated successfully' }
  } catch (error: any) {
    console.error('Error updating pricing factors:', error)
    return { success: false, error: error.message || 'Failed to update pricing factors' }
  }
}

/**
 * Get mentor's current pricing data
 */
export async function getMentorPricingData(
  mentorId: string | number
): Promise<{
  success: boolean
  data?: {
    baseHourlyRate: number
    pricingFactors?: any
    lastUpdated?: string
  }
  error?: string
}> {
  try {
    // Try API first
    const response = await fetch(
      `http://127.0.0.1:8000/api/v1/mentors/${mentorId}/`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.mentor) {
        return {
          success: true,
          data: {
            baseHourlyRate: parseFloat(data.mentor.hourly_rate) || 0,
            pricingFactors: data.mentor.pricing_factors,
            lastUpdated: data.mentor.pricing_updated_at,
          },
        }
      }
    }

    // Fallback to Supabase
    const { supabase } = await import('@/lib/supabase')
    const { data: mentorData, error } = await supabase
      .from('mentors')
      .select('hourly_rate, pricing_factors, pricing_updated_at')
      .eq('id', mentorId)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: {
        baseHourlyRate: parseFloat(mentorData.hourly_rate) || 0,
        pricingFactors: mentorData.pricing_factors,
        lastUpdated: mentorData.pricing_updated_at,
      },
    }
  } catch (error: any) {
    console.error('Error fetching mentor pricing:', error)
    return { success: false, error: error.message || 'Failed to fetch pricing data' }
  }
}

/**
 * Calculate price using AI model (with fallback to rule-based calculator)
 * This is the default pricing method that uses AI when available
 */
export async function calculateAIPrice(
  factors: PricingFactors
): Promise<PriceBreakdown> {
  // First, calculate base price using rule-based calculator
  const basePrice = calculateDynamicPricing(factors)
  
  // Try to enhance with AI if token is available
  // Note: NEXT_PUBLIC_ vars are available on both client and server in Next.js
  const hfToken = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || process.env.HF_TOKEN
  
  if (!hfToken || hfToken === 'hf_demo') {
    // No token, return rule-based price
    return basePrice
  }

  try {
    // Initialize OpenAI client with Hugging Face router
    const client = new OpenAI({
      baseURL: "https://router.huggingface.co/v1",
      apiKey: hfToken,
    })

    const models = [
      "meta-llama/Llama-3.1-8B-Instruct:novita",
      "meta-llama/Llama-3.2-3B-Instruct",
      "microsoft/Phi-3-mini-4k-instruct",
      "Qwen/Qwen2.5-3B-Instruct",
    ]

    // Try models in order
    for (const model of models) {
      try {
        const chatCompletion = await client.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content: "You are an expert pricing analyst. Calculate the optimal price for a tutoring session. Return ONLY a JSON object with a single 'suggestedPrice' number (no other text).",
            },
            {
              role: "user",
              content: `Calculate optimal price for:
Base Rate: $${factors.baseHourlyRate}
Experience: ${factors.experience} years
Rating: ${factors.rating}/5 (${factors.totalReviews} reviews)
Subject: ${factors.subject} (Demand: ${factors.subjectDemand})
Time: ${factors.timeOfDay}, ${factors.dayOfWeek}
Location: ${factors.location.country}
Availability: ${factors.mentorAvailability}
Current calculated: $${basePrice.total}

Return JSON: {"suggestedPrice": number}`,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent pricing
          max_tokens: 100,
        })

        const aiText = chatCompletion.choices[0]?.message?.content || ''
        
        // Try to extract price from JSON response
        try {
          // Remove markdown code blocks if present
          const cleanedText = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
          
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            const aiSuggestedPrice = parseFloat(parsed.suggestedPrice)
            
            if (aiSuggestedPrice && aiSuggestedPrice > 0) {
              // Use AI price but keep the structure from base price
              const aiPrice: PriceBreakdown = {
                ...basePrice,
                total: Number(aiSuggestedPrice.toFixed(2)),
                subtotal: Number((aiSuggestedPrice / 1.16).toFixed(2)), // Remove platform fee
                platformFee: Number((aiSuggestedPrice - aiSuggestedPrice / 1.16).toFixed(2)),
              }
              return aiPrice
            }
          }
        } catch (parseError) {
          console.log('Could not parse AI response, using base price')
        }
      } catch (modelError: any) {
        // Model failed, try next one
        if (modelError?.status === 503) {
          continue // Model loading, try next
        }
        continue
      }
    }
  } catch (error) {
    console.log('AI pricing failed, using rule-based calculator:', error)
  }

  // Fallback to rule-based price
  return basePrice
}

