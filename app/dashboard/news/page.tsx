"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateNewsModal } from "@/components/dashboard/create-news-modal";
import { supabase } from "@/lib/supabase";
import { LoadingLogo } from "@/components/loading-logo";
import { Newspaper, Plus, Eye, Calendar, Trash2, Edit } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
  expires_at: string;
  views: number;
  recruiter_id: string;
  is_active: boolean;
}

export default function NewsManagementPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchAuthUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setAuthUserId(user.id);
          // Check if user is clintonkhozah@gmail.com
          if (user.email?.toLowerCase() !== "clintonkhozah@gmail.com") {
            router.push("/dashboard");
            return;
          }

          // Fetch company data if available
          const { data: companyData } = await supabase
            .from("companies")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (companyData) {
            setCompanyId(companyData.id.toString());
          }
        } else {
          router.push("/");
        }
      } catch (error) {
        console.error("Error fetching auth user:", error);
        router.push("/");
      }
    };

    fetchAuthUser();
  }, [router]);

  useEffect(() => {
    if (authUserId) {
      fetchNews();
    }
  }, [authUserId]);

  const fetchNews = async () => {
    if (!authUserId) return;

    try {
      setLoading(true);
      const { data: newsData, error: newsError } = await supabase
        .from("news")
        .select("*")
        .eq("recruiter_id", authUserId)
        .order("created_at", { ascending: false });

      if (newsError) throw newsError;

      setNews(newsData || []);
    } catch (error: any) {
      console.error("Error fetching news:", error);
      toast.error(
        "Failed to fetch news: " + (error.message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  const extractFilePathFromUrl = (url: string): string | null => {
    try {
      // Extract path from public URL
      // URL format: https://{project}.supabase.co/storage/v1/object/public/course-media/news/{recruiterId}/{fileName}
      const match = url.match(/\/course-media\/(.+)$/);
      if (match && match[1]) {
        return match[1];
      }
      return null;
    } catch (error) {
      console.error("Error extracting file path:", error);
      return null;
    }
  };

  const deleteImageFromStorage = async (imageUrl: string): Promise<void> => {
    try {
      const filePath = extractFilePathFromUrl(imageUrl);
      if (!filePath) {
        console.warn("Could not extract file path from URL:", imageUrl);
        return;
      }

      const { error } = await supabase.storage
        .from("course-media")
        .remove([filePath]);

      if (error) {
        console.error("Error deleting image from storage:", error);
        // Don't throw - continue with news deletion even if image deletion fails
      } else {
        console.log("Image deleted from storage:", filePath);
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      // Don't throw - continue with news deletion
    }
  };

  const handleDelete = async (newsId: string, imageUrl?: string) => {
    if (!confirm("Are you sure you want to delete this news post?")) return;

    try {
      // Delete image from storage first if it exists
      if (imageUrl) {
        await deleteImageFromStorage(imageUrl);
      }

      // Delete news record from database
      const { error } = await supabase.from("news").delete().eq("id", newsId);

      if (error) throw error;

      toast.success("News deleted successfully");
      fetchNews();
    } catch (error: any) {
      console.error("Error deleting news:", error);
      toast.error(
        "Failed to delete news: " + (error.message || "Unknown error")
      );
    }
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffTime = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <DashboardLayout role="mentor">
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <LoadingLogo size={48} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="mentor">
      <div className="space-y-3 md:space-y-6 p-3 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-gray-900">
              News Management
            </h2>
            <p className="text-xs md:text-base text-gray-600 mt-1">
              Manage your news posts and view their performance
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2"
          >
            <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Post News
          </Button>
        </div>

        {news.length === 0 ? (
          <Card className="bg-white border rounded-xl shadow-sm">
            <CardContent className="p-8 md:p-12 text-center">
              <Newspaper className="h-12 w-12 md:h-16 md:w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
                No news posts yet
              </h3>
              <p className="text-xs md:text-sm text-gray-600 mb-4">
                Start sharing news and opportunities with job seekers
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Post Your First News
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {news.map((item) => {
              const daysRemaining = getDaysRemaining(item.expires_at);
              const isExpired = daysRemaining < 0;
              const isExpiringSoon = daysRemaining <= 3 && daysRemaining >= 0;

              return (
                <Card
                  key={item.id}
                  className="bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  {item.image_url && (
                    <div className="relative w-full h-32 md:h-48 overflow-hidden">
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="p-3 md:p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-sm md:text-base font-bold text-gray-900 line-clamp-2 flex-1">
                        {item.title}
                      </CardTitle>
                      {!item.is_active && (
                        <Badge
                          variant="secondary"
                          className="bg-gray-100 text-gray-600 text-[10px] md:text-xs"
                        >
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs md:text-sm text-gray-600 line-clamp-2">
                      {item.content}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 md:p-4 pt-0">
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-600">
                        <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                        <span>Posted: {formatDate(item.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-600">
                        <Eye className="h-3 w-3 md:h-4 md:w-4" />
                        <span>{item.views} views</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpired ? (
                          <Badge className="bg-red-100 text-red-700 text-[10px] md:text-xs">
                            Expired
                          </Badge>
                        ) : isExpiringSoon ? (
                          <Badge className="bg-orange-100 text-orange-700 text-[10px] md:text-xs">
                            Expires in {daysRemaining} day
                            {daysRemaining !== 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 text-[10px] md:text-xs">
                            {daysRemaining} days remaining
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item.id, item.image_url || undefined)}
                        className="flex-1 text-xs md:text-sm h-7 md:h-9"
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create News Modal */}
        {authUserId && (
          <CreateNewsModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => {
              fetchNews();
              setIsCreateModalOpen(false);
            }}
            recruiterId={authUserId}
            companyId={companyId || undefined}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
