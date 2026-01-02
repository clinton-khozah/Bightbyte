"use client"

import * as React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { LoadingLogo } from "@/components/loading-logo"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PricingFactors, PriceBreakdown } from "@/lib/pricing-calculator"
import { OpenAI } from "openai"

interface AIPricingAssistantProps {
  isOpen: boolean
  onClose: () => void
  currentFactors: PricingFactors
  currentPrice: PriceBreakdown
  onPriceUpdate?: (newPrice: PriceBreakdown, aiRecommendation: string) => void
}

interface AIRecommendation {
  suggestedPrice: PriceBreakdown
  recommendation: string
  confidence: number
  factors: {
    factor: string
    impact: string
    suggestion: string
  }[]
}

export function AIPricingAssistant({
  isOpen,
  onClose,
  currentFactors,
  currentPrice,
  onPriceUpdate,
}: AIPricingAssistantProps) {
  const [loading, setLoading] = useState(false)
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyzePricing = async () => {
    setLoading(true)
    setError(null)
    setRecommendation(null)

    try {
      // Use Hugging Face OpenAI-compatible API (router endpoint)
      // This is more reliable than the inference API
      const hfToken = process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || process.env.HF_TOKEN
      
      // Recommended models (in order of preference):
      // 1. meta-llama/Llama-3.1-8B-Instruct:novita (best quality, fast)
      // 2. meta-llama/Llama-3.2-3B-Instruct (fast, good quality)
      // 3. microsoft/Phi-3-mini-4k-instruct (very fast)
      // 4. Qwen/Qwen2.5-3B-Instruct (good for analysis)
      
      const models = [
        "meta-llama/Llama-3.1-8B-Instruct:novita", // Best quality and speed
        "meta-llama/Llama-3.2-3B-Instruct",        // Fast, good quality
        "microsoft/Phi-3-mini-4k-instruct",        // Very fast
        "Qwen/Qwen2.5-3B-Instruct",                // Good for structured analysis
      ]
      
      if (hfToken && hfToken !== 'hf_demo') {
        // Initialize OpenAI client with Hugging Face router
        const client = new OpenAI({
          baseURL: "https://router.huggingface.co/v1",
          apiKey: hfToken,
        })

        // Try models in order until one works
        for (const model of models) {
          try {
            const chatCompletion = await client.chat.completions.create({
              model: model,
              messages: [
                {
                  role: "system",
                  content: "You are an expert pricing analyst helping students evaluate if a tutor's pricing offers good value. Analyze pricing scenarios from a student's perspective and provide insights in JSON format.",
                },
                {
                  role: "user",
                  content: `Analyze this tutor's pricing from a student's perspective and provide value insights:

Tutor Profile:
- Base Hourly Rate: $${currentFactors.baseHourlyRate}
- Experience: ${currentFactors.experience} years
- Rating: ${currentFactors.rating}/5 (${currentFactors.totalReviews} reviews)
- Total Bookings: ${currentFactors.totalBookings}
- Subject: ${currentFactors.subject} (Demand: ${currentFactors.subjectDemand})
- Session Type: ${currentFactors.sessionType}
- Duration: ${currentFactors.duration} minutes
- Time: ${currentFactors.timeOfDay}, ${currentFactors.dayOfWeek}
- Location: ${currentFactors.location.country}
- Availability: ${currentFactors.mentorAvailability}
- Urgent: ${currentFactors.isUrgent ? 'Yes' : 'No'}

Current Price: $${currentPrice.total}

Provide a JSON response with:
{
  "value": "Good value/Fair/Expensive and brief reason",
  "comparison": "Higher/Lower/Same as market",
  "factors": ["factor1", "factor2", ...],
  "insights": "Market comparison insights from student perspective",
  "recommendations": "Should student book this tutor? Value assessment"
}`,
                },
              ],
              temperature: 0.7,
              max_tokens: 500,
            })

            const aiText = chatCompletion.choices[0]?.message?.content || ''
            
            if (aiText) {
              // Extract insights from AI response
              const localAnalysis = performLocalAIAnalysis(currentFactors, currentPrice, aiText)
              setRecommendation(localAnalysis)
              return
            }
          } catch (hfError: any) {
            // If model is loading or unavailable, try next one
            if (hfError?.status === 503 || hfError?.message?.includes('loading')) {
              console.log(`Model ${model} is loading, trying next...`)
              continue
            }
            console.log(`Error with model ${model}, trying next...`, hfError)
            continue
          }
        }
      }
      
      // Fallback to local AI analysis (always works, no API key needed)
      const localAnalysis = performLocalAIAnalysis(currentFactors, currentPrice)
      setRecommendation(localAnalysis)
    } catch (err) {
      console.error("AI analysis error:", err)
      // Fallback to local analysis
      const localAnalysis = performLocalAIAnalysis(currentFactors, currentPrice)
      setRecommendation(localAnalysis)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (isOpen) {
      analyzePricing()
    }
  }, [isOpen])

  const handleApplyRecommendation = () => {
    if (recommendation && onPriceUpdate) {
      onPriceUpdate(recommendation.suggestedPrice, recommendation.recommendation)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-500" />
            Pricing Assistant
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Get AI-powered insights to help you understand if this tutor's pricing offers good value
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingLogo size={32} />
              <p className="text-gray-600 mt-4">Analyzing tutor's pricing and value...</p>
            </div>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {recommendation && !loading && (
            <>
              {/* Current vs Suggested Price */}
              <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200">
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Tutor's Price</p>
                      <p className="text-2xl font-bold text-gray-700">
                        ${currentPrice.total.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Market Value</p>
                      <p className={`text-2xl font-bold ${
                        recommendation.suggestedPrice.total > currentPrice.total
                          ? 'text-blue-600'
                          : recommendation.suggestedPrice.total < currentPrice.total
                          ? 'text-green-600'
                          : 'text-gray-700'
                      }`}>
                        ${recommendation.suggestedPrice.total.toFixed(2)}
                      </p>
                      <Badge className={`mt-2 ${
                        recommendation.suggestedPrice.total > currentPrice.total
                          ? 'bg-blue-100 text-blue-700'
                          : recommendation.suggestedPrice.total < currentPrice.total
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {recommendation.suggestedPrice.total > currentPrice.total ? (
                          <><TrendingUp className="w-3 h-3 mr-1" /> Higher than market</>
                        ) : recommendation.suggestedPrice.total < currentPrice.total ? (
                          <><TrendingDown className="w-3 h-3 mr-1" /> Great value</>
                        ) : (
                          'Fair price'
                        )}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <p className="text-sm text-gray-700">{recommendation.recommendation}</p>
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        Confidence: {recommendation.confidence}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Factors */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Value Analysis & Insights</h3>
                <div className="space-y-2">
                  {recommendation.factors.map((factor, index) => (
                    <Card key={index} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{factor.factor}</p>
                            <p className="text-xs text-gray-600 mt-1">{factor.impact}</p>
                            <p className="text-xs text-blue-600 mt-1 italic">{factor.suggestion}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={onClose}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Local AI analysis function (fallback and enhanced analysis)
function performLocalAIAnalysis(
  factors: PricingFactors,
  currentPrice: PriceBreakdown,
  aiText?: string
): AIRecommendation {
  // Analyze pricing factors
  const analysis: {
    factor: string
    impact: string
    suggestion: string
  }[] = []

  // Experience analysis
  if (factors.experience < 3) {
    analysis.push({
      factor: "Experience Level",
      impact: "This tutor has less experience, which may affect teaching quality",
      suggestion: "Consider if the lower price matches your learning needs and expectations"
    })
  } else if (factors.experience >= 10) {
    analysis.push({
      factor: "Experience Level",
      impact: "This tutor has extensive experience in their field",
      suggestion: "The premium pricing reflects their expertise and proven track record"
    })
  }

  // Rating analysis
  if (factors.rating >= 4.5 && factors.totalReviews >= 20) {
    analysis.push({
      factor: "Rating & Reviews",
      impact: "Excellent rating with many positive reviews from students",
      suggestion: "High ratings indicate quality teaching - price reflects value"
    })
  } else if (factors.rating < 4.0) {
    analysis.push({
      factor: "Rating & Reviews",
      impact: "This tutor's rating is below average",
      suggestion: "Consider if the lower price compensates for the lower rating"
    })
  }

  // Demand analysis
  if (factors.subjectDemand === 'high') {
    analysis.push({
      factor: "Subject Demand",
      impact: "This subject is in high demand, which affects pricing",
      suggestion: "The price reflects market demand for this subject"
    })
  }

  // Time analysis
  if (factors.timeOfDay === 'evening' && factors.dayOfWeek === 'weekday') {
    analysis.push({
      factor: "Time & Day",
      impact: "Peak hours typically have higher pricing",
      suggestion: "Consider booking during off-peak hours for potentially lower rates"
    })
  }

  // Availability analysis
  if (factors.mentorAvailability === 'low') {
    analysis.push({
      factor: "Availability",
      impact: "This tutor has limited availability due to high demand",
      suggestion: "Limited slots may justify the pricing - book early to secure your spot"
    })
  }

  // Calculate suggested price (with AI adjustments)
  let priceAdjustment = 1.0
  
  // If experience is high but price seems low
  if (factors.experience >= 5 && currentPrice.total < factors.baseHourlyRate * 1.5) {
    priceAdjustment = 1.1 // Suggest 10% increase
  }
  
  // If rating is excellent but price doesn't reflect it
  if (factors.rating >= 4.5 && currentPrice.total < factors.baseHourlyRate * 1.3) {
    priceAdjustment = Math.max(priceAdjustment, 1.15) // Suggest 15% increase
  }
  
  // If demand is high but price is low
  if (factors.subjectDemand === 'high' && currentPrice.total < factors.baseHourlyRate * 1.2) {
    priceAdjustment = Math.max(priceAdjustment, 1.2) // Suggest 20% increase
  }

  const suggestedSubtotal = currentPrice.subtotal * priceAdjustment
  const suggestedPlatformFee = suggestedSubtotal * 0.16
  const suggestedTotal = suggestedSubtotal + suggestedPlatformFee

  const suggestedPrice: PriceBreakdown = {
    ...currentPrice,
    subtotal: Number(suggestedSubtotal.toFixed(2)),
    platformFee: Number(suggestedPlatformFee.toFixed(2)),
    total: Number(suggestedTotal.toFixed(2)),
  }

  // Generate recommendation text (student-focused)
  let recommendation = ""
  if (priceAdjustment > 1.1) {
    recommendation = `This tutor's pricing (${factors.experience} years experience, ${factors.rating}★ rating) is higher than typical market rates. However, their expertise and high demand subject may justify the premium. Consider if the quality matches the price.`
  } else if (priceAdjustment < 0.95) {
    recommendation = `This tutor offers competitive pricing compared to the market. With ${factors.experience} years of experience and a ${factors.rating}★ rating, this appears to be good value for money.`
  } else {
    recommendation = `This tutor's pricing is well-calibrated for their profile and market conditions. The price reflects their experience, ratings, and demand appropriately, offering fair value.`
  }

  // Add AI insights if available
  if (aiText) {
    recommendation += ` AI Analysis: ${aiText.substring(0, 200)}...`
  }

  return {
    suggestedPrice,
    recommendation,
    confidence: 85, // Confidence score
    factors: analysis,
  }
}

