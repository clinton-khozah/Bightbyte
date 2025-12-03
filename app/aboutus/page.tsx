"use client"

import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PageContainer } from "@/components/page-container"
import { GraduationCap, Users, BookOpen, CreditCard, Video, Award, CheckCircle, Star, Globe, Shield, Clock, TrendingUp, Zap, Target, ArrowRight, UserCheck, UsersRound, MapPin, BarChart3, Map } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useEffect, useState, useRef } from "react"

const features = [
  {
    icon: Users,
    title: "Expert Mentors",
    description: "Connect with the world's finest mentors and tutors across all subjects and expertise levels."
  },
  {
    icon: BookOpen,
    title: "Easy Booking",
    description: "Simple and intuitive booking system that lets you find and schedule sessions in minutes."
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description: "Safe and secure payment processing ensures your transactions are protected at all times."
  },
  {
    icon: Video,
    title: "Virtual Sessions",
    description: "Attend sessions from anywhere in the world through our high-quality video platform."
  },
  {
    icon: Award,
    title: "Quality Assured",
    description: "All our mentors are verified professionals committed to delivering exceptional learning experiences."
  },
  {
    icon: Star,
    title: "Best in the World",
    description: "We pride ourselves on being the premier platform for connecting students with world-class mentors."
  }
]

const values = [
  {
    title: "Excellence",
    description: "We are committed to providing the highest quality educational experiences through our carefully selected mentors."
  },
  {
    title: "Accessibility",
    description: "Education should be accessible to everyone, which is why we've made it easy to find and book sessions with expert mentors."
  },
  {
    title: "Innovation",
    description: "We continuously innovate our platform to provide the best possible experience for both students and mentors."
  },
  {
    title: "Trust",
    description: "Your learning journey is important to us. We ensure secure transactions and verified mentors you can trust."
  }
]

const statsInitial = [
  { label: "Active Mentors", value: 0, suffix: "", icon: UserCheck, key: "mentors" },
  { label: "Countries", value: 5, suffix: "", icon: MapPin, key: "countries" },
  { label: "Success Rate", value: 98, suffix: "%", icon: BarChart3, key: "success" }
]

// Full text content for text-to-speech
const fullPageText = `Who Are We

Welcome to Brightbyt

We are the premier platform where you can find the best mentors to teach you whatever you want to learn. Book a session, make a secure payment, and have an exceptional learning experience with your special mentor. We are the best in the world at connecting students with world-class educators.

What Makes Us Different

Secure and Trusted: All payments are processed securely, and all mentors are verified professionals. Flexible Scheduling: Book sessions at times that work for you, from anywhere in the world. Instant Access: Start learning immediately after booking. No waiting, no delays. Quality Guaranteed: Every mentor is carefully vetted to ensure the highest quality of instruction.

Our Story

Brightbyt was initiated in 2025 by a group called Brightbyte, who recognized a critical gap in the global education landscape. Born from a deep commitment to educational equity and social impact, Brightbyt was founded with a singular mission: to democratize access to quality education and professional development opportunities for disadvantaged students and individuals seeking to upskill themselves, regardless of their financial circumstances.

In a world where quality education and professional mentorship have become increasingly expensive and inaccessible, Brightbyte saw an opportunity to bridge the gap between talented educators and eager learners. They understood that financial constraints should never be a barrier to personal growth, career advancement, or academic excellence. With this conviction, they set out to create a platform that would revolutionize how education is accessed, delivered, and experienced.

Our core mission is to empower disadvantaged students and professionals who aspire to upskill themselves but face financial barriers. We believe that everyone deserves access to world-class mentorship and educational resources, regardless of their economic background. Through our innovative pricing model, comprehensive scholarship programs, and partnerships with educational institutions, we ensure that financial limitations do not prevent anyone from achieving their learning goals.

Brightbyt represents more than just a tutoring platform—it's a movement toward educational inclusivity and social mobility. We've built a sustainable business model that balances affordability with quality, ensuring that our mentors are fairly compensated while keeping costs accessible for students from all walks of life. Our dynamic pricing system, powered by advanced AI technology, adjusts rates based on market conditions, mentor expertise, and student needs, making premium education accessible at competitive prices.

For investors, Brightbyt presents a unique opportunity to be part of a socially responsible venture with tremendous growth potential. The global online education market is projected to reach $350 billion by 2025, and we're positioned to capture a significant share of this expanding market. Our platform addresses a critical need in underserved communities while maintaining strong unit economics and scalability. We've demonstrated early traction with verified mentors, engaged students, and a proven technology infrastructure that can scale globally.

Our competitive advantages include our proprietary AI-powered pricing system that optimizes both mentor earnings and student affordability, our focus on underserved markets with high growth potential, and our commitment to social impact that resonates with modern consumers and investors alike. We're not just building a business—we're creating a sustainable ecosystem that benefits students, educators, and communities worldwide.

As we continue to expand our reach, we invite forward-thinking investors to join us in transforming the future of education. Together, we can build a platform that not only generates strong returns but also creates lasting positive change in the lives of millions of learners around the world. Brightbyt is more than an investment opportunity—it's a chance to be part of a mission that makes quality education accessible to everyone, everywhere.`

// Animated Counter Component
function AnimatedCounter({ value, suffix, startCounting }: { value: number; suffix: string; startCounting: boolean }) {
  const [count, setCount] = useState(0)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (startCounting && !hasStartedRef.current) {
      hasStartedRef.current = true
      const duration = 2000 // 2 seconds
      const steps = 60
      const increment = value / steps
      const stepDuration = duration / steps

      let current = 0
      
      const timer = setInterval(() => {
        current += increment
        if (current >= value) {
          setCount(value)
          clearInterval(timer)
        } else {
          setCount(Math.floor(current))
        }
      }, stepDuration)

      return () => {
        clearInterval(timer)
      }
    }
  }, [startCounting, value])

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return num.toLocaleString()
    }
    return num.toString()
  }
 
  return (
    <span>
      {formatNumber(count)}{suffix}
    </span>
  )
}

export default function CompanyPage() {
  const statsRef = useRef<HTMLDivElement>(null)
  const [isStatsVisible, setIsStatsVisible] = useState(false)
  const [stats, setStats] = useState(statsInitial)

  // Fetch stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch mentors count
        try {
          const mentorsResponse = await fetch('http://127.0.0.1:8000/api/v1/mentors/list/', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (mentorsResponse.ok) {
            const mentorsData = await mentorsResponse.json()
            if (mentorsData.success && mentorsData.count !== undefined) {
              setStats(prev => prev.map(stat => 
                stat.key === 'mentors' ? { ...stat, value: mentorsData.count } : stat
              ))
            }
          }
        } catch (error) {
          console.error('Error fetching mentors count:', error)
        }

      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }

    fetchStats()
  }, [])

  useEffect(() => {
    let observer: IntersectionObserver | null = null
    let timeoutId: NodeJS.Timeout | null = null

    // Small delay to ensure ref is attached
    timeoutId = setTimeout(() => {
      const currentRef = statsRef.current
      if (!currentRef) return

      // Check if already visible
      const checkVisibility = () => {
        const rect = currentRef.getBoundingClientRect()
        return rect.top < window.innerHeight && rect.bottom > 0
      }

      // Check immediately
      if (checkVisibility()) {
        setIsStatsVisible(true)
        return
      }

      // Set up observer
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsStatsVisible(true)
              if (observer) {
                observer.disconnect()
              }
            }
          })
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px',
        }
      )

      observer.observe(currentRef)
    }, 100)

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (observer) {
        observer.disconnect()
      }
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col relative">
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: "url('/images/adspace.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 0,
        }}
        aria-hidden="true"
      />
      <Navbar />
      <PageContainer className="flex-1 relative z-10">
        <div className="py-12 md:py-20">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="flex justify-center mb-6">
              <Image
                src="/images/logo1.png"
                alt="Brightbyt Logo"
                width={80}
                height={80}
                className="object-contain"
              />
                            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-['Verdana',sans-serif] drop-shadow-lg">
              Who Are We
            </h1>
            <div className="max-w-4xl mx-auto">
              <p className="text-xl md:text-2xl text-white mb-4 font-['Verdana',sans-serif] leading-relaxed font-semibold drop-shadow-md">
                Welcome to <span className="text-blue-300 font-bold">Brightbyt</span>
              </p>
              <p className="text-lg text-gray-100 font-['Verdana',sans-serif] leading-relaxed drop-shadow-md mb-12">
                We are the premier platform where you can find the best mentors to teach you whatever you want to learn. 
                Book a session, make a secure payment, and have an exceptional learning experience with your special mentor. 
                We are the best in the world at connecting students with world-class educators.
              </p>
              
              {/* What Makes Us Different */}
              <div className="mt-12 text-left">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center font-['Verdana',sans-serif] drop-shadow-lg">
                  What Makes Us Different
                </h2>
                <div className="max-w-4xl mx-auto">
                  <p className="text-gray-200 font-['Verdana',sans-serif] leading-relaxed drop-shadow-sm">
                    <strong className="text-white">Secure & Trusted:</strong> All payments are processed securely, and all mentors are verified professionals. <strong className="text-white">Flexible Scheduling:</strong> Book sessions at times that work for you, from anywhere in the world. <strong className="text-white">Instant Access:</strong> Start learning immediately after booking. No waiting, no delays. <strong className="text-white">Quality Guaranteed:</strong> Every mentor is carefully vetted to ensure the highest quality of instruction.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Company Origin Story */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="my-12"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="max-w-5xl mx-auto"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-8 text-center font-['Verdana',sans-serif] drop-shadow-lg">
                Our Story
              </h2>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 md:p-12 border-2 border-yellow-400/30 shadow-2xl">
                <div className="space-y-6 text-gray-100 font-['Verdana',sans-serif] leading-relaxed text-lg md:text-xl">
                  <p className="drop-shadow-md">
                    <strong className="text-yellow-400 text-xl md:text-2xl">Brightbyt was initiated in 2025</strong> by a group called <strong className="text-white">Brightbyte</strong>, who recognized a critical gap in the global education landscape. Born from a deep commitment to educational equity and social impact, Brightbyt was founded with a singular mission: to democratize access to quality education and professional development opportunities for disadvantaged students and individuals seeking to upskill themselves, regardless of their financial circumstances.
                  </p>
                  
                  <p className="drop-shadow-md">
                    In a world where quality education and professional mentorship have become increasingly expensive and inaccessible, Brightbyte saw an opportunity to bridge the gap between talented educators and eager learners. They understood that financial constraints should never be a barrier to personal growth, career advancement, or academic excellence. With this conviction, they set out to create a platform that would revolutionize how education is accessed, delivered, and experienced.
                  </p>
                  
                  <p className="drop-shadow-md">
                    <strong className="text-white">Our core mission</strong> is to empower disadvantaged students and professionals who aspire to upskill themselves but face financial barriers. We believe that everyone deserves access to world-class mentorship and educational resources, regardless of their economic background. Through our innovative pricing model, comprehensive scholarship programs, and partnerships with educational institutions, we ensure that financial limitations do not prevent anyone from achieving their learning goals.
                  </p>
                  
                  <p className="drop-shadow-md">
                    Brightbyt represents more than just a tutoring platform—it's a movement toward educational inclusivity and social mobility. We've built a sustainable business model that balances affordability with quality, ensuring that our mentors are fairly compensated while keeping costs accessible for students from all walks of life. Our dynamic pricing system, powered by advanced AI technology, adjusts rates based on market conditions, mentor expertise, and student needs, making premium education accessible at competitive prices.
                  </p>
                  
                  <p className="drop-shadow-md">
                    <strong className="text-white">For investors</strong>, Brightbyt presents a unique opportunity to be part of a socially responsible venture with tremendous growth potential. The global online education market is projected to reach $350 billion by 2025, and we're positioned to capture a significant share of this expanding market. Our platform addresses a critical need in underserved communities while maintaining strong unit economics and scalability. We've demonstrated early traction with verified mentors, engaged students, and a proven technology infrastructure that can scale globally.
                  </p>
                  
                  <p className="drop-shadow-md">
                    Our competitive advantages include our proprietary AI-powered pricing system that optimizes both mentor earnings and student affordability, our focus on underserved markets with high growth potential, and our commitment to social impact that resonates with modern consumers and investors alike. We're not just building a business—we're creating a sustainable ecosystem that benefits students, educators, and communities worldwide.
                  </p>
                  
                  <p className="drop-shadow-md">
                    As we continue to expand our reach, we invite forward-thinking investors to join us in transforming the future of education. Together, we can build a platform that not only generates strong returns but also creates lasting positive change in the lives of millions of learners around the world. Brightbyt is more than an investment opportunity—it's a chance to be part of a mission that makes quality education accessible to everyone, everywhere.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            ref={statsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16 max-w-5xl mx-auto"
          >
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                        <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
                >
                  <Card className="bg-green-100/30 backdrop-blur-sm border-2 border-green-200/50 shadow-md hover:shadow-xl hover:border-green-300/70 transition-all duration-300 group">
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                        <Icon className="w-5 h-5 text-white" />
                          </div>
                      <div className="text-2xl font-bold text-white mb-1 font-['Verdana',sans-serif] drop-shadow-md group-hover:text-green-200 transition-colors">
                        <AnimatedCounter value={stat.value} suffix={stat.suffix} startCounting={isStatsVisible} />
                            </div>
                      <div className="text-xs text-gray-100 font-['Verdana',sans-serif] font-medium drop-shadow-sm">
                        {stat.label}
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              )
            })}
          </motion.div>

        </div>
      </PageContainer>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  )
} 

