"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar-client"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Testimonial {
  id: string
  name: string
  role: string
  company: string
  content: string
  avatar: string
  rating: number
  mentor_name?: string
}

export function TestimonialCarousel() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Fetch testimonials from API
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://127.0.0.1:8000/api/v1/mentors/testimonials/list/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.success && data.testimonials) {
          // Map API data to component format
          const mappedTestimonials: Testimonial[] = data.testimonials.map((testimonial: any) => ({
            id: testimonial.id,
            name: testimonial.student_name,
            role: testimonial.student_role || '',
            company: testimonial.student_company || '',
            content: testimonial.content,
            avatar: testimonial.avatar_url || `https://source.unsplash.com/featured/100x100?portrait=${testimonial.id}`,
            rating: testimonial.rating || 5,
            mentor_name: testimonial.mentor_name || ''
          }))
          setTestimonials(mappedTestimonials)
        } else {
          console.error('Failed to fetch testimonials:', data.message)
          setTestimonials([])
        }
      } catch (error) {
        console.error('Error fetching testimonials:', error)
        setTestimonials([])
      } finally {
        setLoading(false)
      }
    }

    fetchTestimonials()
  }, [])

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || testimonials.length === 0) return
    
    const interval = setInterval(() => {
      setDirection(1)
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length)
    }, 5000)
    
    return () => clearInterval(interval)
  }, [isAutoPlaying, testimonials.length])

  // Handle navigation
  const handlePrevious = () => {
    if (testimonials.length === 0) return
    setIsAutoPlaying(false)
    setDirection(-1)
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length)
  }

  const handleNext = () => {
    if (testimonials.length === 0) return
    setIsAutoPlaying(false)
    setDirection(1)
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length)
  }

  // Show loading or empty state
  if (loading) {
    return (
      <div className="relative w-full py-10 flex justify-center items-center">
        <div className="text-gray-400">Loading testimonials...</div>
      </div>
    )
  }

  if (testimonials.length === 0) {
    return (
      <div className="relative w-full py-10 flex justify-center items-center">
        <div className="text-gray-400">No testimonials available yet.</div>
      </div>
    )
  }

  return (
    <div className="relative w-full py-10">
      {/* Main carousel */}
      <div className="relative overflow-hidden">
        <div className="flex justify-center items-center">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={{
                enter: (direction) => ({
                  x: direction > 0 ? 1000 : -1000,
                  opacity: 0
                }),
                center: {
                  zIndex: 1,
                  x: 0,
                  opacity: 1
                },
                exit: (direction) => ({
                  zIndex: 0,
                  x: direction < 0 ? 1000 : -1000,
                  opacity: 0
                })
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="w-full max-w-3xl"
            >
              <Card className="bg-black/30 backdrop-blur-sm border-gray-700/30 overflow-hidden">
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-shrink-0">
                      <Avatar className="h-20 w-20 border-2 border-yellow-400/30">
                        <AvatarImage src={testimonials[currentIndex].avatar} alt={testimonials[currentIndex].name} />
                        <AvatarFallback className="bg-gray-800/20 text-lg">
                          {testimonials[currentIndex].name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-grow">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="text-xl font-bold text-white">{testimonials[currentIndex].name}</h3>
                        {testimonials[currentIndex].role && (
                          <>
                            <span className="text-gray-400">•</span>
                            <p className="text-gray-300">{testimonials[currentIndex].role}</p>
                          </>
                        )}
                        {testimonials[currentIndex].company && (
                          <>
                            <span className="text-gray-400">•</span>
                            <p className="text-gray-300">{testimonials[currentIndex].company}</p>
                          </>
                        )}
                        {testimonials[currentIndex].mentor_name && (
                          <>
                            <span className="text-gray-400">•</span>
                            <p className="text-blue-400 font-medium">About {testimonials[currentIndex].mentor_name}</p>
                          </>
                        )}
                      </div>
                      <div className="flex gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-5 w-5",
                              i < testimonials[currentIndex].rating ? "text-yellow-400 fill-yellow-400" : "text-gray-600"
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-gray-300 text-lg leading-relaxed italic">
                        "{testimonials[currentIndex].content}"
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex justify-center items-center gap-4 mt-8">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full h-10 w-10 border-gray-700/50 hover:bg-yellow-400/10 hover:border-yellow-400/30"
          onClick={handlePrevious}
        >
          <ChevronLeft className="h-5 w-5 text-gray-300" />
        </Button>
        
        <div className="flex gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === currentIndex 
                  ? "bg-yellow-400 w-4" 
                  : "bg-gray-600 hover:bg-gray-500"
              )}
              onClick={() => {
                setIsAutoPlaying(false)
                setDirection(index > currentIndex ? 1 : -1)
                setCurrentIndex(index)
              }}
            />
          ))}
        </div>
        
        <Button
          variant="outline"
          size="icon"
          className="rounded-full h-10 w-10 border-gray-700/50 hover:bg-yellow-400/10 hover:border-yellow-400/30"
          onClick={handleNext}
        >
          <ChevronRight className="h-5 w-5 text-gray-300" />
        </Button>
      </div>
    </div>
  )
} 