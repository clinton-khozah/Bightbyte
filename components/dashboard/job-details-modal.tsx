"use client"

import * as React from "react"
import { X, MapPin, Calendar, Clock, DollarSign, Briefcase, GraduationCap, ExternalLink, Mail, Eye, Users } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar-client"

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

interface JobDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  job: Job | null
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

const formatSalary = (job: Job) => {
  if (!job.is_salary_disclosed) {
    return "Salary not disclosed"
  }
  if (job.salary_min && job.salary_max) {
    return `${job.salary_currency} ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`
  }
  if (job.salary_min) {
    return `${job.salary_currency} ${job.salary_min.toLocaleString()}+`
  }
  return "Salary negotiable"
}

export function JobDetailsModal({ isOpen, onClose, job }: JobDetailsModalProps) {
  if (!job) return null

  const companyName = job.company_name || ""

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">{job.title}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Company Info */}
          <div className="flex items-center gap-4 pb-4 border-b">
            <Avatar className="h-16 w-16 border-2 border-gray-200">
              <AvatarImage
                src={job.company_logo}
                alt={companyName}
                className="object-cover"
              />
              <AvatarFallback className="bg-gray-100 text-gray-600 text-sm font-semibold">
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
            <div>
              {companyName && companyName !== "Unknown Company" && (
                <h3 className="text-lg font-semibold text-gray-900">{companyName}</h3>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getJobTypeColor(job.job_type)}>
                  {getJobTypeIcon(job.job_type)}
                  <span className="ml-1 capitalize">{job.job_type}</span>
                </Badge>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200">
                  {job.category}
                </Badge>
                {job.is_featured && (
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                    Featured
                  </Badge>
                )}
                {job.is_urgent && (
                  <Badge className="bg-red-100 text-red-700 border-red-200">
                    Urgent
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-lg font-semibold mb-2">Description</h4>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </div>

          {/* Job Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">{job.location}</p>
              </div>
            </div>

            {job.application_deadline && (
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Application Deadline</p>
                  <p className="font-medium">
                    {new Date(job.application_deadline).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {job.duration && (
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">{job.duration}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-gray-700">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Compensation</p>
                <p className="font-medium">{formatSalary(job)}</p>
              </div>
            </div>

            {job.experience_level && (
              <div className="flex items-center gap-2 text-gray-700">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Experience Level</p>
                  <p className="font-medium">{job.experience_level}</p>
                </div>
              </div>
            )}

            {job.education_level && (
              <div className="flex items-center gap-2 text-gray-700">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Education Level</p>
                  <p className="font-medium">{job.education_level}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-gray-700">
              <Eye className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Views</p>
                <p className="font-medium">{job.total_views || 0}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-700">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Applications</p>
                <p className="font-medium">{job.total_applications || 0}</p>
              </div>
            </div>
          </div>

          {/* Requirements */}
          {job.requirements && (
            <div>
              <h4 className="text-lg font-semibold mb-2">Requirements</h4>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{job.requirements}</p>
            </div>
          )}

          {/* Qualifications */}
          {job.qualifications && (
            <div>
              <h4 className="text-lg font-semibold mb-2">Qualifications</h4>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{job.qualifications}</p>
            </div>
          )}

          {/* Tags */}
          {job.tags && job.tags.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {job.tags.map((tag: string, idx: number) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {job.benefits && job.benefits.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold mb-2">Benefits</h4>
              <div className="flex flex-wrap gap-2">
                {job.benefits.map((benefit: string, idx: number) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs bg-green-50 text-green-700 border-green-200"
                  >
                    {benefit}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {job.application_method === "email" && job.application_email && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Mail className="h-4 w-4" />
                <span className="font-medium">Apply via email: {job.application_email}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            {job.application_method === "external_link" && job.application_link ? (
              <Button
                onClick={() => {
                  window.open(job.application_link!, "_blank", "noopener,noreferrer")
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Apply
              </Button>
            ) : job.application_method === "email" && job.application_email ? (
              <Button
                onClick={() => {
                  window.location.href = `mailto:${job.application_email}?subject=Application for ${encodeURIComponent(job.title)}`
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
              >
                <Mail className="h-4 w-4 mr-2" />
                Apply
              </Button>
            ) : (
              <Button
                onClick={() => {
                  // Handle platform application
                  console.log("Apply via platform:", job.id)
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
              >
                Apply
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

