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
  Globe,
  Heart,
  Instagram,
  MessageSquare,
  Share2,
  ShieldCheck,
  Star,
  Twitter,
  Youtube,
} from "lucide-react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar-client"
import { PageContainer } from "@/components/page-container"
// This would normally come from a database
const influencer = {
  id: 1,
  name: "Alex Morgan",
  handle: "@techreviewalex",
  avatar: "/placeholder.svg?height=200&width=200",
  description:
    "Tech reviewer and gadget enthusiast with a focus on consumer electronics and smartphones. I create in-depth reviews, comparison videos, and tutorials to help consumers make informed purchasing decisions. With over 5 years of experience in the tech industry, I provide honest, unbiased opinions on the latest technology products.",
  platform: "YouTube",
  icon: Youtube,
  metrics: {
    followers: "850K",
    engagement: "4.2%",
    avgViews: "120K",
    totalVideos: "412",
    monthlyGrowth: "+5.8K",
    demographics: "25-34 (45%), Male (72%)",
  },
  price: "$3,500",
  priceModel: "per video",
  category: "Technology",
  tags: ["Tech Reviews", "Gadgets", "Unboxing", "Tutorials", "Smartphones", "Laptops"],
  rating: 4.8,
  reviewCount: 124,
  verified: true,
  socialProfiles: [
    { platform: "YouTube", handle: "@techreviewalex", followers: "850K", url: "#" },
    { platform: "Instagram", handle: "@techreviewalex", followers: "320K", url: "#" },
    { platform: "Twitter", handle: "@techreviewalex", followers: "175K", url: "#" },
  ],
  pastCollaborations: [
    { brand: "TechGadgets Inc.", campaign: "Smartphone Launch", date: "June 2023" },
    { brand: "AudioPro", campaign: "Headphones Review", date: "April 2023" },
    { brand: "LaptopMaster", campaign: "Gaming Laptop Series", date: "February 2023" },
    { brand: "SmartHome Solutions", campaign: "Smart Home Devices", date: "December 2022" },
  ],
  contentSamples: [
    { title: "Ultimate Smartphone Comparison 2023", views: "450K", engagement: "5.2%", url: "#" },
    { title: "Top 10 Budget Laptops for Students", views: "380K", engagement: "4.8%", url: "#" },
    { title: "Smart Home Setup Guide", views: "290K", engagement: "4.5%", url: "#" },
  ],
  reviews: [
    {
      id: 1,
      author: "Sarah Johnson",
      company: "TechGadgets Inc.",
      rating: 5,
      date: "June 15, 2023",
      content:
        "Working with Alex was fantastic! His review of our new smartphone was thorough, honest, and engaging. The video quality was excellent, and he highlighted all the key features we wanted to showcase. We saw a 35% increase in website traffic after his review went live.",
    },
    {
      id: 2,
      author: "Michael Chen",
      company: "AudioPro",
      rating: 5,
      date: "April 22, 2023",
      content:
        "Alex delivered an exceptional review of our headphones. His attention to detail and technical knowledge really helped explain the unique features of our product. The audience engagement was impressive, and we received a significant boost in sales following his video.",
    },
    {
      id: 3,
      author: "Jessica Williams",
      company: "LaptopMaster",
      rating: 4,
      date: "February 8, 2023",
      content:
        "Good collaboration overall. Alex provided a comprehensive review of our gaming laptop series. The only reason for 4 stars instead of 5 is that the video was delivered a few days later than initially agreed upon. However, the quality of the content made up for the slight delay.",
    },
  ],
  services: [
    {
      title: "Dedicated Review Video",
      description: "In-depth 15-20 minute review of your product with detailed analysis and honest feedback",
      price: "$3,500",
      deliverables: [
        "Full HD video",
        "Product demonstration",
        "Technical analysis",
        "Pros and cons",
        "Final recommendation",
      ],
    },
    {
      title: "Product Comparison",
      description: "Compare your product against competitors to highlight unique selling points",
      price: "$4,200",
      deliverables: ["Side-by-side comparison", "Feature analysis", "Performance testing", "Value assessment"],
    },
    {
      title: "Tutorial/How-To Video",
      description: "Step-by-step guide showing how to use your product and maximize its features",
      price: "$2,800",
      deliverables: ["Detailed instructions", "Tips and tricks", "Use case scenarios", "Troubleshooting common issues"],
    },
  ],
} as const;

export default function InfluencerDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen relative">
      {/* Background image as a div */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center -z-10"
        style={{ backgroundImage: "url('/images/adspace.png')" }}
        aria-hidden="true"
      />
      <div className="relative z-10 bg-black/50">
        <Navbar />
        <PageContainer>
          <div className="py-8">
            <div className="relative shrink-0 flex flex-col gap-8 py-20">
              <div className="flex items-start gap-8">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={influencer.avatar} alt={influencer.name} />
                  <AvatarFallback>{influencer.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <h1 className="text-4xl font-bold text-white">{influencer.name}</h1>
                    {influencer.verified && (
                      <Badge variant="secondary" className="bg-blue-500">
                        <ShieldCheck className="w-4 h-4 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-300 mt-2">{influencer.handle}</p>
                  <p className="text-gray-300 mt-4">{influencer.description}</p>
                  <div className="flex gap-4 mt-6">
                    <Button variant="outline" className="text-white">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Contact
                    </Button>
                    <Button variant="outline" className="text-white">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PageContainer>
        <Footer />
      </div>
    </div>
  );
}