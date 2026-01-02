"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar-client";
import {
  Star,
  Users,
  DollarSign,
  Heart,
  Share2,
  Video,
  Clock,
  Globe,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { LoadingLogo } from "@/components/loading-logo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { SignUpModal } from "@/components/auth/sign-up-modal";

interface Session {
  id: string;
  title: string;
  host: {
    name: string;
    avatar: string;
    rating: number;
    reviews: number;
    verified: boolean;
    expertise: string;
  };
  description: string;
  price: number;
  currency: string;
  duration: string;
  date: string;
  time: string;
  timezone: string;
  participants: number;
  maxParticipants: number;
  subject: string;
  level: string;
  language: string;
  location: string;
  postedAt?: string;
}

// Live session data (fallback)
const liveSessionsFallback: Session[] = [
  {
    id: 1,
    title: "Advanced Mathematics Masterclass",
    host: {
      name: "John Smith",
      avatar: "/placeholder.svg?height=100&width=100",
      rating: 4.9,
      reviews: 87,
      verified: true,
      expertise: "Mathematics & Statistics",
    },
    description:
      "Master advanced calculus, linear algebra, and mathematical proofs in this comprehensive session.",
    price: 187.5,
    currency: "R",
    duration: "90 minutes",
    date: "2025-01-20",
    time: "14:00",
    timezone: "GMT+2",
    participants: 15,
    maxParticipants: 30,
    subject: "Mathematics",
    level: "Advanced",
    language: "English",
    location: "Global",
  },
  {
    id: 2,
    title: "Finance & Investment Strategies",
    host: {
      name: "Emma Johnson",
      avatar: "/placeholder.svg?height=100&width=100",
      rating: 4.8,
      reviews: 65,
      verified: true,
      expertise: "Finance & Investing",
    },
    description:
      "Learn investment strategies, portfolio management, and financial planning from an expert.",
    price: 147.0,
    currency: "R",
    duration: "60 minutes",
    date: "2025-01-21",
    time: "10:00",
    timezone: "GMT+2",
    participants: 12,
    maxParticipants: 25,
    subject: "Finance",
    level: "Intermediate",
    language: "English",
    location: "Global",
  },
  {
    id: 3,
    title: "Health & Fitness Transformation",
    host: {
      name: "David Chen",
      avatar: "/placeholder.svg?height=100&width=100",
      rating: 4.7,
      reviews: 92,
      verified: true,
      expertise: "Health & Fitness",
    },
    description:
      "Transform your health with personalized fitness plans, nutrition guidance, and wellness strategies.",
    price: 228.0,
    currency: "R",
    duration: "75 minutes",
    date: "2025-01-22",
    time: "18:00",
    timezone: "GMT+2",
    participants: 18,
    maxParticipants: 35,
    subject: "Health & Fitness",
    level: "All Levels",
    language: "English",
    location: "Global",
  },
  {
    id: 4,
    title: "E-commerce Business Mastery",
    host: {
      name: "Sarah Wilson",
      avatar: "/placeholder.svg?height=100&width=100",
      rating: 4.9,
      reviews: 78,
      verified: true,
      expertise: "E-commerce & Retail",
    },
    description:
      "Build and scale your e-commerce business with proven strategies and expert insights.",
    price: 277.5,
    currency: "R",
    duration: "120 minutes",
    date: "2025-01-23",
    time: "15:30",
    timezone: "GMT+2",
    participants: 22,
    maxParticipants: 40,
    subject: "Business",
    level: "Intermediate",
    language: "English",
    location: "Global",
  },
  {
    id: 5,
    title: "Tech Innovation & Development",
    host: {
      name: "Michael Brown",
      avatar: "/placeholder.svg?height=100&width=100",
      rating: 4.8,
      reviews: 103,
      verified: true,
      expertise: "Tech & Gadgets",
    },
    description:
      "Explore the latest in technology, software development, and innovation trends.",
    price: 222.0,
    currency: "R",
    duration: "90 minutes",
    date: "2025-01-24",
    time: "11:00",
    timezone: "GMT+2",
    participants: 19,
    maxParticipants: 30,
    subject: "Technology",
    level: "Advanced",
    language: "English",
    location: "Global",
  },
  {
    id: 6,
    title: "Beauty & Fashion Styling",
    host: {
      name: "Lisa Anderson",
      avatar: "/placeholder.svg?height=100&width=100",
      rating: 4.9,
      reviews: 156,
      verified: true,
      expertise: "Beauty & Fashion",
    },
    description:
      "Learn professional styling techniques, beauty tips, and fashion trends from industry experts.",
    price: 319.5,
    currency: "R",
    duration: "60 minutes",
    date: "2025-01-25",
    time: "16:00",
    timezone: "GMT+2",
    participants: 25,
    maxParticipants: 50,
    subject: "Beauty & Fashion",
    level: "All Levels",
    language: "English",
    location: "Global",
  },
];

export default function LiveSessionsPage() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [liveSessions, setLiveSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const cardsPerView = 3;

  // Fetch sessions from database
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split("T")[0];

        console.log("Fetching public sessions, today:", today);

        // Fetch ALL scheduled sessions first (we'll filter client-side for private field)
        // Try with mentor join first
        let allSessionsData: any[] = [];
        let allError: any = null;

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
          // Fallback: fetch sessions without mentor join
          const { data: sessionsOnly, error: sessionsError } = await supabase
            .from("sessions")
            .select("*")
            .eq("status", "scheduled")
            .order("date", { ascending: true })
            .order("time", { ascending: true });

          if (sessionsError) {
            allError = sessionsError;
          } else {
            allSessionsData = sessionsOnly || [];
            // Fetch mentors separately
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
          }
        } else {
          allSessionsData = sessionsWithMentors || [];
        }

        console.log(
          "All sessions fetched:",
          allSessionsData?.length || 0,
          allSessionsData
        );

        if (allError) {
          console.error("Error fetching sessions:", allError);
          setLiveSessions([]);
          setLoading(false);
          return;
        }

        // Filter for public sessions (private = false or 'false' or null)
        // Show all public sessions regardless of date for now
        const sessionsData = (allSessionsData || []).filter((session: any) => {
          const isPrivate = session.private;
          // Check for boolean false, string 'false', null, or undefined
          const isPublic =
            isPrivate === false ||
            isPrivate === "false" ||
            String(isPrivate).toLowerCase() === "false" ||
            isPrivate === null ||
            isPrivate === undefined;

          console.log(
            `Session ${session.id} (${
              session.topic
            }): private=${isPrivate} (type: ${typeof isPrivate}), isPublic=${isPublic}, date=${
              session.date
            }`
          );

          return isPublic;
        });

        console.log(
          "Filtered public sessions:",
          sessionsData.length,
          sessionsData
        );

        const error = null;

        if (error) {
          console.error("Error fetching sessions:", error);
          setLiveSessions([]);
        } else if (sessionsData) {
          // Map database sessions to component format
          const mappedSessions: Session[] = sessionsData.map((session: any) => {
            const mentor = session.mentors || {};

            // Parse specialization
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

            // Format duration
            const durationMinutes = session.duration || 60;
            const duration = `${durationMinutes} minutes`;

            // Format date and time
            const sessionDate = new Date(`${session.date}T${session.time}`);
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const timezoneOffset = sessionDate.getTimezoneOffset();
            const timezoneString = `GMT${
              timezoneOffset > 0 ? "-" : "+"
            }${Math.abs(timezoneOffset / 60)}`;

            return {
              id: session.id,
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
              participants: 0, // This would need to be calculated from bookings
              maxParticipants: 30, // Default, could be added to sessions table
              subject:
                specializations.length > 0 ? specializations[0] : "General",
              level: "All Levels", // Could be added to sessions table
              language: "English", // Could be added to sessions table
              location: mentor.country || "Global",
              postedAt: session.created_at || session.updated_at || null,
            };
          });

          setLiveSessions(mappedSessions);
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
        setLiveSessions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const filteredSessions = liveSessions.filter(
    (session) =>
      session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.host.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Carousel navigation
  const maxIndex = Math.max(0, filteredSessions.length - cardsPerView);

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < maxIndex;

  // Get visible sessions based on current index
  const visibleSessions = filteredSessions.slice(
    currentIndex,
    currentIndex + cardsPerView
  );

  // Reset to first card when search changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [searchQuery]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });
  };

  const handleJoinSession = (session: Session) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  const handleJoinSessionNow = () => {
    setIsModalOpen(false);
    setIsSignInOpen(true);
  };

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
          backgroundPosition: "center",
          zIndex: 0,
        }}
        aria-hidden="true"
      />
      <Navbar />
      <main className="flex-1 relative z-10 flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="container py-12 max-w-7xl mx-auto px-4">
          <div className="text-center py-5 mb-8 mt-16">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Live Sessions Available
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Join live sessions with expert mentors from around the world
            </p>
            <div className="max-w-2xl mx-auto mb-8">
              <Input
                type="search"
                placeholder="Search sessions by title, host, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <LoadingLogo size={32} />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white text-lg">
                No public sessions available at the moment.
              </p>
            </div>
          ) : (
            <div className="relative flex items-center gap-4 max-w-7xl mx-auto">
              {/* Left Arrow */}
              {canGoPrevious && (
                <button
                  onClick={handlePrevious}
                  className="flex-shrink-0 bg-white rounded-full p-3 shadow-lg border border-gray-200 hover:bg-gray-50 transition-all hover:scale-110 z-10"
                  aria-label="Previous sessions"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>
              )}

              <div className="flex-1 overflow-hidden relative">
                <motion.div
                  className="flex gap-6"
                  animate={{
                    x: `-${currentIndex * (100 / cardsPerView)}%`,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8,
                  }}
                >
                  {filteredSessions.map((session, index) => (
                    <div
                      key={session.id}
                      className="flex-shrink-0"
                      style={{
                        width: `calc((100% - ${
                          (cardsPerView - 1) * 1.5
                        }rem) / ${cardsPerView})`,
                      }}
                    >
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full min-w-[300px] max-w-[360px] mx-auto h-auto min-h-[420px] rounded-xl border-2 border-blue-200 shadow-lg p-4 flex flex-col justify-between transition-all duration-300 group hover:shadow-xl hover:border-blue-400 bg-white text-gray-900"
                      >
                        {/* Header: Avatar, Name, Verified */}
                        <div className="flex items-start gap-3 mb-3 w-full">
                          <Avatar className="h-16 w-16 flex-shrink-0 rounded-full border-2 border-blue-300 shadow-md ring-2 ring-blue-100 overflow-hidden">
                            <AvatarImage
                              src={session.host.avatar}
                              alt={session.host.name}
                              className="object-cover w-full h-full rounded-full"
                            />
                            <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-semibold text-sm rounded-full flex items-center justify-center">
                              {session.host.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-gray-900 text-xs leading-tight">
                                Hosted by {session.host.name}
                              </span>
                              {session.host.verified && (
                                <Badge className="px-1.5 py-0.5 text-[10px] rounded-full bg-green-100 text-green-700 font-medium border border-green-200">
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-[10px] text-gray-600">
                                {session.host.rating.toFixed(1)} (
                                {session.host.reviews} reviews)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Session Title */}
                        <h3 className="font-bold text-sm text-gray-900 mb-1.5 text-left line-clamp-1">
                          {session.title}
                        </h3>

                        {/* Description */}
                        <p className="text-gray-700 text-[11px] mb-2.5 text-left line-clamp-2 leading-snug">
                          {session.description}
                        </p>

                        {/* Session Details */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2.5 text-[11px] text-gray-700 mb-2.5 w-full space-y-1.5 border border-blue-200">
                          {session.postedAt && (
                            <div className="flex items-center gap-1.5 pb-1.5 border-b border-blue-200">
                              <Clock className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
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
                          <div className="flex items-start gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 leading-tight">
                              <span className="font-semibold text-gray-900">
                                Date:{" "}
                              </span>
                              <span>
                                {new Date(session.date).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}{" "}
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
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                            <div>
                              <span className="font-semibold text-gray-900">
                                Duration:{" "}
                              </span>
                              <span>{session.duration}</span>
                            </div>
                            <span className="text-gray-400">•</span>
                            <Users className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                            <div>
                              <span className="font-semibold text-gray-900">
                                Participants:{" "}
                              </span>
                              <span>
                                {session.participants}/{session.maxParticipants}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                            <div>
                              <span className="font-semibold text-gray-900">
                                Location:{" "}
                              </span>
                              <span>{session.location}</span>
                            </div>
                          </div>
                        </div>

                        {/* Tags and Price in same row */}
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex flex-wrap gap-1">
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-700 border border-blue-300 px-1.5 py-0.5 text-[9px] font-medium"
                            >
                              {session.subject}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="bg-purple-100 text-purple-700 border border-purple-300 px-1.5 py-0.5 text-[9px] font-medium"
                            >
                              {session.level}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              {session.currency}
                              {session.price.toFixed(2)}
                            </div>
                            <div className="text-[9px] text-gray-600">
                              to join
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-auto w-full">
                          <Button
                            variant="outline"
                            size="icon"
                            className="flex-shrink-0 h-9 w-9 hover:bg-red-50 text-gray-500 hover:text-red-500 border-gray-300"
                            onClick={() => toggleFavorite(session.id)}
                          >
                            <Heart
                              className={`h-4 w-4 ${
                                favorites.has(session.id)
                                  ? "fill-red-500 text-red-500"
                                  : ""
                              }`}
                            />
                          </Button>
                          <Button
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 text-sm shadow-md hover:shadow-lg transition-all"
                            onClick={() => handleJoinSession(session)}
                          >
                            <Video className="h-4 w-4 mr-1.5" />
                            Join Session
                          </Button>
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right Arrow */}
              {canGoNext && (
                <button
                  onClick={handleNext}
                  className="flex-shrink-0 bg-white rounded-full p-3 shadow-lg border border-gray-200 hover:bg-gray-50 transition-all hover:scale-110 z-10"
                  aria-label="Next sessions"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700" />
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-full max-w-2xl bg-white text-gray-700">
          {selectedSession && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-blue-200">
                    <AvatarImage
                      src={selectedSession.host.avatar}
                      alt={selectedSession.host.name}
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {selectedSession.host.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-2xl flex items-center gap-2 text-gray-800">
                      {selectedSession.title}
                    </DialogTitle>
                    <p className="text-gray-500">
                      Hosted by {selectedSession.host.name}
                    </p>
                    {selectedSession.host.verified && (
                      <Badge className="mt-1 bg-green-100 text-green-700 border border-green-200">
                        Verified Host
                      </Badge>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">
                      Session Details
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-lg space-y-3 border border-blue-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="font-medium text-gray-700">
                            {new Date(selectedSession.date).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(
                              `2000-01-01T${selectedSession.time}`
                            ).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}{" "}
                            ({selectedSession.timezone})
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="font-medium text-gray-700">
                            Duration
                          </div>
                          <div className="text-sm text-gray-500">
                            {selectedSession.duration}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="font-medium text-gray-700">
                            Participants
                          </div>
                          <div className="text-sm text-gray-500">
                            {selectedSession.participants}/
                            {selectedSession.maxParticipants} joined
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="font-medium text-gray-700">
                            Location
                          </div>
                          <div className="text-sm text-gray-500">
                            {selectedSession.location}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">
                      About This Session
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {selectedSession.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">
                      Host Information
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-lg space-y-3 border border-blue-100">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-blue-200">
                          <AvatarImage
                            src={selectedSession.host.avatar}
                            alt={selectedSession.host.name}
                          />
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {selectedSession.host.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-gray-800">
                            {selectedSession.host.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {selectedSession.host.expertise}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium text-gray-700">
                          {selectedSession.host.rating.toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({selectedSession.host.reviews} reviews)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">
                      Session Information
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-lg space-y-2 border border-blue-100">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Subject</span>
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-700 border border-blue-200"
                        >
                          {selectedSession.subject}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Level</span>
                        <Badge
                          variant="secondary"
                          className="bg-purple-100 text-purple-700 border border-purple-200"
                        >
                          {selectedSession.level}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Language</span>
                        <span className="font-medium text-gray-700">
                          {selectedSession.language}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {selectedSession.currency}
                      {selectedSession.price.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Price to join this session
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Close
                </Button>
                <Button
                  onClick={handleJoinSessionNow}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Session Now
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Sign In Modal */}
      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSignUp={() => {
          setIsSignInOpen(false);
          setIsSignUpOpen(true);
        }}
      />

      {/* Sign Up Modal */}
      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
      />

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
