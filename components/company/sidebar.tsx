"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboard,
  Target,
  BarChart3,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  Building2,
  Mail,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar-client"

const companyRoutes = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/company",
    variant: "default",
  },
  {
    title: "Campaigns",
    icon: Target,
    href: "/company/campaigns",
    variant: "ghost",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/company/analytics",
    variant: "ghost",
  },
  {
    title: "Influencers",
    icon: Users,
    href: "/company/influencers",
    variant: "ghost",
  },
  {
    title: "Messages",
    icon: Mail,
    href: "/company/messages",
    variant: "ghost",
  },
]

export function CompanySidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden md:flex flex-col border-r border-purple-800/50 w-64 h-screen bg-gradient-to-br from-[#140047] via-[#140047] to-[#32147f] z-0">
      <div className="p-4 border-b border-purple-800/50">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="/placeholder.svg" alt="Company" />
            <AvatarFallback>
              <Building2 className="h-6 w-6 text-purple-400" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-white">TechCorp Inc.</h2>
            <p className="text-sm text-purple-200/70">Technology & Software</p>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-3 py-4">
          <div className="space-y-1 py-2">
            {companyRoutes.map((route) => (
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
              <Link href="/company/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start text-purple-200/70 hover:text-white" asChild>
              <Link href="/company/help">
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