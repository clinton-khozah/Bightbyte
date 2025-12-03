"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { 
  LayoutDashboard, 
  Users, 
  BarChart2, 
  Settings, 
  MessageSquare,
  DollarSign,
  Bell,
  Menu,
  X,
  MonitorPlay,
  PlusCircle,
  HelpCircle,
  LogOut,
  Calendar,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  ChevronDown,
  Megaphone,
  FileText,
  FolderOpen,
  ClipboardList,
  HardDrive,
  CheckCircle2
} from "lucide-react"
import clsx from "clsx"
import { supabase } from "@/lib/supabase"
import { UserProfilePopup } from "./user-profile-popup"
import { LogoutConfirmationModal } from "./logout-confirmation-modal"
import { MessagesModal } from "./messages-modal"
import dynamic from "next/dynamic"

// Dynamically import CreateSessionModal to avoid SSR issues for learners
const CreateSessionModal = dynamic(
  () => import("./create-session-modal").then((mod) => ({ default: mod.CreateSessionModal })),
  { ssr: false }
)

// Dynamically import MentorSettingsModal to avoid SSR issues for learners
const MentorSettingsModal = dynamic(
  () => import("./mentor-settings-modal").then((mod) => ({ default: mod.MentorSettingsModal })),
  { ssr: false }
)

interface SidebarLink {
  icon: any
  label: string
  href: string
}

// Dynamic links based on user type
const getMainLinks = (userType: string): SidebarLink[] => {
  if (userType === 'mentor' || userType === 'tutor') {
    return [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        href: "/dashboard"
      },
      {
        icon: Users,
        label: "My Sessions",
        href: "/dashboard/tutor/sessions"
      },
      {
        icon: Calendar,
        label: "Calendar",
        href: "/dashboard/tutor/calendar"
      },
      {
        icon: MessageSquare,
        label: "Messages",
        href: "/dashboard/tutor/messages"
      },
      {
        icon: BarChart2,
        label: "Earnings",
        href: "/dashboard/tutor/earnings"
      },
      {
        icon: Megaphone,
        label: "Advertising",
        href: "/dashboard/advertising"
      },
      {
        icon: FileText,
        label: "Reports",
        href: "/dashboard/advertising/reports"
      },
      {
        icon: FolderOpen,
        label: "Study Materials",
        href: "/dashboard/tutor/study-materials"
      },
      {
        icon: BookOpen,
        label: "Quizzes",
        href: "/dashboard/tutor/quizzes"
      },
      {
        icon: HardDrive,
        label: "Storage",
        href: "/dashboard/tutor/storage"
      }
    ]
  } else {
    // Student/Learner links
    return [
      {
        icon: LayoutDashboard,
        label: "Dashboard",
        href: "/dashboard/learner"
      },
      {
        icon: Calendar,
        label: "My Bookings",
        href: "/dashboard/learner/bookings"
      },
      {
        icon: Calendar,
        label: "Calendar",
        href: "/dashboard/learner/calendar"
      },
      {
        icon: Users,
        label: "Find Tutors",
        href: "/dashboard/learner/tutors"
      },
      {
        icon: MessageSquare,
        label: "Messages",
        href: "/dashboard/learner/messages"
      },
      {
        icon: BarChart2,
        label: "Progress",
        href: "/dashboard/learner/progress"
      },
      {
        icon: ClipboardList,
        label: "My Tasks",
        href: "/dashboard/learner/tasks"
      }
    ]
  }
}

const bottomLinks: SidebarLink[] = [
  {
    icon: Settings,
    label: "Settings",
    href: "/dashboard/advertiser/settings"
  },
  {
    icon: LogOut,
    label: "Logout",
    href: "/auth/logout"
  }
]

export function DashboardLayout({ 
  children,
  role 
}: { 
  children: React.ReactNode
  role?: string
}) {
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const pathname = usePathname()

  // Listen for custom event to open settings modal
  useEffect(() => {
    const handleOpenSettings = () => {
      setIsSettingsModalOpen(true)
    }
    
    window.addEventListener('openSettingsModal', handleOpenSettings)
    
    return () => {
      window.removeEventListener('openSettingsModal', handleOpenSettings)
    }
  }, [])

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Check if user is in mentors or students table
        // For mentors, use user_id column (UUID) to match Supabase Auth user.id
        const { data: mentorData, error: mentorError } = await supabase
          .from('mentors')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!mentorError && mentorData) {
          // Convert verified field to boolean if it's a string
          const verified = mentorData.is_verified === true || mentorData.is_verified === 'true' || mentorData.is_verified === 'pending' 
            ? (mentorData.is_verified === 'pending' ? 'pending' : true)
            : false
          
          // Parse JSON fields if they're strings
          let social_links = mentorData.social_links || {}
          if (typeof social_links === 'string') {
            try {
              social_links = JSON.parse(social_links)
            } catch {
              social_links = {}
            }
          }
          
          let settings = mentorData.settings || {}
          if (typeof settings === 'string') {
            try {
              settings = JSON.parse(settings)
            } catch {
              settings = {}
            }
          }
          
          // Parse languages and specialization if they're strings
          let languages_spoken = mentorData.languages || []
          if (typeof languages_spoken === 'string') {
            try {
              languages_spoken = JSON.parse(languages_spoken)
            } catch {
              languages_spoken = []
            }
          }
          if (!Array.isArray(languages_spoken)) {
            languages_spoken = []
          }
          
          // Determine user type from user metadata or default to 'mentor'
          // Check user metadata to see if they signed up as tutor, mentor, or other
          const userTypeFromMetadata = user.user_metadata?.user_type
          let userType = 'mentor' // default
          
          if (userTypeFromMetadata === 'tutor') {
            userType = 'tutor'
          } else if (userTypeFromMetadata === 'mentor') {
            userType = 'mentor'
          } else if (userTypeFromMetadata === 'user') {
            // If they signed up as 'user' or 'other', check their title to determine
            const titleLower = (mentorData.title || '').toLowerCase()
            if (titleLower.includes('tutor') || titleLower.includes('tutoring')) {
              userType = 'tutor'
            } else {
              userType = 'mentor'
            }
          }
          
          setUserData({ 
            ...mentorData, 
            id: mentorData.user_id || user.id, // Use user_id as the id for consistency
            mentor_db_id: mentorData.id, // Store the database ID for session creation
            full_name: mentorData.name, 
            user_type: userType,
            verified,
            social_links,
            settings,
            languages_spoken,
            avatar_url: mentorData.avatar || null,
            phone_number: mentorData.phone_number || null,
            country: mentorData.country || null,
            city: mentorData.city || null,
            bio: mentorData.description || null,
            title: mentorData.title,
            experience: mentorData.experience,
            hourly_rate: mentorData.hourly_rate,
            availability: mentorData.availability,
            specialization: mentorData.specialization,
            qualifications: mentorData.qualifications,
            website: mentorData.personal_website || null,
            created_at: mentorData.created_at || null,
            updated_at: mentorData.updated_at || null
          })
        } else {
          // Check students table
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('id', user.id)
            .single()

          if (studentError) throw studentError
          
          // Convert verified field to boolean if it's a string
          const verified = studentData.verified === true || studentData.verified === 'true' || studentData.verified === 'pending'
            ? (studentData.verified === 'pending' ? 'pending' : true)
            : false
          
          // Parse JSON fields if they're strings
          let social_links = studentData.social_links || {}
          if (typeof social_links === 'string') {
            try {
              social_links = JSON.parse(social_links)
            } catch {
              social_links = {}
            }
          }
          
          let settings = studentData.settings || {}
          if (typeof settings === 'string') {
            try {
              settings = JSON.parse(settings)
            } catch {
              settings = {}
            }
          }
          
          // Parse languages_spoken and interests if they're strings
          let languages_spoken = studentData.languages_spoken
          if (typeof languages_spoken === 'string') {
            try {
              languages_spoken = JSON.parse(languages_spoken)
            } catch {
              // If it's a string like "[]", try to clean it
              languages_spoken = languages_spoken.replace(/[\[\]"]/g, '') || null
            }
          }
          
          let interests = studentData.interests
          if (typeof interests === 'string') {
            try {
              interests = JSON.parse(interests)
            } catch {
              // If it's a string like "[]", try to clean it
              interests = interests.replace(/[\[\]"]/g, '') || null
            }
          }
          
          setUserData({ 
            ...studentData, 
            user_type: 'student',
            verified,
            social_links,
            settings,
            languages_spoken,
            interests
          })
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    fetchUserData()
  }, [])

  // Get the user type from role prop or userData
  const userType = role || userData?.user_type || 'student'
  const mainLinks = getMainLinks(userType)

  // Fetch notifications (sessions, ad payments, storage purchases from last 72 hours)
  useEffect(() => {
    if (!userData?.id && !userData?.mentor_db_id) {
      setNotifications([])
      return
    }

    const fetchNotifications = async () => {
      try {
        setNotificationsLoading(true)
        const now = new Date()
        const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000)
        const notificationsList: any[] = []

        // Fetch recent sessions (booked or requested)
        if (userData?.mentor_db_id || userData?.id) {
          const mentorId = userData.mentor_db_id || userData.id
          
          // Get sessions from last 72 hours
          const { data: recentSessions } = await supabase
            .from('sessions')
            .select('*')
            .eq('mentor_id', mentorId)
            .gte('created_at', seventyTwoHoursAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(20)

          if (recentSessions) {
            recentSessions.forEach((session: any) => {
              const sessionDate = new Date(session.created_at)
              const hoursAgo = Math.floor((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60))
              
              if (session.is_paid && session.learner_name && session.learner_name !== 'TBD') {
                notificationsList.push({
                  id: `session-${session.id}`,
                  type: 'session_booked',
                  title: 'Session Booked',
                  description: `${session.learner_name} booked "${session.topic}"`,
                  amount: session.amount,
                  timestamp: session.created_at,
                  hoursAgo,
                  icon: 'CheckCircle2',
                  color: 'text-green-600',
                  bgColor: 'bg-green-100'
                })
              } else if (!session.is_paid) {
                notificationsList.push({
                  id: `session-request-${session.id}`,
                  type: 'session_requested',
                  title: 'New Session Request',
                  description: `New session request: "${session.topic}"`,
                  timestamp: session.created_at,
                  hoursAgo,
                  icon: 'Calendar',
                  color: 'text-blue-600',
                  bgColor: 'bg-blue-100'
                })
              }
            })
          }

          // Fetch recent ad deposits (from last 72 hours)
          try {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/mentors/ads/deposits/${mentorId}/`)
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.deposits) {
                data.deposits.forEach((deposit: any) => {
                  const depositDate = new Date(deposit.created_at || deposit.deposited_at)
                  if (depositDate >= seventyTwoHoursAgo) {
                    const hoursAgo = Math.floor((now.getTime() - depositDate.getTime()) / (1000 * 60 * 60))
                    notificationsList.push({
                      id: `ad-deposit-${deposit.id}`,
                      type: 'ad_payment',
                      title: 'Ad Account Deposit',
                      description: `Added $${parseFloat(deposit.amount || 0).toFixed(2)} to ad account`,
                      amount: deposit.amount,
                      timestamp: deposit.created_at || deposit.deposited_at,
                      hoursAgo,
                      icon: 'Megaphone',
                      color: 'text-purple-600',
                      bgColor: 'bg-purple-100'
                    })
                  }
                })
              }
            }
          } catch (error) {
            console.error('Error fetching ad deposits:', error)
          }

          // Fetch recent storage purchases (from last 72 hours)
          const { data: storagePurchases } = await supabase
            .from('storage_purchases')
            .select('*')
            .eq('mentor_id', mentorId)
            .eq('payment_status', 'succeeded')
            .gte('created_at', seventyTwoHoursAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(10)

          if (storagePurchases) {
            storagePurchases.forEach((purchase: any) => {
              const purchaseDate = new Date(purchase.created_at)
              const hoursAgo = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60))
              notificationsList.push({
                id: `storage-${purchase.id}`,
                type: 'storage_purchase',
                title: 'Storage Upgrade',
                description: `Purchased ${purchase.storage_gb} GB storage`,
                amount: purchase.price_usd,
                timestamp: purchase.created_at,
                hoursAgo,
                icon: 'HardDrive',
                color: 'text-indigo-600',
                bgColor: 'bg-indigo-100'
              })
            })
          }
        }

        // Sort by timestamp (newest first)
        notificationsList.sort((a, b) => {
          const dateA = new Date(a.timestamp)
          const dateB = new Date(b.timestamp)
          return dateB.getTime() - dateA.getTime()
        })

        setNotifications(notificationsList)
      } catch (error) {
        console.error('Error fetching notifications:', error)
      } finally {
        setNotificationsLoading(false)
      }
    }

    fetchNotifications()
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => {
      clearInterval(interval)
    }
  }, [userData?.id, userData?.mentor_db_id])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={clsx(
        "bg-white border-r border-gray-200 transition-all duration-300 relative",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>

        <div className="flex flex-col h-full px-4 py-6">
          {/* Logo Section */}
          <div 
            className={clsx(
              "flex items-center justify-center mb-8 px-2",
              isSidebarCollapsed && "justify-center"
            )}
          >
            <div className="h-20 w-20 flex items-center justify-center flex-shrink-0">
              <Image
                src="/images/logo1.png"
                alt="Logo"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 space-y-1">
            {mainLinks.map((link) => {
              // Handle Messages button separately to open modal
              if (link.label === "Messages") {
                return (
                  <button
                    key={link.href}
                    onClick={() => setIsMessagesModalOpen(true)}
                    className={clsx(
                      "flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors group",
                      pathname === link.href
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                      isSidebarCollapsed && "justify-center"
                    )}
                    title={isSidebarCollapsed ? link.label : undefined}
                  >
                    <link.icon className={clsx("h-5 w-5 flex-shrink-0", !isSidebarCollapsed && "mr-3")} />
                    {!isSidebarCollapsed && <span>{link.label}</span>}
                  </button>
                )
              }
              
              // Regular links
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors group",
                    pathname === link.href
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                    isSidebarCollapsed && "justify-center"
                  )}
                  title={isSidebarCollapsed ? link.label : undefined}
                >
                  <link.icon className={clsx("h-5 w-5 flex-shrink-0", !isSidebarCollapsed && "mr-3")} />
                  {!isSidebarCollapsed && <span>{link.label}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Action Button - Different for different user types */}
          {!isSidebarCollapsed && (
            <div className="px-2 my-4">
              {userType === 'mentor' || userType === 'tutor' ? (
                <button 
                  onClick={() => setIsCreateSessionOpen(true)}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Create Session
                </button>
              ) : (
                <button className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-medium hover:bg-blue-700 transition-colors">
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Book a Session
                </button>
              )}
            </div>
          )}

          {/* Collapsed Action Button */}
          {isSidebarCollapsed && (
            <div className="px-2 my-4">
              <button 
                className="w-full p-2 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
                title={userType === 'mentor' || userType === 'tutor' ? 'Create Session' : 'Book a Session'}
              >
                <PlusCircle className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Bottom Navigation */}
          <nav className="space-y-1">
            {bottomLinks.map((link) => {
              // Handle logout button separately
              if (link.label === "Logout") {
                return (
                  <button
                    key={link.href}
                    onClick={() => setIsLogoutModalOpen(true)}
                    className={clsx(
                      "flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                      isSidebarCollapsed && "justify-center"
                    )}
                    title={isSidebarCollapsed ? link.label : undefined}
                  >
                    <link.icon className={clsx("h-5 w-5 flex-shrink-0", !isSidebarCollapsed && "mr-3")} />
                    {!isSidebarCollapsed && <span>{link.label}</span>}
                  </button>
                )
              }
              
              // Handle Settings button separately - open modal for mentors/tutors
              if (link.label === "Settings" && (userType === 'mentor' || userType === 'tutor')) {
                return (
                  <button
                    key={link.href}
                    onClick={() => setIsSettingsModalOpen(true)}
                    className={clsx(
                      "flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      pathname === link.href
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                      isSidebarCollapsed && "justify-center"
                    )}
                    title={isSidebarCollapsed ? link.label : undefined}
                  >
                    <link.icon className={clsx("h-5 w-5 flex-shrink-0", !isSidebarCollapsed && "mr-3")} />
                    {!isSidebarCollapsed && <span>{link.label}</span>}
                  </button>
                )
              }
              
              // Regular links
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    pathname === link.href
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-600",
                    isSidebarCollapsed && "justify-center"
                  )}
                  title={isSidebarCollapsed ? link.label : undefined}
                >
                  <link.icon className={clsx("h-5 w-5 flex-shrink-0", !isSidebarCollapsed && "mr-3")} />
                  {!isSidebarCollapsed && <span>{link.label}</span>}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50 flex flex-col">
        {/* Top Header with User Info */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 hover:border-gray-300"
            aria-label="Toggle sidebar"
          >
            {isSidebarCollapsed ? (
              <Menu className="h-6 w-6 text-gray-600" />
            ) : (
              <X className="h-6 w-6 text-gray-600" />
            )}
          </button>
          
          <div className="flex items-center gap-3">
            {/* Messages and Notifications Icons */}
            <div className="flex items-center gap-2">
              {/* Messages Icon */}
              <button
                onClick={() => setIsMessagesModalOpen(true)}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 hover:border-blue-400 group"
                aria-label="Messages"
              >
                <MessageSquare className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
              </button>
              
              {/* Notifications Icon */}
              <button
                onClick={() => setIsNotificationsOpen(true)}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 hover:border-orange-400 group"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-gray-600 group-hover:text-orange-600 transition-colors" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>
            </div>
            
            {/* User Profile */}
            <div 
              className="flex items-center gap-4 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-xl px-5 py-3 transition-all duration-200 border border-gray-200 hover:border-blue-400 hover:shadow-md group"
              onClick={() => setIsProfileOpen(true)}
            >
              <div className="text-right">
                <h2 className="font-semibold text-base bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-purple-700 transition-colors">
                  {userData?.full_name || 'User'}
                </h2>
                <p className="text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-purple-600 transition-colors">
                  {userData?.user_type === 'tutor' 
                    ? 'Tutor' 
                    : userData?.user_type === 'mentor' 
                    ? 'Mentor' 
                    : userData?.user_type === 'student'
                    ? 'Student'
                    : 'User'}
                </p>
              </div>
              <div className="relative flex items-center gap-2">
                {userData?.avatar_url ? (
                  <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-blue-200 shadow-sm group-hover:border-blue-400 transition-colors">
                    <img
                      src={userData.avatar_url}
                      alt={userData.full_name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-blue-200 shadow-sm group-hover:border-blue-400 transition-colors">
                    <UserCircle className="h-8 w-8 text-white" />
                  </div>
                )}
                <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>

      {/* User Profile Popup */}
      <UserProfilePopup
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userData={userData}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />

      {/* Messages Modal */}
      {userData && (
        <MessagesModal
          isOpen={isMessagesModalOpen}
          onClose={() => setIsMessagesModalOpen(false)}
          userType={userType}
          userId={userData.id}
          userData={userData}
        />
      )}

      {/* Notifications Dropdown */}
      {isNotificationsOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsNotificationsOpen(false)}
          />
          {/* Notifications Panel */}
          <div className="fixed top-16 right-6 w-[500px] max-h-[700px] bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Notifications</h3>
                <p className="text-sm text-gray-600">Last 72 hours</p>
              </div>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[650px]">
              {notificationsLoading ? (
                <div className="p-10 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-base text-gray-600">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  <Bell className="h-16 w-16 text-gray-300 mx-auto mb-3" />
                  <p className="text-base">No new notifications</p>
                  <p className="text-sm mt-2">You'll see updates here when they arrive</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notif) => {
                    const IconComponent = 
                      notif.icon === 'CheckCircle2' ? CheckCircle2 :
                      notif.icon === 'Calendar' ? Calendar :
                      notif.icon === 'Megaphone' ? Megaphone :
                      notif.icon === 'HardDrive' ? HardDrive :
                      Bell
                    
                    const timeAgo = notif.hoursAgo < 1 
                      ? 'Just now' 
                      : notif.hoursAgo === 1 
                      ? '1 hour ago' 
                      : notif.hoursAgo < 24
                      ? `${notif.hoursAgo} hours ago`
                      : `${Math.floor(notif.hoursAgo / 24)} day${Math.floor(notif.hoursAgo / 24) > 1 ? 's' : ''} ago`

                    return (
                      <div
                        key={notif.id}
                        className="p-5 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => {
                          // Navigate based on notification type
                          if (notif.type === 'session_booked' || notif.type === 'session_requested') {
                            window.location.href = '/dashboard/tutor/sessions'
                          } else if (notif.type === 'ad_payment') {
                            window.location.href = '/dashboard/advertising/reports'
                          } else if (notif.type === 'storage_purchase') {
                            window.location.href = '/dashboard/tutor/storage'
                          }
                          setIsNotificationsOpen(false)
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`flex-shrink-0 h-12 w-12 rounded-full ${notif.bgColor} flex items-center justify-center`}>
                            <IconComponent className={`h-6 w-6 ${notif.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold text-gray-900">{notif.title}</p>
                            <p className="text-sm text-gray-600 mt-1.5">{notif.description}</p>
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-sm text-gray-500">{timeAgo}</span>
                              {notif.amount && (
                                <span className="text-sm font-semibold text-gray-900">
                                  ${parseFloat(notif.amount || 0).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Create Session Modal */}
      {userData && (userType === 'mentor' || userType === 'tutor') && (
        <CreateSessionModal
          isOpen={isCreateSessionOpen}
          onClose={() => setIsCreateSessionOpen(false)}
          mentorId={userData.mentor_db_id || userData.id || ''}
          onSuccess={() => {
            // Optionally refresh data or show success message
            window.location.reload()
          }}
        />
      )}

      {/* Settings Modal for Mentors/Tutors */}
      {(userType === 'mentor' || userType === 'tutor') && userData && (
        <MentorSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          userData={userData}
          onUpdate={() => {
            // Refresh user data after settings update
            const fetchUserData = async () => {
              try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: mentorData } = await supabase
                  .from('mentors')
                  .select('*')
                  .eq('user_id', user.id)
                  .maybeSingle()

                if (mentorData) {
                  // Process mentor data similar to initial fetch
                  let social_links = mentorData.social_links || {}
                  if (typeof social_links === 'string') {
                    try {
                      social_links = JSON.parse(social_links)
                    } catch {
                      social_links = {}
                    }
                  }
                  
                  let settings = mentorData.settings || {}
                  if (typeof settings === 'string') {
                    try {
                      settings = JSON.parse(settings)
                    } catch {
                      settings = {}
                    }
                  }

                  let languages = mentorData.languages || []
                  if (typeof languages === 'string') {
                    try {
                      languages = JSON.parse(languages)
                    } catch {
                      languages = []
                    }
                  }

                  let specialization = mentorData.specialization || []
                  if (typeof specialization === 'string') {
                    try {
                      specialization = JSON.parse(specialization)
                    } catch {
                      specialization = []
                    }
                  }

                  setUserData({
                    ...mentorData,
                    id: mentorData.user_id || user.id,
                    mentor_db_id: mentorData.id,
                    full_name: mentorData.name,
                    avatar_url: mentorData.avatar || null,
                    bio: mentorData.description || null,
                    user_type: userType,
                    verified: mentorData.is_verified === true || mentorData.is_verified === 'true',
                    social_links,
                    settings,
                    languages_spoken: languages,
                    phone_number: mentorData.phone_number || null,
                    country: mentorData.country || null,
                    city: mentorData.city || null,
                    title: mentorData.title,
                    experience: mentorData.experience,
                    hourly_rate: mentorData.hourly_rate,
                    availability: mentorData.availability,
                    specialization: specialization,
                    qualifications: mentorData.qualifications,
                  })
                }
              } catch (error) {
                console.error('Error refreshing user data:', error)
              }
            }
            fetchUserData()
          }}
        />
      )}
    </div>
  )
} 