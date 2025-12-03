"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import Image from "next/image"
import { supabase } from '@/lib/supabase'
import { googleAuthService } from '@/lib/googleAuthService'
import { useRouter } from 'next/navigation'
import { VerificationModal } from "./verification-modal"
import { LoadingLogo } from "@/components/loading-logo"

interface SignUpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SignUpModal({ isOpen, onClose }: SignUpModalProps) {
  const router = useRouter()
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    role: "" as string,
    userType: "" as "student" | "mentor" | "tutor",
  })
  const [showVerification, setShowVerification] = React.useState(false)
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!formData.userType) {
      setError("Please select a role")
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?user_type=${formData.userType}&full_name=${encodeURIComponent(formData.fullName)}`,
          data: {
            full_name: formData.fullName,
            user_type: formData.userType
          }
        }
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error("Failed to create user account")
      }

      // Note: Record creation will happen in the callback route after email verification
      // This ensures the session is properly established
      console.log('User signed up successfully. User type:', formData.userType)
      console.log('Mentor/Student record will be created after email verification in callback route.')

      // Show verification modal
      setShowVerification(true)
    } catch (error: any) {
      let errorMessage = error.message || "An error occurred during sign up"
      // Replace "Failed to fetch" with a more user-friendly message
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("fetch")) {
        errorMessage = "Check your internet connection"
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    if (!formData.userType) {
      setError("Please select a role first")
      setLoading(false)
      return
    }

    setError("")
    setLoading(true)

    try {
      console.log("Starting Google authentication for sign-up...")

      // Get Google credential using the same method as BrightByt dashboard
      const credential = await googleAuthService.signInWithGoogle(true)
      console.log("Google credential received:", credential ? "Yes" : "No")

      if (!credential) {
        throw new Error("No credential received from Google")
      }

      // Use Supabase to authenticate with Google token (same as BrightByt dashboard)
      console.log("Signing up with Google via Supabase...")
      const { data, error: signUpError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: credential,
      })

      if (signUpError) {
        console.error("Supabase Google sign-up error:", signUpError)
        throw new Error(`Supabase authentication failed: ${signUpError.message}`)
      }

      if (!data.user) {
        throw new Error("No user data received from Supabase")
      }

      console.log("Supabase Google authentication successful:", data.user)

      // Determine which table to use based on user type
      // Mentor or Tutor should go to mentors table
      const isMentor = formData.userType === 'mentor' || formData.userType === 'tutor'
      const tableName = isMentor ? 'mentors' : 'students'

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (!existingUser) {
        const nameToUse = formData.fullName || data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User'

        if (isMentor) {
          console.log('Creating mentor record for Google sign-up user:', data.user.id, 'Type:', formData.userType)
          // Create mentor record
          const { data: mentorData, error: mentorError } = await supabase
            .from('mentors')
            .insert({
              id: data.user.id,
              name: nameToUse,
              email: data.user.email || '',
              title: '',
              description: '',
              specialization: '[]',
              rating: 1.00,
              total_reviews: 0,
              hourly_rate: 0.00,
              avatar: data.user.user_metadata?.avatar_url || '',
              experience: 0,
              languages: '[]',
              availability: 'Available now',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              phone_number: '',
              gender: '',
              age: null,
              country: '',
              latitude: null,
              longitude: null,
              sessions_conducted: 0,
              qualifications: '',
              id_document: '',
              id_number: '',
              cv_document: '',
              payment_method: '',
              linkedin_profile: '',
              github_profile: '',
              twitter_profile: '',
              facebook_profile: '',
              instagram_profile: '',
              personal_website: '',
              bank_name: '',
              account_holder_name: '',
              account_number: '',
              routing_number: '',
              payment_account_details: '{}',
              payment_period: 'per_session',
              is_complete: false,
              is_verified: false
            })
            .select()
            .single()

          if (mentorError) {
            console.error('Error creating mentor record:', mentorError)
            console.error('Error details:', JSON.stringify(mentorError, null, 2))
            setError(`Mentor profile setup failed: ${mentorError.message}`)
          } else {
            console.log('Mentor record created successfully:', mentorData)
          }
        } else if (formData.userType === 'student') {
          // Create student record
          console.log('Creating student record for Google sign-up user:', data.user.id)
          const { error: studentError } = await supabase
            .from('students')
            .insert({
              id: data.user.id,
              email: data.user.email || '',
              full_name: nameToUse,
              avatar_url: data.user.user_metadata?.avatar_url || null,
              bio: null,
              website: null,
              phone_number: null,
              date_of_birth: null,
              gender: null,
              country: null,
              city: null,
              timezone: null,
              native_language: null,
              languages_spoken: '[]',
              current_level: 'beginner',
              interests: '[]',
              learning_goals: null,
              preferred_learning_style: null,
              availability_hours: null,
              budget_range: null,
              social_links: '{}',
              settings: '{}',
              verified: data.user.email_confirmed_at ? true : false,
              status: 'active',
              role: 'student',
              is_complete: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (studentError) {
            console.error('Error creating student record:', studentError)
            setError(`Student profile setup failed: ${studentError.message}`)
          } else {
            console.log('Student record created successfully')
          }
        }
      }

      const userTypeForRedirect = formData.userType

      console.log('Sign-up complete - User type:', userTypeForRedirect)

        // Redirect based on user type
        if (userTypeForRedirect === 'mentor' || userTypeForRedirect === 'tutor' || userTypeForRedirect === 'user') {
          console.log('Redirecting to company dashboard')
          router.push('/dashboard')
        } else {
          console.log('Redirecting to learner dashboard')
          router.push('/dashboard/learner')
        }

      onClose()
    } catch (error: any) {
      console.error('Google sign-up error:', error)
      let errorMessage = error.message || "An error occurred during Google sign up."
      // Replace "Failed to fetch" with a more user-friendly message
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("fetch")) {
        errorMessage = "Check your internet connection"
      }
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleVerificationComplete = async () => {
    setShowVerification(false)
    onClose()
    
    // Wait for session to be established and verify user exists
    try {
      // Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Verify user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('User not authenticated after verification')
        return
      }

        // Check if user is a mentor/tutor
        if (formData.userType === 'mentor' || formData.userType === 'tutor') {
          // Verify mentor record exists
          const { data: mentorData } = await supabase
            .from('mentors')
            .select('id')
            .eq('id', user.id)
            .maybeSingle()
          
          if (mentorData) {
            window.location.href = '/dashboard'
          } else {
            // Mentor record might not exist yet, still redirect to company dashboard
            // The dashboard will handle creating the record if needed
            window.location.href = '/dashboard'
          }
        } else {
          window.location.href = '/dashboard/learner'
        }
    } catch (error) {
      console.error('Error during verification redirect:', error)
        // Fallback redirect
        if (formData.userType === 'mentor' || formData.userType === 'tutor') {
          window.location.href = '/dashboard'
        } else {
          window.location.href = '/dashboard/learner'
        }
    }
  }

  const handleSkipVerification = () => {
    setShowVerification(false)
    onClose()
    // You can add additional logic here to show the login modal
  }


  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-white border-2 border-blue-200 rounded-xl shadow-lg p-6">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                  {loading ? (
                    <LoadingLogo size={44} />
                  ) : (
                    <Image
                      src="/images/logo1.png"
                      alt="Brightbyt Logo"
                      width={50}
                      height={50}
                      className="object-contain"
                    />
                  )}
              </div>

              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">I am joining as</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                      className={`relative flex items-center p-2 rounded-lg border-2 cursor-pointer transition-all h-10 ${
                          formData.userType === 'student'
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 bg-white hover:border-blue-400'
                        }`}
                        onClick={() => setFormData({ ...formData, userType: 'student' })}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              formData.userType === 'student' ? 'border-blue-600' : 'border-gray-300'
                          }`}
                        >
                            {formData.userType === 'student' && (
                              <div className="w-2 h-2 rounded-full bg-blue-600" />
                          )}
                        </div>
                          <span className={`font-medium text-sm ${formData.userType === 'student' ? 'text-blue-600' : 'text-gray-700'}`}>
                          Student
                        </span>
                      </div>
                    </div>

                    <div
                      className={`relative flex items-center p-2 rounded-lg border-2 cursor-pointer transition-all h-10 ${
                          formData.userType === 'mentor'
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 bg-white hover:border-blue-400'
                        }`}
                        onClick={() => setFormData({ ...formData, userType: 'mentor' })}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              formData.userType === 'mentor' ? 'border-blue-600' : 'border-gray-300'
                          }`}
                        >
                            {formData.userType === 'mentor' && (
                              <div className="w-2 h-2 rounded-full bg-blue-600" />
                          )}
                        </div>
                          <span className={`font-medium text-sm ${formData.userType === 'mentor' ? 'text-blue-600' : 'text-gray-700'}`}>
                          Mentor
                        </span>
                      </div>
                    </div>

                    <div
                      className={`relative flex items-center p-2 rounded-lg border-2 cursor-pointer transition-all h-10 ${
                          formData.userType === 'tutor'
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 bg-white hover:border-blue-400'
                        }`}
                        onClick={() => setFormData({ ...formData, userType: 'tutor' })}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              formData.userType === 'tutor' ? 'border-blue-600' : 'border-gray-300'
                          }`}
                        >
                            {formData.userType === 'tutor' && (
                              <div className="w-2 h-2 rounded-full bg-blue-600" />
                          )}
                          </div>
                          <span className={`font-medium text-sm ${formData.userType === 'tutor' ? 'text-blue-600' : 'text-gray-700'}`}>
                            Tutor
                          </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Create password"
                      required
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm password"
                      required
                      className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="terms"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    required
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700">
                    I agree to the{" "}
                    <a 
                      href="/resources#terms" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Terms of Service
                    </a>
                    {" "}and{" "}
                    <a 
                      href="/resources#privacy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Privacy Policy
                    </a>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </form>

              <div className="mt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={loading || !formData.userType}
                  className="mt-4 w-full px-4 py-2 border-2 border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {loading ? "Signing up..." : "Sign up with Google"}
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      <VerificationModal
        isOpen={showVerification}
        onClose={() => setShowVerification(false)}
        email={formData.email}
        onVerificationComplete={handleVerificationComplete}
        onSkip={handleSkipVerification}
      />
    </>
  )
} 