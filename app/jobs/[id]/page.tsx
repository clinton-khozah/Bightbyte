"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { LoadingLogo } from "@/components/loading-logo"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar-client"
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Briefcase,
  GraduationCap,
  ExternalLink,
  Mail,
  Eye,
  Users,
  CheckCircle2,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { trackJobEvent, trackConversion } from "@/lib/analytics"

interface Job {
  id: string
  title: string
  company_name?: string
  company_logo?: string
  description: string
  job_type: "job" | "learnership" | "internship" | "bursary"
  category: string
  location: string
  salary_min?: number
  salary_max?: number
  salary_currency: string
  is_salary_disclosed: boolean
  experience_level?: string
  education_level?: string
  application_deadline?: string
  start_date?: string
  duration?: string
  requirements?: string
  qualifications?: string
  status: string
  is_featured: boolean
  is_urgent: boolean
  total_applications: number
  total_views: number
  tags?: string[]
  benefits?: string[]
  application_method?: string
  application_link?: string
  application_email?: string
}

const getJobTypeColor = (type: string) => {
  switch (type) {
    case "learnership":
      return "bg-purple-100 text-purple-700 border-purple-200"
    case "internship":
      return "bg-blue-100 text-blue-700 border-blue-200"
    case "bursary":
      return "bg-green-100 text-green-700 border-green-200"
    default:
      return "bg-gray-100 text-gray-700 border-gray-200"
  }
}

const getJobTypeIcon = (type: string) => {
  switch (type) {
    case "learnership":
      return <GraduationCap className="w-4 h-4" />
    case "internship":
      return <Briefcase className="w-4 h-4" />
    case "bursary":
      return <DollarSign className="w-4 h-4" />
    default:
      return <Briefcase className="w-4 h-4" />
  }
}

const getCurrencySymbol = (currency: string) => {
  const currencyMap: { [key: string]: string } = {
    USD: "$",
    ZAR: "R",
    EUR: "€",
    GBP: "£",
    NGN: "₦",
    KES: "KSh",
    GHS: "GH₵",
    EGP: "E£",
    AUD: "A$",
    CAD: "C$",
    INR: "₹",
    BRL: "R$",
    MXN: "$",
  }
  return currencyMap[currency.toUpperCase()] || currency
}

const formatSalary = (job: Job) => {
  if (!job.is_salary_disclosed) {
    return "Salary not disclosed"
  }
  const currencySymbol = getCurrencySymbol(job.salary_currency || "USD")
  if (job.salary_min && job.salary_max) {
    return `${currencySymbol}${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
  }
  if (job.salary_min) {
    return `${currencySymbol}${job.salary_min.toLocaleString()}+`
  }
  return "Salary negotiable"
}

const getRelativeTime = (dateString: string) => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInMs = now.getTime() - date.getTime()
  const diffInSeconds = Math.floor(diffInMs / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)
  const diffInMonths = Math.floor(diffInDays / 30)

  if (diffInSeconds < 60) {
    return "Just now"
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`
  } else if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`
  } else if (diffInMonths < 1) {
    return "Less than a month ago"
  } else {
    return `${diffInMonths} month${diffInMonths !== 1 ? "s" : ""} ago`
  }
}

export default function JobDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasTrackedView, setHasTrackedView] = useState(false)

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setLoading(true)
        const jobId = params.id as string

        // Try API first
        try {
          const response = await fetch(
            `http://127.0.0.1:8000/api/v1/jobs/${jobId}/`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            }
          )

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.job) {
              setJob(data.job)
              setLoading(false)
              return
            }
          }
        } catch (apiError) {
          console.log("API fetch failed, trying Supabase directly:", apiError)
        }

        // Fallback to Supabase
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", jobId)
          .single()

        if (jobError) {
          console.error("Error fetching job:", jobError)
          setError("Job not found")
          setLoading(false)
          return
        }

        if (jobData) {
          // Try to get company name
          let companyName = "Company"
          if (jobData.company_id) {
            const { data: companyData } = await supabase
              .from("companies")
              .select("company_name, name")
              .eq("id", jobData.company_id)
              .maybeSingle()

            if (companyData) {
              companyName = companyData.company_name || companyData.name || "Company"
            }
          }

          // Increment view count (only once per session)
          const viewKey = `job_view_${jobId}`
          const hasViewed = sessionStorage.getItem(viewKey)
          let newViewCount = jobData.total_views || 0
          
          if (!hasViewed) {
            // Track view in database
            newViewCount = (jobData.total_views || 0) + 1
            await supabase
              .from("jobs")
              .update({ total_views: newViewCount })
              .eq("id", jobId)
            
            // Track job view in Google Analytics
            trackJobEvent.view(jobId, jobData.title)
            
            // Mark as viewed in session storage to prevent duplicate views
            sessionStorage.setItem(viewKey, "true")
            setHasTrackedView(true)
          }

          setJob({
            ...jobData,
            company_name: jobData.company_name || companyName,
            total_views: newViewCount,
          } as Job)
        }
      } catch (error) {
        console.error("Error fetching job:", error)
        setError("Failed to load job details")
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchJob()
    }
  }, [params.id])

  // Scroll to apply section when hash is present
  useEffect(() => {
    if (job && window.location.hash === '#apply') {
      // Small delay to ensure page is rendered
      setTimeout(() => {
        const applySection = document.getElementById('apply')
        if (applySection) {
          applySection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 300)
    }
  }, [job])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingLogo size={32} />
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
            <p className="text-gray-600 mb-6">{error || "The job you're looking for doesn't exist."}</p>
            <Button onClick={() => router.push("/")}>Go Back Home</Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const companyName = job.company_name || ""

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Navbar />
      <div className="container mx-auto px-3 md:px-4 pt-20 md:pt-24 pb-6 md:pb-8 max-w-4xl overflow-hidden">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4 md:mb-6 text-xs md:text-sm"
        >
          <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
          Back
        </Button>

        {/* Job Card */}
        <div className="bg-white rounded-lg md:rounded-xl shadow-lg border-2 border-blue-200 p-4 md:p-8 break-words overflow-wrap-anywhere">
          {/* Header */}
          <div className="flex items-start gap-3 md:gap-6 mb-4 md:mb-6">
            <Avatar className="h-12 w-12 md:h-20 md:w-20 border-2 border-blue-400 shadow-lg shadow-blue-200">
              <AvatarImage
                src={job.company_logo}
                alt={companyName || "Company"}
                className="object-cover"
              />
              <AvatarFallback className="bg-gray-100 text-gray-600 text-xs md:text-base font-semibold">
                {companyName
                  ? companyName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : "C"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2 flex-wrap">
                <h1 className="text-lg md:text-3xl font-bold text-gray-900 line-clamp-2">{job.title}</h1>
                {job.is_featured && (
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1">
                    Featured
                  </Badge>
                )}
                {job.is_urgent && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1">
                    Urgent
                  </Badge>
                )}
              </div>
              {companyName && companyName !== "Unknown Company" && (
                <p className="text-sm md:text-lg font-semibold text-gray-700 mb-2 md:mb-4">{companyName}</p>
              )}
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                <Badge className={`${getJobTypeColor(job.job_type)} text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1`}>
                  <span className="hidden md:inline">{getJobTypeIcon(job.job_type)}</span>
                  <span className="ml-0 md:ml-1 capitalize">{job.job_type}</span>
                </Badge>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1">
                  {job.category}
                </Badge>
                {job.experience_level && (
                  <Badge variant="outline" className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1">{job.experience_level}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 md:gap-6 mb-4 md:mb-6 pb-4 md:pb-6 border-b border-gray-200">
            <div className="flex items-center gap-1.5 md:gap-2 text-gray-600">
              <Eye className="w-4 h-4 md:w-5 md:h-5" />
              <span className="font-medium text-xs md:text-sm">{job.total_views || 0} views</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 text-gray-600">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
              <span className="font-medium text-xs md:text-sm">{job.total_applications || 0} applications</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4 md:mb-6">
            <h2 className="text-base md:text-xl font-bold text-gray-900 mb-2 md:mb-3">Description</h2>
            <div className="prose max-w-none break-words overflow-wrap-anywhere">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-xs md:text-sm break-words overflow-wrap-anywhere">{job.description}</p>
            </div>
          </div>

          {/* Job Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
            <div className="flex items-center gap-2 md:gap-3 p-2 md:p-4 bg-blue-50 rounded-md md:rounded-lg">
              <MapPin className="w-4 h-4 md:w-6 md:h-6 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] md:text-sm text-gray-500">Location</p>
                <p className="font-semibold text-gray-900 text-xs md:text-sm truncate">{job.location}</p>
              </div>
            </div>

            {job.application_deadline && (
              <div className="flex items-center gap-2 md:gap-3 p-2 md:p-4 bg-blue-50 rounded-md md:rounded-lg">
                <Calendar className="w-4 h-4 md:w-6 md:h-6 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] md:text-sm text-gray-500">Application Deadline</p>
                  <p className="font-semibold text-gray-900 text-xs md:text-sm">
                    {new Date(job.application_deadline).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {job.duration && (
              <div className="flex items-center gap-2 md:gap-3 p-2 md:p-4 bg-blue-50 rounded-md md:rounded-lg">
                <Clock className="w-4 h-4 md:w-6 md:h-6 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] md:text-sm text-gray-500">Duration</p>
                  <p className="font-semibold text-gray-900 text-xs md:text-sm truncate">{job.duration}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 md:gap-3 p-2 md:p-4 bg-blue-50 rounded-md md:rounded-lg">
              <DollarSign className="w-4 h-4 md:w-6 md:h-6 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] md:text-sm text-gray-500">SALARY</p>
                <p className="font-semibold text-gray-900 text-sm md:text-lg truncate">{formatSalary(job)}</p>
              </div>
            </div>

            {job.experience_level && (
              <div className="flex items-center gap-2 md:gap-3 p-2 md:p-4 bg-blue-50 rounded-md md:rounded-lg">
                <Briefcase className="w-4 h-4 md:w-6 md:h-6 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] md:text-sm text-gray-500">Experience Level</p>
                  <p className="font-semibold text-gray-900 text-xs md:text-sm truncate">{job.experience_level}</p>
                </div>
              </div>
            )}

            {job.education_level && (
              <div className="flex items-center gap-2 md:gap-3 p-2 md:p-4 bg-blue-50 rounded-md md:rounded-lg">
                <GraduationCap className="w-4 h-4 md:w-6 md:h-6 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] md:text-sm text-gray-500">Education Level</p>
                  <p className="font-semibold text-gray-900 text-xs md:text-sm truncate">{job.education_level}</p>
                </div>
              </div>
            )}
          </div>

          {/* Requirements */}
          {job.requirements && (
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-xl font-bold text-gray-900 mb-2 md:mb-3">Requirements</h2>
              <div className="prose max-w-none break-words overflow-wrap-anywhere">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-xs md:text-sm break-words overflow-wrap-anywhere">{job.requirements}</p>
              </div>
            </div>
          )}

          {/* Qualifications */}
          {job.qualifications && (
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-xl font-bold text-gray-900 mb-2 md:mb-3">Qualifications</h2>
              <div className="prose max-w-none break-words overflow-wrap-anywhere">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-xs md:text-sm break-words overflow-wrap-anywhere">{job.qualifications}</p>
              </div>
            </div>
          )}

          {/* Tags */}
          {job.tags && job.tags.length > 0 && (
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-xl font-bold text-gray-900 mb-2 md:mb-3">Tags</h2>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {job.tags.map((tag: string, idx: number) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-[10px] md:text-sm bg-blue-50 text-blue-700 border-blue-200 px-1.5 md:px-2 py-0.5 md:py-1"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {job.benefits && job.benefits.length > 0 && (
            <div className="mb-4 md:mb-6">
              <h2 className="text-base md:text-xl font-bold text-gray-900 mb-2 md:mb-3">Benefits</h2>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {job.benefits.map((benefit: string, idx: number) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-[10px] md:text-sm bg-green-50 text-green-700 border-green-200 px-1.5 md:px-2 py-0.5 md:py-1"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                    {benefit}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Application Method Indicator - Moved to bottom */}
          <div id="apply" className="scroll-mt-24">

          {/* Action Buttons - Moved to bottom */}
          <div className="flex gap-2 md:gap-3 pt-4 md:pt-6 border-t border-gray-200 mt-6 md:mt-8">
            {job.application_method === "external_link" && job.application_link ? (
              <Button
                onClick={async () => {
                  // Track application in Google Analytics
                  trackJobEvent.apply(job.id, job.title, "external_link")
                  trackConversion("job_application", 1)
                  
                  // Track application
                  await supabase
                    .from("jobs")
                    .update({ total_applications: (job.total_applications || 0) + 1 })
                    .eq("id", job.id)
                  
                  // Update local state
                  setJob(prev => prev ? {
                    ...prev,
                    total_applications: (prev.total_applications || 0) + 1
                  } : null)
                  
                  // Open external link
                  window.open(job.application_link!, "_blank", "noopener,noreferrer")
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all text-xs md:text-base h-9 md:h-11"
              >
                <ExternalLink className="h-3 w-3 md:h-5 md:w-5 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Apply</span>
                <span className="sm:hidden">Apply</span>
              </Button>
            ) : job.application_method === "email" && job.application_email ? (
              <Button
                onClick={async () => {
                  // Track application in Google Analytics
                  trackJobEvent.apply(job.id, job.title, "email")
                  trackConversion("job_application", 1)
                  
                  // Track application
                  await supabase
                    .from("jobs")
                    .update({ total_applications: (job.total_applications || 0) + 1 })
                    .eq("id", job.id)
                  
                  // Update local state
                  setJob(prev => prev ? {
                    ...prev,
                    total_applications: (prev.total_applications || 0) + 1
                  } : null)
                  
                  // Open email client
                  window.location.href = `mailto:${job.application_email}?subject=Application for ${encodeURIComponent(job.title)}`
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all text-xs md:text-base h-9 md:h-11"
              >
                <Mail className="h-3 w-3 md:h-5 md:w-5 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Apply via Email</span>
                <span className="sm:hidden">Apply</span>
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  // Track application in Google Analytics
                  trackJobEvent.apply(job.id, job.title, "platform")
                  trackConversion("job_application", 1)
                  
                  // Track application
                  await supabase
                    .from("jobs")
                    .update({ total_applications: (job.total_applications || 0) + 1 })
                    .eq("id", job.id)
                  
                  // Update local state
                  setJob(prev => prev ? {
                    ...prev,
                    total_applications: (prev.total_applications || 0) + 1
                  } : null)
                  
                  const { data: { user } } = await supabase.auth.getUser()
                  if (user) {
                    localStorage.setItem("jobToApplyId", job.id)
                    window.location.href = "/dashboard/applicant"
                  } else {
                    localStorage.setItem("jobToApplyId", job.id)
                    // Open sign in modal or redirect
                    window.location.href = "/login"
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all text-xs md:text-base h-9 md:h-11"
              >
                Apply Now
              </Button>
            )}
          </div>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  )
}

