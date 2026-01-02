"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("pf_payment_id")

  React.useEffect(() => {
    // Payment was successful
    // The ITN callback will handle updating the database
    // This page just confirms to the user
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600">
            Your payment has been processed successfully.
          </p>
          {paymentId && (
            <p className="text-sm text-gray-500 mt-2">
              Payment ID: {paymentId}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => router.push("/dashboard/learner")}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="w-full"
          >
            Return Home
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          You will receive a confirmation email shortly with your booking
          details.
        </p>
      </div>
    </div>
  )
}

