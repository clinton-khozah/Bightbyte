"use client";

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PageContainer } from "@/components/page-container";
import { AnimatedContent } from "@/components/animated-content";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, Eye, FileText, Mail, Globe } from "lucide-react";
import { Metadata } from "next";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <PageContainer>
        <AnimatedContent>
          <div className="container py-12">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <Shield className="w-10 h-10 text-blue-600" />
                <h1 className="text-4xl md:text-5xl font-bold text-white font-['Verdana',sans-serif] drop-shadow-lg">
                  Privacy Policy
                </h1>
              </div>
              <p className="text-gray-300 mb-8 font-['Verdana',sans-serif]">
                <strong className="text-white">Last Updated:</strong>{" "}
                {new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>

              <Card className="bg-white/10 backdrop-blur-sm border-white/20 mb-6">
                <CardContent className="p-6 md:p-8">
                  <div className="space-y-6 text-gray-300 font-['Verdana',sans-serif]">
                    <div>
                      <p className="text-lg mb-4">
                        At Brightbyt, we are committed to protecting your
                        privacy. This Privacy Policy explains how we collect,
                        use, and safeguard your personal information when you
                        use our platform.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <h2 className="text-2xl font-bold text-white">
                          Information We Collect
                        </h2>
                      </div>
                      <p className="mb-3">
                        We collect information that you provide directly to us,
                        including:
                      </p>
                      <ul className="list-disc list-inside ml-4 space-y-2">
                        <li>Name, email address, and contact information</li>
                        <li>Resume/CV and application documents</li>
                        <li>Profile information and job preferences</li>
                        <li>Company information (for recruiters)</li>
                        <li>
                          Job application history and communication records
                        </li>
                        <li>Payment information (processed securely)</li>
                        <li>Usage data and website analytics</li>
                      </ul>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Eye className="w-5 h-5 text-blue-400" />
                        <h2 className="text-2xl font-bold text-white">
                          How We Use Your Information
                        </h2>
                      </div>
                      <p className="mb-3">We use the information we collect to:</p>
                      <ul className="list-disc list-inside ml-4 space-y-2">
                        <li>
                          Connect job seekers with relevant opportunities
                        </li>
                        <li>Match recruiters with qualified candidates</li>
                        <li>Process job applications and communications</li>
                        <li>Send job alerts and notifications</li>
                        <li>Improve our platform and user experience</li>
                        <li>Process payments and transactions</li>
                        <li>Comply with legal obligations</li>
                        <li>Prevent fraud and ensure platform security</li>
                      </ul>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Lock className="w-5 h-5 text-blue-400" />
                        <h2 className="text-2xl font-bold text-white">
                          Data Security
                        </h2>
                      </div>
                      <p>
                        We implement industry-standard security measures to
                        protect your personal information, including:
                      </p>
                      <ul className="list-disc list-inside ml-4 space-y-2 mt-3">
                        <li>SSL encryption for data transmission</li>
                        <li>Secure server infrastructure</li>
                        <li>Regular security audits and updates</li>
                        <li>Access controls and authentication</li>
                        <li>Data backup and recovery systems</li>
                      </ul>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Globe className="w-5 h-5 text-blue-400" />
                        <h2 className="text-2xl font-bold text-white">
                          Third-Party Services
                        </h2>
                      </div>
                      <p className="mb-3">
                        We may use third-party services that collect, monitor,
                        and analyze information, including:
                      </p>
                      <ul className="list-disc list-inside ml-4 space-y-2">
                        <li>
                          <strong>Google Analytics:</strong> To analyze website
                          usage and improve user experience
                        </li>
                        <li>
                          <strong>Payment Processors:</strong> To securely
                          process payments
                        </li>
                        <li>
                          <strong>Email Services:</strong> To send notifications
                          and communications
                        </li>
                        <li>
                          <strong>Cloud Storage:</strong> To store and manage
                          data securely
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-white mb-3">
                        Cookies and Tracking Technologies
                      </h2>
                      <p className="mb-3">
                        We use cookies and similar tracking technologies to:
                      </p>
                      <ul className="list-disc list-inside ml-4 space-y-2">
                        <li>Remember your preferences and settings</li>
                        <li>Analyze website traffic and usage patterns</li>
                        <li>Provide personalized content and ads</li>
                        <li>Improve website functionality</li>
                      </ul>
                      <p className="mt-3">
                        You can control cookies through your browser settings.
                        However, disabling cookies may limit some website
                        functionality.
                      </p>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-white mb-3">
                        Your Rights
                      </h2>
                      <p className="mb-3">
                        You have the right to:
                      </p>
                      <ul className="list-disc list-inside ml-4 space-y-2">
                        <li>Access your personal information</li>
                        <li>Correct inaccurate or incomplete data</li>
                        <li>Request deletion of your data</li>
                        <li>Opt-out of marketing communications</li>
                        <li>Request data portability</li>
                        <li>File a complaint with data protection authorities</li>
                      </ul>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-white mb-3">
                        Data Retention
                      </h2>
                      <p>
                        We retain your personal information for as long as
                        necessary to fulfill the purposes outlined in this
                        Privacy Policy, unless a longer retention period is
                        required or permitted by law.
                      </p>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-white mb-3">
                        Children's Privacy
                      </h2>
                      <p>
                        Our platform is not intended for children under 18 years
                        of age. We do not knowingly collect personal information
                        from children. If you believe we have collected
                        information from a child, please contact us immediately.
                      </p>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-white mb-3">
                        Changes to This Privacy Policy
                      </h2>
                      <p>
                        We may update this Privacy Policy from time to time. We
                        will notify you of any changes by posting the new
                        Privacy Policy on this page and updating the "Last
                        Updated" date. You are advised to review this Privacy
                        Policy periodically for any changes.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Mail className="w-5 h-5 text-blue-400" />
                        <h2 className="text-2xl font-bold text-white">
                          Contact Us
                        </h2>
                      </div>
                      <p className="mb-3">
                        If you have any questions about this Privacy Policy or
                        our data practices, please contact us:
                      </p>
                      <div className="bg-white/5 rounded-lg p-4 space-y-2">
                        <p>
                          <strong className="text-white">Email:</strong>{" "}
                          <a
                            href="mailto:support@brightbyt.com"
                            className="text-blue-400 hover:underline"
                          >
                            support@brightbyt.com
                          </a>
                        </p>
                        <p>
                          <strong className="text-white">Website:</strong>{" "}
                          <a
                            href="https://brightbyt.com/contact"
                            className="text-blue-400 hover:underline"
                          >
                            https://brightbyt.com/contact
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </AnimatedContent>
      </PageContainer>
      <Footer />
    </div>
  );
}

