"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ZoomIn, ZoomOut } from "lucide-react"
import Image from "next/image"

interface ProfilePictureModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  mentorName: string
}

export function ProfilePictureModal({ isOpen, onClose, imageUrl, mentorName }: ProfilePictureModalProps) {
  const [isZoomed, setIsZoomed] = React.useState(false)

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

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
            className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{mentorName}</h2>
                  <p className="text-sm text-gray-500">Profile Picture</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsZoomed(!isZoomed)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title={isZoomed ? "Zoom Out" : "Zoom In"}
                  >
                    {isZoomed ? (
                      <ZoomOut className="w-5 h-5" />
                    ) : (
                      <ZoomIn className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Image Container */}
              <div className="relative bg-gray-100 p-8 flex items-center justify-center min-h-[400px] max-h-[calc(90vh-100px)] overflow-auto">
                <motion.div
                  animate={{ scale: isZoomed ? 1.5 : 1 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  <img
                    src={imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentorName)}&background=3B82F6&color=fff&size=128`}
                    alt={mentorName}
                    className={`rounded-full object-cover border-4 border-white shadow-2xl ${
                      isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                    }`}
                    style={{
                      width: isZoomed ? '600px' : '400px',
                      height: isZoomed ? '600px' : '400px',
                      transition: 'width 0.3s, height 0.3s'
                    }}
                    onClick={() => setIsZoomed(!isZoomed)}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(mentorName)}&background=3B82F6&color=fff&size=128`
                    }}
                  />
                </motion.div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 text-center">
                <p className="text-sm text-gray-600">
                  Click the image or use the zoom button to enlarge
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

