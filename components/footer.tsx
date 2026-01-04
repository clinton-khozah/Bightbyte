"use client";

import Link from "next/link";
import Image from "next/image";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { languages, useTranslation } from "@/contexts/TranslationContext";
import { TranslatableText } from "@/components/translatable-text";

export function Footer() {
  const { language, setLanguage } = useTranslation();

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    // Force a re-render by updating the language state
    // The TranslationProvider will handle the state update
  };

  return (
    <footer className="bg-blue-200 border-t border-blue-400 w-full mt-auto">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8">
          {/* Company Info */}
          <div className="space-y-2 md:space-y-4">
            <div className="flex items-center space-x-2 md:space-x-3">
              <Image
                src="/images/logo1.png"
                alt="Brightbyt Logo"
                width={40}
                height={40}
                className="object-contain w-8 h-8 md:w-12 md:h-12"
              />
              <div className="text-xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent font-['Verdana',sans-serif]">
                Brightbyt
              </div>
            </div>
            <TranslatableText
              as="p"
              className="text-xs md:text-sm text-gray-600 font-['Verdana',sans-serif] leading-relaxed font-medium"
            >
              Connecting job seekers with career opportunities worldwide. Your
              journey to professional success starts here.
            </TranslatableText>
          </div>

          {/* Quick Links */}
          <div>
            <TranslatableText
              as="h3"
              className="text-gray-900 font-bold mb-2 md:mb-4 text-sm md:text-lg font-['Verdana',sans-serif] border-b border-blue-300 pb-1 md:pb-2"
            >
              Quick Links
            </TranslatableText>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <Link
                  href="/findtutors"
                  className="text-gray-700 hover:text-blue-700 transition-colors font-['Verdana',sans-serif] font-medium hover:underline inline-block text-xs md:text-sm"
                >
                  <TranslatableText>Find Jobs</TranslatableText>
                </Link>
              </li>
              <li>
                <Link
                  href="/aboutus"
                  className="text-gray-700 hover:text-blue-700 transition-colors font-['Verdana',sans-serif] font-medium hover:underline inline-block text-xs md:text-sm"
                >
                  <TranslatableText>Who are we</TranslatableText>
                </Link>
              </li>
              <li>
                <Link
                  href="/start-earning"
                  className="text-gray-700 hover:text-blue-700 transition-colors font-['Verdana',sans-serif] font-medium hover:underline inline-block text-xs md:text-sm"
                >
                  <TranslatableText>Post Jobs & Find Talent</TranslatableText>
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <TranslatableText
              as="h3"
              className="text-gray-900 font-bold mb-2 md:mb-4 text-sm md:text-lg font-['Verdana',sans-serif] border-b border-blue-300 pb-1 md:pb-2"
            >
              Resources
            </TranslatableText>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <Link
                  href="/resources#blog"
                  className="text-gray-700 hover:text-blue-700 transition-colors font-['Verdana',sans-serif] font-medium hover:underline inline-block text-xs md:text-sm"
                >
                  <TranslatableText>Blog</TranslatableText>
                </Link>
              </li>
              <li>
                <Link
                  href="/resources#faq"
                  className="text-gray-700 hover:text-blue-700 transition-colors font-['Verdana',sans-serif] font-medium hover:underline inline-block text-xs md:text-sm"
                >
                  <TranslatableText>FAQ</TranslatableText>
                </Link>
              </li>
              <li>
                <Link
                  href="/resources#support"
                  className="text-gray-700 hover:text-blue-700 transition-colors font-['Verdana',sans-serif] font-medium hover:underline inline-block text-xs md:text-sm"
                >
                  <TranslatableText>Support</TranslatableText>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <TranslatableText
              as="h3"
              className="text-gray-900 font-bold mb-2 md:mb-4 text-sm md:text-lg font-['Verdana',sans-serif] border-b border-blue-300 pb-1 md:pb-2"
            >
              Legal
            </TranslatableText>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-700 hover:text-blue-700 transition-colors font-['Verdana',sans-serif] font-medium hover:underline inline-block text-xs md:text-sm"
                >
                  <TranslatableText>Privacy Policy</TranslatableText>
                </Link>
              </li>
              <li>
                <Link
                  href="/resources#terms"
                  className="text-gray-700 hover:text-blue-700 transition-colors font-['Verdana',sans-serif] font-medium hover:underline inline-block text-xs md:text-sm"
                >
                  <TranslatableText>Terms of Service</TranslatableText>
                </Link>
              </li>
              <li>
                <Link
                  href="/resources#cookies"
                  className="text-gray-700 hover:text-blue-700 transition-colors font-['Verdana',sans-serif] font-medium hover:underline inline-block text-xs md:text-sm"
                >
                  <TranslatableText>Cookie Policy</TranslatableText>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-6 md:mt-12 pt-4 md:pt-8 border-t border-blue-300">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
            <p className="text-xs md:text-sm text-gray-700 font-['Verdana',sans-serif] font-medium text-center md:text-left">
              © {new Date().getFullYear()} Brightbyt.{" "}
              <TranslatableText>All rights reserved.</TranslatableText>
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-6">
              {/* Language Selector */}
              <div className="flex items-center gap-1.5 md:gap-2">
                <Globe className="h-4 w-4 md:h-5 md:w-5 text-gray-700" />
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-[140px] md:w-[180px] bg-white border-blue-300 text-gray-900 font-['Verdana',sans-serif] text-xs md:text-sm h-8 md:h-10">
                    <SelectValue placeholder="Select Language" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {languages.map((lang) => (
                      <SelectItem
                        key={lang.code}
                        value={lang.code}
                        className="font-['Verdana',sans-serif] text-xs md:text-sm"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{lang.nativeName}</span>
                          <span className="text-[10px] md:text-xs text-gray-500 ml-2">
                            ({lang.name})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-4 md:space-x-6">
                <Link
                  href="https://www.facebook.com/profile.php?id=61584098290434"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-blue-700 transition-colors"
                >
                  <span className="sr-only">Facebook</span>
                  <svg
                    className="h-5 w-5 md:h-6 md:w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </Link>
                <Link
                  href="https://www.instagram.com/bryght_byte/#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-blue-700 transition-colors"
                >
                  <span className="sr-only">Instagram</span>
                  <svg
                    className="h-5 w-5 md:h-6 md:w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </Link>
                <Link
                  href="https://www.tiktok.com/@bright_byt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-blue-700 transition-colors"
                >
                  <span className="sr-only">TikTok</span>
                  <svg
                    className="h-5 w-5 md:h-6 md:w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
