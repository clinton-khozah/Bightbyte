"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  BarChart3,
  Bell,
  CreditCard,
  Globe,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PlusCircle,
  Settings,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar-client"

const advertiserRoutes = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    variant: "default",
  },
  {
    title: "Ad Spaces",
    icon: Globe,
    href: "/dashboard/ad-spaces",
    variant: "ghost",
  },
  {
    title: "Requests",
    icon: Bell,
    href: "/dashboard/requests",
    variant: "ghost",
  },
  {
    title: "Messages",
    icon: MessageSquare,
    href: "/dashboard/messages",
    variant: "ghost",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/dashboard/analytics",
    variant: "ghost",
  },
  {
    title: "Earnings",
    icon: CreditCard,
    href: "/dashboard/earnings",
    variant: "ghost",
  },
]

const buyerRoutes = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    variant: "default",
  },
  {
    title: "Browse Ad Spaces",
    icon: Globe,
    href: "/ad-spaces",
    variant: "ghost",
  },
  {
    title: "My Campaigns",
    icon: BarChart3,
    href: "/dashboard/campaigns",
    variant: "ghost",
  },
  {
    title: "Messages",
    icon: MessageSquare,
    href: "/dashboard/messages",
    variant: "ghost",
  },
  {
    title: "Billing",
    icon: CreditCard,
    href: "/dashboard/billing",
    variant: "ghost",
  },
]

export function Sidebar() {
  const pathname = usePathname()
  // For demo purposes, we'll assume the user is an advertiser
  const routes = advertiserRoutes

  return (
    <div className="hidden md:flex flex-col border-r border-purple-800/50 w-64 h-screen bg-gradient-to-br from-[#140047] via-[#140047] to-[#32147f] z-0">
      <div className="p-4 border-b border-purple-800/50">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="/placeholder.svg" alt="Profile" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-white">John Doe</h2>
            <p className="text-sm text-purple-200/70">Premium Advertiser</p>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-3 py-4">
          <div className="space-y-1 py-2">
            {routes.map((route) => (
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
            <Button variant="outline" size="sm" className="w-full justify-start text-purple-200/70 hover:text-white border-purple-800/50" asChild>
              <Link href="/dashboard/ad-spaces/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Ad Space
              </Link>
            </Button>
          </div>
          <Separator className="my-3 bg-purple-800/50" />
          <div className="space-y-1 py-2">
            <Button variant="ghost" size="sm" className="w-full justify-start text-purple-200/70 hover:text-white" asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-purple-200/70 hover:text-white" asChild>
              <Link href="/dashboard/help">
                <Users className="mr-2 h-4 w-4" />
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

