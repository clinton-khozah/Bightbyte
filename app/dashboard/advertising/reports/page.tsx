"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AnalyticsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

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

        const userEmail = user.email?.trim().toLowerCase();

        // Check if user is authorized
        if (userEmail === "clintonkhozah@gmail.com") {
          setIsAuthorized(true);
        } else {
          // Redirect unauthorized users
          router.push("/dashboard");
          return;
        }

        const { data: mentor } = await supabase
          .from("mentors")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (mentor) {
          setUserData({
            ...mentor,
            id: mentor.id,
            email: mentor.email || user.email || "",
          });
        } else {
          setUserData({ id: user.id, email: user.email || "" });
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  if (loading) {
    return (
      <DashboardLayout role="mentor">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthorized) {
    return (
      <DashboardLayout role="mentor">
        <div className="flex items-center justify-center min-h-screen">
          <Card className="bg-white border rounded-xl shadow-sm max-w-md">
            <CardContent className="p-6 text-center">
              <p className="text-gray-600">
                You don't have access to this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="mentor">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <BarChart3 className="h-10 w-10 text-blue-600" />
            Google Analytics
          </h1>
          <p className="text-lg text-gray-600">
            View your website analytics and performance metrics
          </p>
        </div>

        <Card className="bg-white border rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Google Analytics Dashboard
            </CardTitle>
            <CardDescription className="text-gray-600">
              Access your comprehensive website analytics, including visitor
              statistics, traffic sources, user behavior, and conversion
              metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Google Analytics Dashboard
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Access your comprehensive website analytics, including visitor
                  statistics, traffic sources, user behavior, and conversion
                  metrics.
                </p>
                <Button
                  onClick={() => {
                    window.open(
                      "https://analytics.google.com/analytics/web/",
                      "_blank"
                    );
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Open Google Analytics
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
