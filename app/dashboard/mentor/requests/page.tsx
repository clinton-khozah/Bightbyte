"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  GraduationCap,
  Calendar,
  DollarSign
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
  student_phone: string | null;
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

export default function MentorRequestsPage() {
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

        // Get mentor data
        const { data: mentorData } = await supabase
          .from('mentors')
          .select('id, email, name')
          .eq('email', user.email)
          .single();

        if (!mentorData) {
          router.push("/");
          return;
        }

        setUserData({ ...user, mentorId: mentorData.id });
      } catch (error) {
        console.error("Error fetching user data:", error);
        router.push("/");
      }
    };

    fetchUserData();
  }, [router]);

  React.useEffect(() => {
    if (!userData?.mentorId) return;

    const fetchRequests = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('tutor_requests')
          .select('*')
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

  const handleAcceptRequest = async (requestId: number) => {
    try {
      const { error } = await supabase
        .from('tutor_requests')
        .update({
          status: 'accepted',
          accepted_by_mentor_id: userData.mentorId,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      setRequests(requests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'accepted', accepted_by_mentor_id: userData.mentorId, accepted_at: new Date().toISOString() }
          : req
      ));
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Failed to accept request. Please try again.");
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      const { error } = await supabase
        .from('tutor_requests')
        .update({
          status: 'rejected',
        })
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      setRequests(requests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'rejected' }
          : req
      ));
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Failed to reject request. Please try again.");
    }
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
  const acceptedRequests = requests.filter(r => r.status === 'accepted' && r.accepted_by_mentor_id === userData?.mentorId);
  const otherRequests = requests.filter(r => r.status !== 'pending' && (r.accepted_by_mentor_id !== userData?.mentorId || r.status === 'rejected'));

  return (
    <DashboardLayout role="mentor">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tutor Requests</h1>
          <p className="text-gray-600 mt-2">View and manage tutor requests from students</p>
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
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="w-4 h-4" />
                                <span className="font-medium">Student:</span>
                                <span>{request.student_name}</span>
                              </div>
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
                          <p className="text-sm text-gray-700 mb-4">{request.description}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleAcceptRequest(request.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Accept Request
                          </Button>
                          <Button
                            onClick={() => handleRejectRequest(request.id)}
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Contact details will be shared after student payment
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Accepted Requests */}
            {acceptedRequests.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">My Accepted Requests</h2>
                <div className="grid gap-4">
                  {acceptedRequests.map((request) => (
                    <Card key={request.id} className="border-l-4 border-l-green-500">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              <BookOpen className="w-5 h-5 text-green-600" />
                              {request.subject}
                            </CardTitle>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="w-4 h-4" />
                                <span className="font-medium">Student:</span>
                                <span>{request.student_name}</span>
                              </div>
                              {request.payment_status === 'paid' && (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                  <DollarSign className="w-4 h-4" />
                                  <span>Payment Received</span>
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
                        {request.payment_status === 'pending' && (
                          <p className="text-xs text-yellow-600">
                            Waiting for student payment...
                          </p>
                        )}
                        {request.payment_status === 'paid' && (
                          <p className="text-xs text-green-600">
                            Payment received. Contact details available.
                          </p>
                        )}
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
                            <div className="mt-2">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="w-4 h-4" />
                                <span>{request.student_name}</span>
                              </div>
                            </div>
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
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

