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

// Dynamically import JobNotificationPopup to avoid SSR issues
const JobNotificationPopup = dynamic(
  () =>
    import("@/components/job-notification-popup").then((mod) => ({
      default: mod.JobNotificationPopup,
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

interface SearchSuggestion {
  id: string;
  search_term: string;
  search_type: string;
  display_name: string;
  search_value: string;
  search_count: number;
  click_count: number;
  display_order: number;
  is_featured: boolean;
}

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
  const [isSignUpForPostingJob, setIsSignUpForPostingJob] = useState(false);
  const [popularSearches, setPopularSearches] = useState<SearchSuggestion[]>(
    []
  );
  const [popularSearchesLoading, setPopularSearchesLoading] = useState(true);

  const [userCurrency, setUserCurrency] = useState<{
    code: string;
    symbol: string;
    rate: number;
  }>({ code: "USD", symbol: "$", rate: 1 });

  // Note: Role selection is now handled by the dashboard page, not the home page
  // When a user signs in with Google and doesn't have a role, they are redirected to /dashboard
  // The dashboard page will detect this and show the role selection modal

  // Track search in database
  const trackSearch = async (
    searchTerm: string,
    searchType: string,
    displayName: string,
    searchValue: string,
    incrementClick: boolean = false
  ) => {
    try {
      // Call the database function to increment search count
      const { error: searchError } = await supabase.rpc(
        "increment_search_suggestion",
        {
          p_search_term: searchTerm,
          p_search_type: searchType,
          p_display_name: displayName,
          p_search_value: searchValue,
        }
      );

      if (searchError) {
        console.error("Error tracking search:", searchError);
      }

      // If this is a click on a suggestion, also increment click_count
      if (incrementClick) {
        const { error: clickError } = await supabase.rpc(
          "increment_click_count",
          {
            p_search_term: searchTerm,
            p_search_type: searchType,
          }
        );

        if (clickError) {
          console.error("Error tracking click:", clickError);
        }
      }
    } catch (error) {
      console.error("Error tracking search:", error);
    }
  };

  // Fetch popular searches from database
  useEffect(() => {
    const fetchPopularSearches = async () => {
      try {
        setPopularSearchesLoading(true);
        console.log("Fetching popular searches from database...");
        const { data, error } = await supabase
          .from("search_suggestions")
          .select("*")
          .eq("is_active", true)
          .limit(20);

        if (error) {
          console.error("Error fetching popular searches:", error);
          console.error("Error details:", JSON.stringify(error, null, 2));
          setPopularSearchesLoading(false);
          return;
        }

        console.log("Popular searches fetched:", data);
        console.log("Number of suggestions:", data?.length || 0);

        if (data && data.length > 0) {
          // Sort client-side: featured first, then by display_order, then by search_count
          const sorted = [...data].sort((a, b) => {
            // Featured items first
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;

            // Then by display_order
            if (a.display_order !== b.display_order) {
              return a.display_order - b.display_order;
            }

            // Then by search_count (descending)
            return b.search_count - a.search_count;
          });

          setPopularSearches(sorted);
          console.log("Popular searches set:", sorted);
        } else {
          console.log("No popular searches found in database - using fallback");
        }
      } catch (error) {
        console.error("Error fetching popular searches:", error);
      } finally {
        setPopularSearchesLoading(false);
      }
    };

    fetchPopularSearches();
  }, []);

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

  // Handle category selection with tracking
  const handleCategoryClick = (
    category: string | null,
    suggestion?: SearchSuggestion
  ) => {
    setSelectedCategory(category === selectedCategory ? null : category);

    // Track the search if it's from a suggestion
    if (suggestion) {
      trackSearch(
        suggestion.search_term,
        suggestion.search_type,
        suggestion.display_name,
        suggestion.search_value,
        true // Increment click count
      );
    } else if (category) {
      // Track manual category selection
      const searchType =
        category === "job" ||
        category === "learnership" ||
        category === "internship" ||
        category === "bursary"
          ? "job_type"
          : "category";
      trackSearch(category, searchType, category, category, false);
    } else {
      // Track "All" selection
      trackSearch("All", "category", "All", "all", false);
    }
  };

  // Track search query when user types
  useEffect(() => {
    if (searchQuery.trim()) {
      // Debounce search tracking
      const timeoutId = setTimeout(() => {
        trackSearch(searchQuery, "keyword", searchQuery, searchQuery);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery]);

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
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        }}
        aria-hidden="true"
      />
      <Navbar />
      <main className="flex-1 relative z-10">
        <div className="relative pt-20 md:pt-32 pb-4 md:pb-8 flex-1 flex flex-col">
          <div className="py-1 md:py-2">
            <AnimatedContent>
              <div className="container-narrow relative z-10 py-1 md:py-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="max-w-4xl mx-auto text-center mb-4 md:mb-8 px-4"
                >
                  <h1 className="text-2xl sm:text-3xl md:text-6xl font-bold tracking-tight mb-3 md:mb-6 text-white flex flex-wrap justify-center items-baseline font-['Verdana',sans-serif] gap-1 md:gap-0">
                    <span className="text-yellow-400 font-['Verdana',sans-serif]">
                      The Revolutionary
                    </span>
                    <span className="text-[#9575ff] font-['Verdana',sans-serif] font-bold">
                      Career Opportunities
                    </span>
                    <span className="text-white/90 font-['Verdana',sans-serif] font-bold">
                      Platform
                    </span>
                  </h1>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="relative z-10 mb-6 md:mb-10"
                  >
                    <div className="bg-white rounded-xl md:rounded-2xl border-2 border-blue-200 px-4 py-4 md:px-6 md:py-6 max-w-2xl mx-auto shadow-lg">
                      <p className="text-sm sm:text-base md:text-xl text-gray-700 mb-4 md:mb-8 font-medium font-['Verdana',sans-serif] leading-relaxed">
                        Connect{" "}
                        <span className="text-gray-900 font-semibold font-['Verdana',sans-serif]">
                          Job Seekers
                        </span>{" "}
                        with{" "}
                        <span className="text-gray-900 font-semibold font-['Verdana',sans-serif]">
                          Top Companies
                        </span>{" "}
                        for{" "}
                        <span className="text-gray-900 font-semibold font-['Verdana',sans-serif]">
                          Jobs, Learnerships, Internships & Bursaries
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
                        <TabsList className="grid w-full grid-cols-2 mb-4 md:mb-6 bg-blue-50 border border-blue-200 p-1.5 rounded-lg gap-1">
                          <TabsTrigger
                            value="find-spaces"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700 rounded transition-all duration-300 font-['Verdana',sans-serif] font-medium text-xs sm:text-sm md:text-base py-1 md:py-1.5 w-full"
                          >
                            Find Jobs
                          </TabsTrigger>
                          <TabsTrigger
                            value="list-space"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-700 rounded transition-all duration-300 font-['Verdana',sans-serif] font-medium text-xs sm:text-sm md:text-base py-1 md:py-1.5 w-full"
                          >
                            Post a Job
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
                                <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 md:h-4 md:w-4 group-focus-within:text-blue-600 transition-colors" />
                                <Input
                                  type="text"
                                  placeholder="Search for jobs..."
                                  value={searchQuery}
                                  onChange={(e) =>
                                    setSearchQuery(e.target.value)
                                  }
                                  className="pl-8 md:pl-10 bg-white border-gray-300 focus-within:border-blue-500 text-gray-900 rounded-lg transition-all font-['Verdana',sans-serif] text-sm md:text-base h-9 md:h-10"
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
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-300 px-3 md:px-5 font-['Verdana',sans-serif] text-xs sm:text-sm h-9 md:h-10"
                                >
                                  Search
                                </Button>
                              </motion.div>
                            </div>

                            <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-3 md:mt-5 text-xs sm:text-sm">
                              <span className="text-gray-600 font-['Verdana',sans-serif] hidden sm:inline">
                                Popular:
                              </span>
                              <div className="flex flex-wrap gap-1.5 md:gap-3 items-center">
                                {popularSearches.length > 0 ? (
                                  popularSearches.map((suggestion) => {
                                    // Determine the category value based on search_type and search_value
                                    let categoryValue: string | null = null;
                                    if (suggestion.search_type === "job_type") {
                                      categoryValue = suggestion.search_value;
                                    } else if (
                                      suggestion.search_type === "category"
                                    ) {
                                      if (suggestion.search_value === "all") {
                                        categoryValue = null;
                                      } else {
                                        categoryValue = suggestion.search_value;
                                      }
                                    } else {
                                      categoryValue = suggestion.search_value;
                                    }

                                    const isSelected =
                                      selectedCategory === categoryValue;

                                    return (
                                      <button
                                        key={suggestion.id}
                                        onClick={() =>
                                          handleCategoryClick(
                                            categoryValue,
                                            suggestion
                                          )
                                        }
                                        className={`text-gray-700 hover:text-blue-600 transition-colors px-2 md:px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-xs md:text-sm ${
                                          isSelected
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                        }`}
                                      >
                                        {suggestion.display_name}
                                      </button>
                                    );
                                  })
                                ) : (
                                  // Fallback to default buttons if no suggestions loaded
                                  <>
                                    <button
                                      onClick={() => handleCategoryClick(null)}
                                      className={`text-gray-700 hover:text-blue-600 transition-colors px-2 md:px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-xs md:text-sm ${
                                        selectedCategory === null
                                          ? "bg-blue-600 text-white border-blue-600"
                                          : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                      }`}
                                    >
                                      All
                                    </button>
                                    <button
                                      onClick={() => handleCategoryClick("job")}
                                      className={`text-gray-700 hover:text-blue-600 transition-colors px-2 md:px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-xs md:text-sm ${
                                        selectedCategory === "job"
                                          ? "bg-blue-600 text-white border-blue-600"
                                          : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                      }`}
                                    >
                                      Jobs
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleCategoryClick("learnership")
                                      }
                                      className={`text-gray-700 hover:text-blue-600 transition-colors px-2 md:px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-xs md:text-sm ${
                                        selectedCategory === "learnership"
                                          ? "bg-blue-600 text-white border-blue-600"
                                          : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                      }`}
                                    >
                                      Learnerships
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleCategoryClick("internship")
                                      }
                                      className={`text-gray-700 hover:text-blue-600 transition-colors px-2 md:px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-xs md:text-sm ${
                                        selectedCategory === "internship"
                                          ? "bg-blue-600 text-white border-blue-600"
                                          : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                      }`}
                                    >
                                      Internships
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleCategoryClick("bursary")
                                      }
                                      className={`text-gray-700 hover:text-blue-600 transition-colors px-2 md:px-3 py-1 rounded-full border font-['Verdana',sans-serif] text-xs md:text-sm ${
                                        selectedCategory === "bursary"
                                          ? "bg-blue-600 text-white border-blue-600"
                                          : "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100"
                                      }`}
                                    >
                                      Bursaries
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        </TabsContent>

                        <TabsContent value="list-space">
                          <div className="text-center">
                            <p className="mb-3 md:mb-5 text-gray-700 font-medium font-['Verdana',sans-serif] text-xs md:text-base">
                              Post jobs, learnerships, internships, and
                              bursaries to find the best candidates
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
                                onClick={() => {
                                  setIsSignUpForPostingJob(true);
                                  setIsSignUpOpen(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-md md:rounded-lg shadow-md font-['Verdana',sans-serif] text-xs md:text-sm"
                              >
                                Get Started{" "}
                                <ArrowRight className="h-3 w-3 md:h-3 md:w-3" />
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
          </div>
        </div>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>

      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => {
          setIsSignUpOpen(false);
          setIsSignUpForPostingJob(false);
        }}
        isForPostingJob={isSignUpForPostingJob}
      />

      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSignUp={() => {
          setIsSignInOpen(false);
          setIsSignUpOpen(true);
        }}
      />

      {/* Job Notification Popup */}
      <JobNotificationPopup />
    </div>
  );
}
