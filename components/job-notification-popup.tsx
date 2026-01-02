"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Bell, Check } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

interface JobNotificationPopupProps {
  onClose?: () => void;
  onNotificationSubmitted?: () => void;
  isOpen?: boolean;
}

export function JobNotificationPopup({
  onClose,
  onNotificationSubmitted,
  isOpen,
}: JobNotificationPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    // If isOpen prop is provided, use it for controlled visibility
    // Otherwise, auto-show after a delay (for landing page)
    if (isOpen !== undefined) {
      setIsVisible(isOpen);
    } else {
      // Check if user has already subscribed (using localStorage)
      // Only show popup if user hasn't subscribed yet
      const hasSubscribed = localStorage.getItem("jobNotificationSubmitted");
      if (!hasSubscribed) {
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 240000); // Show after 4 minutes (240000 milliseconds)
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen]);

  // Fetch available job categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Get unique categories from jobs table
        const { data, error } = await supabase
          .from("jobs")
          .select("category")
          .not("category", "is", null);

        if (error) {
          console.error("Error fetching categories:", error);
          // Use default categories as fallback
          setCategories([
            "IT",
            "Engineering",
            "Finance",
            "Healthcare",
            "Marketing",
            "Education",
            "Sales",
            "Human Resources",
          ]);
          return;
        }

        if (data) {
          const uniqueCategories = Array.from(
            new Set(data.map((job) => job.category).filter(Boolean))
          ) as string[];
          if (uniqueCategories.length > 0) {
            setCategories(uniqueCategories);
          } else {
            // Use default categories if none found
            setCategories([
              "IT",
              "Engineering",
              "Finance",
              "Healthcare",
              "Marketing",
              "Education",
              "Sales",
              "Human Resources",
            ]);
          }
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        // Use default categories as fallback
        setCategories([
          "IT",
          "Engineering",
          "Finance",
          "Healthcare",
          "Marketing",
          "Education",
          "Sales",
          "Human Resources",
        ]);
      }
    };

    fetchCategories();
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Don't mark as seen when closing - allow it to show again if user hasn't subscribed
    // Only mark as seen when user actually subscribes
    if (onClose) {
      onClose();
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      // Insert into job_notifications table
      const { error } = await supabase.from("job_notifications").insert({
        email: email,
        categories: selectedCategories.length > 0 ? selectedCategories : null,
        is_active: true,
      });

      if (error) {
        console.error("Error submitting notification:", error);
        alert("Something went wrong. Please try again.");
        return;
      }

      // Send welcome email
      try {
        const response = await fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: email,
            subject: "Welcome to Brightbyt! 🎉",
            html: generateWelcomeEmail(email.split("@")[0] || "there", email),
            from: "clintonkhozah@gmail.com",
          }),
        });

        if (response.ok) {
          console.log("✅ Welcome email sent to", email);
        }
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
        // Don't fail the subscription if email fails
      }

      // Mark as submitted in localStorage (also marks as seen)
      localStorage.setItem("jobNotificationSubmitted", "true");
      localStorage.setItem("jobNotificationPopupSeen", "true");
      setIsSubmitted(true);

      if (onNotificationSubmitted) {
        onNotificationSubmitted();
      }

      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error("Error submitting notification:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const shouldShow = isOpen !== undefined ? isOpen : isVisible;
  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, x: "-50%" }}
        animate={{ opacity: 1, y: 0, x: "-50%" }}
        exit={{ opacity: 0, y: 100, x: "-50%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-4 left-1/2 z-50 w-[280px] md:w-80 max-w-[calc(100vw-2rem)]"
      >
        <div
          className="relative p-[2px] md:p-[3px] rounded-lg md:rounded-xl animate-border-rotate"
          style={{
            background:
              "conic-gradient(from 0deg, #3b82f6, #a855f7, #ec4899, #f59e0b, #3b82f6)",
          }}
        >
          <Card className="bg-white shadow-2xl border-2 border-blue-200 rounded-lg md:rounded-xl overflow-hidden relative z-10">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white pb-1.5 md:pb-2 pt-2 md:pt-3 px-2 md:px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white flex items-center justify-center p-0.5 md:p-1">
                    <Image
                      src="/images/logo1.png"
                      alt="Brightbyt Logo"
                      width={20}
                      height={20}
                      className="object-contain md:w-6 md:h-6"
                    />
                  </div>
                  <CardTitle className="text-xs md:text-sm font-bold">
                    Get Job Alerts
                  </CardTitle>
                </div>
                <button
                  onClick={handleClose}
                  className="text-white hover:bg-white/20 rounded-full p-0.5 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
                </button>
              </div>
              <p className="text-[10px] md:text-xs text-blue-100 mt-0.5 leading-tight">
                Get notified when we post jobs related to your interests
              </p>
            </CardHeader>

            <CardContent className="p-2 md:p-3">
              {isSubmitted ? (
                <div className="text-center py-2 md:py-4">
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2 md:mb-3">
                    <Check className="w-4 h-4 md:w-6 md:h-6 text-green-600" />
                  </div>
                  <p className="text-xs md:text-sm font-medium text-gray-700 mb-1">
                    Success!
                  </p>
                  <p className="text-[10px] md:text-xs text-gray-600">
                    We'll notify you when relevant jobs are posted.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-2 md:space-y-3"
                >
                  {/* Email Input */}
                  <div className="space-y-0.5 md:space-y-1">
                    <label className="text-[10px] md:text-xs font-medium text-gray-700 flex items-center gap-1">
                      <Mail className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white border-gray-300 focus:border-blue-500 h-7 md:h-8 text-[10px] md:text-xs py-0.5 md:py-1 px-1.5 md:px-2"
                    />
                  </div>

                  {/* Categories Selection */}
                  {categories.length > 0 && (
                    <div className="space-y-0.5 md:space-y-1">
                      <label className="text-[10px] md:text-xs font-medium text-gray-700 flex items-center gap-1">
                        <Bell className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        Job Categories (Optional)
                      </label>
                      <p className="text-[9px] md:text-[10px] text-gray-500 mb-0.5 md:mb-1">
                        Select categories you're interested in
                      </p>
                      <div className="flex flex-wrap gap-1 md:gap-1.5 max-h-24 md:max-h-32 overflow-y-auto">
                        {categories.slice(0, 8).map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => toggleCategory(category)}
                            className={`px-1.5 md:px-2 py-0.5 md:py-1 text-[9px] md:text-[10px] rounded-md border transition-colors ${
                              selectedCategories.includes(category)
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-gray-50 text-gray-700 border-gray-300 hover:border-blue-400"
                            }`}
                          >
                            {category}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || !email}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] md:text-xs h-7 md:h-8 font-medium"
                  >
                    {isSubmitting ? "Submitting..." : "Notify Me"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
