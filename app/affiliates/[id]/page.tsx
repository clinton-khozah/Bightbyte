import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  BarChart2,
  Calendar,
  Check,
  Clock,
  Eye,
  Heart,
  Link2,
  Share2,
  ShieldCheck,
  Star,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar-client"
import { Progress } from "@/components/ui/progress"

// This would normally come from a database
const affiliate = {
  id: 1,
  name: "John Smith",
  avatar: "/placeholder.svg?height=200&width=200",
  description:
    "Experienced affiliate marketer specializing in SaaS products and digital marketing tools. With over 7 years in the industry, I've helped technology companies increase their sales through strategic affiliate marketing campaigns. My audience consists primarily of business owners, marketers, and entrepreneurs looking for tools to grow their businesses.",
  expertise: "SaaS & Marketing",
  metrics: {
    conversions: "12.5%",
    avgCommission: "$1,200/mo",
    activeClients: "15",
    totalSales: "$950K+",
    audienceSize: "250K+",
    responseRate: "98%",
  },
  commissionRate: "15%",
  commissionModel: "of sales",
  category: "Technology",
  tags: ["SaaS", "Marketing Tools", "B2B", "Email Marketing", "CRM", "Analytics"],
  rating: 4.9,
  verified: true,
  marketingChannels: [
    { channel: "Email Newsletter", subscribers: "45K", openRate: "28%", conversionRate: "3.2%" },
    { channel: "Blog", monthlyVisitors: "120K", avgTimeOnPage: "4:25", conversionRate: "2.8%" },
    { channel: "YouTube", subscribers: "35K", avgViews: "15K", conversionRate: "1.9%" },
    { channel: "Social Media", followers: "85K", engagement: "4.5%", conversionRate: "2.1%" },
  ],
  pastCollaborations: [
    { brand: "MarketingPro CRM", campaign: "Annual Subscription Drive", results: "250+ conversions, $75K in sales" },
    { brand: "EmailMaster", campaign: "New Feature Launch", results: "180+ conversions, $42K in sales" },
    { brand: "AnalyticsPro", campaign: "Black Friday Promotion", results: "320+ conversions, $96K in sales" },
    { brand: "LeadGennius", campaign: "Quarterly Promotion", results: "150+ conversions, $36K in sales" },
  ],
  services: [
    {
      title: "Email Marketing Campaign",
      description: "Dedicated email campaign to my list of 45K+ subscribers with follow-up sequence",
      commissionRate: "15%",
      deliverables: [
        "Initial announcement email",
        "2 follow-up emails",
        "Dedicated landing page",
        "Performance tracking",
      ],
    },
    {
      title: "Blog + Social Media Package",
      description: "Comprehensive promotion across my blog and social media channels",
      commissionRate: "18%",
      deliverables: [
        "Detailed blog review",
        "Social media posts (5+)",
        "Stories/highlights",
        "30-day promotion period",
      ],
    },
    {
      title: "Full Marketing Bundle",
      description: "Complete promotion across all my channels (email, blog, social, YouTube)",
      commissionRate: "20%",
      deliverables: [
        "All channels promotion",
        "Custom affiliate landing page",
        "Dedicated tracking",
        "60-day promotion period",
      ],
    },
  ],
  reviews: [
    {
      id: 1,
      author: "Sarah Johnson",
      company: "MarketingPro CRM",
      rating: 5,
      date: "July 15, 2023",
      content:
        "John is an exceptional affiliate partner. His understanding of our product and ability to communicate its value to his audience resulted in one of our most successful affiliate campaigns. The quality of leads was outstanding, with a much higher conversion rate than our average affiliate. Highly recommended!",
    },
    {
      id: 2,
      author: "Michael Chen",
      company: "EmailMaster",
      rating: 5,
      date: "May 22, 2023",
      content:
        "Working with John has been a game-changer for our email marketing platform. His audience is perfectly aligned with our target market, and his promotional content was both authentic and compelling. We saw a significant spike in sign-ups during his campaign, and many of those users converted to paid plans. Will definitely work with him again.",
    },
    {
      id: 3,
      author: "Jessica Williams",
      company: "AnalyticsPro",
      rating: 4,
      date: "December 8, 2022",
      content:
        "John delivered great results for our Black Friday promotion. His understanding of analytics tools and ability to explain complex features to his audience was impressive. The only reason for 4 stars instead of 5 is that we had a slight delay in launching the campaign, but the results more than made up for it. Looking forward to our next collaboration.",
    },
  ],
}

export default function AffiliateDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: "url('/images/adspace.png')",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          zIndex: 0,
        }}
        aria-hidden="true"
      />
      <Navbar />
      <main className="flex-1">
        <div className="container py-8">
          <div className="mb-6">
            <Link
              href="/affiliates"
              className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to affiliates
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <Avatar className="h-24 w-24 border-2 border-primary/10">
                    <AvatarImage src={affiliate.avatar} alt={affiliate.name} />
                    <AvatarFallback>{affiliate.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{affiliate.expertise}</Badge>
                      <Badge variant="secondary">{affiliate.category}</Badge>
                      {affiliate.verified && (
                        <Badge variant="outline" className="gap-1">
                          <Check className="h-3 w-3" /> Verified
                        </Badge>
                      )}
                    </div>
                    <h1 className="text-3xl font-bold mb-1">{affiliate.name}</h1>
                    <p className="text-muted-foreground mb-2">Affiliate Marketer</p>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span>{affiliate.rating}</span>
                        <span className="mx-1">•</span>
                        <span>{affiliate.reviews.length} reviews</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        <span>400+ profile views this week</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 self-start">
                  <Button variant="outline" size="icon">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="about">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="about">About</TabsTrigger>
                  <TabsTrigger value="channels">Channels</TabsTrigger>
                  <TabsTrigger value="services">Services</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>

                <TabsContent value="about" className="pt-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">About {affiliate.name}</h3>
                      <p className="text-muted-foreground">{affiliate.description}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(affiliate.metrics).map(([key, value]) => (
                        <div key={key} className="bg-muted/50 p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </p>
                          <p className="font-medium">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-3">Past Collaborations</h3>
                      <div className="space-y-4">
                        {affiliate.pastCollaborations.map((collab, index) => (
                          <div key={index} className="bg-muted/30 p-4 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium">{collab.brand}</h4>
                              <Badge variant="outline">{collab.campaign}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp className="h-4 w-4 text-green-500" />
                              <span>{collab.results}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-2">Expertise</h3>
                      <div className="flex flex-wrap gap-2">
                        {affiliate.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="channels" className="pt-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium mb-3">Marketing Channels</h3>

                    <div className="grid gap-6">
                      {affiliate.marketingChannels.map((channel, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <CardTitle>{channel.channel}</CardTitle>
                              <Badge variant="secondary">{channel.conversionRate} Conversion</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              {Object.entries(channel)
                                .filter(([key]) => key !== "channel" && key !== "conversionRate")
                                .map(([key, value]) => (
                                  <div key={key}>
                                    <p className="text-muted-foreground capitalize">
                                      {key.replace(/([A-Z])/g, " $1").trim()}
                                    </p>
                                    <p className="font-medium">{value}</p>
                                  </div>
                                ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="bg-muted/30 p-6 rounded-lg">
                      <h4 className="font-medium mb-4">Audience Demographics</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Business Owners</span>
                            <span>45%</span>
                          </div>
                          <Progress value={45} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Marketing Professionals</span>
                            <span>30%</span>
                          </div>
                          <Progress value={30} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Entrepreneurs</span>
                            <span>15%</span>
                          </div>
                          <Progress value={15} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Others</span>
                            <span>10%</span>
                          </div>
                          <Progress value={10} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="services" className="pt-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium mb-3">Services Offered</h3>

                    <div className="grid gap-6">
                      {affiliate.services.map((service, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <CardTitle>{service.title}</CardTitle>
                              <div className="text-right">
                                <p className="font-bold">{service.commissionRate}</p>
                                <p className="text-xs text-muted-foreground">commission rate</p>
                              </div>
                            </div>
                            <CardDescription>{service.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <h4 className="text-sm font-medium mb-2">What's included:</h4>
                            <ul className="space-y-1">
                              {service.deliverables.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                          <CardFooter>
                            <Button className="w-full">Partner With Me</Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="reviews" className="pt-6">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted/50 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold">{affiliate.rating}</p>
                        <div className="flex justify-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < Math.floor(affiliate.rating) ? "text-yellow-500" : "text-muted"}`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{affiliate.reviews.length} reviews</p>
                      </div>
                      <div className="flex-1">
                        <div className="space-y-1">
                          {[5, 4, 3, 2, 1].map((rating) => {
                            const percentage =
                              rating === 5 ? 85 : rating === 4 ? 12 : rating === 3 ? 3 : rating === 2 ? 0 : 0
                            return (
                              <div key={rating} className="flex items-center gap-2">
                                <div className="flex items-center">
                                  <span className="text-sm w-3">{rating}</span>
                                  <Star className="h-3 w-3 text-yellow-500 ml-1" />
                                </div>
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="bg-yellow-500 h-full rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-muted-foreground">{percentage}%</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-6">
                      {affiliate.reviews.map((review) => (
                        <div key={review.id} className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{review.author}</p>
                              <p className="text-sm text-muted-foreground">{review.company}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${i < review.rating ? "text-yellow-500" : "text-muted"}`}
                                  />
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground">{review.date}</p>
                            </div>
                          </div>
                          <p className="text-sm">{review.content}</p>
                          {review.id < affiliate.reviews.length && <Separator className="mt-4" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Partner With {affiliate.name}</CardTitle>
                  <CardDescription>Start an affiliate partnership</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold">{affiliate.commissionRate}</p>
                      <p className="text-sm text-muted-foreground">{affiliate.commissionModel}</p>
                    </div>
                    <Button className="gap-2">
                      <Link2 className="h-4 w-4" />
                      Partner Now
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Available for new partnerships</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Average response time: 8 hours</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Detailed performance tracking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Secure payment & transparent reporting</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Similar Affiliates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Emma Johnson" />
                      <AvatarFallback>EJ</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">Emma Johnson</p>
                      <p className="text-sm text-muted-foreground">Finance & Investing • 12% commission</p>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0">
                      View
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="/placeholder.svg?height=40&width=40" alt="David Chen" />
                      <AvatarFallback>DC</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">David Chen</p>
                      <p className="text-sm text-muted-foreground">Health & Fitness • 18% commission</p>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0">
                      View
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="/placeholder.svg?height=40&width=40" alt="James Taylor" />
                      <AvatarFallback>JT</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">James Taylor</p>
                      <p className="text-sm text-muted-foreground">Gaming & Entertainment • 12% commission</p>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0">
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

