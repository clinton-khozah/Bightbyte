"use client"

import * as React from "react"
import { CreditCard, Lock, ExternalLink } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface PayFastPaymentFormProps {
  onSuccess: (paymentId: string) => void
  onError: (error: string) => void
  amount: number
  onBack: () => void
  itemName?: string
  emailAddress?: string
  nameFirst?: string
  nameLast?: string
  cellNumber?: string
  metadata?: Record<string, any>
}

export function PayFastPaymentForm({
  onSuccess,
  onError,
  amount,
  onBack,
  itemName = "Mentoring Session Payment",
  emailAddress: propEmailAddress = "",
  nameFirst: propNameFirst = "",
  nameLast: propNameLast = "",
  cellNumber = "",
  metadata = {},
}: PayFastPaymentFormProps) {
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [message, setMessage] = React.useState<string>("")
  const [paymentUrl, setPaymentUrl] = React.useState<string>("")
  const [userEmail, setUserEmail] = React.useState<string>(propEmailAddress)
  const [userFirstName, setUserFirstName] = React.useState<string>(propNameFirst)
  const [userLastName, setUserLastName] = React.useState<string>(propNameLast)

  // Fetch user data if not provided
  React.useEffect(() => {
    const fetchUserData = async () => {
      if (!propEmailAddress || !propNameFirst) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user) {
            const email = user.email || ""
            const fullName = user.user_metadata?.full_name || ""
            const nameParts = fullName.split(" ")
            const firstName = nameParts[0] || ""
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : ""

            setUserEmail(email)
            setUserFirstName(firstName)
            setUserLastName(lastName)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      } else {
        setUserEmail(propEmailAddress)
        setUserFirstName(propNameFirst)
        setUserLastName(propNameLast)
      }
    }

    fetchUserData()
  }, [propEmailAddress, propNameFirst, propNameLast])

  // Create payment URL when component mounts and user data is ready
  React.useEffect(() => {
    const createPayment = async () => {
      if (!userEmail) {
        // Wait for user data
        return
      }

      setIsProcessing(true)
      setMessage("")

      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/v1/ai/payment/payfast/create/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: amount,
              item_name: itemName,
              return_url: `${window.location.origin}/payment/success`,
              cancel_url: `${window.location.origin}/payment/cancel`,
              notify_url: `${window.location.origin}/api/v1/ai/payment/payfast-itn/`,
              email_address: userEmail,
              name_first: userFirstName,
              name_last: userLastName,
              cell_number: cellNumber,
              currency: "ZAR",
              metadata: metadata,
            }),
          }
        )

        const data = await response.json()

        if (data.success && data.payment_url) {
          setPaymentUrl(data.payment_url)
          setIsProcessing(false)
        } else {
          const errorMsg = data.error || "Failed to create payment"
          setMessage(errorMsg)
          onError(errorMsg)
          setIsProcessing(false)
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred"
        setMessage(errorMessage)
        onError(errorMessage)
        setIsProcessing(false)
      }
    }

    createPayment()
  }, [amount, itemName, userEmail, userFirstName, userLastName, cellNumber, metadata])

  const handleRedirectToPayFast = () => {
    if (paymentUrl) {
      // Redirect to PayFast payment page
      window.location.href = paymentUrl
    }
  }

  return (
    <div className="space-y-6">
      {/* Amount Display */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">
              Total Amount
            </span>
          </div>
          <span className="text-2xl font-bold text-blue-600">
            R{amount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Payment Info */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Secure Payment via PayFast
            </h3>
            <p className="text-sm text-gray-600">
              You will be redirected to PayFast's secure payment page to complete
              your transaction. PayFast supports all major credit cards, debit
              cards, and EFT payments.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <Lock className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Secure & Encrypted
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Your payment information is encrypted and secure. We never
                  store your card details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Badge */}
      <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
        <Lock className="w-4 h-4" />
        <span>Secured by PayFast</span>
      </div>

      {/* Error Message */}
      {message && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{message}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleRedirectToPayFast}
          disabled={isProcessing || !paymentUrl}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Preparing Payment...</span>
            </>
          ) : (
            <>
              <span>Pay R{amount.toFixed(2)}</span>
              <ExternalLink className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Info Text */}
      <p className="text-xs text-center text-gray-500">
        Clicking "Pay" will redirect you to PayFast's secure payment page.
        After payment, you'll be redirected back to complete your booking.
      </p>
    </div>
  )
}

