"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  GraduationCap,
  DollarSign,
  CreditCard
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TutorRequest {
  id: number;
  student_id: string | null;
  student_name: string;
  student_email: string;
  grade_level: string | null;
  subject: string;
  description: string | null;
  preferred_time: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  accepted_by_mentor_id: number | null;
  accepted_at: string | null;
  payment_status: 'pending' | 'paid' | 'refunded';
  payment_amount: number | null;
  payment_currency: string;
  created_at: string;
}

export default function LearnerRequestsPage() {
  const [requests, setRequests] = React.useState<TutorRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [userData, setUserData] = React.useState<any>(null);
  const router = useRouter();

  React.useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/");
          return;
        }

        const { data: studentData } = await supabase
          .from('students')
          .select('*')
          .eq('id', user.id)
          .single();

        setUserData({ ...user, ...studentData });
      } catch (error) {
        console.error("Error fetching user data:", error);
        router.push("/");
      }
    };

    fetchUserData();
  }, [router]);

  React.useEffect(() => {
    if (!userData?.email) return;

    const fetchRequests = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('tutor_requests')
          .select('*')
          .eq('student_email', userData.email)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setRequests(data || []);
      } catch (error) {
        console.error("Error fetching requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [userData]);

  const handlePayment = async (requestId: number) => {
    // TODO: Implement payment integration (Stripe, PayPal, etc.)
    alert("Payment integration coming soon!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const acceptedRequests = requests.filter(r => r.status === 'accepted');
  const paidRequests = requests.filter(r => r.payment_status === 'paid');
  const otherRequests = requests.filter(r => r.status !== 'pending' && r.status !== 'accepted');

  return (
    <DashboardLayout role="learner">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Tutor Requests</h1>
          <p className="text-gray-600 mt-2">View and manage your tutor requests</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Pending Requests</h2>
                <div className="grid gap-4">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="border-l-4 border-l-yellow-500">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              <BookOpen className="w-5 h-5 text-blue-600" />
                              {request.subject}
                            </CardTitle>
                            <div className="mt-2 space-y-1">
                              {request.grade_level && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <GraduationCap className="w-4 h-4" />
                                  <span>{request.grade_level}</span>
                                </div>
                              )}
                              {request.preferred_time && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Clock className="w-4 h-4" />
                                  <span>{request.preferred_time}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {request.description && (
                          <p className="text-sm text-gray-700 mb-2">{request.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Waiting for a tutor to accept your request...
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Accepted Requests - Need Payment */}
            {acceptedRequests.filter(r => r.payment_status === 'pending').length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Accepted - Payment Required</h2>
                <div className="grid gap-4">
                  {acceptedRequests.filter(r => r.payment_status === 'pending').map((request) => (
                    <Card key={request.id} className="border-l-4 border-l-green-500">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              <BookOpen className="w-5 h-5 text-green-600" />
                              {request.subject}
                            </CardTitle>
                            <div className="mt-2 space-y-1">
                              {request.payment_amount && (
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                  <DollarSign className="w-4 h-4" />
                                  <span>
                                    {request.payment_currency === 'USD' ? '$' : request.payment_currency}
                                    {request.payment_amount.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {request.description && (
                          <p className="text-sm text-gray-700 mb-4">{request.description}</p>
                        )}
                        <Button
                          onClick={() => handlePayment(request.id)}
                          className="bg-blue-600 hover:bg-blue-700 w-full"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Now
                        </Button>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Complete payment to get tutor contact details
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Paid Requests */}
            {paidRequests.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Active Sessions</h2>
                <div className="grid gap-4">
                  {paidRequests.map((request) => (
                    <Card key={request.id} className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-blue-600" />
                              {request.subject}
                            </CardTitle>
                            <div className="mt-2">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Payment Confirmed
                              </Badge>
                            </div>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {request.description && (
                          <p className="text-sm text-gray-700 mb-2">{request.description}</p>
                        )}
                        <p className="text-xs text-green-600">
                          ✓ Payment received. Tutor contact details available.
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Other Requests */}
            {otherRequests.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Other Requests</h2>
                <div className="grid gap-4">
                  {otherRequests.map((request) => (
                    <Card key={request.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              <BookOpen className="w-5 h-5" />
                              {request.subject}
                            </CardTitle>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {request.description && (
                          <p className="text-sm text-gray-700">{request.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {requests.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No tutor requests found</p>
                  <Button
                    onClick={() => router.push('/')}
                    className="mt-4"
                  >
                    Create New Request
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

