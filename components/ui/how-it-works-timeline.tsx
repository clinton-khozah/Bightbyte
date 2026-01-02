"use client";

import { UserPlus, FileText, Search, Send } from "lucide-react";
import RadialOrbitalTimeline from "./radial-orbital-timeline";

const timelineData = [
  {
    id: 1,
    title: "Sign Up with Us",
    date: "Step 1",
    content: "Create your free account and join our platform to access thousands of job opportunities, learnerships, internships, and bursaries.",
    category: "For Job Seekers",
    icon: UserPlus,
    relatedIds: [2],
    status: "completed" as const,
    energy: 100,
  },
  {
    id: 2,
    title: "Fix Your CV",
    date: "Step 2",
    content: "Get professional help to optimize your CV and make it stand out to employers. Our tools and resources help you create a winning resume.\n\n💡 CV Tips to Get Hired:\n• Use keywords from job descriptions\n• Keep it concise (1-2 pages max)\n• Highlight achievements with numbers\n• Use a clean, professional format\n• Tailor your CV for each application\n• Include relevant skills and certifications\n• Proofread for spelling and grammar errors\n• Add a strong professional summary",
    category: "For Job Seekers",
    icon: FileText,
    relatedIds: [1, 3],
    status: "completed" as const,
    energy: 90,
  },
  {
    id: 3,
    title: "Browse Opportunities",
    date: "Step 3",
    content: "Search and filter through available jobs, learnerships, internships, and bursaries that match your skills, interests, and career goals.",
    category: "For Job Seekers",
    icon: Search,
    relatedIds: [2, 4],
    status: "in-progress" as const,
    energy: 60,
  },
  {
    id: 4,
    title: "Apply & Get Hired",
    date: "Step 4",
    content: "Submit your application directly to companies or through our platform. Track your applications and get notified about new opportunities.",
    category: "For Job Seekers",
    icon: Send,
    relatedIds: [3],
    status: "pending" as const,
    energy: 30,
  },
];

export function HowItWorksTimeline() {
  return (
    <div className="w-full h-[450px] md:h-[800px] flex flex-col items-center justify-center bg-transparent overflow-visible py-8 md:py-20">
      <div className="relative w-full max-w-5xl h-full flex items-center justify-center overflow-visible px-4 md:px-8">
        <RadialOrbitalTimeline timelineData={timelineData} />
      </div>
    </div>
  );
} 