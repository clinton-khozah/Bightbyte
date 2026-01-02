"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar-client";
import {
  Calendar,
  Eye,
  User,
  Building2,
  Image as ImageIcon,
  ArrowRight,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LoadingLogo } from "@/components/loading-logo";
import Image from "next/image";
import { motion } from "framer-motion";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
  expires_at: string;
  views: number;
  recruiter_id: string;
  company_id?: string;
  company_name?: string;
  recruiter_name?: string;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch active news that hasn't expired
      const { data: newsData, error: newsError } = await supabase
        .from("news")
        .select("*")
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (newsError) throw newsError;

      // Fetch company names for news items
      const newsWithDetails = await Promise.all(
        (newsData || []).map(async (item) => {
          let companyName = null;
          let recruiterName = null;

          // Try to get company name
          if (item.company_id) {
            const { data: companyData } = await supabase
              .from("companies")
              .select("company_name, name")
              .eq("id", item.company_id)
              .maybeSingle();

            if (companyData) {
              companyName = companyData.company_name || companyData.name;
            }
          }

          // Try to get recruiter name from mentors table
          const { data: mentorData } = await supabase
            .from("mentors")
            .select("name")
            .eq("id", item.recruiter_id)
            .maybeSingle();

          if (mentorData) {
            recruiterName = mentorData.name;
          }

          return {
            ...item,
            company_name: companyName,
            recruiter_name: recruiterName,
          };
        })
      );

      setNews(newsWithDetails);
    } catch (err: any) {
      console.error("Error fetching news:", err);
      setError(err.message || "Failed to load news");
    } finally {
      setLoading(false);
    }
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffInMs = expires.getTime() - now.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    return diffInDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingLogo size={32} />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      <Navbar />
      <div className="flex-grow container mx-auto px-4 pt-20 md:pt-32 pb-12 md:pb-20 max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 font-['Verdana',sans-serif]">
            News and Opportunities
          </h1>
          <p className="text-sm md:text-base text-gray-600 font-['Verdana',sans-serif]">
            Stay updated with the latest news and opportunities from our
            recruiters
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {news.length === 0 ? (
          <Card className="bg-white border-2 border-blue-200">
            <CardContent className="p-8 text-center">
              <p className="text-gray-600 text-lg">
                No news available at the moment.
              </p>
              <p className="text-gray-500 mt-2">
                Check back later for updates!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item, index) => {
              const daysRemaining = getDaysRemaining(item.expires_at);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="bg-white border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all h-full flex flex-col overflow-hidden">
                    {item.image_url && (
                      <div className="relative w-full h-56 md:h-64 overflow-hidden">
                        <Image
                          src={item.image_url}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          priority={index < 3}
                        />
                      </div>
                    )}
                    <CardContent className="p-4 md:p-6 flex flex-col flex-grow">
                      <div className="flex items-start justify-between mb-3">
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                          {daysRemaining > 0
                            ? `${daysRemaining} days left`
                            : daysRemaining === 0
                            ? "0 days left"
                            : `${Math.abs(daysRemaining)} days expired`}
                        </Badge>
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                          <Eye className="w-3 h-3" />
                          <span>{item.views || 0}</span>
                        </div>
                      </div>

                      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2 font-['Verdana',sans-serif] line-clamp-2">
                        {item.title}
                      </h2>

                      <p className="text-gray-700 text-sm mb-4 flex-grow line-clamp-4 font-['Verdana',sans-serif]">
                        {item.content}
                      </p>

                      <div className="mt-auto pt-4 border-t border-gray-200 space-y-3">
                        <Button
                          onClick={() => {
                            setSelectedNews(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
                        >
                          Learn More
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>{getRelativeTime(item.created_at)}</span>
                        </div>
                        {item.company_name && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Building2 className="w-3 h-3" />
                            <span>{item.company_name}</span>
                          </div>
                        )}
                        {item.recruiter_name && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <User className="w-3 h-3" />
                            <span>{item.recruiter_name}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />

      {/* News Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-bold">
              {selectedNews?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedNews && (
            <div className="space-y-4">
              {selectedNews.image_url && (
                <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden">
                  <Image
                    src={selectedNews.image_url}
                    alt={selectedNews.title}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-600 pb-4 border-b">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{getRelativeTime(selectedNews.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{selectedNews.views || 0} views</span>
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  {(() => {
                    const days = getDaysRemaining(selectedNews.expires_at);
                    return days > 0
                      ? `${days} days left`
                      : days === 0
                      ? "0 days left"
                      : `${Math.abs(days)} days expired`;
                  })()}
                </Badge>
              </div>
              {selectedNews.company_name && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="w-4 h-4" />
                  <span className="font-semibold">{selectedNews.company_name}</span>
                </div>
              )}
              {selectedNews.recruiter_name && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{selectedNews.recruiter_name}</span>
                </div>
              )}
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-['Verdana',sans-serif]">
                  {selectedNews.content}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
