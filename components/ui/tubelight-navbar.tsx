"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LucideIcon, LogIn, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface NavBarProps {
  items: NavItem[];
  className?: string;
  onSignIn?: () => void;
  onSignUp?: () => void;
  rightContent?: React.ReactNode;
}

export function NavBar({
  items,
  className,
  onSignIn,
  onSignUp,
  rightContent,
}: NavBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  // Determine active tab based on current pathname
  const getActiveTab = () => {
    const activeItem = items.find(
      (item) => pathname === item.url || pathname.startsWith(item.url + "/")
    );
    return activeItem ? activeItem.name : null;
  };

  const activeTab = getActiveTab();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex justify-center items-center py-4 transition-all duration-300",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 md:gap-3 backdrop-blur-lg py-2 md:py-3 px-3 md:px-6 rounded-full shadow-lg w-full max-w-5xl mx-auto",
          isScrolled
            ? "bg-white/95 border-2 border-blue-500 shadow-blue-200/50"
            : "bg-white/90 border-2 border-blue-400 shadow-blue-200/50"
        )}
      >
        {/* Logo Section */}
        <div className="flex items-center gap-1 flex-shrink-0 mr-12 md:mr-0">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo1.png"
              alt="Brightbyt Logo"
              width={32}
              height={32}
              className="object-contain w-8 h-8 md:w-10 md:h-10"
            />
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex items-center gap-4 md:gap-6 ml-12 md:ml-16 flex-shrink-0">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            const isNavigating = navigatingTo === item.url;

            const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
              if (item.url !== pathname) {
                e.preventDefault();
                setNavigatingTo(item.url);
                router.push(item.url);
                // Reset loading state after navigation completes
                setTimeout(() => {
                  setNavigatingTo(null);
                }, 1000);
              }
            };

            return (
              <Link
                key={item.name}
                href={item.url}
                onClick={handleClick}
                className={cn(
                  "relative cursor-pointer text-sm md:text-lg font-medium text-gray-700 transition-colors px-1.5 md:px-3 flex items-center gap-1.5",
                  "hover:text-blue-600",
                  activeTab === item.name && "text-blue-600",
                  "relative group",
                  isNavigating && "opacity-70 cursor-wait"
                )}
              >
                {isNavigating ? (
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin flex-shrink-0" />
                ) : (
                  <>
                    <span className="hidden md:inline">{item.name}</span>
                    <span className="md:hidden">
                      <Icon size={16} strokeWidth={2.5} />
                    </span>
                  </>
                )}
                {isActive && !isNavigating && (
                  <motion.div
                    layoutId="lamp"
                    className="absolute inset-0 w-full bg-blue-50 rounded-full -z-10"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                  >
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-t-full">
                      <div className="absolute w-12 h-6 bg-blue-400/30 rounded-full blur-md -top-2 -left-2" />
                      <div className="absolute w-8 h-6 bg-blue-400/30 rounded-full blur-md -top-1" />
                      <div className="absolute w-4 h-4 bg-blue-400/30 rounded-full blur-sm top-0 left-2" />
                    </div>
                  </motion.div>
                )}
                {!isNavigating && (
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-500 transition-all duration-300 group-hover:w-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Spacer to push auth buttons to the right */}
        <div className="flex-grow"></div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {rightContent}
          <button
            onClick={onSignIn}
            className={cn(
              "px-2 md:px-3 py-1 md:py-1.5 rounded-md text-[10px] md:text-xs font-medium text-blue-600 bg-white border-2 border-blue-500 hover:bg-blue-50 hover:border-blue-600 transition-all shadow-sm hover:shadow-md flex items-center gap-1 md:gap-1.5"
            )}
          >
            <LogIn className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span className="hidden sm:inline">Sign In</span>
          </button>
          <button
            onClick={onSignUp}
            className={cn(
              "px-2 md:px-4 py-1 md:py-2 rounded-md text-[10px] md:text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
            )}
          >
            <span className="hidden sm:inline">Get Started</span>
            <span className="sm:hidden">Start</span>
          </button>
        </div>
      </div>
    </div>
  );
}
