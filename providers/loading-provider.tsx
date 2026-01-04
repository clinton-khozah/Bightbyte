"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { LoadingScreen } from "@/components/loading-screen"
import { Suspense } from "react"

interface LoadingContextType {
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  setIsLoading: () => {},
})

function LoadingProviderContent({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true) // Start with loading state on first load
  const pathname = usePathname()

  // First load effect
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      setIsLoading(false)
    }, 2500) // Initial loading time
    
    return () => clearTimeout(initialTimer)
  }, [])

  // Navigation loading effect
  useEffect(() => {
    if (pathname) {
      setIsLoading(true)
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 1500) // Reduced loading time for navigation

      return () => clearTimeout(timer)
    }
  }, [pathname])

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {isLoading && <LoadingScreen />}
      <div className={isLoading ? "hidden" : ""}>{children}</div>
    </LoadingContext.Provider>
  )
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>{children}</div>}>
      <LoadingProviderContent>{children}</LoadingProviderContent>
    </Suspense>
  )
}

export const useLoading = () => {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider")
  }
  return context
} 