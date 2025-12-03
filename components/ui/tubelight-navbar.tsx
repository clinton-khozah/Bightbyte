"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { LucideIcon, LogIn } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}

interface NavBarProps {
  items: NavItem[]
  className?: string
  onSignIn?: () => void
  onSignUp?: () => void
  rightContent?: React.ReactNode
}

export function NavBar({ items, className, onSignIn, onSignUp, rightContent }: NavBarProps) {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Determine active tab based on current pathname
  const getActiveTab = () => {
    const activeItem = items.find(item => pathname === item.url || pathname.startsWith(item.url + '/'))
    return activeItem ? activeItem.name : null
  }
  
  const activeTab = getActiveTab()

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex justify-center items-center py-4 transition-all duration-300",
        className,
      )}
    >
      <div className={cn(
        "flex items-center justify-between gap-3 backdrop-blur-lg py-3 px-6 rounded-full shadow-lg w-full max-w-5xl mx-auto",
        isScrolled 
          ? "bg-white/95 border-2 border-blue-500 shadow-blue-200/50" 
          : "bg-white/90 border-2 border-blue-400 shadow-blue-200/50"
      )}>
        {/* Logo Section */}
        <div className="flex items-center gap-1">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo1.png"
              alt="Brightbyt Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </Link>
        </div>
        
        {/* Navigation Items */}
        <div className="flex items-center gap-6">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.name

            return (
              <Link
                key={item.name}
                href={item.url}
                className={cn(
                  "relative cursor-pointer text-lg font-medium text-gray-700 transition-colors px-3",
                  "hover:text-blue-600",
                  activeTab === item.name && "text-blue-600",
                  "relative group"
                )}
              >
                <span className="hidden md:inline">{item.name}</span>
                <span className="md:hidden">
                  <Icon size={18} strokeWidth={2.5} />
                </span>
                {isActive && (
                  <motion.div
                    layoutId="lamp"
                    className="absolute inset-0 w-full bg-blue-50 rounded-full -z-10"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                  >
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-t-full">
                      <div className="absolute w-12 h-6 bg-blue-400/30 rounded-full blur-md -top-2 -left-2" />
                      <div className="absolute w-8 h-6 bg-blue-400/30 rounded-full blur-md -top-1" />
                      <div className="absolute w-4 h-4 bg-blue-400/30 rounded-full blur-sm top-0 left-2" />
                    </div>
                  </motion.div>
                )}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full" />
              </Link>
            )
          })}
        </div>
        
        {/* Auth Buttons */}
        <div className="flex items-center gap-2">
          {rightContent}
          <button
            onClick={onSignIn}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium text-blue-600 bg-white border-2 border-blue-500 hover:bg-blue-50 hover:border-blue-600 transition-all shadow-sm hover:shadow-md flex items-center gap-1.5"
            )}
          >
            <LogIn size={14} />
            Sign In
          </button>
          <button
            onClick={onSignUp}
            className={cn(
              "px-4 py-2 rounded-md text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
            )}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  )
} 