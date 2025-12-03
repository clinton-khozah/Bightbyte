"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboard,
  DollarSign,
  BarChart3,
  Users2,
  Settings,
  LogOut,
  UserCircle,
  HelpCircle,
  Target,
  MessageSquare,
  Heart,
  Briefcase,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar-client"

const influencerRoutes = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/influencer",
    variant: "default",
  },
  {
    title: "My Earnings",
    icon: DollarSign,
    href: "/influencer/earnings",
    variant: "ghost",
  },
  {
    title: "Performance",
    icon: BarChart3,
    href: "/influencer/performance",
    variant: "ghost",
  },
  {
    title: "My Audience",
    icon: Users2,
    href: "/influencer/audience",
    variant: "ghost",
  },
  {
    title: "Active Campaigns",
    icon: Target,
    href: "/influencer/active-campaigns",
    variant: "ghost",
  },
  {
    title: "Brand Offers",
    icon: Briefcase,
    href: "/influencer/brand-offers",
    variant: "ghost",
  },
  {
    title: "Engagement",
    icon: Heart,
    href: "/influencer/engagement",
    variant: "ghost",
  },
  {
    title: "Messages",
    icon: MessageSquare,
    href: "/influencer/messages",
    variant: "ghost",
  },
]

export function InfluencerSidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden md:flex flex-col border-r border-purple-800/50 w-64 h-screen bg-gradient-to-br from-[#140047] via-[#140047] to-[#32147f] z-0">
      <div className="p-4 border-b border-purple-800/50">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="/placeholder.svg" alt="Influencer" />
            <AvatarFallback>
              <UserCircle className="h-6 w-6 text-purple-400" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-white">Sarah Johnson</h2>
            <p className="text-sm text-purple-200/70">Lifestyle Influencer</p>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-3 py-4">
          <div className="space-y-1 py-2">
            {influencerRoutes.map((route) => (
              <Button
                key={route.href}
                variant={pathname === route.href ? "secondary" : "ghost"}
                size="sm"
                className={cn("w-full justify-start text-purple-200/70 hover:text-white", {
                  "bg-purple-800/30 text-white": pathname === route.href,
                })}
                asChild
              >
                <Link href={route.href}>
                  <route.icon className="mr-2 h-4 w-4" />
                  {route.title}
                </Link>
              </Button>
            ))}
          </div>
          <Separator className="my-3 bg-purple-800/50" />
          <div className="space-y-1 py-2">
            <Button variant="ghost" size="sm" className="w-full justify-start text-purple-200/70 hover:text-white" asChild>
              <Link href="/influencer/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-purple-200/70 hover:text-white" asChild>
              <Link href="/influencer/help">
                <HelpCircle className="mr-2 h-4 w-4" />
                Help & Support
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-purple-200/70 hover:text-white" 
              asChild
            >
              <Link href="/auth/logout">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Link>
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
} 