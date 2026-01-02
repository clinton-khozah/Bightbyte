"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs-client";
import {
  generateWelcomeEmail,
  generateJobMatchEmail,
  generateAlertEmail,
  sendEmail,
} from "@/lib/email-service";

export default function TestEmailPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [emailType, setEmailType] = useState<"welcome" | "job-match" | "alert">("welcome");

  const handlePreview = () => {
    let html = "";
    
    switch (emailType) {
      case "welcome":
        html = generateWelcomeEmail(name || "John Doe", email || "test@example.com");
        break;
      case "job-match":
        html = generateJobMatchEmail(
          name || "John Doe",
          "Senior Software Developer",
          "Tech Solutions Inc.",
          "Full-time",
          "Remote",
          "Matches your preferred category: IT",
          "https://brightbyt.com/jobs/123"
        );
        break;
      case "alert":
        html = generateAlertEmail(
          name || "John Doe",
          "New Opportunities Available",
          "We have new job postings that might interest you. Check out our latest opportunities!",
          "https://brightbyt.com/jobs",
          "View Jobs"
        );
        break;
    }
    
    setPreviewHtml(html);
  };

  const handleSendTest = async () => {
    if (!email) {
      alert("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      let html = "";
      let subject = "";

      switch (emailType) {
        case "welcome":
          html = generateWelcomeEmail(name || "User", email);
          subject = "Welcome to Brightbyt! 🎉";
          break;
        case "job-match":
          html = generateJobMatchEmail(
            name || "User",
            "Senior Software Developer",
            "Tech Solutions Inc.",
            "Full-time",
            "Remote",
            "Matches your preferred category: IT",
            `${window.location.origin}/jobs/123`
          );
          subject = "🎯 New Job Match - Brightbyt";
          break;
        case "alert":
          html = generateAlertEmail(
            name || "User",
            "New Opportunities Available",
            "We have new job postings that might interest you. Check out our latest opportunities!",
            `${window.location.origin}/jobs`,
            "View Jobs"
          );
          subject = "New Opportunities - Brightbyt";
          break;
      }

      const success = await sendEmail({
        to: email,
        subject: subject,
        html: html,
      });

      if (success) {
        alert("✅ Email sent successfully! Check your inbox.");
      } else {
        alert("⚠️ Email queued (check console for details in development mode)");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to send email. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Testing & Preview</h1>
        <p className="text-gray-600 mb-8">Test and preview Brightbyt email templates</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={emailType} onValueChange={(v) => setEmailType(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="welcome">Welcome</TabsTrigger>
                  <TabsTrigger value="job-match">Job Match</TabsTrigger>
                  <TabsTrigger value="alert">Alert</TabsTrigger>
                </TabsList>

                <TabsContent value="welcome" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Recipient Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email Address</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="test@example.com"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="job-match" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Recipient Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email Address</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="test@example.com"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Job details are pre-filled for testing. In production, these come from the job posting.
                  </p>
                </TabsContent>

                <TabsContent value="alert" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Recipient Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email Address</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="test@example.com"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-4">
                <Button onClick={handlePreview} variant="outline" className="flex-1">
                  Preview Email
                </Button>
                <Button
                  onClick={handleSendTest}
                  disabled={loading || !email}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? "Sending..." : "Send Test Email"}
                </Button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                <p className="font-semibold mb-1">📝 Note:</p>
                <p>
                  In development mode, emails are logged to console. Configure RESEND_API_KEY 
                  environment variable for production email sending.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Email Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {previewHtml ? (
                <div
                  className="border rounded-lg overflow-hidden"
                  style={{ maxHeight: "600px", overflowY: "auto" }}
                >
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full"
                    style={{ minHeight: "500px", border: "none" }}
                    title="Email Preview"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-400">
                  <p>Click "Preview Email" to see the template</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

