"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"

declare global {
  interface Window {
    dataLayer: any[]
    gtag: (...args: any[]) => void
  }
}

export function GoogleAnalytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastPathname = useRef<string | null>(null)

  // Wait for gtag to be available
  const waitForGtag = (callback: () => void, maxAttempts = 50) => {
    let attempts = 0
    const checkGtag = () => {
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        callback()
      } else if (attempts < maxAttempts) {
        attempts++
        setTimeout(checkGtag, 100)
      } else {
        console.warn("Google Analytics gtag not available after", maxAttempts, "attempts")
        console.warn("Make sure the Google Analytics script is loaded in the <head> section")
      }
    }
    checkGtag()
  }

  // Debug: Log when component mounts and verify GA is loaded
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("=== Google Analytics Debug ===")
      console.log("Component mounted")
      console.log("gtag available:", typeof window.gtag === "function")
      console.log("dataLayer available:", Array.isArray(window.dataLayer))
      console.log("dataLayer length:", window.dataLayer?.length || 0)
      
      // Check if scripts are loaded
      const gtagScript = document.querySelector('script[src*="googletagmanager.com/gtag/js"]')
      console.log("gtag.js script found:", !!gtagScript)
      
      // Try to send a test event
      if (typeof window.gtag === "function") {
        console.log("✅ Google Analytics is ready!")
        window.gtag("event", "page_view_test", {
          event_category: "debug",
          event_label: "GA Component Loaded",
        })
      } else {
        console.warn("⚠️ Google Analytics gtag function not found")
        console.warn("Check if scripts are loading correctly in the <head> section")
      }
    }
  }, [])

  useEffect(() => {
    // Track page view
    waitForGtag(() => {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "")
      
      // Only track if pathname changed
      if (lastPathname.current !== pathname) {
        lastPathname.current = pathname
        
        // Update config with new page info
        window.gtag("config", "G-3WTZLZ9TTE", {
          page_path: url,
          page_location: window.location.href,
          page_title: document.title,
        })

        // Track page view event (GA4 standard event)
        window.gtag("event", "page_view", {
          page_path: url,
          page_title: document.title,
          page_location: window.location.href,
        })
        
        // Also track session_start on first page view
        if (lastPathname.current === null) {
          window.gtag("event", "session_start", {
            page_path: url,
            page_location: window.location.href,
          })
          console.log("✅ GA: Session started")
        }
        
        console.log("✅ GA: Page view tracked", url)
        console.log("📊 Current dataLayer:", window.dataLayer)
      }
    }, 100) // Increase max attempts for initial load
  }, [pathname, searchParams])

  // Track time spent on page, scroll, clicks, etc.
  useEffect(() => {
    const startTime = Date.now()
    const scrollDepths = new Set<number>()
    let heartbeatInterval: NodeJS.Timeout | null = null

    // Track when user leaves the page
    const handleBeforeUnload = () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000)
      if (timeSpent > 0 && typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "time_on_page", {
          value: timeSpent,
          page_path: pathname,
        })
      }
    }

    // Track scroll depth
    const handleScroll = () => {
      try {
        if (typeof window === "undefined" || !window.gtag || !document.documentElement) return
        
        const scrollTop = window.scrollY || (document.documentElement?.scrollTop || 0)
        const scrollHeight = (document.documentElement?.scrollHeight || 0) - window.innerHeight
        
        if (scrollHeight <= 0) return // Prevent division by zero
        
        const scrollPercent = Math.round((scrollTop / scrollHeight) * 100)
        
        // Track milestone scroll depths (only once per page)
        const depths: number[] = [25, 50, 75, 90]
        if (Array.isArray(depths) && depths.length > 0) {
          depths.forEach((depth) => {
            if (scrollPercent >= depth && !scrollDepths.has(depth)) {
              scrollDepths.add(depth)
              if (window.gtag) {
                window.gtag("event", "scroll", {
                  scroll_depth: depth,
                  page_path: pathname,
                })
              }
            }
          })
        }
      } catch (error) {
        console.error("Error tracking scroll:", error)
      }
    }

    // Track clicks on buttons and links
    const handleClick = (e: MouseEvent) => {
      try {
        if (typeof window === "undefined" || !window.gtag) return
        
        const target = e.target as HTMLElement
        
        // Track button clicks - use GA4 standard event
        const button = target.closest("button")
        if (button) {
          const buttonText = button.textContent?.trim()?.substring(0, 100) || "Button"
          const buttonId = button.id || button.getAttribute("data-id") || "unknown"
          
          // Use GA4 standard click event
          window.gtag("event", "click", {
            event_category: "button",
            event_label: buttonText,
            button_id: buttonId,
            page_path: pathname,
            page_location: window.location.href,
            page_title: document.title,
          })
          
          console.log("✅ GA: Button click tracked", buttonText)
        }
        
        // Track link clicks - use GA4 standard event
        const link = target.closest("a") as HTMLAnchorElement
        if (link) {
          const linkUrl = link.href || ""
          const linkText = link.textContent?.trim()?.substring(0, 100) || "Link"
          const isExternal = linkUrl.startsWith("http") && !linkUrl.includes(window.location.hostname)
          
          // Use GA4 standard click event for links
          window.gtag("event", "click", {
            event_category: isExternal ? "outbound_link" : "internal_link",
            event_label: linkText,
            link_url: linkUrl.substring(0, 200),
            link_id: link.id || link.getAttribute("data-id") || "unknown",
            page_path: pathname,
            page_location: window.location.href,
            page_title: document.title,
          })
          
          console.log("✅ GA: Link click tracked", linkText, isExternal ? "(external)" : "(internal)")
        }
      } catch (error) {
        console.error("Error tracking click:", error)
      }
    }

    // Track form submissions
    const handleSubmit = (e: Event) => {
      try {
        if (typeof window === "undefined" || !window.gtag) return
        
        const form = e.target as HTMLFormElement
        if (form) {
          const formId = form.id || form.name || "unknown_form"
          window.gtag("event", "form_submit", {
            event_category: "form",
            event_label: formId,
            page_path: pathname,
          })
        }
      } catch (error) {
        console.error("Error tracking form submit:", error)
      }
    }

    // Setup tracking once gtag is available
    waitForGtag(() => {
      // Track active users (heartbeat every 30 seconds) - GA4 standard event
      heartbeatInterval = setInterval(() => {
        if (window.gtag) {
          window.gtag("event", "user_engagement", {
            engagement_time_msec: 30000,
            page_path: pathname,
            page_location: window.location.href,
            page_title: document.title,
          })
        }
      }, 30000)
      
      console.log("✅ GA: Event listeners initialized")
    })

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("scroll", handleScroll, { passive: true })
    document.addEventListener("click", handleClick, true)
    document.addEventListener("submit", handleSubmit, true)

    // Cleanup function
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("scroll", handleScroll)
      document.removeEventListener("click", handleClick, true)
      document.removeEventListener("submit", handleSubmit, true)
      
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      
      // Track final time spent
      const timeSpent = Math.round((Date.now() - startTime) / 1000)
      if (timeSpent > 0 && typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "time_on_page", {
          value: timeSpent,
          page_path: pathname,
        })
      }
    }
  }, [pathname])

  return null
}

