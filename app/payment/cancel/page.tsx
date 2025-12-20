"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { XCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PaymentCancelPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Cancelled
          </h1>
          <p className="text-gray-600">
            Your payment was cancelled. No charges have been made.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => router.back()}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button
            onClick={() => router.push("/dashboard/learner")}
            variant="outline"
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          If you need assistance, please contact our support team.
        </p>
      </div>
    </div>
  )
}

