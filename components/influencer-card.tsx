"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Star, Sparkles, TrendingUp } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar-client"

interface InfluencerCardProps {
  influencer: {
    id: number
    name: string
    handle: string
    avatar: string
    description: string
    platform: string
    icon: any
    metrics: Record<string, string>
    price: number
    priceModel: string
    category: string
    tags: string[]
    rating: number
    reviews: number
    verified: boolean
  }
}

// Platform-specific gradient styles with enhanced colors
const platformGradients = {
  YouTube: "from-white to-white hover:from-red-50/30 hover:to-white",
  Instagram: "from-white to-white hover:from-pink-50/30 hover:to-white",
  Twitch: "from-white to-white hover:from-purple-50/30 hover:to-white",
  Twitter: "from-white to-white hover:from-blue-50/30 hover:to-white",
  Blog: "from-white to-white hover:from-green-50/30 hover:to-white"
}

const platformAccents = {
  YouTube: "border-red-200 hover:border-red-300",
  Instagram: "border-pink-200 hover:border-pink-300",
  Twitch: "border-purple-200 hover:border-purple-300",
  Twitter: "border-blue-200 hover:border-blue-300",
  Blog: "border-green-200 hover:border-green-300"
}

const platformButtonStyles = {
  YouTube: "hover:bg-red-50/80 hover:border-red-200/40 text-red-600",
  Instagram: "hover:bg-pink-50/80 hover:border-pink-200/40 text-pink-600",
  Twitch: "hover:bg-purple-50/80 hover:border-purple-200/40 text-purple-600",
  Twitter: "hover:bg-blue-50/80 hover:border-blue-200/40 text-blue-600",
  Blog: "hover:bg-green-50/80 hover:border-green-200/40 text-green-600"
}

// Platform-specific glow effects
const platformGlow = {
  YouTube: "hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]",
  Instagram: "hover:shadow-[0_0_30px_rgba(236,72,153,0.2)]",
  Twitch: "hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]",
  Twitter: "hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]",
  Blog: "hover:shadow-[0_0_30px_rgba(34,197,94,0.2)]"
}

function BlinkingStarRating({ rating, platform }: { rating: number; platform: string }) {
  const [currentRating, setCurrentRating] = useState(0);
  const totalStars = 5;

  useEffect(() => {
    let currentCount = 0;
    const interval = setInterval(() => {
      if (currentCount < rating) {
        setCurrentRating(prev => prev + 0.5);
        currentCount += 0.5;
      } else {
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [rating]);

  // Platform-specific star colors
  const starColors = {
    YouTube: "fill-red-400 text-red-400",
    Instagram: "fill-pink-400 text-pink-400",
    Twitch: "fill-purple-400 text-purple-400",
    Twitter: "fill-blue-400 text-blue-400",
    Blog: "fill-green-400 text-green-400"
  }

  return (
    <div className="flex items-center gap-1 mt-2">
      {[...Array(totalStars)].map((_, index) => {
        const starValue = index + 1;
        const isHalfStar = currentRating === index + 0.5;
        const isFullStar = currentRating >= starValue;

        return (
          <Star
            key={`star-${index}`}
            className={`w-4 h-4 transition-all duration-300 ${
              isFullStar
                ? starColors[platform as keyof typeof starColors]
                : isHalfStar
                ? starColors[platform as keyof typeof starColors].replace("fill-", "fill-opacity-50 fill-")
                : "fill-transparent text-gray-300"
            }`}
          />
        );
      })}
      <span className={`text-sm ml-1 ${
        platform === "YouTube" ? "text-red-600" :
        platform === "Instagram" ? "text-pink-600" :
        platform === "Twitch" ? "text-purple-600" :
        platform === "Twitter" ? "text-blue-600" :
        "text-green-600"
      }`}>
        ({rating.toFixed(1)})
      </span>
    </div>
  );
}

// New component for the floating sparkles effect
function FloatingSparkles({ platform }: { platform: string }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-1 h-1 rounded-full ${
            platform === "YouTube" ? "bg-red-400" :
            platform === "Instagram" ? "bg-pink-400" :
            platform === "Twitch" ? "bg-purple-400" :
            platform === "Twitter" ? "bg-blue-400" :
            "bg-green-400"
          }`}
          initial={{ 
            x: Math.random() * 100 + "%", 
            y: "100%",
            scale: 0
          }}
          animate={{ 
            y: "0%",
            scale: [0, 1, 0],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.8,
            ease: "easeOut"
          }}
        />
      ))}
    </motion.div>
  )
}

export function InfluencerCard({ influencer }: InfluencerCardProps) {
  const [scale, setScale] = useState(0.9)
  const [isHovered, setIsHovered] = useState(false)
  const [showSparkles, setShowSparkles] = useState(false)
  
  // Enhanced dynamic scaling based on metrics and engagement
  useEffect(() => {
    const followers = parseInt(influencer.metrics.followers.replace(/[K,M]+$/, '000'));
    const engagement = parseFloat(influencer.metrics.engagement?.replace('%', '') || '0');
    const baseScale = followers > 1000000 ? 1.1 : 
                     followers > 500000 ? 1 : 
                     engagement > 5 ? 1.05 : 0.9;
    
    const sizes = [baseScale - 0.1, baseScale, baseScale + 0.1];
    const randomSize = () => {
      const randomIndex = Math.floor(Math.random() * sizes.length)
      setScale(sizes[randomIndex])
    }

    randomSize()
    const interval = setInterval(randomSize, Math.random() * 2000 + 2000)
    return () => clearInterval(interval)
  }, [influencer.metrics])

  const Icon = influencer.icon

  // Calculate engagement level for visual indicators
  const engagementRate = parseFloat(influencer.metrics.engagement?.replace('%', '') || '0');
  const isHighEngagement = engagementRate > 5;

  return (
    <motion.div
      animate={{
        scale: scale,
        rotate: isHovered ? [0, -1, 1, -1, 0] : 0
      }}
      transition={{
        duration: 0.8,
        ease: "easeInOut"
      }}
      className="h-full p-8"
      onHoverStart={() => {
        setIsHovered(true)
        setShowSparkles(true)
      }}
      onHoverEnd={() => {
        setIsHovered(false)
        setShowSparkles(false)
      }}
    >
      <Card 
        className={`h-full backdrop-blur-sm overflow-hidden transition-all duration-300 group relative bg-white border-2
          bg-gradient-to-br ${platformGradients[influencer.platform as keyof typeof platformGradients]}
          ${platformAccents[influencer.platform as keyof typeof platformAccents]}
          ${platformGlow[influencer.platform as keyof typeof platformGlow]}`}
      >
        {showSparkles && <FloatingSparkles platform={influencer.platform} />}
        
        <CardHeader>
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.3 }}
            >
              <Avatar className={`h-12 w-12 border-2 relative
                ${platformAccents[influencer.platform as keyof typeof platformAccents]}`}>
                <AvatarImage src={influencer.avatar} alt={influencer.name} />
                <AvatarFallback>{influencer.name[0]}</AvatarFallback>
                {isHighEngagement && (
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </motion.div>
                )}
              </Avatar>
            </motion.div>
            <div>
              <CardTitle className="text-gray-800 flex items-center gap-2">
                {influencer.name}
                {influencer.verified && (
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Badge variant="secondary" className={`${
                      platformButtonStyles[influencer.platform as keyof typeof platformButtonStyles]
                    } border border-current/30`}>
                      <Sparkles className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  </motion.div>
                )}
              </CardTitle>
              <CardDescription className="text-gray-600">{influencer.handle}</CardDescription>
              <BlinkingStarRating rating={influencer.rating} platform={influencer.platform} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4 text-sm">{influencer.description}</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {Object.entries(influencer.metrics).map(([key, value]) => (
              <motion.div
                key={key}
                whileHover={{ 
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
                className={`bg-gray-50 p-2 rounded-lg text-center shadow-sm border
                  ${platformAccents[influencer.platform as keyof typeof platformAccents]}`}
              >
                <div className="text-gray-800 font-bold">{value}</div>
                <div className="text-gray-600 text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
              </motion.div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {influencer.tags.map((tag, index) => (
              <motion.div
                key={tag}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Badge 
                  variant="secondary" 
                  className={`bg-white/80 transition-all duration-300
                    ${platformButtonStyles[influencer.platform as keyof typeof platformButtonStyles]}`}
                >
                  {tag}
                </Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className={`text-2xl font-bold ${
              influencer.platform === "YouTube" ? "text-red-600" :
              influencer.platform === "Instagram" ? "text-pink-600" :
              influencer.platform === "Twitch" ? "text-purple-600" :
              influencer.platform === "Twitter" ? "text-blue-600" :
              "text-green-600"
            }`}>
              R{influencer.price}
            </div>
            <div className="text-sm font-medium text-gray-600">{influencer.priceModel}</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="outline" 
              className={`bg-white shadow-sm border-2 transition-all duration-300 font-medium
                ${platformAccents[influencer.platform as keyof typeof platformAccents]}
                ${platformButtonStyles[influencer.platform as keyof typeof platformButtonStyles]}`}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Profile
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
    </motion.div>
  )
} 