"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Mail,
  Smartphone,
  Instagram,
  Users,
  Eye,
  MousePointerClick,
  Activity,
  Clock,
} from "lucide-react";
import { DisplayCards } from "@/components/ui/display-cards";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";

export function FeaturedAdSpaces() {
  const [flippedCards, setFlippedCards] = useState<number[]>([]);

  const toggleFlip = (index: number) => {
    setFlippedCards((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <section className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-transparent" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 bg-transparent font-['Calibri',sans-serif] relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <motion.h2
            className="text-4xl md:text-5xl font-bold mb-4 text-yellow-400"
            initial={{ opacity: 0, x: -100 }}
            whileInView={{
              opacity: 1,
              x: 0,
              transition: {
                type: "spring",
                stiffness: 50,
                damping: 15,
                mass: 1,
              },
            }}
            viewport={{ once: true }}
          >
            Featured Ad Spaces
          </motion.h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: "Tech Blog Banner",
              platform: "Website",
              reach: "50K monthly visitors",
              price: "R5,000/mo",
              category: "Technology",
              image: "https://source.unsplash.com/featured/300x200?tech-blog",
              description:
                "Premium banner placement on a leading tech blog. High visibility and engagement from tech-savvy audience.",
              features: [
                "Top banner position",
                "Responsive design",
                "Analytics included",
                "A/B testing available",
              ],
            },
            {
              title: "YouTube Pre-roll",
              platform: "YouTube",
              reach: "100K subscribers",
              price: "R8,000/mo",
              category: "Entertainment",
              image: "https://source.unsplash.com/featured/300x200?youtube",
              description:
                "Pre-roll video ads on a popular YouTube channel. Capture attention before content starts.",
              features: [
                "15-30 second spots",
                "Targeted audience",
                "Performance metrics",
                "Creative support",
              ],
            },
            {
              title: "Instagram Story",
              platform: "Instagram",
              reach: "75K followers",
              price: "R6,500/mo",
              category: "Lifestyle",
              image: "https://source.unsplash.com/featured/300x200?instagram",
              description:
                "Full-screen story ads on an influential Instagram account. Perfect for visual storytelling.",
              features: [
                "Interactive elements",
                "Swipe-up links",
                "Story highlights",
                "Engagement tracking",
              ],
            },
            {
              title: "Podcast Mid-roll",
              platform: "Podcast",
              reach: "30K listeners",
              price: "R4,000/mo",
              category: "Education",
              image: "https://source.unsplash.com/featured/300x200?podcast",
              description:
                "Mid-roll audio spots in a popular podcast series. Connect with engaged listeners.",
              features: [
                "60-second spots",
                "Host read option",
                "Download tracking",
                "Listener demographics",
              ],
            },
          ].map((space, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative group h-[400px] perspective-1000"
            >
              <AnimatePresence initial={false}>
                <motion.div
                  className="absolute inset-0 w-full h-full"
                  initial={false}
                  animate={{
                    rotateY: flippedCards.includes(index) ? 180 : 0,
                    transition: {
                      duration: 0.6,
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                    },
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Front of card */}
                  <motion.div
                    className="absolute inset-0 w-full h-full backface-hidden"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <Card className="bg-black/30 backdrop-blur-sm border-gray-700/30 overflow-hidden h-full">
                      <CardContent className="p-0 h-full flex flex-col">
                        <div className="relative h-48">
                          <Image
                            src={space.image}
                            alt={space.title}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-xl font-bold text-white mb-1">
                              {space.title}
                            </h3>
                            <p className="text-sm text-gray-300">
                              {space.platform}
                            </p>
                          </div>
                        </div>
                        <div className="p-4 flex-grow">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-300">
                              {space.reach}
                            </span>
                            <span className="text-lg font-semibold text-yellow-400">
                              {space.price}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="h-6 w-6 rounded-full bg-gray-800/20 flex items-center justify-center">
                              <svg
                                className="h-3 w-3 text-[#9575ff]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>
                            <span className="text-sm text-gray-300">
                              {space.category}
                            </span>
                          </div>
                          <Button
                            className="w-full bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 border border-yellow-400/30"
                            onClick={() => toggleFlip(index)}
                          >
                            View Details <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Back of card */}
                  <motion.div
                    className="absolute inset-0 w-full h-full backface-hidden"
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <Card className="bg-black/30 backdrop-blur-sm border-gray-700/30 overflow-hidden h-full">
                      <CardContent className="p-6 h-full flex flex-col">
                        <h3 className="text-xl font-bold text-white mb-2">
                          {space.title}
                        </h3>
                        <p className="text-gray-300 mb-4">
                          {space.description}
                        </p>
                        <div className="space-y-2 mb-4">
                          {space.features.map((feature, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-full bg-yellow-400/20 flex items-center justify-center">
                                <svg
                                  className="h-3 w-3 text-yellow-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              <span className="text-sm text-gray-300">
                                {feature}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-auto">
                          <Button
                            className="w-full bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 border border-yellow-400/30"
                            onClick={() => toggleFlip(index)}
                          >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
