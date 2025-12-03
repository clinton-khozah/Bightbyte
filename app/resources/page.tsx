"use client"

import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { PageContainer } from "@/components/page-container"
import { BookOpen, HelpCircle, HeadphonesIcon, Scale, FileText, Shield, Cookie, ArrowRight, Search, Mail, MessageCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"

export default function ResourcesPage() {
  const [searchQuery, setSearchQuery] = useState("")

  // Handle scrolling to hash anchor when page loads (for new tab navigation)
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      // Wait for page to fully render and then scroll to the section
      const scrollToSection = () => {
        const element = document.querySelector(hash)
        if (element) {
          // Use scrollIntoView with offset for better positioning
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          })
        }
      }
      
      // Try immediately and also after a short delay to handle async rendering
      scrollToSection()
      setTimeout(scrollToSection, 100)
      setTimeout(scrollToSection, 500)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col relative">
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: "url('/images/adspace.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 0,
        }}
        aria-hidden="true"
      />
      <Navbar />
      <PageContainer className="flex-1 relative z-10">
        <div className="py-12 md:py-20 px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="flex justify-center mb-6">
              <Image
                src="/images/logo1.png"
                alt="Brightbyt Logo"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-['Verdana',sans-serif] drop-shadow-lg">
              Resources & Information
            </h1>
            <p className="text-lg text-gray-100 font-['Verdana',sans-serif] leading-relaxed drop-shadow-md max-w-3xl mx-auto">
              Find everything you need to know about Brightbyt, from helpful articles to legal information.
            </p>
          </motion.div>

          {/* Navigation Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 max-w-6xl mx-auto px-4"
          >
            <a href="#blog" className="group">
              <Card className="bg-blue-100/30 backdrop-blur-sm border-2 border-blue-200/50 shadow-md hover:shadow-xl hover:border-blue-300/70 transition-all duration-300 h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 font-['Verdana',sans-serif] drop-shadow-md">Blog</h3>
                  <p className="text-sm text-gray-200 font-['Verdana',sans-serif]">Latest articles and insights</p>
                </CardContent>
              </Card>
            </a>
            <a href="#faq" className="group">
              <Card className="bg-green-100/30 backdrop-blur-sm border-2 border-green-200/50 shadow-md hover:shadow-xl hover:border-green-300/70 transition-all duration-300 h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <HelpCircle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 font-['Verdana',sans-serif] drop-shadow-md">FAQ</h3>
                  <p className="text-sm text-gray-200 font-['Verdana',sans-serif]">Frequently asked questions</p>
                </CardContent>
              </Card>
            </a>
            <a href="#support" className="group">
              <Card className="bg-purple-100/30 backdrop-blur-sm border-2 border-purple-200/50 shadow-md hover:shadow-xl hover:border-purple-300/70 transition-all duration-300 h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <HeadphonesIcon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 font-['Verdana',sans-serif] drop-shadow-md">Support</h3>
                  <p className="text-sm text-gray-200 font-['Verdana',sans-serif]">Get help and assistance</p>
                </CardContent>
              </Card>
            </a>
            <a href="#legal" className="group">
              <Card className="bg-orange-100/30 backdrop-blur-sm border-2 border-orange-200/50 shadow-md hover:shadow-xl hover:border-orange-300/70 transition-all duration-300 h-full">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Scale className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 font-['Verdana',sans-serif] drop-shadow-md">Legal</h3>
                  <p className="text-sm text-gray-200 font-['Verdana',sans-serif]">Policies and terms</p>
                </CardContent>
              </Card>
            </a>
          </motion.div>

          {/* Blog Section */}
          <motion.section
            id="blog"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-20 scroll-mt-20"
          >
            <div className="flex items-center gap-3 mb-8">
              <BookOpen className="w-8 h-8 text-blue-300" />
              <h2 className="text-3xl md:text-4xl font-bold text-white font-['Verdana',sans-serif] drop-shadow-lg">
                Blog
              </h2>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 md:p-8 border-2 border-white/20 mx-4">
              <p className="text-gray-200 font-['Verdana',sans-serif] text-lg mb-6">
                Welcome to the Brightbyt Blog! Here you'll find the latest articles, tips, and insights about online learning, tutoring, and educational excellence.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white/5 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white font-['Verdana',sans-serif]">Coming Soon</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 font-['Verdana',sans-serif]">
                      We're working on bringing you valuable content about education, learning strategies, and success stories from our community.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white font-['Verdana',sans-serif]">Stay Tuned</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 font-['Verdana',sans-serif]">
                      Subscribe to our newsletter to be notified when we publish new articles and educational resources.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.section>

          {/* FAQ Section */}
          <motion.section
            id="faq"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-20 scroll-mt-20"
          >
            <div className="flex items-center gap-3 mb-8">
              <HelpCircle className="w-8 h-8 text-green-300" />
              <h2 className="text-3xl md:text-4xl font-bold text-white font-['Verdana',sans-serif] drop-shadow-lg">
                Frequently Asked Questions
              </h2>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 md:p-8 border-2 border-white/20 mx-4">
              <div className="space-y-6">
                <Card className="bg-white/5 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white font-['Verdana',sans-serif]">How do I find a tutor?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 font-['Verdana',sans-serif]">
                      You can browse our extensive list of verified tutors by subject, rating, or availability. Use our search filters to find the perfect match for your learning needs.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white font-['Verdana',sans-serif]">How do I book a session?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 font-['Verdana',sans-serif]">
                      Simply select a tutor, choose your preferred date and time, and complete the secure payment. You'll receive a confirmation email with all the details.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white font-['Verdana',sans-serif]">What payment methods do you accept?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 font-['Verdana',sans-serif]">
                      We accept all major credit cards, PayPal, and bank transfers. All payments are processed securely through our encrypted payment system.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white font-['Verdana',sans-serif]">Can I cancel or reschedule a session?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 font-['Verdana',sans-serif]">
                      Yes! You can cancel or reschedule sessions up to 24 hours before the scheduled time. Check our cancellation policy for more details.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white font-['Verdana',sans-serif]">Are all tutors verified?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 font-['Verdana',sans-serif]">
                      Yes, all tutors on our platform undergo a thorough verification process, including background checks and credential verification.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.section>

          {/* Support Section */}
          <motion.section
            id="support"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-20 scroll-mt-20"
          >
            <div className="flex items-center gap-3 mb-8">
              <HeadphonesIcon className="w-8 h-8 text-purple-300" />
              <h2 className="text-3xl md:text-4xl font-bold text-white font-['Verdana',sans-serif] drop-shadow-lg">
                Support
              </h2>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 md:p-8 border-2 border-white/20 mx-4">
              <p className="text-gray-200 font-['Verdana',sans-serif] text-lg mb-8">
                We're here to help! Get in touch with our support team through any of the following channels:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <Card className="bg-white/5 backdrop-blur-sm border-white/20 text-center">
                  <CardContent className="p-6">
                    <Mail className="w-10 h-10 text-purple-300 mx-auto mb-4" />
                    <h3 className="text-white font-bold mb-2 font-['Verdana',sans-serif]">Email Support</h3>
                    <p className="text-gray-300 font-['Verdana',sans-serif] text-sm mb-4">support@brightbyt.com</p>
                    <p className="text-gray-400 font-['Verdana',sans-serif] text-xs">Response within 24 hours</p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 backdrop-blur-sm border-white/20 text-center">
                  <CardContent className="p-6">
                    <MessageCircle className="w-10 h-10 text-purple-300 mx-auto mb-4" />
                    <h3 className="text-white font-bold mb-2 font-['Verdana',sans-serif]">Live Chat</h3>
                    <p className="text-gray-300 font-['Verdana',sans-serif] text-sm mb-4">Available 24/7</p>
                    <a 
                      href="https://wa.me/27723592849" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-['Verdana',sans-serif]">
                        Start Chat
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.section>

          {/* Legal Section */}
          <motion.section
            id="legal"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="mb-20 scroll-mt-20"
          >
            <div className="flex items-center gap-3 mb-8">
              <Scale className="w-8 h-8 text-orange-300" />
              <h2 className="text-3xl md:text-4xl font-bold text-white font-['Verdana',sans-serif] drop-shadow-lg">
                Legal Information
              </h2>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border-2 border-white/20 space-y-8">
              {/* Privacy Policy */}
              <div id="privacy" className="scroll-mt-20">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-orange-300" />
                  <h3 className="text-2xl font-bold text-white font-['Verdana',sans-serif]">Privacy Policy</h3>
                </div>
                <Card className="bg-white/5 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6">
                    <p className="text-gray-300 font-['Verdana',sans-serif] mb-4">
                      <strong className="text-white">Last Updated:</strong> {new Date().toLocaleDateString()}
                    </p>
                    <div className="space-y-4 text-gray-300 font-['Verdana',sans-serif]">
                      <p>
                        At Brightbyt, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our platform.
                      </p>
                      <div>
                        <h4 className="text-white font-bold mb-2">Information We Collect</h4>
                        <p>We collect information that you provide directly to us, including:</p>
                        <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                          <li>Name, email address, and contact information</li>
                          <li>Payment and billing information</li>
                          <li>Profile information and preferences</li>
                          <li>Communication records with tutors</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-white font-bold mb-2">How We Use Your Information</h4>
                        <p>We use the information we collect to:</p>
                        <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                          <li>Provide and improve our services</li>
                          <li>Process payments and transactions</li>
                          <li>Communicate with you about your account</li>
                          <li>Send you updates and promotional materials (with your consent)</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-white font-bold mb-2">Data Security</h4>
                        <p>
                          We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Terms of Service */}
              <div id="terms" className="scroll-mt-20">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-orange-300" />
                  <h3 className="text-2xl font-bold text-white font-['Verdana',sans-serif]">Terms of Service</h3>
                </div>
                <Card className="bg-white/5 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6">
                    <p className="text-gray-300 font-['Verdana',sans-serif] mb-4">
                      <strong className="text-white">Last Updated:</strong> {new Date().toLocaleDateString()}
                    </p>
                    <div className="space-y-4 text-gray-300 font-['Verdana',sans-serif]">
                      <p>
                        By using Brightbyt, you agree to be bound by these Terms of Service. Please read them carefully.
                      </p>
                      <div>
                        <h4 className="text-white font-bold mb-2">User Responsibilities</h4>
                        <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                          <li>Students under 18 years old must have parental or guardian consent to use our platform</li>
                          <li>Tutors and mentors must be at least 18 years old to provide services</li>
                          <li>You are responsible for maintaining the confidentiality of your account</li>
                          <li>You agree to use the platform only for lawful purposes</li>
                          <li>You will not share your account credentials with others</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-white font-bold mb-2">Payment Terms</h4>
                        <p>
                          All payments are processed securely. Refunds are subject to our cancellation policy. Sessions must be cancelled at least 24 hours in advance to be eligible for a full refund.
                        </p>
                      </div>
                      <div>
                        <h4 className="text-white font-bold mb-2">Limitation of Liability</h4>
                        <p>
                          Brightbyt acts as a platform connecting students with tutors. We are not responsible for the quality of instruction provided by tutors, though we do verify their credentials.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cookie Policy */}
              <div id="cookies" className="scroll-mt-20">
                <div className="flex items-center gap-3 mb-4">
                  <Cookie className="w-6 h-6 text-orange-300" />
                  <h3 className="text-2xl font-bold text-white font-['Verdana',sans-serif]">Cookie Policy</h3>
                </div>
                <Card className="bg-white/5 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6">
                    <p className="text-gray-300 font-['Verdana',sans-serif] mb-4">
                      <strong className="text-white">Last Updated:</strong> {new Date().toLocaleDateString()}
                    </p>
                    <div className="space-y-4 text-gray-300 font-['Verdana',sans-serif]">
                      <p>
                        Brightbyt uses cookies and similar technologies to enhance your experience on our platform.
                      </p>
                      <div>
                        <h4 className="text-white font-bold mb-2">Types of Cookies We Use</h4>
                        <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                          <li><strong className="text-white">Essential Cookies:</strong> Required for the platform to function properly</li>
                          <li><strong className="text-white">Analytics Cookies:</strong> Help us understand how visitors use our platform</li>
                          <li><strong className="text-white">Preference Cookies:</strong> Remember your settings and preferences</li>
                          <li><strong className="text-white">Marketing Cookies:</strong> Used to deliver relevant advertisements</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-white font-bold mb-2">Managing Cookies</h4>
                        <p>
                          You can control and manage cookies through your browser settings. However, disabling certain cookies may affect the functionality of our platform.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.section>
        </div>
      </PageContainer>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  )
}

