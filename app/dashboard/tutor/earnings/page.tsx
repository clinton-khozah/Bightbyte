"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/layout";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Download,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { LoadingLogo } from "@/components/loading-logo";
import { convertAndFormatPrice } from "@/lib/currency";

interface Payment {
  id: string;
  session_id: string;
  amount: number;
  mentor_payout_amount: number;
  platform_fee: number;
  status: string;
  paid_at: string;
  session?: {
    topic: string;
    date: string;
    time: string;
    learner_name: string;
  };
}

interface EarningsStats {
  totalEarnings: number;
  totalDeducted: number;
  availableBalance: number;
  totalSessions: number;
  platformFeePercentage: number;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export default function EarningsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [mentorData, setMentorData] = useState<any>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    totalDeducted: 0,
    availableBalance: 0,
    totalSessions: 0,
    platformFeePercentage: 19,
  });
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [convertedStats, setConvertedStats] = useState<any>({});
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [paymentAccountDetails, setPaymentAccountDetails] = useState<any>(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<any[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [withdrawalSuccessData, setWithdrawalSuccessData] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/");
          return;
        }

        // Get mentor data
        const { data: mentor, error: mentorError } = await supabase
          .from("mentors")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (mentorError) throw mentorError;

        if (!mentor) {
          router.push("/");
          return;
        }

        setUserData(user);
        setMentorData(mentor);

        // Extract payment method and account details
        const paymentMethod = mentor.payment_method || null;
        let accountDetails = null;
        try {
          const details = mentor.payment_account_details;
          if (details) {
            accountDetails =
              typeof details === "string" ? JSON.parse(details) : details;
          }
        } catch (e) {
          console.error("Error parsing payment account details:", e);
        }
        setPaymentMethod(paymentMethod);
        setPaymentAccountDetails(accountDetails);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [router]);

  // Auto-detect user location for currency conversion
  useEffect(() => {
    if (!userLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          if (mentorData?.country) {
            // Use mentor's country as fallback
            setUserLocation(null);
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 3600000,
        }
      );
    }
  }, [userLocation, mentorData?.country]);

  useEffect(() => {
    const fetchEarnings = async () => {
      if (!mentorData?.id) return;

      try {
        setLoading(true);

        // Fetch all payments for this mentor where status is 'succeeded'
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("payments")
          .select(
            `
            *,
            sessions (
              id,
              topic,
              date,
              time,
              learner_name
            )
          `
          )
          .eq("mentor_id", mentorData.id)
          .eq("status", "succeeded")
          .order("paid_at", { ascending: false });

        if (paymentsError) throw paymentsError;

        const paymentsList: Payment[] = (paymentsData || []).map((p: any) => ({
          id: p.id,
          session_id: p.session_id,
          amount: parseFloat(p.amount || 0),
          mentor_payout_amount: parseFloat(p.mentor_payout_amount || 0),
          platform_fee: parseFloat(p.platform_fee || 0),
          status: p.status,
          paid_at: p.paid_at,
          session: p.sessions
            ? {
                topic: p.sessions.topic,
                date: p.sessions.date,
                time: p.sessions.time,
                learner_name: p.sessions.learner_name,
              }
            : undefined,
        }));

        setPayments(paymentsList);

        // Calculate stats
        const totalEarnings = paymentsList.reduce(
          (sum, p) => sum + p.amount,
          0
        );
        const totalDeducted = paymentsList.reduce(
          (sum, p) => sum + p.platform_fee,
          0
        );
        // If platform_fee is not set, calculate 19% of total
        const calculatedDeducted = paymentsList.reduce((sum, p) => {
          if (p.platform_fee > 0) {
            return sum + p.platform_fee;
          }
          return sum + p.amount * 0.19;
        }, 0);
        let availableBalance = paymentsList.reduce((sum, p) => {
          if (p.mentor_payout_amount > 0) {
            return sum + p.mentor_payout_amount;
          }
          return sum + p.amount * 0.81; // 81% after 19% fee
        }, 0);

        // Subtract pending withdrawals from available balance
        // Convert mentorData.id to number if needed
        const mentorIdForBalance =
          typeof mentorData.id === "string"
            ? parseInt(mentorData.id)
            : mentorData.id;

        const { data: allPendingWithdrawalsData } = await supabase
          .from("withdrawals")
          .select("amount, status")
          .eq("mentor_id", mentorIdForBalance)
          .in("status", ["pending", "processing", "pending_manual"]);

        if (allPendingWithdrawalsData && allPendingWithdrawalsData.length > 0) {
          const pendingTotal = allPendingWithdrawalsData.reduce(
            (sum, w) => sum + parseFloat(w.amount || 0),
            0
          );
          availableBalance = Math.max(0, availableBalance - pendingTotal);
        }

        setStats({
          totalEarnings,
          totalDeducted: calculatedDeducted,
          availableBalance,
          totalSessions: paymentsList.length,
          platformFeePercentage: 19,
        });
      } catch (error) {
        console.error("Error fetching earnings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [mentorData?.id]);

  // Fetch all withdrawals (for history) and pending withdrawals
  useEffect(() => {
    const fetchWithdrawals = async () => {
      if (!mentorData?.id) {
        console.log("No mentorData.id, skipping withdrawal fetch");
        return;
      }

      try {
        // Convert mentorData.id to number if needed (mentor_id in withdrawals table is BIGINT)
        const mentorId =
          typeof mentorData.id === "string"
            ? parseInt(mentorData.id)
            : mentorData.id;

        console.log("Fetching withdrawals for mentor_id:", mentorId, "type:", typeof mentorId);
        console.log("mentorData.id:", mentorData.id, "type:", typeof mentorData.id);

        // Fetch ALL withdrawals for history - try both number and string formats
        let allWithdrawalsData = null;
        let allError = null;

        // Try with number first
        const { data: withdrawalsByNumber, error: errorByNumber } = await supabase
          .from("withdrawals")
          .select("*")
          .eq("mentor_id", mentorId)
          .order("requested_at", { ascending: false });

        if (errorByNumber) {
          console.error("Error fetching with number mentor_id:", errorByNumber);
          // Try with string as fallback
          const { data: withdrawalsByString, error: errorByString } = await supabase
            .from("withdrawals")
            .select("*")
            .eq("mentor_id", String(mentorId))
            .order("requested_at", { ascending: false });
          
          if (errorByString) {
            console.error("Error fetching with string mentor_id:", errorByString);
            allError = errorByString;
          } else {
            allWithdrawalsData = withdrawalsByString;
            console.log("Found withdrawals using string mentor_id:", allWithdrawalsData);
          }
        } else {
          allWithdrawalsData = withdrawalsByNumber;
          console.log("Found withdrawals using number mentor_id:", allWithdrawalsData);
        }

        // Also check what mentor_ids exist in withdrawals table for debugging
        const { data: sampleWithdrawals } = await supabase
          .from("withdrawals")
          .select("mentor_id, id, amount, status")
          .limit(5);
        
        console.log("Sample withdrawals (first 5) with mentor_ids:", sampleWithdrawals);

        if (allError) {
          console.error("Error fetching all withdrawals:", allError);
          if (
            allError.code === "42P01" ||
            allError.message?.includes("does not exist")
          ) {
            console.warn("Withdrawals table does not exist yet");
            setPendingWithdrawals([]);
            setAllWithdrawals([]);
            return;
          }
        } else {
          console.log(`Found ${allWithdrawalsData?.length || 0} withdrawals for mentor ${mentorId}`);
          setAllWithdrawals(allWithdrawalsData || []);
        }

        // Fetch only pending ones - try both number and string
        let withdrawalsData = null;
        let withdrawalsError = null;

        const { data: pendingByNumber, error: pendingErrorByNumber } = await supabase
          .from("withdrawals")
          .select("*")
          .eq("mentor_id", mentorId)
          .in("status", ["pending", "processing", "pending_manual"])
          .order("requested_at", { ascending: false });

        if (pendingErrorByNumber) {
          console.error("Error fetching pending with number:", pendingErrorByNumber);
          // Try with string
          const { data: pendingByString, error: pendingErrorByString } = await supabase
            .from("withdrawals")
            .select("*")
            .eq("mentor_id", String(mentorId))
            .in("status", ["pending", "processing", "pending_manual"])
            .order("requested_at", { ascending: false });
          
          if (pendingErrorByString) {
            console.error("Error fetching pending with string:", pendingErrorByString);
            withdrawalsError = pendingErrorByString;
          } else {
            withdrawalsData = pendingByString;
          }
        } else {
          withdrawalsData = pendingByNumber;
        }

        if (withdrawalsError) {
          console.error(
            "Error fetching pending withdrawals:",
            withdrawalsError
          );
          setPendingWithdrawals([]);
        } else {
          console.log(`Found ${withdrawalsData?.length || 0} pending withdrawals`);
          setPendingWithdrawals(withdrawalsData || []);
        }
      } catch (error: any) {
        console.error("Error fetching withdrawals:", error);
        setPendingWithdrawals([]);
        setAllWithdrawals([]);
      }
    };

    fetchWithdrawals();

    // Refresh withdrawals every 30 seconds
    const interval = setInterval(fetchWithdrawals, 30000);
    return () => clearInterval(interval);
  }, [mentorData?.id]);

  // Convert stats to local currency
  useEffect(() => {
    const convertStats = async () => {
      if (!userLocation && !mentorData?.country) return;

      const conversions: any = {};

      try {
        const totalEarningsResult = await convertAndFormatPrice(
          stats.totalEarnings,
          userLocation
        );
        const totalDeductedResult = await convertAndFormatPrice(
          stats.totalDeducted,
          userLocation
        );
        const availableBalanceResult = await convertAndFormatPrice(
          stats.availableBalance,
          userLocation
        );

        conversions.totalEarnings = totalEarningsResult.formatted;
        conversions.totalDeducted = totalDeductedResult.formatted;
        conversions.availableBalance = availableBalanceResult.formatted;
        conversions.currencySymbol = availableBalanceResult.symbol;
      } catch (error) {
        console.error("Error converting currency:", error);
      }

      setConvertedStats(conversions);
    };

    if (stats.totalEarnings > 0) {
      convertStats();
    }
  }, [stats, userLocation, mentorData?.country]);

  const handleWithdraw = async () => {
    if (!mentorData?.id) return;

    // Check if payment method is configured
    if (!paymentMethod || !paymentAccountDetails) {
      alert(
        "Please configure your payment method in your profile settings before withdrawing.\n\nGo to Settings > Profile to add your bank account, PayPal, or other payment details."
      );
      setShowWithdrawalModal(false);
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid withdrawal amount");
      return;
    }

    if (amount > stats.availableBalance) {
      alert(
        `Insufficient balance. Available: ${
          convertedStats.availableBalance ||
          `$${stats.availableBalance.toFixed(2)}`
        }`
      );
      return;
    }

    if (amount < 10) {
      alert("Minimum withdrawal amount is $10.00");
      return;
    }

    setWithdrawing(true);

    try {
      // Call backend API to process withdrawal
      const response = await fetch(
        `${API_BASE_URL}/mentors/earnings/withdraw/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mentor_id: mentorData.id,
            amount: amount,
            currency: "usd",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        alert(
          errorData.error ||
            `Failed to process withdrawal. Server returned ${response.status}`
        );
        setWithdrawing(false);
        return;
      }

      const data = await response.json();

      if (data.success) {
        // Show success modal
        setWithdrawalSuccessData({
          amount: amount,
          status: data.status || "pending",
          message: data.message || "Withdrawal request submitted successfully!",
          note: data.note || "",
          withdrawalId: data.withdrawal_id,
        });
        setShowWithdrawalModal(false);
        setShowSuccessModal(true);
        setWithdrawalAmount("");

        // Wait a moment for database to be consistent, then refresh all withdrawals and earnings
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mentorIdForRefresh =
          typeof mentorData.id === "string"
            ? parseInt(mentorData.id)
            : mentorData.id;

        // Fetch all withdrawals - try both number and string formats
        let allWithdrawalsData = null;
        
        const { data: withdrawalsByNumber } = await supabase
          .from("withdrawals")
          .select("*")
          .eq("mentor_id", mentorIdForRefresh)
          .order("requested_at", { ascending: false });

        if (withdrawalsByNumber) {
          allWithdrawalsData = withdrawalsByNumber;
        } else {
          // Try with string as fallback
          const { data: withdrawalsByString } = await supabase
            .from("withdrawals")
            .select("*")
            .eq("mentor_id", String(mentorIdForRefresh))
            .order("requested_at", { ascending: false });
          
          if (withdrawalsByString) {
            allWithdrawalsData = withdrawalsByString;
          }
        }

        if (allWithdrawalsData) {
          console.log("Refreshed withdrawals after withdrawal:", allWithdrawalsData);
          setAllWithdrawals(allWithdrawalsData);
          // Filter pending ones
          const pending = allWithdrawalsData.filter((w) =>
            ["pending", "processing", "pending_manual"].includes(w.status)
          );
          setPendingWithdrawals(pending);
        } else {
          console.warn("No withdrawals found after withdrawal request");
        }

        // Refresh earnings to update balance
        const { data: paymentsData } = await supabase
          .from("payments")
          .select(
            `
            *,
            sessions (
              id,
              topic,
              date,
              time,
              learner_name
            )
          `
          )
          .eq("mentor_id", mentorData.id)
          .eq("status", "succeeded")
          .order("paid_at", { ascending: false });

        if (paymentsData) {
          const paymentsList: Payment[] = paymentsData.map((p: any) => ({
            id: p.id,
            session_id: p.session_id,
            amount: parseFloat(p.amount || 0),
            mentor_payout_amount: parseFloat(p.mentor_payout_amount || 0),
            platform_fee: parseFloat(p.platform_fee || 0),
            status: p.status,
            paid_at: p.paid_at,
            session: p.sessions
              ? {
                  topic: p.sessions.topic,
                  date: p.sessions.date,
                  time: p.sessions.time,
                  learner_name: p.sessions.learner_name,
                }
              : undefined,
          }));

          setPayments(paymentsList);

          // Recalculate stats with updated pending withdrawals
          const totalEarnings = paymentsList.reduce(
            (sum, p) => sum + p.amount,
            0
          );
          const calculatedDeducted = paymentsList.reduce((sum, p) => {
            if (p.platform_fee > 0) {
              return sum + p.platform_fee;
            }
            return sum + p.amount * 0.19;
          }, 0);
          let availableBalance = paymentsList.reduce((sum, p) => {
            if (p.mentor_payout_amount > 0) {
              return sum + p.mentor_payout_amount;
            }
            return sum + p.amount * 0.81;
          }, 0);

          // Subtract pending withdrawals
          const pending = allWithdrawalsData?.filter((w) =>
            ["pending", "processing", "pending_manual"].includes(w.status)
          ) || [];
          const pendingTotal = pending.reduce(
            (sum, w) => sum + parseFloat(w.amount || 0),
            0
          );
          availableBalance = Math.max(0, availableBalance - pendingTotal);

          setStats({
            totalEarnings,
            totalDeducted: calculatedDeducted,
            availableBalance,
            totalSessions: paymentsList.length,
            platformFeePercentage: 19,
          });
        }
      } else {
        alert(data.error || "Failed to process withdrawal. Please try again.");
      }
    } catch (error: any) {
      console.error("Error processing withdrawal:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to process withdrawal.";

      if (error instanceof TypeError && error.message.includes("fetch")) {
        errorMessage = `Failed to connect to backend server.\n\nPlease ensure the Django backend is running on ${API_BASE_URL}\n\nError: ${error.message}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="mentor">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingLogo size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="mentor">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Earnings</h1>
          <p className="text-gray-600">
            Track your earnings from completed sessions
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {convertedStats.totalEarnings ||
                    `$${stats.totalEarnings.toFixed(2)}`}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalSessions} paid sessions
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Platform Fee ({stats.platformFeePercentage}%)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {convertedStats.totalDeducted ||
                    `$${stats.totalDeducted.toFixed(2)}`}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Deducted from earnings
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Available Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {convertedStats.availableBalance ||
                    `$${stats.availableBalance.toFixed(2)}`}
                </div>
                <p className="text-xs text-gray-500 mt-1">Ready to withdraw</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalSessions}
                </div>
                <p className="text-xs text-gray-500 mt-1">Paid sessions</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Withdrawal Section */}
        <Card className="mb-6 border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              Withdraw Earnings
            </CardTitle>
            <CardDescription>
              Request a withdrawal to your registered payment method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    Available Balance
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {convertedStats.availableBalance ||
                      `$${stats.availableBalance.toFixed(2)}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum withdrawal: $10.00
                  </p>
                </div>
                <Button
                  onClick={() => setShowWithdrawalModal(true)}
                  disabled={stats.availableBalance < 10}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Withdraw
                </Button>
              </div>

              {/* Pending Withdrawals */}
              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Pending Withdrawals
                </p>
                {pendingWithdrawals.length > 0 ? (
                  <div className="space-y-2">
                    {pendingWithdrawals.map((withdrawal) => (
                      <motion.div
                        key={withdrawal.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-300 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="text-lg font-bold text-gray-900">
                              {convertedStats.currencySymbol || "$"}
                              {parseFloat(withdrawal.amount || 0).toFixed(2)}
                            </p>
                            <Badge
                              variant="outline"
                              className={
                                withdrawal.status === "processing"
                                  ? "bg-blue-100 text-blue-700 border-blue-300 font-semibold"
                                  : withdrawal.status === "pending_manual"
                                  ? "bg-purple-100 text-purple-700 border-purple-300 font-semibold"
                                  : "bg-yellow-100 text-yellow-700 border-yellow-300 font-semibold"
                              }
                            >
                              {withdrawal.status === "processing"
                                ? "Processing"
                                : withdrawal.status === "pending_manual"
                                ? "Pending Manual"
                                : "Pending"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                            {withdrawal.requested_at && (
                              <span className="flex items-center gap-1">
                                <span>Requested:</span>
                                <span className="font-medium">
                                  {new Date(
                                    withdrawal.requested_at
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </span>
                            )}
                            {withdrawal.withdrawal_id && (
                              <span className="flex items-center gap-1">
                                <span>ID:</span>
                                <span className="font-mono text-xs">
                                  {withdrawal.id?.slice(0, 8)}...
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500">
                      No pending withdrawals
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Your withdrawal requests will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Withdrawal History</CardTitle>
                <CardDescription>
                  All your withdrawal requests and their status
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!mentorData?.id) return;
                  const mentorId =
                    typeof mentorData.id === "string"
                      ? parseInt(mentorData.id)
                      : mentorData.id;
                  
                  // Try both formats
                  let allData = null;
                  const { data: byNumber } = await supabase
                    .from("withdrawals")
                    .select("*")
                    .eq("mentor_id", mentorId)
                    .order("requested_at", { ascending: false });
                  
                  if (byNumber) {
                    allData = byNumber;
                  } else {
                    const { data: byString } = await supabase
                      .from("withdrawals")
                      .select("*")
                      .eq("mentor_id", String(mentorId))
                      .order("requested_at", { ascending: false });
                    allData = byString;
                  }
                  
                  if (allData) {
                    setAllWithdrawals(allData);
                    const pending = allData.filter((w) =>
                      ["pending", "processing", "pending_manual"].includes(w.status)
                    );
                    setPendingWithdrawals(pending);
                    console.log("Manually refreshed withdrawals:", allData);
                  }
                }}
              >
                <LoadingLogo size={16} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {allWithdrawals.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No withdrawals yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Your withdrawal history will appear here
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Mentor ID: {mentorData?.id} (Check browser console for details)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {allWithdrawals.map((withdrawal) => (
                  <motion.div
                    key={withdrawal.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      withdrawal.status === "completed"
                        ? "bg-green-50 border-green-200 hover:bg-green-100"
                        : withdrawal.status === "failed"
                        ? "bg-red-50 border-red-200 hover:bg-red-100"
                        : withdrawal.status === "processing"
                        ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                        : "bg-yellow-50 border-yellow-200 hover:bg-yellow-100"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-lg font-bold text-gray-900">
                          {convertedStats.currencySymbol || "$"}
                          {parseFloat(withdrawal.amount || 0).toFixed(2)}
                        </p>
                        <Badge
                          variant="outline"
                          className={
                            withdrawal.status === "completed"
                              ? "bg-green-100 text-green-700 border-green-300"
                              : withdrawal.status === "failed"
                              ? "bg-red-100 text-red-700 border-red-300"
                              : withdrawal.status === "processing"
                              ? "bg-blue-100 text-blue-700 border-blue-300"
                              : withdrawal.status === "pending_manual"
                              ? "bg-purple-100 text-purple-700 border-purple-300"
                              : "bg-yellow-100 text-yellow-700 border-yellow-300"
                          }
                        >
                          {withdrawal.status === "completed"
                            ? "Completed"
                            : withdrawal.status === "failed"
                            ? "Failed"
                            : withdrawal.status === "processing"
                            ? "Processing"
                            : withdrawal.status === "pending_manual"
                            ? "Pending Manual"
                            : "Pending"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {withdrawal.requested_at && (
                          <span>
                            Requested:{" "}
                            {new Date(
                              withdrawal.requested_at
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                        {withdrawal.processed_at && (
                          <span>
                            Processed:{" "}
                            {new Date(
                              withdrawal.processed_at
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                        {withdrawal.payment_method && (
                          <span className="capitalize">
                            Method: {withdrawal.payment_method.replace("_", " ")}
                          </span>
                        )}
                      </div>
                      {withdrawal.failure_reason && (
                        <p className="text-xs text-red-600 mt-2">
                          Reason: {withdrawal.failure_reason}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {withdrawal.status === "completed" && (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      )}
                      {withdrawal.status === "failed" && (
                        <AlertCircle className="h-6 w-6 text-red-600" />
                      )}
                      {(withdrawal.status === "pending" ||
                        withdrawal.status === "processing" ||
                        withdrawal.status === "pending_manual") && (
                        <LoadingLogo size={24} />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              All payments received from completed sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No payments yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Payments will appear here after students book and pay for
                  sessions
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {payment.session?.topic || "Session"}
                        </h4>
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-700 border-green-300"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Paid
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {payment.session?.learner_name && (
                          <span>Student: {payment.session.learner_name}</span>
                        )}
                        {payment.session?.date && (
                          <span>
                            {new Date(
                              payment.session.date
                            ).toLocaleDateString()}
                          </span>
                        )}
                        {payment.paid_at && (
                          <span>
                            Paid:{" "}
                            {new Date(payment.paid_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {convertedStats.currencySymbol || "$"}
                        {payment.mentor_payout_amount > 0
                          ? payment.mentor_payout_amount.toFixed(2)
                          : (payment.amount * 0.81).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Fee: {convertedStats.currencySymbol || "$"}
                        {payment.platform_fee > 0
                          ? payment.platform_fee.toFixed(2)
                          : (payment.amount * 0.19).toFixed(2)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal Modal */}
        <Dialog
          open={showWithdrawalModal}
          onOpenChange={setShowWithdrawalModal}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Withdraw Earnings</DialogTitle>
              <DialogDescription>
                Enter the amount you want to withdraw. Minimum withdrawal is
                $10.00
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Payment Method Info */}
              {paymentMethod && paymentAccountDetails ? (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    Withdrawal will be sent to:
                  </p>
                  {paymentMethod === "bank_transfer" && (
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>
                        <strong>Bank:</strong>{" "}
                        {paymentAccountDetails.bank_name === "other"
                          ? paymentAccountDetails.bank_name_other || "N/A"
                          : paymentAccountDetails.bank_name || "N/A"}
                      </p>
                      <p>
                        <strong>Account:</strong> ****
                        {paymentAccountDetails.account_number
                          ? typeof paymentAccountDetails.account_number ===
                            "string"
                            ? paymentAccountDetails.account_number.slice(-4)
                            : paymentAccountDetails.account_number
                                .toString()
                                .slice(-4)
                          : "****"}
                      </p>
                      <p>
                        <strong>Account Holder:</strong>{" "}
                        {paymentAccountDetails.account_holder || "N/A"}
                      </p>
                      {paymentAccountDetails.routing_number && (
                        <p className="text-xs text-blue-600">
                          <strong>Routing:</strong>{" "}
                          {paymentAccountDetails.routing_number}
                        </p>
                      )}
                    </div>
                  )}
                  {paymentMethod === "paypal" && (
                    <div className="text-sm text-blue-800">
                      <p>
                        <strong>PayPal:</strong>{" "}
                        {paymentAccountDetails.email || "N/A"}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Note: PayPal withdrawals require manual processing
                      </p>
                    </div>
                  )}
                  {paymentMethod === "stripe" && (
                    <div className="text-sm text-blue-800">
                      <p>
                        <strong>Stripe Account:</strong>{" "}
                        {paymentAccountDetails.email || "N/A"}
                      </p>
                    </div>
                  )}
                  {paymentMethod === "crypto" && (
                    <div className="text-sm text-blue-800">
                      <p>
                        <strong>Wallet:</strong>{" "}
                        {paymentAccountDetails.wallet_address?.slice(0, 10)}...
                        {paymentAccountDetails.wallet_address?.slice(-6) ||
                          "N/A"}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Note: Crypto withdrawals require manual processing
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm font-semibold text-yellow-900 mb-2">
                    ⚠️ Payment Method Not Configured
                  </p>
                  <p className="text-sm text-yellow-800 mb-2">
                    Please set up your payment method in your profile settings
                    before withdrawing.
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs text-yellow-700">
                      Please configure your payment method in Settings to enable
                      withdrawals.
                    </p>
                    <Button
                      onClick={() => {
                        setShowWithdrawalModal(false);
                        // Dispatch custom event to open settings modal
                        window.dispatchEvent(
                          new CustomEvent("openSettingsModal")
                        );
                      }}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      Open Settings
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="amount">Withdrawal Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="10"
                  max={stats.availableBalance}
                  step="0.01"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={!paymentMethod || !paymentAccountDetails}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available:{" "}
                  {convertedStats.availableBalance ||
                    `$${stats.availableBalance.toFixed(2)}`}
                </p>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-700">
                  Withdrawals are processed within 3-5 business days to your
                  registered payment method.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowWithdrawalModal(false);
                    setWithdrawalAmount("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleWithdraw}
                  disabled={
                    withdrawing ||
                    !withdrawalAmount ||
                    parseFloat(withdrawalAmount) < 10 ||
                    !paymentMethod ||
                    !paymentAccountDetails
                  }
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {withdrawing ? (
                    <>
                      <LoadingLogo size={16} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Withdraw
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Success Modal */}
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center"
                >
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </motion.div>
              </div>
              <DialogTitle className="text-center text-2xl">
                Withdrawal Request Submitted!
              </DialogTitle>
              <DialogDescription className="text-center">
                Your withdrawal request has been successfully submitted
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600 mb-2">
                  {convertedStats.currencySymbol || "$"}
                  {withdrawalSuccessData?.amount?.toFixed(2) || "0.00"}
                </p>
                <p className="text-sm text-gray-600">Amount to be withdrawn</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Status:
                </p>
                <p className="text-sm text-blue-800 capitalize mb-2">
                  {withdrawalSuccessData?.status === "processing"
                    ? "Processing"
                    : "Pending"}
                </p>
                {withdrawalSuccessData?.status === "processing" && (
                  <p className="text-xs text-blue-600">
                    Your withdrawal is being processed and will arrive in 2-5
                    business days.
                  </p>
                )}
                {(withdrawalSuccessData?.status === "pending" ||
                  withdrawalSuccessData?.status === "pending_manual") && (
                  <p className="text-xs text-blue-600">
                    Your withdrawal request is pending and will be processed
                    within 3-5 business days.
                  </p>
                )}
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 text-center">
                  Updated available balance:{" "}
                  {convertedStats.availableBalance ||
                    `$${stats.availableBalance.toFixed(2)}`}
                </p>
              </div>

              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  setWithdrawalSuccessData(null);
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
