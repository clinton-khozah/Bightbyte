"use client";

import React from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamically import HowItWorksTimeline to avoid SSR issues
const HowItWorksTimeline = dynamic(
  () =>
    import("./ui/how-it-works-timeline").then((mod) => ({
      default: mod.HowItWorksTimeline,
    })),
  { ssr: false }
);

// Dynamically import JobCards to avoid SSR issues
const JobCards = dynamic(
  () => import("./job-cards").then((mod) => ({ default: mod.JobCards })),
  { ssr: false }
);

interface HowItWorksProps {
  searchQuery?: string;
  selectedCategory?: string | null;
}

export function HowItWorks({
  searchQuery = "",
  selectedCategory = null,
}: HowItWorksProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-transparent" />
      <div className="container mx-auto px-4 pt-0 pb-4 sm:px-6 lg:px-8 bg-transparent font-['Calibri',sans-serif] relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-4 text-yellow-400 font-['Verdana',sans-serif] drop-shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{
              opacity: 1,
              y: 0,
              transition: {
                type: "spring",
                stiffness: 50,
                damping: 15,
                mass: 1,
              },
            }}
            viewport={{ once: true }}
          >
            Latest Job Opportunities
          </motion.h2>
        </motion.div>
        <JobCards
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 mt-16"
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
            How It Works
          </motion.h2>
          <p className="text-xl text-black max-w-2xl mx-auto mb-8">
            Discover how our platform connects job seekers with top companies
            for jobs, learnerships, internships, and bursaries
          </p>
        </motion.div>

        <HowItWorksTimeline />
      </div>
    </section>
  );
}
