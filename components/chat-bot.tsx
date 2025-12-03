"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

export function ChatBot() {
  // WhatsApp link - update with your actual WhatsApp number
  // Format: https://wa.me/PHONENUMBER (include country code, no + or spaces)
  const whatsappLink = "https://wa.me/27723592849" // WhatsApp number: +27723592849

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <motion.div 
        className="relative"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Link href={whatsappLink} target="_blank" rel="noopener noreferrer">
          <Button
            size="lg"
            className="relative rounded-full w-14 h-14 bg-white border border-gray-300 hover:bg-gray-50 shadow-md z-10 overflow-hidden p-0"
          >
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <Image 
                src="/images/whatsapp.png" 
                alt="WhatsApp" 
                width={56} 
                height={56}
                className="object-cover"
              />
            </div>
          </Button>
        </Link>
      </motion.div>
    </div>
  )
} 