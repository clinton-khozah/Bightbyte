"use client"

import * as React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, MousePointerClick, Eye, DollarSign, Globe, Calendar, BarChart3, ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1"

interface Campaign {
  id: string
  name: string
  status: string
  cost_per_click: number
  daily_budget: number | null
  total_clicks: number
  total_impressions: number
  total_spent: number
  start_date: string
  end_date: string | null
}

interface CampaignAnalytics {
  campaign: Campaign
  total_clicks: number
  total_impressions: number
  total_spent: number
  ctr: number
  clicks_by_country: Record<string, number>
  recent_clicks: Array<{
    clicked_at: string
    country: string
    city: string
    click_cost: number
  }>
}

function AdAnalyticsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userData, setUserData] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  useEffect(() => {
    const campaignId = searchParams?.get('campaign')
    if (campaignId) {
      setSelectedCampaign(campaignId)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/")
          return
        }

        const { data: mentorData } = await supabase
          .from("mentors")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        if (mentorData) {
          setUserData({ ...mentorData, id: mentorData.id })
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      }
    }

    fetchUserData()
  }, [router])

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!userData?.id) return

      try {
        setLoading(true)
        const response = await fetch(`${API_BASE_URL}/mentors/ads/campaigns/${userData.id}/`)
        const data = await response.json()

        if (data.success && data.campaigns) {
          setCampaigns(data.campaigns)
          if (data.campaigns.length > 0 && !selectedCampaign) {
            setSelectedCampaign(data.campaigns[0].id)
          }
        }
      } catch (error) {
        console.error("Error fetching campaigns:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [userData, selectedCampaign])

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!selectedCampaign) return

      try {
        setAnalyticsLoading(true)
        const response = await fetch(`${API_BASE_URL}/mentors/ads/campaigns/analytics/${selectedCampaign}/`)
        const data = await response.json()

        if (data.success && data.analytics) {
          setAnalytics(data.analytics)
        }
      } catch (error) {
        console.error("Error fetching analytics:", error)
      } finally {
        setAnalyticsLoading(false)
      }
    }

    fetchAnalytics()
  }, [selectedCampaign])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      active: { variant: "default", label: "Active" },
      paused: { variant: "secondary", label: "Paused" },
      archived: { variant: "outline", label: "Archived" },
    }
    const config = variants[status] || { variant: "secondary" as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <DashboardLayout userData={userData} role="mentor">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userData={userData} role="mentor">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/advertising")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Advertising
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Campaign Analytics</h1>
          <p className="text-gray-600">Track your advertising performance and ROI</p>
        </div>

        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Campaigns Yet</h3>
              <p className="text-gray-600 mb-6">Create a campaign to see analytics here</p>
              <Button onClick={() => router.push("/dashboard/advertising/campaigns")}>
                Create Your First Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Campaign Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Campaign
              </label>
              <div className="flex flex-wrap gap-3">
                {campaigns.map((campaign) => (
                  <Button
                    key={campaign.id}
                    variant={selectedCampaign === campaign.id ? "default" : "outline"}
                    onClick={() => setSelectedCampaign(campaign.id)}
                  >
                    {campaign.name}
                    {getStatusBadge(campaign.status)}
                  </Button>
                ))}
              </div>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : analytics ? (
              <>
                {/* Key Metrics */}
                <div className="grid md:grid-cols-4 gap-6 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Total Clicks</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {analytics.total_clicks.toLocaleString()}
                          </p>
                        </div>
                        <MousePointerClick className="w-8 h-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Impressions</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {analytics.total_impressions.toLocaleString()}
                          </p>
                        </div>
                        <Eye className="w-8 h-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">CTR</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {analytics.ctr.toFixed(2)}%
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                          <p className="text-2xl font-bold text-gray-900">
                            ${analytics.total_spent.toFixed(2)}
                          </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Campaign Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Campaign Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Campaign Name</p>
                        <p className="font-semibold">{analytics.campaign.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        {getStatusBadge(analytics.campaign.status)}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Cost Per Click</p>
                        <p className="font-semibold">${analytics.campaign.cost_per_click.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Daily Budget</p>
                        <p className="font-semibold">
                          {analytics.campaign.daily_budget
                            ? `$${analytics.campaign.daily_budget.toFixed(2)}`
                            : "Unlimited"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Start Date</p>
                        <p className="font-semibold">
                          {analytics.campaign.start_date ? formatDate(analytics.campaign.start_date) : "N/A"}
                        </p>
                      </div>
                      {analytics.campaign.end_date && (
                        <div>
                          <p className="text-sm text-gray-600">End Date</p>
                          <p className="font-semibold">{formatDate(analytics.campaign.end_date)}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Clicks by Country */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Clicks by Country</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(analytics.clicks_by_country).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(analytics.clicks_by_country)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 10)
                            .map(([country, count]) => (
                              <div key={country} className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">{country}</span>
                                <Badge variant="secondary">{count} clicks</Badge>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No clicks yet</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Clicks */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Recent Clicks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.recent_clicks.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 text-sm font-semibold text-gray-700">
                                Date
                              </th>
                              <th className="text-left py-2 text-sm font-semibold text-gray-700">
                                Location
                              </th>
                              <th className="text-right py-2 text-sm font-semibold text-gray-700">
                                Cost
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {analytics.recent_clicks.map((click, idx) => (
                              <tr key={idx} className="border-b">
                                <td className="py-2 text-sm text-gray-600">
                                  {formatDate(click.clicked_at)}
                                </td>
                                <td className="py-2 text-sm text-gray-600">
                                  {click.city}, {click.country}
                                </td>
                                <td className="py-2 text-sm text-gray-600 text-right">
                                  ${click.click_cost.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No clicks yet</p>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function AdAnalyticsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout userData={null} role="mentor">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    }>
      <AdAnalyticsContent />
    </Suspense>
  )
}
