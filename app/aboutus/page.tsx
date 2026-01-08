"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PageContainer } from "@/components/page-container";
import {
  GraduationCap,
  Users,
  BookOpen,
  CreditCard,
  Video,
  Award,
  Star,
  Shield,
  Clock,
  TrendingUp,
  Zap,
  Target,
  ArrowRight,
  UserCheck,
  UsersRound,
  MapPin,
  BarChart3,
  Map,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useEffect, useState } from "react";

const features = [
  {
    icon: Users,
    title: "Expert Mentors",
    description:
      "Connect with the world's finest mentors and tutors across all subjects and expertise levels.",
  },
  {
    icon: BookOpen,
    title: "Easy Booking",
    description:
      "Simple and intuitive booking system that lets you find and schedule sessions in minutes.",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description:
      "Safe and secure payment processing ensures your transactions are protected at all times.",
  },
  {
    icon: Video,
    title: "Virtual Sessions",
    description:
      "Attend sessions from anywhere in the world through our high-quality video platform.",
  },
  {
    icon: Award,
    title: "Quality Assured",
    description:
      "All our mentors are verified professionals committed to delivering exceptional learning experiences.",
  },
  {
    icon: Star,
    title: "Best in the World",
    description:
      "We pride ourselves on being the premier platform for connecting students with world-class mentors.",
  },
];

const values = [
  {
    title: "Excellence",
    description:
      "We are committed to providing the highest quality educational experiences through our carefully selected mentors.",
  },
  {
    title: "Accessibility",
    description:
      "Education should be accessible to everyone, which is why we've made it easy to find and book sessions with expert mentors.",
  },
  {
    title: "Innovation",
    description:
      "We continuously innovate our platform to provide the best possible experience for both students and mentors.",
  },
  {
    title: "Trust",
    description:
      "Your learning journey is important to us. We ensure secure transactions and verified mentors you can trust.",
  },
];

// Full text content for text-to-speech
const fullPageText = `Who Are We

Welcome to Brightbyt

We are the premier platform where you can find the best mentors to teach you whatever you want to learn, and where recruiters connect with top talent for jobs, learnerships, internships, and bursaries. Book a session, make a secure payment, and have an exceptional learning experience with your special mentor. As recruiters, we help companies find the perfect candidates while connecting job seekers with career opportunities worldwide. We are the best in the world at connecting students with world-class educators and matching talent with career opportunities.

What Makes Us Different

Secure and Trusted: All payments are processed securely, and all mentors are verified professionals. Flexible Scheduling: Book sessions at times that work for you, from anywhere in the world. Instant Access: Start learning immediately after booking. No waiting, no delays. Quality Guaranteed: Every mentor is carefully vetted to ensure the highest quality of instruction.

Our Story

Brightbyt was initiated in 2025 by a group called Brightbyte, who recognized a critical gap in the global education landscape. Born from a deep commitment to educational equity and social impact, Brightbyt was founded with a singular mission: to democratize access to quality education and professional development opportunities for disadvantaged students and individuals seeking to upskill themselves, regardless of their financial circumstances.

In a world where quality education and professional mentorship have become increasingly expensive and inaccessible, Brightbyte saw an opportunity to bridge the gap between talented educators and eager learners. They understood that financial constraints should never be a barrier to personal growth, career advancement, or academic excellence. With this conviction, they set out to create a platform that would revolutionize how education is accessed, delivered, and experienced.

Our core mission is to empower disadvantaged students and professionals who aspire to upskill themselves but face financial barriers. We believe that everyone deserves access to world-class mentorship and educational resources, regardless of their economic background. Through our innovative pricing model, comprehensive scholarship programs, and partnerships with educational institutions, we ensure that financial limitations do not prevent anyone from achieving their learning goals.

Brightbyt represents more than just a tutoring platform—it's a movement toward educational inclusivity and social mobility. We've built a sustainable business model that balances affordability with quality, ensuring that our mentors are fairly compensated while keeping costs accessible for students from all walks of life. Our dynamic pricing system, powered by advanced AI technology, adjusts rates based on market conditions, mentor expertise, and student needs, making premium education accessible at competitive prices.

For investors, Brightbyt presents a unique opportunity to be part of a socially responsible venture with tremendous growth potential. The global online education market is projected to reach $350 billion by 2025, and we're positioned to capture a significant share of this expanding market. Our platform addresses a critical need in underserved communities while maintaining strong unit economics and scalability. We've demonstrated early traction with verified mentors, engaged students, and a proven technology infrastructure that can scale globally.

Our competitive advantages include our proprietary AI-powered pricing system that optimizes both mentor earnings and student affordability, our focus on underserved markets with high growth potential, and our commitment to social impact that resonates with modern consumers and investors alike. We're not just building a business—we're creating a sustainable ecosystem that benefits students, educators, and communities worldwide.

As we continue to expand our reach, we invite forward-thinking investors to join us in transforming the future of education. Together, we can build a platform that not only generates strong returns but also creates lasting positive change in the lives of millions of learners around the world. Brightbyt is more than an investment opportunity—it's a chance to be part of a mission that makes quality education accessible to everyone, everywhere.`;

export default function CompanyPage() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: "url('/images/adspace.png')",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          zIndex: 0,
        }}
        aria-hidden="true"
      />
      <Navbar />
      <PageContainer className="flex-1 relative z-10">
        <div className="py-6 md:py-20">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 md:mb-16"
          >
            <div className="flex justify-center mb-3 md:mb-6">
              <Image
                src="/images/logo1.png"
                alt="Brightbyt Logo"
                width={80}
                height={80}
                className="object-contain w-12 h-12 md:w-20 md:h-20"
              />
            </div>
            <h1 className="text-2xl md:text-6xl font-bold text-black mb-3 md:mb-6 font-['Verdana',sans-serif] drop-shadow-lg">
              Who Are We
            </h1>
            <div className="max-w-4xl mx-auto px-2 md:px-0">
              <p className="text-sm md:text-2xl text-black mb-2 md:mb-4 font-['Verdana',sans-serif] leading-relaxed font-semibold drop-shadow-md">
                Welcome to{" "}
                <span className="text-blue-600 font-bold">Brightbyt</span>
              </p>
              <p className="text-xs md:text-lg text-black font-['Verdana',sans-serif] leading-relaxed drop-shadow-md mb-6 md:mb-12">
                We are the premier platform where you can find the best mentors
                to teach you whatever you want to learn, and where recruiters
                connect with top talent for jobs, learnerships, internships, and
                bursaries. Book a session, make a secure payment, and have an
                exceptional learning experience with your special mentor. As
                recruiters, we help companies find the perfect candidates while
                connecting job seekers with career opportunities worldwide. We
                are the best in the world at connecting students with
                world-class educators and matching talent with career
                opportunities.
              </p>

              {/* What Makes Us Different */}
              <div className="mt-6 md:mt-12 text-left">
                <h2 className="text-lg md:text-4xl font-bold text-black mb-4 md:mb-8 text-center font-['Verdana',sans-serif] drop-shadow-lg">
                  What Makes Us Different
                </h2>
                <div className="max-w-4xl mx-auto">
                  <p className="text-xs md:text-base text-black font-['Verdana',sans-serif] leading-relaxed drop-shadow-sm">
                    <strong className="text-black">Secure & Trusted:</strong>{" "}
                    All payments are processed securely, and all mentors are
                    verified professionals.{" "}
                    <strong className="text-black">Flexible Scheduling:</strong>{" "}
                    Book sessions at times that work for you, from anywhere in
                    the world.{" "}
                    <strong className="text-black">Instant Access:</strong>{" "}
                    Start learning immediately after booking. No waiting, no
                    delays.{" "}
                    <strong className="text-black">Quality Guaranteed:</strong>{" "}
                    Every mentor is carefully vetted to ensure the highest
                    quality of instruction.{" "}
                    <strong className="text-black">
                      Recruitment Excellence:
                    </strong>{" "}
                    As recruiters, we connect companies with top talent for
                    jobs, learnerships, internships, and bursaries, ensuring the
                    best matches for both employers and job seekers.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Company Origin Story */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="my-6 md:my-12"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="max-w-5xl mx-auto px-2 md:px-0"
            >
              <h2 className="text-lg md:text-4xl font-bold text-yellow-400 mb-4 md:mb-8 text-center font-['Verdana',sans-serif] drop-shadow-lg">
                Our Story
              </h2>
              <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-4 md:p-12 border-2 border-yellow-400/30 shadow-2xl">
                <div className="space-y-3 md:space-y-6 text-black font-['Verdana',sans-serif] leading-relaxed text-xs md:text-xl">
                  <p className="drop-shadow-md">
                    <strong className="text-yellow-600 text-sm md:text-2xl">
                      Brightbyt was initiated in 2025
                    </strong>{" "}
                    by a group called{" "}
                    <strong className="text-black">Brightbyte</strong>, who
                    recognized critical gaps in both the global education
                    landscape and the job market. Born from a deep commitment to
                    educational equity, social impact, and career advancement,
                    Brightbyt was founded with a dual mission: to democratize
                    access to quality education and professional development
                    opportunities for disadvantaged students and individuals
                    seeking to upskill themselves, while also serving as
                    recruiters connecting top companies with talented job
                    seekers, learnership candidates, interns, and bursary
                    recipients—regardless of their financial circumstances.
                  </p>

                  <p className="drop-shadow-md">
                    In a world where quality education, professional mentorship,
                    and career opportunities have become increasingly expensive
                    and inaccessible, Brightbyte saw an opportunity to bridge
                    multiple gaps: between talented educators and eager
                    learners, and between companies seeking talent and job
                    seekers looking for opportunities. As recruiters, we
                    understand the challenges both employers and candidates
                    face. We recognized that financial constraints should never
                    be a barrier to personal growth, career advancement, or
                    academic excellence. With this conviction, we set out to
                    create a comprehensive platform that would revolutionize how
                    education is accessed, delivered, and experienced, while
                    also transforming how companies recruit and how job seekers
                    find meaningful career opportunities.
                  </p>

                  <p className="drop-shadow-md">
                    <strong className="text-black">Our core mission</strong> is
                    twofold: to empower disadvantaged students and professionals
                    who aspire to upskill themselves but face financial
                    barriers, and to serve as trusted recruiters connecting
                    companies with exceptional talent. We believe that everyone
                    deserves access to world-class mentorship, educational
                    resources, and career opportunities, regardless of their
                    economic background. Through our innovative pricing model,
                    comprehensive scholarship programs, partnerships with
                    educational institutions, and our role as recruiters
                    facilitating job placements, learnerships, internships, and
                    bursaries, we ensure that financial limitations do not
                    prevent anyone from achieving their learning and career
                    goals.
                  </p>

                  <p className="drop-shadow-md">
                    Brightbyt represents more than just a tutoring platform—it's
                    a movement toward educational inclusivity, social mobility,
                    and career advancement. As recruiters, we've built a
                    sustainable business model that balances affordability with
                    quality, ensuring that our mentors are fairly compensated
                    while keeping costs accessible for students from all walks
                    of life. Our dynamic pricing system, powered by advanced AI
                    technology, adjusts rates based on market conditions, mentor
                    expertise, and student needs, making premium education
                    accessible at competitive prices. Simultaneously, our
                    recruitment services help companies find the right talent
                    while providing job seekers with access to jobs,
                    learnerships, internships, and bursaries that match their
                    skills and aspirations.
                  </p>

                  <p className="drop-shadow-md">
                    <strong className="text-black">For investors</strong>,
                    Brightbyt presents a unique opportunity to be part of a
                    socially responsible venture with tremendous growth
                    potential. The global online education market is projected
                    to reach $350 billion by 2025, and the global recruitment
                    and talent acquisition market continues to grow
                    exponentially. We're positioned to capture a significant
                    share of both expanding markets. Our platform addresses
                    critical needs in underserved communities—both educational
                    and career-related—while maintaining strong unit economics
                    and scalability. As recruiters, we've demonstrated early
                    traction with verified mentors, engaged students, active job
                    seekers, partnering companies, and a proven technology
                    infrastructure that can scale globally.
                  </p>

                  <p className="drop-shadow-md">
                    Our competitive advantages include our proprietary
                    AI-powered pricing system that optimizes both mentor
                    earnings and student affordability, our comprehensive
                    recruitment services connecting companies with top talent,
                    our focus on underserved markets with high growth potential,
                    and our commitment to social impact that resonates with
                    modern consumers and investors alike. As recruiters, we
                    understand the nuances of talent acquisition and job
                    placement. We're not just building a business—we're creating
                    a sustainable ecosystem that benefits students, educators,
                    job seekers, companies, and communities worldwide.
                  </p>

                  <p className="drop-shadow-md">
                    As we continue to expand our reach as both educators and
                    recruiters, we invite forward-thinking investors to join us
                    in transforming the future of education and career
                    development. Together, we can build a platform that not only
                    generates strong returns but also creates lasting positive
                    change in the lives of millions of learners and job seekers
                    around the world. Brightbyt is more than an investment
                    opportunity—it's a chance to be part of a mission that makes
                    quality education and career opportunities accessible to
                    everyone, everywhere.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </PageContainer>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
