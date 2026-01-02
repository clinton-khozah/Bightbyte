"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const adSpaces = [
  {
    title: "Social Media",
    description: "Reach millions through targeted social media advertising",
    icon: "🚀",
  },
  {
    title: "Display Ads",
    description: "Premium banner and display advertising spaces",
    icon: "🎯",
  },
  {
    title: "Video Content",
    description: "Engaging video ad placements across platforms",
    icon: "🎥",
  },
  {
    title: "Influencer Network",
    description: "Connect with our network of verified influencers",
    icon: "👥",
  },
  {
    title: "Native Content",
    description: "Seamless native advertising integration",
    icon: "📱",
  },
  {
    title: "Email Marketing",
    description: "Targeted email marketing campaigns",
    icon: "📧",
  },
];

export function AdSpaces() {
  return (
    <section className="py-20">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
              Ad Spaces
            </h2>
            <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Choose from our diverse range of advertising spaces to reach your
              target audience effectively.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 pt-12 md:grid-cols-2 lg:grid-cols-3">
          {adSpaces.map((space, index) => (
            <motion.div
              key={space.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group relative h-full"
            >
              <div className="relative h-full overflow-hidden rounded-lg border border-[#2a2e45] bg-[#1a1e32] transition-all duration-300 hover:scale-[1.02] hover:border-[#9575ff]">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#9575ff]/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Glow effect */}
                <div className="absolute -inset-px bg-gradient-to-r from-[#9575ff] to-[#8a63ff] opacity-0 blur-xl transition-all duration-300 group-hover:opacity-15" />

                {/* Content */}
                <div className="relative z-10 p-6">
                  <div className="mb-2 text-2xl">{space.icon}</div>
                  <h3 className="mb-2 text-xl font-bold text-white">
                    {space.title}
                  </h3>
                  <p className="mb-4 text-sm text-gray-400">
                    {space.description}
                  </p>
                  <div className="flex items-center text-[#9575ff] transition-colors group-hover:text-[#a98fff]">
                    <span className="text-sm font-medium">Learn more</span>
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
