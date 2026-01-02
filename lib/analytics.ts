/**
 * Google Analytics Event Tracking Utility
 * Use this to track custom events throughout the application
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}

/**
 * Track a custom event in Google Analytics
 */
export const trackEvent = (
  eventName: string,
  eventParams?: {
    event_category?: string
    event_label?: string
    value?: number
    [key: string]: any
  }
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, {
      ...eventParams,
      page_path: window.location.pathname,
      page_title: document.title,
    })
  }
}

/**
 * Track a page view
 */
export const trackPageView = (url: string, title?: string) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", "G-3WTZLZ9TTE", {
      page_path: url,
      page_title: title || document.title,
    })
  }
}

/**
 * Track job-related events
 */
export const trackJobEvent = {
  view: (jobId: string, jobTitle: string) => {
    trackEvent("job_view", {
      event_category: "job",
      event_label: jobTitle,
      job_id: jobId,
    })
  },
  
  apply: (jobId: string, jobTitle: string, method: "platform" | "external_link" | "email") => {
    trackEvent("job_apply", {
      event_category: "job",
      event_label: jobTitle,
      job_id: jobId,
      application_method: method,
      value: 1, // For conversion tracking
    })
  },
  
  click: (jobId: string, jobTitle: string, action: string) => {
    trackEvent("job_click", {
      event_category: "job",
      event_label: `${action}: ${jobTitle}`,
      job_id: jobId,
      action_type: action,
    })
  },
}

/**
 * Track user actions
 */
export const trackUserEvent = {
  signUp: (method: "email" | "google") => {
    trackEvent("sign_up", {
      event_category: "user",
      event_label: method,
      value: 1,
    })
  },
  
  signIn: (method: "email" | "google") => {
    trackEvent("sign_in", {
      event_category: "user",
      event_label: method,
    })
  },
  
  postJob: () => {
    trackEvent("post_job", {
      event_category: "job",
      event_label: "Post a Job",
      value: 1,
    })
  },
  
  search: (query: string, resultsCount: number) => {
    trackEvent("search", {
      event_category: "engagement",
      event_label: query,
      search_results: resultsCount,
    })
  },
}

/**
 * Track form submissions
 */
export const trackFormSubmit = (formName: string, success: boolean) => {
  trackEvent("form_submit", {
    event_category: "form",
    event_label: formName,
    success: success,
    value: success ? 1 : 0,
  })
}

/**
 * Track button clicks
 */
export const trackButtonClick = (buttonName: string, location?: string) => {
  trackEvent("button_click", {
    event_category: "engagement",
    event_label: buttonName,
    button_location: location || window.location.pathname,
  })
}

/**
 * Track external link clicks
 */
export const trackExternalLink = (url: string, linkText: string) => {
  trackEvent("external_link_click", {
    event_category: "outbound",
    event_label: linkText,
    link_url: url,
  })
}

/**
 * Track conversion events for Google Ads
 */
export const trackConversion = (conversionType: string, value?: number) => {
  trackEvent("conversion", {
    event_category: "conversion",
    event_label: conversionType,
    value: value || 0,
  })
  
  // Also send as purchase event for e-commerce tracking
  if (value && value > 0) {
    trackEvent("purchase", {
      transaction_id: `${conversionType}_${Date.now()}`,
      value: value,
      currency: "USD",
    })
  }
}

