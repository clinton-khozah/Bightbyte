"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { LogOut, X, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

interface LogoutConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LogoutConfirmationModal({ isOpen, onClose }: LogoutConfirmationModalProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Redirect to home page
      router.push("/")
      // Force a full page reload to clear all state
      window.location.href = "/"
    } catch (error) {
      console.error("Logout error:", error)
      // Even if there's an error, redirect to home
      router.push("/")
      window.location.href = "/"
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[80]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Confirm Logout</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoggingOut}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="text-gray-600">
                  Are you sure you want to logout? You'll need to sign in again to access your dashboard.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  disabled={isLoggingOut}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoggingOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Logging out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      Yes, Logout
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

