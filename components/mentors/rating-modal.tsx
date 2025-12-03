"use client"

import * as React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Star, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

interface RatingModalProps {
  isOpen: boolean
  onClose: () => void
  mentorId: number
  mentorName: string
  onRatingSubmitted?: () => void
}

export function RatingModal({
  isOpen,
  onClose,
  mentorId,
  mentorName,
  onRatingSubmitted,
}: RatingModalProps) {
  const [selectedRating, setSelectedRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [comment, setComment] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (selectedRating === 0) {
      toast.error("Please select a rating")
      return
    }

    setIsSubmitting(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Please log in to submit a rating")
        setIsSubmitting(false)
        return
      }

      // Get student data
      const { data: studentData } = await supabase
        .from('students')
        .select('full_name, email')
        .eq('id', user.id)
        .single()

      const studentName = studentData?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous'

      // Insert rating/review into testimonials table
      const { data, error } = await supabase
        .from('testimonials')
        .insert({
          mentor_id: mentorId,
          mentor_name: mentorName,
          student_name: studentName,
          rating: selectedRating,
          content: comment || `Rated ${selectedRating} out of 5 stars`,
          is_approved: false, // Requires admin approval
        })
        .select()
        .single()

      if (error) {
        console.error("Error submitting rating:", error)
        toast.error("Failed to submit rating. Please try again.")
        setIsSubmitting(false)
        return
      }

      // Update mentor's rating and total_reviews
      // First, get current mentor data
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('rating, total_reviews')
        .eq('id', mentorId)
        .single()

      if (mentorData) {
        const currentRating = mentorData.rating || 0
        const currentReviews = mentorData.total_reviews || 0
        
        // Calculate new average rating
        const newTotalReviews = currentReviews + 1
        const newRating = ((currentRating * currentReviews) + selectedRating) / newTotalReviews

        // Update mentor's rating
        await supabase
          .from('mentors')
          .update({
            rating: newRating,
            total_reviews: newTotalReviews,
          })
          .eq('id', mentorId)
      }

      toast.success("Rating submitted successfully! It will be reviewed before being published.")
      setSelectedRating(0)
      setComment("")
      setHoveredRating(0)
      onClose()
      
      if (onRatingSubmitted) {
        onRatingSubmitted()
      }
    } catch (error) {
      console.error("Error submitting rating:", error)
      toast.error("Failed to submit rating. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedRating(0)
      setComment("")
      setHoveredRating(0)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
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
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Rate {mentorName}</h2>
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Rating Stars */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Your Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      disabled={isSubmitting}
                      className="focus:outline-none disabled:opacity-50"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= (hoveredRating || selectedRating)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300 fill-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {selectedRating > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedRating === 5 && "Excellent"}
                    {selectedRating === 4 && "Very Good"}
                    {selectedRating === 3 && "Good"}
                    {selectedRating === 2 && "Fair"}
                    {selectedRating === 1 && "Poor"}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review (Optional)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience with this tutor..."
                  rows={4}
                  disabled={isSubmitting}
                  className="resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedRating === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Rating"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

