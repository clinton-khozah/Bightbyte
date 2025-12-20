"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2, AlertCircle, CheckCircle, FileText, Upload, User, GraduationCap, MapPin, Phone, Mail, CreditCard, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { LoadingLogo } from "@/components/loading-logo"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

interface TutorApplicationModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail: string
  userName: string
  onComplete?: () => void
}

export function TutorApplicationModal({ 
  isOpen, 
  onClose, 
  userEmail,
  userName,
  onComplete
}: TutorApplicationModalProps) {
  const [applicationType, setApplicationType] = React.useState<"tutor" | "mentor">("tutor")
  const [motivation, setMotivation] = React.useState("")
  const [qualifications, setQualifications] = React.useState("")
  const [idNumber, setIdNumber] = React.useState("")
  const [gender, setGender] = React.useState("")
  const [age, setAge] = React.useState("")
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [country, setCountry] = React.useState("")
  const [latitude, setLatitude] = React.useState<number | null>(null)
  const [longitude, setLongitude] = React.useState<number | null>(null)
  const [isGettingLocation, setIsGettingLocation] = React.useState(false)
  const [cvFile, setCvFile] = React.useState<File | null>(null)
  const [idDocumentFile, setIdDocumentFile] = React.useState<File | null>(null)
  const [qualificationsFile, setQualificationsFile] = React.useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [countries, setCountries] = React.useState<Array<{ name: string; code: string }>>([])

  // Get user's location
  React.useEffect(() => {
    if (isOpen) {
      getCurrentLocation()
      fetchCountries()
    }
  }, [isOpen])

  const fetchCountries = async () => {
    try {
      const response = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2")
      if (!response.ok) throw new Error("Failed to fetch countries")
      const data = await response.json()
      const formattedCountries = data
        .map((country: any) => ({
          name: country.name?.common || "",
          code: country.cca2 || "",
        }))
        .filter((c: any) => c.name && c.code)
        .sort((a: any, b: any) => a.name.localeCompare(b.name))
      setCountries(formattedCountries)
    } catch (error) {
      console.error("Error fetching countries:", error)
    }
  }

  const getCurrentLocation = () => {
    setIsGettingLocation(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude)
          setLongitude(position.coords.longitude)
          setIsGettingLocation(false)
        },
        (error) => {
          console.error("Error getting location:", error)
          setIsGettingLocation(false)
          // Don't show error to user, just continue without coordinates
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    } else {
      setIsGettingLocation(false)
    }
  }

  const handleFileChange = (
    setter: (file: File | null) => void,
    e: React.ChangeEvent<HTMLInputElement>,
    allowImages: boolean = false
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = allowImages
        ? [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp'
          ]
        : [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ]
      
      if (!validTypes.includes(file.type)) {
        setError(allowImages 
          ? 'Please upload a PDF, Word document, or image (JPG, PNG, WEBP)'
          : 'Please upload a PDF or Word document'
        )
        return
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setter(file)
      setError("")
    }
  }

  const uploadFile = async (
    file: File,
    documentType: "cv_document" | "id_document" | "qualifications"
  ): Promise<string | null> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.id) {
        throw new Error("No session found")
      }

      const userId = session.user.id
      const timestamp = Date.now()
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "pdf"
      const sanitizedUserId = userId.replace(/[^a-zA-Z0-9]/g, "_")
      const fileName = `${sanitizedUserId}_${documentType}_${timestamp}.${fileExtension}`
      const filePath = `verification-docs/${sanitizedUserId}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("course-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        })

      if (uploadError) throw uploadError

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("course-media").getPublicUrl(filePath)

      return publicUrl
    } catch (error: any) {
      console.error(`Error uploading ${documentType}:`, error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}
    if (!motivation.trim()) {
      newErrors.motivation = "Please provide your motivation for becoming a tutor/mentor"
    }
    if (!cvFile) {
      newErrors.cv = "CV document is required"
    }
    if (!idDocumentFile) {
      newErrors.idDocument = "ID document is required"
    }
    if (!idNumber.trim()) {
      newErrors.idNumber = "ID number is required"
    }
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required"
    }
    if (!country) {
      newErrors.country = "Country is required"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    setIsUploading(true)

    try {
      // Get authenticated user UUID from session
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.id) {
        throw new Error("No session found. Please log in again.")
      }

      const userId = session.user.id

      // Upload documents
      let cvUrl: string | null = null
      let idDocumentUrl: string | null = null
      let qualificationsUrl: string | null = null

      if (cvFile) {
        cvUrl = await uploadFile(cvFile, "cv_document")
      }
      if (idDocumentFile) {
        idDocumentUrl = await uploadFile(idDocumentFile, "id_document")
      }
      if (qualificationsFile) {
        qualificationsUrl = await uploadFile(qualificationsFile, "qualifications")
      }

      setIsUploading(false)

      // Prepare application data with all fields
      const applicationData = {
        description: motivation.trim(),
        qualifications: qualificationsFile ? qualificationsUrl : qualifications.trim() || null,
        cv_document: cvUrl,
        id_document: idDocumentUrl,
        id_number: idNumber.trim(),
        phone_number: phoneNumber.trim(),
        email: userEmail,
        country: country,
        latitude: latitude,
        longitude: longitude,
        gender: gender || null,
        age: age ? parseInt(age) : null,
        application_type: applicationType,
        updated_at: new Date().toISOString(),
      }

      // Find existing mentor record
      const { data: mentorData, error: mentorError } = await supabase
        .from("mentors")
        .select("id, user_id")
        .eq("user_id", userId)
        .maybeSingle()

      if (mentorError && mentorError.code !== "PGRST116") {
        throw new Error(`Failed to find mentor record: ${mentorError.message}`)
      }

      if (!mentorData) {
        throw new Error("Mentor record not found. Please complete your profile first.")
      }

      // Update mentor record with application data
      const { error: updateError } = await supabase
        .from("mentors")
        .update({
          description: applicationData.description,
          qualifications: applicationData.qualifications,
          cv_document: applicationData.cv_document,
          id_document: applicationData.id_document,
          id_number: applicationData.id_number,
          phone_number: applicationData.phone_number,
          email: applicationData.email,
          country: applicationData.country,
          latitude: applicationData.latitude,
          longitude: applicationData.longitude,
          gender: applicationData.gender,
          age: applicationData.age,
          updated_at: applicationData.updated_at,
        })
        .eq("id", mentorData.id)

      if (updateError) {
        throw new Error(`Failed to update mentor record: ${updateError.message}`)
      }

      // Create or update application progress record
      try {
        const { data: mentorData } = await supabase
          .from("mentors")
          .select("id")
          .eq("user_id", userId)
          .single()

        if (mentorData) {
          // Check if progress record exists
          const { data: existingProgress } = await supabase
            .from("mentor_application_progress")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle()

          if (!existingProgress) {
            // Create initial progress record
            await supabase.from("mentor_application_progress").insert({
              mentor_id: mentorData.id,
              user_id: userId,
              current_step: "application_submitted",
              status: "pending",
              application_submitted: true,
              application_submitted_at: new Date().toISOString(),
            })
          }
        }
      } catch (progressError) {
        console.warn('Error creating progress record:', progressError)
      }

      // Also send application email with Amplitude test link
      try {
        const emailResponse = await fetch(`${baseUrl}/mentors/send-application-email/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userEmail,
            name: userName,
            application_type: applicationType,
            motivation: motivation.trim(),
            qualifications: qualifications.trim(),
            message: "You are bit close to start tutoring and start earning! The next step is the baseline assessment. Pass mark is 75%."
          })
        })

        // Don't fail if email fails, just log it
        if (!emailResponse.ok) {
          console.warn('Failed to send application email, but application was submitted')
        }
      } catch (emailError) {
        console.warn('Error sending application email:', emailError)
      }

      setSuccess(true)
      
      // Close modal after 3 seconds
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setMotivation("")
        setQualifications("")
        setIdNumber("")
        setGender("")
        setAge("")
        setPhoneNumber("")
        setCountry("")
        setApplicationType("tutor")
        setCvFile(null)
        setIdDocumentFile(null)
        setQualificationsFile(null)
        setLatitude(null)
        setLongitude(null)
      }, 3000)
    } catch (error: any) {
      console.error('Error submitting application:', error)
      setError(error.message || 'Failed to submit application. Please try again.')
      setIsUploading(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {/* Success Popup */}
      {success && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md"
          >
            <div
              className="relative p-[3px] rounded-xl animate-border-rotate"
              style={{
                background:
                  "conic-gradient(from 0deg, #3b82f6, #2563eb, #1d4ed8, #1e40af, #3b82f6)",
              }}
            >
              <Card className="bg-white shadow-2xl border-2 border-blue-200 rounded-xl overflow-hidden relative z-10">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white pb-2 pt-3">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1">
                      <Image
                        src="/images/logo1.png"
                        alt="BrightByt Logo"
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                    <CardTitle className="text-sm font-bold">
                      Application Submitted!
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Success!
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        We've sent an email to <strong>{userEmail}</strong> with a link to complete the Amplitude test.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main Form Popup */}
      {isOpen && !success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50"
          >
            <div
              className="relative p-[3px] rounded-xl animate-border-rotate"
              style={{
                background:
                  "conic-gradient(from 0deg, #3b82f6, #2563eb, #1d4ed8, #1e40af, #3b82f6)",
              }}
            >
              <Card className="bg-white shadow-2xl border-2 border-blue-200 rounded-xl overflow-hidden relative z-10">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1">
                        <Image
                          src="/images/logo1.png"
                          alt="BrightByt Logo"
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      </div>
                      <CardTitle className="text-sm font-bold">
                        Apply as Tutor/Mentor
                      </CardTitle>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-white hover:bg-white/20 rounded-full p-0.5 transition-colors"
                      aria-label="Close"
                      disabled={isSubmitting}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="p-2.5">
                  <form onSubmit={handleSubmit} className="space-y-2">
                    {/* Application Type */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        I am applying as: <span className="text-red-500">*</span>
                      </label>
                      <RadioGroup
                        value={applicationType}
                        onValueChange={(value) => setApplicationType(value as "tutor" | "mentor")}
                        className="flex gap-4 mt-1"
                        disabled={isSubmitting}
                      >
                        <div className="flex items-center space-x-1.5">
                          <RadioGroupItem value="tutor" id="tutor" className="w-3 h-3" />
                          <label htmlFor="tutor" className="text-xs font-normal cursor-pointer">
                            Tutor
                          </label>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <RadioGroupItem value="mentor" id="mentor" className="w-3 h-3" />
                          <label htmlFor="mentor" className="text-xs font-normal cursor-pointer">
                            Mentor
                          </label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Motivation */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5" />
                        Why do you want to become a {applicationType}? <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        value={motivation}
                        onChange={(e) => {
                          setMotivation(e.target.value)
                          if (errors.motivation) setErrors({ ...errors, motivation: "" })
                        }}
                        placeholder="Tell us about your motivation, experience, and what makes you a great tutor/mentor..."
                        rows={4}
                        className="bg-white border-gray-300 focus:border-blue-500 resize-none text-xs py-1 px-2"
                        disabled={isSubmitting}
                      />
                      {errors.motivation && (
                        <p className="text-xs text-red-500">{errors.motivation}</p>
                      )}
                      <p className="text-xs text-gray-500 leading-tight">
                        This information will help us understand your background and goals.
                      </p>
                    </div>

                    {/* Qualifications */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <GraduationCap className="w-2.5 h-2.5" />
                        Qualifications & Certifications
                      </label>
                      <Textarea
                        value={qualifications}
                        onChange={(e) => setQualifications(e.target.value)}
                        placeholder="List your educational qualifications, certifications, degrees, or relevant training..."
                        rows={3}
                        className="bg-white border-gray-300 focus:border-blue-500 resize-none text-xs py-1 px-2"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-gray-500 leading-tight">
                        Include degrees, certifications, professional training, or any relevant qualifications.
                      </p>
                    </div>

                    {/* CV Document */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <Upload className="w-2.5 h-2.5" />
                        CV Document <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            handleFileChange(setCvFile, e)
                            if (errors.cv) setErrors({ ...errors, cv: "" })
                          }}
                          className="hidden"
                          id="cv-upload"
                          disabled={isSubmitting}
                        />
                        <label
                          htmlFor="cv-upload"
                          className="flex items-center gap-2 cursor-pointer border border-gray-300 rounded-lg px-2 py-1.5 h-7 text-xs hover:bg-gray-50 transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          {cvFile ? cvFile.name : "Upload CV (PDF, DOC, DOCX)"}
                        </label>
                      </div>
                      {errors.cv && (
                        <p className="text-xs text-red-500">{errors.cv}</p>
                      )}
                    </div>

                    {/* ID Document */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5" />
                        ID Document <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,image/*"
                          onChange={(e) => {
                            handleFileChange(setIdDocumentFile, e, true)
                            if (errors.idDocument) setErrors({ ...errors, idDocument: "" })
                          }}
                          className="hidden"
                          id="id-upload"
                          disabled={isSubmitting}
                        />
                        <label
                          htmlFor="id-upload"
                          className="flex items-center gap-2 cursor-pointer border border-gray-300 rounded-lg px-2 py-1.5 h-7 text-xs hover:bg-gray-50 transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          {idDocumentFile ? idDocumentFile.name : "Upload ID Document"}
                        </label>
                      </div>
                      {errors.idDocument && (
                        <p className="text-xs text-red-500">{errors.idDocument}</p>
                      )}
                    </div>

                    {/* ID Number */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <CreditCard className="w-2.5 h-2.5" />
                        ID Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={idNumber}
                        onChange={(e) => {
                          setIdNumber(e.target.value)
                          if (errors.idNumber) setErrors({ ...errors, idNumber: "" })
                        }}
                        placeholder="Enter your ID number"
                        className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2"
                        disabled={isSubmitting}
                      />
                      {errors.idNumber && (
                        <p className="text-xs text-red-500">{errors.idNumber}</p>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value)
                          if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: "" })
                        }}
                        placeholder="+1 234 567 8900"
                        className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2"
                        disabled={isSubmitting}
                      />
                      {errors.phoneNumber && (
                        <p className="text-xs text-red-500">{errors.phoneNumber}</p>
                      )}
                    </div>

                    {/* Country */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        Country <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={country}
                        onValueChange={(value) => {
                          setCountry(value)
                          if (errors.country) setErrors({ ...errors, country: "" })
                        }}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2">
                          <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c.code} value={c.name}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.country && (
                        <p className="text-xs text-red-500">{errors.country}</p>
                      )}
                    </div>

                    {/* Location Status */}
                    {isGettingLocation ? (
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Getting your location...
                      </div>
                    ) : latitude && longitude ? (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <MapPin className="w-3 h-3" />
                        Location captured: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MapPin className="w-3 h-3" />
                        Location not available
                      </div>
                    )}

                    {/* Gender */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        Gender{" "}
                        <span className="text-gray-500 font-normal">(Optional)</span>
                      </label>
                      <Select
                        value={gender}
                        onValueChange={setGender}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Age */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        Age{" "}
                        <span className="text-gray-500 font-normal">(Optional)</span>
                      </label>
                      <Input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="Enter your age"
                        min="18"
                        max="100"
                        className="bg-white border-gray-300 focus:border-blue-500 h-7 text-xs py-0.5 px-2"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* Qualifications Document (Optional) */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5" />
                        Qualifications Document{" "}
                        <span className="text-gray-500 font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => handleFileChange(setQualificationsFile, e)}
                          className="hidden"
                          id="qualifications-upload"
                          disabled={isSubmitting}
                        />
                        <label
                          htmlFor="qualifications-upload"
                          className="flex items-center gap-2 cursor-pointer border border-gray-300 rounded-lg px-2 py-1.5 h-7 text-xs hover:bg-gray-50 transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          {qualificationsFile ? qualificationsFile.name : "Upload Qualifications Document"}
                        </label>
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                        <AlertCircle className="w-3 h-3" />
                        <span className="text-xs">{error}</span>
                      </div>
                    )}

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                      <p className="text-xs text-blue-800 leading-tight">
                        <strong>Next Steps:</strong> After submitting your application, you'll receive an email with a link to complete the Amplitude test. This test helps us assess your knowledge and skills.
                      </p>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 h-7 text-xs border-gray-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !motivation.trim() || !cvFile || !idDocumentFile || !idNumber.trim() || !phoneNumber.trim() || !country}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium h-7 text-xs"
                      >
                        {isSubmitting ? (
                          <>
                            <LoadingLogo size={12} />
                            {isUploading ? "Uploading..." : "Submitting..."}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1.5" />
                            Submit Application
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
