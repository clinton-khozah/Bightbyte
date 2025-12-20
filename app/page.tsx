"use client";

import { HowItWorks } from "@/components/how-it-works";
import { FeaturedSpaces } from "@/components/featured-spaces";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { AnimatedContent } from "@/components/animated-content";
import { PageContainer } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs-client";
import {
  ArrowRight,
  Search,
  Instagram,
  Youtube,
  Twitter,
  Star,
  Users,
  Video,
  Clock,
  Globe,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CustomCursor } from "@/components/custom-cursor";
import { useState, useEffect, useCallback } from "react";
import * as React from "react";
import { Hero } from "@/components/hero";
import { CTA } from "@/components/cta";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SignUpModal } from "@/components/auth/sign-up-modal";
import { SignInModal } from "@/components/auth/sign-in-modal";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { LoadingLogo } from "@/components/loading-logo";

// Dynamically import TutorRequestPopup to avoid SSR issues
const TutorRequestPopup = dynamic(
  () =>
    import("@/components/tutor-request-popup").then((mod) => ({
      default: mod.TutorRequestPopup,
    })),
  { ssr: false }
);
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar-client";

// Currency conversion map (USD to local currency)
const currencyMap: {
  [key: string]: { code: string; symbol: string; rate: number };
} = {
  ZA: { code: "ZAR", symbol: "R", rate: 17.5 }, // South Africa
  US: { code: "USD", symbol: "$", rate: 1 },
  GB: { code: "GBP", symbol: "£", rate: 0.79 },
  EU: { code: "EUR", symbol: "€", rate: 0.92 },
  NG: { code: "NGN", symbol: "₦", rate: 1500 },
  KE: { code: "KES", symbol: "KSh", rate: 130 },
  GH: { code: "GHS", symbol: "GH₵", rate: 12 },
  EG: { code: "EGP", symbol: "E£", rate: 30 },
  AU: { code: "AUD", symbol: "A$", rate: 1.5 },
  CA: { code: "CAD", symbol: "C$", rate: 1.35 },
  IN: { code: "INR", symbol: "₹", rate: 83 },
  BR: { code: "BRL", symbol: "R$", rate: 5 },
  MX: { code: "MXN", symbol: "$", rate: 17 },
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [favoriteAdSpaces, setFavoriteAdSpaces] = useState<Set<number>>(
    new Set()
  );
  const [selectedAdSpace, setSelectedAdSpace] = useState<number | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  // Live sessions state
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsCurrentIndex, setSessionsCurrentIndex] = useState(0);
  const sessionsCardsPerView = 3;
  const [userCurrency, setUserCurrency] = useState<{
    code: string;
    symbol: string;
    rate: number;
  }>({ code: "USD", symbol: "$", rate: 1 });

  // Note: Role selection is now handled by the dashboard page, not the home page
  // When a user signs in with Google and doesn't have a role, they are redirected to /dashboard
  // The dashboard page will detect this and show the role selection modal

  // Detect user location and set currency
  useEffect(() => {
    const detectUserLocation = async () => {
      try {
        // Try to get location from IP
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          const countryCode = data.country_code;

          if (countryCode && currencyMap[countryCode]) {
            setUserCurrency(currencyMap[countryCode]);
          } else {
            // Try to get from browser locale
            const locale = navigator.language || "en-US";
            const region = locale.split("-")[1];
            if (region && currencyMap[region]) {
              setUserCurrency(currencyMap[region]);
            }
          }
        }
      } catch (error) {
        console.error("Error detecting location:", error);
        // Try browser locale as fallback
        try {
          const locale = navigator.language || "en-US";
          const region = locale.split("-")[1];
          if (region && currencyMap[region]) {
            setUserCurrency(currencyMap[region]);
          }
        } catch (e) {
          // Keep default USD
        }
      }
    };

    detectUserLocation();
  }, []);

  // Fetch live public sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setSessionsLoading(true);

        const { data: sessionsWithMentors, error: mentorsError } =
          await supabase
            .from("sessions")
            .select(
              `
            *,
            mentors (
              id,
              name,
              avatar,
              title,
              rating,
              total_reviews,
              is_verified,
              specialization,
              country
            )
          `
            )
            .eq("status", "scheduled")
            .order("date", { ascending: true })
            .order("time", { ascending: true });

        if (mentorsError) {
          console.error("Error fetching sessions with mentors:", mentorsError);
          const { data: sessionsOnly, error: sessionsError } = await supabase
            .from("sessions")
            .select("*")
            .eq("status", "scheduled")
            .order("date", { ascending: true })
            .order("time", { ascending: true });

          if (sessionsError) {
            console.error("Error fetching sessions:", sessionsError);
            setLiveSessions([]);
          } else {
            const allSessionsData = sessionsOnly || [];
            for (const session of allSessionsData) {
              if (session.mentor_id) {
                const mentorId =
                  typeof session.mentor_id === "string"
                    ? parseInt(session.mentor_id)
                    : session.mentor_id;

                const { data: mentorData } = await supabase
                  .from("mentors")
                  .select(
                    "id, name, avatar, title, rating, total_reviews, is_verified, specialization, country"
                  )
                  .eq("id", mentorId)
                  .maybeSingle();
                session.mentors = mentorData;
              }
            }

            const sessionsData = allSessionsData.filter((session: any) => {
              const isPrivate = session.private;
              const isPublic =
                isPrivate === false ||
                isPrivate === "false" ||
                String(isPrivate).toLowerCase() === "false" ||
                isPrivate === null ||
                isPrivate === undefined;
              return isPublic;
            });

            const mappedSessions = sessionsData.map((session: any) => {
              const mentor = session.mentors || {};

              let specializations: string[] = [];
              if (Array.isArray(mentor.specialization)) {
                specializations = mentor.specialization;
              } else if (typeof mentor.specialization === "string") {
                try {
                  specializations = JSON.parse(mentor.specialization || "[]");
                } catch {
                  specializations = [];
                }
              }

              const durationMinutes = session.duration || 60;
              const duration = `${durationMinutes} minutes`;

              const sessionDate = new Date(`${session.date}T${session.time}`);
              const timezoneOffset = sessionDate.getTimezoneOffset();
              const timezoneString = `GMT${
                timezoneOffset > 0 ? "-" : "+"
              }${Math.abs(timezoneOffset / 60)}`;

              return {
                id: session.id,
                mentor_id: session.mentor_id, // Store mentor_id for booking
                title: session.topic || "Untitled Session",
                host: {
                  name: mentor.name || "Unknown Mentor",
                  avatar:
                    mentor.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      mentor.name || "Mentor"
                    )}&background=3B82F6&color=fff&size=128`,
                  rating: parseFloat(mentor.rating) || 4.0,
                  reviews: mentor.total_reviews || 0,
                  verified: mentor.is_verified || false,
                  expertise:
                    specializations.length > 0
                      ? specializations[0]
                      : mentor.title || "General",
                },
                description:
                  session.notes ||
                  session.topic ||
                  "Join this live session to learn and grow.",
                price: parseFloat(session.amount) || 0,
                currency: "R",
                duration: duration,
                date: session.date,
                time: session.time,
                timezone: timezoneString,
                participants: 0,
                maxParticipants: 30,
                subject:
                  specializations.length > 0 ? specializations[0] : "General",
                level: "All Levels",
                language: "English",
                location: mentor.country || "Global",
                postedAt: session.created_at || session.updated_at || null,
              };
            });

            // Filter out past sessions
            const now = new Date();
            const upcomingSessions = mappedSessions.filter((session: any) => {
              const sessionDateTime = new Date(
                `${session.date}T${session.time}`
              );
              return sessionDateTime > now;
            });

            setLiveSessions(upcomingSessions);
          }
        } else {
          const allSessionsData = sessionsWithMentors || [];
          const sessionsData = allSessionsData.filter((session: any) => {
            const isPrivate = session.private;
            const isPublic =
              isPrivate === false ||
              isPrivate === "false" ||
              String(isPrivate).toLowerCase() === "false" ||
              isPrivate === null ||
              isPrivate === undefined;
            return isPublic;
          });

          const mappedSessions = sessionsData.map((session: any) => {
            const mentor = session.mentors || {};

            let specializations: string[] = [];
            if (Array.isArray(mentor.specialization)) {
              specializations = mentor.specialization;
            } else if (typeof mentor.specialization === "string") {
              try {
                specializations = JSON.parse(mentor.specialization || "[]");
              } catch {
                specializations = [];
              }
            }

            const durationMinutes = session.duration || 60;
            const duration = `${durationMinutes} minutes`;

            const sessionDate = new Date(`${session.date}T${session.time}`);
            const timezoneOffset = sessionDate.getTimezoneOffset();
            const timezoneString = `GMT${
              timezoneOffset > 0 ? "-" : "+"
            }${Math.abs(timezoneOffset / 60)}`;

            return {
              id: session.id,
              mentor_id: session.mentor_id, // Store mentor_id for booking
              title: session.topic || "Untitled Session",
              host: {
                name: mentor.name || "Unknown Mentor",
                avatar:
                  mentor.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    mentor.name || "Mentor"
                  )}&background=3B82F6&color=fff&size=128`,
                rating: parseFloat(mentor.rating) || 4.0,
                reviews: mentor.total_reviews || 0,
                verified: mentor.is_verified || false,
                expertise:
                  specializations.length > 0
                    ? specializations[0]
                    : mentor.title || "General",
              },
              description:
                session.notes ||
                session.topic ||
                "Join this live session to learn and grow.",
              price: parseFloat(session.amount) || 0,
              currency: "R",
              duration: duration,
              date: session.date,
              time: session.time,
              timezone: timezoneString,
              participants: 0,
              maxParticipants: 30,
              subject:
                specializations.length > 0 ? specializations[0] : "General",
              level: "All Levels",
              language: "English",
              location: mentor.country || "Global",
              postedAt: session.created_at || session.updated_at || null,
            };
          });

          // Filter out past sessions
          const now = new Date();
          const upcomingSessions = mappedSessions.filter((session: any) => {
            const sessionDateTime = new Date(`${session.date}T${session.time}`);
            return sessionDateTime > now;
          });

          setLiveSessions(upcomingSessions);
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
        setLiveSessions([]);
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  // Sessions carousel navigation
  const sessionsMaxIndex = Math.max(
    0,
    liveSessions.length - sessionsCardsPerView
  );

  const handleSessionsPrevious = () => {
    setSessionsCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSessionsNext = () => {
    setSessionsCurrentIndex((prev) => Math.min(sessionsMaxIndex, prev + 1));
  };

  const canGoSessionsPrevious = sessionsCurrentIndex > 0;
  const canGoSessionsNext = sessionsCurrentIndex < sessionsMaxIndex;

  return (
    <div className="min-h-screen flex flex-col">
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: "url('/images/adspace.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 0,
        }}
        aria-hidden="true"
      />
      <Navbar />
      <main className="flex-1 relative z-10">
        <div className="relative pt-32 pb-8 flex-1 flex flex-col">
          <div className="py-2">
            <AnimatedContent>
              <div className="container-narrow relative z-10 py-2 md:py-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="max-w-4xl mx-auto text-center mb-8"
                >
                  <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-white flex flex-wrap justify-center items-baseline font-['Verdana',sans-serif]">
                    <span className="text-yellow-400 font-['Verdana',sans-serif]">
                      The Revolutionary
                    </span>
                    &nbsp;
                    <span className="text-[#9575ff] font-['Verdana',sans-serif] font-bold">
                      Online Learning
                    </span>
                    &nbsp;
                    <span className="text-white/90 font-['Verdana',sans-serif] font-bold">
                      Network
                    </span>
                  </h1>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="relative z-10 mb-10"
                  >
                    <div className="bg-white rounded-2xl border-2 border-blue-200 px-6 py-6 max-w-2xl mx-auto shadow-lg">
                      <p className="text-lg md:text-xl text-gray-700 mb-8 font-medium font-['Verdana',sans-serif] leading-relaxed">
                        Connect{" "}
                        <span className="text-gray-900 font-semibold font-['Verdana',sans-serif]">
                          Students
                        </span>{" "}
                        with{" "}
                        <span className="text-gray-900 font-semibold font-['Verdana',sans-serif]">
                          Expert Tutors
                        </span>{" "}
                        and{" "}
                        <span className="text-gray-900 font-semibold font-['Verdana',sans-serif]">
                          Mentors
                        </span>{" "}
                        through our{" "}
                        <span className="relative inline-block font-['Verdana',sans-serif] text-blue-600">
                          innovative
                          <motion.span
                            className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400"
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ delay: 0.8, duration: 0.6 }}
                          />
                        </span>{" "}
                        platform{" "}
                        <span className="text-blue-600 font-bold font-['Verdana',sans-serif]">
                          BrightByt
                        </span>
                        .
                      </p>

                      <Tabs defaultValue="find-spaces" className="relative">
                        <TabsList className="grid w-full grid-cols-2 mb-6 bg-blue-50 border border-blue-200 p-1 rounded-lg">
                          <TabsTrigger
                            value="find-spaces"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700 rounded-md transition-all duration-300 font-['Verdana',sans-serif] font-medium"
                          >
                            Find Tutors
                          </TabsTrigger>
                          <TabsTrigger
                            value="list-space"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700 rounded-md transition-all duration-300 font-['Verdana',sans-serif] font-medium"
                          >
                            Become a Tutor
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="find-spaces">
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="relative"
                          >
                            <div className="flex w-full items-center space-x-2">
                              <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-blue-600 transition-colors" />
                                <Input
                                  type="text"
                                  placeholder="Search for tutors, mentors, or subjects..."
                                  value={searchQuery}
                                  onChange={(e) =>
                                    setSearchQuery(e.target.value)
                                  }
                                  className="pl-10 bg-white border-gray-300 focus-within:border-blue-500 text-gray-900 rounded-lg transition-all font-['Verdana',sans-serif]"
                                />
                              </div>
                              <motion.div
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 10,
                                }}
                              >
                                <Button
                                  type="button"
                                  onClick={() => setSearchQuery("")}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-300 px-5 font-['Verdana',sans-serif]"
                                >
                                  Search
                                </Button>
                              </motion.div>
                            </div>

                            <div className="flex flex-wrap justify-center gap-3 mt-5 text-sm">
                              <span className="text-gray-600 font-['Verdana',sans-serif]">
                                Popular:
                              </span>
                              <div className="flex flex-wrap gap-3 items-center">
                                <button
                                  onClick={() => setSelectedCategory(null)}
                                  className={`text-gray-700 hover:text-blue-600 transition-colors px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-sm ${
                                    selectedCategory === null
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                  }`}
                                >
                                  All
                                </button>
                                <button
                                  onClick={() =>
                                    setSelectedCategory(
                                      selectedCategory === "Mathematics"
                                        ? null
                                        : "Mathematics"
                                    )
                                  }
                                  className={`text-gray-700 hover:text-blue-600 transition-colors px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-sm ${
                                    selectedCategory === "Mathematics"
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                  }`}
                                >
                                  Mathematics
                                </button>
                                <button
                                  onClick={() =>
                                    setSelectedCategory(
                                      selectedCategory === "Science"
                                        ? null
                                        : "Science"
                                    )
                                  }
                                  className={`text-gray-700 hover:text-blue-600 transition-colors px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-sm ${
                                    selectedCategory === "Science"
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                  }`}
                                >
                                  Science
                                </button>
                                <button
                                  onClick={() =>
                                    setSelectedCategory(
                                      selectedCategory === "Programming"
                                        ? null
                                        : "Programming"
                                    )
                                  }
                                  className={`text-gray-700 hover:text-blue-600 transition-colors px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-sm ${
                                    selectedCategory === "Programming"
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                  }`}
                                >
                                  Programming
                                </button>
                                <button
                                  onClick={() =>
                                    setSelectedCategory(
                                      selectedCategory === "Languages"
                                        ? null
                                        : "Languages"
                                    )
                                  }
                                  className={`text-gray-700 hover:text-blue-600 transition-colors px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-sm ${
                                    selectedCategory === "Languages"
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                  }`}
                                >
                                  Languages
                                </button>
                                <button
                                  onClick={() =>
                                    setSelectedCategory(
                                      selectedCategory === "Physical Science"
                                        ? null
                                        : "Physical Science"
                                    )
                                  }
                                  className={`text-gray-700 hover:text-blue-600 transition-colors px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-sm ${
                                    selectedCategory === "Physical Science"
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                  }`}
                                >
                                  Physical Science
                                </button>
                                <button
                                  onClick={() =>
                                    setSelectedCategory(
                                      selectedCategory === "Geography"
                                        ? null
                                        : "Geography"
                                    )
                                  }
                                  className={`text-gray-700 hover:text-blue-600 transition-colors px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-sm ${
                                    selectedCategory === "Geography"
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                  }`}
                                >
                                  Geography
                                </button>
                                <button
                                  onClick={() =>
                                    setSelectedCategory(
                                      selectedCategory ===
                                        "Computer Engineering"
                                        ? null
                                        : "Computer Engineering"
                                    )
                                  }
                                  className={`text-gray-700 hover:text-blue-600 transition-colors px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-sm ${
                                    selectedCategory === "Computer Engineering"
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                  }`}
                                >
                                  Computer Engineering
                                </button>
                                <button
                                  onClick={() =>
                                    setSelectedCategory(
                                      selectedCategory ===
                                        "Artificial Intelligence"
                                        ? null
                                        : "Artificial Intelligence"
                                    )
                                  }
                                  className={`text-gray-700 hover:text-blue-600 transition-colors px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-sm ${
                                    selectedCategory ===
                                    "Artificial Intelligence"
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                  }`}
                                >
                                  Artificial Intelligence
                                </button>
                                <button
                                  onClick={() =>
                                    setSelectedCategory(
                                      selectedCategory === "Life Science"
                                        ? null
                                        : "Life Science"
                                    )
                                  }
                                  className={`text-gray-700 hover:text-blue-600 transition-colors px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-sm ${
                                    selectedCategory === "Life Science"
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                  }`}
                                >
                                  Life Science
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        </TabsContent>

                        <TabsContent value="list-space">
                          <div className="text-center">
                            <p className="mb-5 text-gray-700 font-medium font-['Verdana',sans-serif]">
                              Start teaching and helping students today
                            </p>
                            <motion.div
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 10,
                              }}
                            >
                              <Button
                                onClick={() => setIsSignUpOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2 px-4 py-2 rounded-lg shadow-md font-['Verdana',sans-serif] text-sm"
                              >
                                Get Started <ArrowRight className="h-3 w-3" />
                              </Button>
                            </motion.div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </AnimatedContent>

            <AnimatedContent className="pb-0">
              <HowItWorks
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
              />
            </AnimatedContent>

            {/* Live Public Sessions Section */}
            <AnimatedContent className="pb-0">
              <div className="container py-12 max-w-7xl mx-auto px-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="text-center mb-8"
                >
                  <h2 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-4 font-['Verdana',sans-serif] drop-shadow-lg">
                    Upcoming Public Class, Join and Learn with Our Tutors
                  </h2>
                  <p className="text-lg md:text-xl text-gray-200 font-['Verdana',sans-serif] drop-shadow-md max-w-3xl mx-auto">
                    Discover exciting learning opportunities! Click "Join
                    Session" to participate in live classes taught by our expert
                    tutors.
                  </p>
                </motion.div>

                {sessionsLoading ? (
                  <div className="flex justify-center items-center py-20">
                    <LoadingLogo size={32} />
                  </div>
                ) : liveSessions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-white text-lg font-['Verdana',sans-serif]">
                      No public sessions available at the moment.
                    </p>
                  </div>
                ) : (
                  <div className="relative flex items-center gap-4 max-w-7xl mx-auto">
                    {/* Left Arrow */}
                    {liveSessions.length > sessionsCardsPerView && (
                      <button
                        onClick={handleSessionsPrevious}
                        disabled={!canGoSessionsPrevious}
                        className={`flex-shrink-0 bg-white rounded-full p-3 shadow-lg border border-gray-200 transition-all hover:scale-110 z-50 ${
                          canGoSessionsPrevious
                            ? "hover:bg-gray-50 cursor-pointer opacity-100"
                            : "opacity-30 cursor-not-allowed"
                        }`}
                        aria-label="Previous sessions"
                      >
                        <ChevronLeft className="w-6 h-6 text-gray-700" />
                      </button>
                    )}

                    <div className="flex-1 overflow-hidden relative">
                      <motion.div
                        className="flex gap-12"
                        animate={{
                          x: `-${
                            sessionsCurrentIndex * (100 / sessionsCardsPerView)
                          }%`,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                          mass: 0.8,
                        }}
                      >
                        {liveSessions.map((session) => (
                          <div
                            key={session.id}
                            className="flex-shrink-0"
                            style={{
                              width: `calc((100% - ${
                                (sessionsCardsPerView - 1) * 3
                              }rem) / ${sessionsCardsPerView})`,
                            }}
                          >
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5 }}
                              className="w-full min-w-[380px] max-w-[450px] mx-auto h-auto min-h-[520px] rounded-xl border-2 border-blue-200 shadow-lg p-6 flex flex-col justify-between transition-all duration-300 group hover:shadow-xl hover:border-blue-400 bg-white text-gray-900"
                            >
                              {/* Header: Avatar, Name, Verified */}
                              <div className="flex items-start gap-4 mb-4 w-full">
                                <Avatar className="h-20 w-20 flex-shrink-0 rounded-full border-2 border-blue-300 shadow-md ring-2 ring-blue-100 overflow-hidden">
                                  <AvatarImage
                                    src={session.host.avatar}
                                    alt={session.host.name}
                                    className="object-cover w-full h-full rounded-full"
                                  />
                                  <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-semibold text-base rounded-full flex items-center justify-center">
                                    {session.host.name
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-gray-900 text-sm leading-tight">
                                      Will be hosted by {session.host.name}
                                    </span>
                                    {session.host.verified && (
                                      <Badge className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium border border-green-200">
                                        Verified
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="text-xs text-gray-600">
                                      {session.host.rating.toFixed(1)} (
                                      {session.host.reviews} reviews)
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Session Title */}
                              <h3 className="font-bold text-base text-gray-900 mb-2 text-left line-clamp-1">
                                {session.title}
                              </h3>

                              {/* Description */}
                              <p className="text-gray-700 text-sm mb-3 text-left line-clamp-2 leading-snug">
                                {session.description}
                              </p>

                              {/* Session Details */}
                              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3.5 text-sm text-gray-700 mb-3 w-full space-y-2 border border-blue-200">
                                {session.postedAt && (
                                  <div className="flex items-center gap-2 pb-2 border-b border-blue-200">
                                    <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                    <div>
                                      <span className="font-semibold text-gray-900">
                                        Posted:{" "}
                                      </span>
                                      <span>
                                        {new Date(
                                          session.postedAt
                                        ).toLocaleDateString("en-US", {
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                        })}{" "}
                                        at{" "}
                                        {new Date(
                                          session.postedAt
                                        ).toLocaleTimeString("en-US", {
                                          hour: "numeric",
                                          minute: "2-digit",
                                          hour12: true,
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-start gap-2">
                                  <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 leading-tight">
                                    <span className="font-semibold text-gray-900">
                                      Date:{" "}
                                    </span>
                                    <span>
                                      {new Date(
                                        session.date
                                      ).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })}{" "}
                                      at{" "}
                                      {new Date(
                                        `2000-01-01T${session.time}`
                                      ).toLocaleTimeString("en-US", {
                                        hour: "numeric",
                                        minute: "2-digit",
                                        hour12: true,
                                      })}{" "}
                                      ({session.timezone})
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  <div>
                                    <span className="font-semibold text-gray-900">
                                      Duration:{" "}
                                    </span>
                                    <span>{session.duration}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  <div>
                                    <span className="font-semibold text-gray-900">
                                      Location:{" "}
                                    </span>
                                    <span>Online</span>
                                  </div>
                                </div>
                              </div>

                              {/* Tags and Price in same row */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex flex-wrap gap-1.5">
                                  <Badge
                                    variant="secondary"
                                    className="bg-blue-100 text-blue-700 border border-blue-300 px-2 py-1 text-xs font-medium"
                                  >
                                    {session.subject}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="bg-purple-100 text-purple-700 border border-purple-300 px-2 py-1 text-xs font-medium"
                                  >
                                    {session.level}
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-gray-900">
                                    {userCurrency.symbol}
                                    {(
                                      session.price * userCurrency.rate
                                    ).toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    to join
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2 mt-auto w-full">
                                <Button
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-base shadow-md hover:shadow-lg transition-all"
                                  onClick={async () => {
                                    // Check if user is authenticated
                                    const {
                                      data: { user },
                                    } = await supabase.auth.getUser();

                                    // Get mentor ID from session
                                    let mentorId = null;
                                    if (session.mentor_id) {
                                      mentorId =
                                        typeof session.mentor_id === "string"
                                          ? parseInt(session.mentor_id)
                                          : session.mentor_id;
                                    }

                                    if (user && mentorId) {
                                      // User is authenticated, store both mentor ID and session ID
                                      localStorage.setItem(
                                        "tutorToBookId",
                                        mentorId.toString()
                                      );
                                      localStorage.setItem(
                                        "sessionToBookId",
                                        session.id.toString()
                                      );
                                      window.location.href =
                                        "/dashboard/learner";
                                    } else if (mentorId) {
                                      // User not authenticated, store both mentor ID and session ID
                                      localStorage.setItem(
                                        "tutorToBookId",
                                        mentorId.toString()
                                      );
                                      localStorage.setItem(
                                        "sessionToBookId",
                                        session.id.toString()
                                      );
                                      setIsSignInOpen(true);
                                    } else {
                                      // No mentor ID, just open sign-in modal
                                      setIsSignInOpen(true);
                                    }
                                  }}
                                >
                                  <Video className="h-5 w-5 mr-2" />
                                  Join Session
                                </Button>
                              </div>
                            </motion.div>
                          </div>
                        ))}
                      </motion.div>
                    </div>

                    {/* Right Arrow */}
                    {liveSessions.length > sessionsCardsPerView && (
                      <button
                        onClick={handleSessionsNext}
                        disabled={!canGoSessionsNext}
                        className={`flex-shrink-0 bg-white rounded-full p-3 shadow-lg border border-gray-200 transition-all hover:scale-110 z-50 ${
                          canGoSessionsNext
                            ? "hover:bg-gray-50 cursor-pointer opacity-100"
                            : "opacity-30 cursor-not-allowed"
                        }`}
                        aria-label="Next sessions"
                      >
                        <ChevronRight className="w-6 h-6 text-gray-700" />
                      </button>
                    )}
                  </div>
                )}

                {/* Browse Live Sessions Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="text-center mt-8"
                >
                  <a
                    href="/sessions"
                    className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 font-['Verdana',sans-serif] text-lg"
                  >
                    Browse Live Sessions
                    <ChevronRight className="w-5 h-5" />
                  </a>
                </motion.div>
              </div>
            </AnimatedContent>
          </div>
        </div>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>

      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
      />

      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSignUp={() => {
          setIsSignInOpen(false);
          setIsSignUpOpen(true);
        }}
      />

      <TutorRequestPopup
        onRequestSubmitted={() => {
          setIsSignInOpen(true);
        }}
      />
    </div>
  );
}
