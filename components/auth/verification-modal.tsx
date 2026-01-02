"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { AnimatedButton } from "@/components/animated-button"
import { supabase } from "@/lib/supabase"

interface VerificationModalProps {
  isOpen: boolean
  onClose: () => void
  email: string
  onVerificationComplete: () => void
  onSkip: () => void
}

export function VerificationModal({ isOpen, onClose, email, onVerificationComplete, onSkip }: VerificationModalProps) {
  const [otp, setOtp] = React.useState<string[]>(["", "", "", "", "", ""])
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [resendDisabled, setResendDisabled] = React.useState(false)
  const [countdown, setCountdown] = React.useState(60)
  const [showSuccess, setShowSuccess] = React.useState(false)

  React.useEffect(() => {
    if (resendDisabled && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0) {
      setResendDisabled(false)
      setCountdown(60)
    }
  }, [countdown, resendDisabled])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[value.length - 1]
    }
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError("")

    // Move to next input if current input is filled
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`) as HTMLInputElement
      if (nextInput) nextInput.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`) as HTMLInputElement
      if (prevInput) prevInput.focus()
    }
  }

  const handleVerify = async () => {
    const code = otp.join("")
    if (code.length !== 6) {
      setError("Please enter a valid 6-digit code")
      return
    }

    setLoading(true)
    setError("")

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email'
      })

      if (error) throw error

      setShowSuccess(true)
    } catch (error) {
      setError("Invalid verification code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setResendDisabled(true)
    setCountdown(60)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error
    } catch (error) {
      setError("Failed to resend code. Please try again.")
      setResendDisabled(false)
    }
  }

  return (
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
            className="relative w-full max-w-md mx-4"
          >
            <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600">
                  We've sent a 6-digit verification code to{" "}
                  <span className="text-blue-600 font-medium">{email}</span>
                </p>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Verification Code</label>
                  <div className="flex gap-2 justify-center">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-input-${index}`}
                        type="text"
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-12 h-12 text-center text-xl bg-gray-50 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        maxLength={1}
                        pattern="[0-9]*"
                        inputMode="numeric"
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendDisabled}
                    className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {resendDisabled ? `Resend code in ${countdown}s` : "Resend code"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={loading || otp.some(digit => !digit)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Verifying..." : "Verify"}
                </button>

                {showSuccess && (
                  <div className="mt-4 space-y-4">
                    <p className="text-green-500 text-center">Email verified successfully!</p>
                    <div className="flex gap-4">
                      <AnimatedButton
                        onClick={onVerificationComplete}
                        variant="primary-gradient"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        hoverScale={1.02}
                        glowOnHover={true}
                        sweep={true}
                      >
                        Continue Login
                      </AnimatedButton>
                      <AnimatedButton
                        onClick={onSkip}
                        variant="secondary"
                        className="flex-1"
                        hoverScale={1.02}
                        glowOnHover={true}
                        sweep={true}
                      >
                        Skip to Login
                      </AnimatedButton>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
} 