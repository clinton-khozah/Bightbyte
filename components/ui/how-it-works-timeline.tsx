"use client";

import { Search, Calendar, CreditCard, CheckCircle } from "lucide-react";
import RadialOrbitalTimeline from "./radial-orbital-timeline";

const timelineData = [
  {
    id: 1,
    title: "Browse Tutors",
    date: "Step 1",
    content: "Explore tutors and mentors across different subjects and expertise levels to find the perfect match for your learning needs.",
    category: "For Students",
    icon: Search,
    relatedIds: [2],
    status: "completed" as const,
    energy: 100,
  },
  {
    id: 2,
    title: "Select Time",
    date: "Step 2",
    content: "Choose a convenient time slot from your tutor's available schedule that fits your learning timeline.",
    category: "For Students",
    icon: Calendar,
    relatedIds: [1, 3],
    status: "completed" as const,
    energy: 90,
  },
  {
    id: 3,
    title: "Book Session",
    date: "Step 3",
    content: "Confirm your booking by selecting your preferred session duration and completing the secure payment process.",
    category: "For Students",
    icon: CreditCard,
    relatedIds: [2, 4],
    status: "in-progress" as const,
    energy: 60,
  },
  {
    id: 4,
    title: "Attend & Learn",
    date: "Step 4",
    content: "Join your scheduled session via video call and start learning from your expert tutor or mentor.",
    category: "For Students",
    icon: CheckCircle,
    relatedIds: [3],
    status: "pending" as const,
    energy: 30,
  },
];

export function HowItWorksTimeline() {
  return (
    <div className="w-full h-[800px] flex flex-col items-center justify-center bg-transparent overflow-visible py-20">
      <div className="relative w-full max-w-5xl h-full flex items-center justify-center overflow-visible px-8">
        <RadialOrbitalTimeline timelineData={timelineData} />
      </div>
    </div>
  );
} 