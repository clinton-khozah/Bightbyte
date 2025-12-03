"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Bot, Copy, Send, Sparkles, Wand2, Zap } from "lucide-react"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar-client"
import { useToast } from "@/hooks/use-toast"

// Define message type
type Message = {
  role: "user" | "assistant"
  content: string
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi there! I'm your AI assistant for All Things Ads. How can I help you today?",
    },
  ])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [adCopyPrompt, setAdCopyPrompt] = useState("")
  const [adCopyResult, setAdCopyResult] = useState("")
  const [adCopyType, setAdCopyType] = useState("social")
  const [adCopyTone, setAdCopyTone] = useState("professional")
  const [isGeneratingAdCopy, setIsGeneratingAdCopy] = useState(false)
  const [contentToModerate, setContentToModerate] = useState("")
  const [moderationResult, setModerationResult] = useState<null | {
    approved: boolean
    reason?: string
    suggestions?: string
  }>(null)
  const [isModeratingContent, setIsModeratingContent] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Handle chat submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isGenerating) return

    // Add user message
    const userMessage = { role: "user" as const, content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsGenerating(true)

    try {
      // Generate AI response
      const { text } = await generateText({
        model: openai("gpt-3.5-turbo"), // Using OpenAI as a fallback since DeepSeek isn't directly available
        prompt: input,
        system:
          "You are an AI assistant for All Things Ads, a platform that connects advertisers, ad buyers, and affiliates. You help with ad copy suggestions, marketing advice, and platform usage questions. Keep responses concise, helpful, and focused on advertising and marketing.",
        temperature: 0.7,
        maxTokens: 500,
      })

      // Add AI response
      setMessages((prev) => [...prev, { role: "assistant", content: text }])
    } catch (error) {
      console.error("Error generating response:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm sorry, I encountered an error. Please try again later.",
        },
      ])
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate ad copy
  const generateAdCopy = async () => {
    if (!adCopyPrompt.trim() || isGeneratingAdCopy) return

    setIsGeneratingAdCopy(true)
    setAdCopyResult("")

    try {
      const { text } = await generateText({
        model: openai("gpt-3.5-turbo"),
        prompt: `Create ${adCopyType} ad copy with a ${adCopyTone} tone for: ${adCopyPrompt}`,
        system:
          "You are an expert copywriter specializing in creating compelling ad copy. Generate concise, engaging, and effective ad copy based on the user's specifications.",
        temperature: 0.8,
        maxTokens: 300,
      })

      setAdCopyResult(text)
    } catch (error) {
      console.error("Error generating ad copy:", error)
      setAdCopyResult("Failed to generate ad copy. Please try again later.")
    } finally {
      setIsGeneratingAdCopy(false)
    }
  }

  // Moderate content
  const moderateContent = async () => {
    if (!contentToModerate.trim() || isModeratingContent) return

    setIsModeratingContent(true)
    setModerationResult(null)

    try {
      const { text } = await generateText({
        model: openai("gpt-3.5-turbo"),
        prompt: `Moderate this ad content and determine if it's appropriate: "${contentToModerate}". If it's not appropriate, explain why and suggest improvements.`,
        system:
          "You are an AI content moderator for an advertising platform. Analyze the provided content and determine if it complies with standard advertising policies. Check for inappropriate language, misleading claims, offensive content, and prohibited products/services. Respond in JSON format with 'approved' (boolean), 'reason' (string, only if not approved), and 'suggestions' (string, only if not approved).",
        temperature: 0.3,
        maxTokens: 500,
      })

      try {
        // Try to parse the response as JSON
        const jsonResult = JSON.parse(text)
        setModerationResult(jsonResult)
      } catch (e) {
        // If parsing fails, create a structured response
        const approved = text.toLowerCase().includes("approved") && !text.toLowerCase().includes("not approved")
        setModerationResult({
          approved,
          reason: approved ? undefined : "Content may violate advertising policies",
          suggestions: approved ? undefined : text,
        })
      }
    } catch (error) {
      console.error("Error moderating content:", error)
      setModerationResult({
        approved: false,
        reason: "Error processing moderation request",
        suggestions: "Please try again later.",
      })
    } finally {
      setIsModeratingContent(false)
    }
  }

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "The text has been copied to your clipboard.",
    })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="py-12 bg-muted/50">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4" variant="outline">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                AI-Powered
              </Badge>
              <h1 className="text-4xl font-bold mb-4">AI Assistant</h1>
              <p className="text-xl text-muted-foreground">
                Get help with ad copy, content moderation, and marketing advice
              </p>
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="container">
            <Tabs defaultValue="chat" className="max-w-5xl mx-auto">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="chat">AI Chat</TabsTrigger>
                <TabsTrigger value="ad-copy">Ad Copy Generator</TabsTrigger>
                <TabsTrigger value="moderation">Content Moderation</TabsTrigger>
              </TabsList>

              {/* AI Chat Tab */}
              <TabsContent value="chat" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Chat with AI Assistant</CardTitle>
                    <CardDescription>
                      Ask questions about advertising, marketing strategies, or using the platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px] overflow-y-auto border rounded-md p-4 mb-4">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex mb-4 ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                        >
                          {message.role === "assistant" && (
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarImage src="/placeholder.svg?height=32&width=32" />
                              <AvatarFallback>
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`px-4 py-2 rounded-lg max-w-[80%] ${
                              message.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          </div>
                          {message.role === "user" && (
                            <Avatar className="h-8 w-8 ml-2">
                              <AvatarImage src="/placeholder.svg?height=32&width=32" />
                              <AvatarFallback>U</AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSubmit} className="flex gap-2">
                      <Input
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isGenerating}
                      />
                      <Button type="submit" disabled={isGenerating || !input.trim()}>
                        {isGenerating ? (
                          <>Generating...</>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">
                    <p>Powered by DeepSeek R1 - Optimized for advertising and marketing assistance</p>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Ad Copy Generator Tab */}
              <TabsContent value="ad-copy" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Ad Copy Generator</CardTitle>
                    <CardDescription>Generate compelling ad copy for your campaigns</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Ad Type</label>
                          <Select value={adCopyType} onValueChange={setAdCopyType}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select ad type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="social">Social Media Ad</SelectItem>
                              <SelectItem value="display">Display Banner Ad</SelectItem>
                              <SelectItem value="search">Search Ad</SelectItem>
                              <SelectItem value="email">Email Campaign</SelectItem>
                              <SelectItem value="video">Video Ad Script</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Tone</label>
                          <Select value={adCopyTone} onValueChange={setAdCopyTone}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tone" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="casual">Casual</SelectItem>
                              <SelectItem value="humorous">Humorous</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                              <SelectItem value="inspirational">Inspirational</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">What are you advertising?</label>
                        <Textarea
                          placeholder="Describe your product, service, or offer in detail..."
                          value={adCopyPrompt}
                          onChange={(e) => setAdCopyPrompt(e.target.value)}
                          rows={4}
                        />
                      </div>

                      <Button
                        onClick={generateAdCopy}
                        disabled={isGeneratingAdCopy || !adCopyPrompt.trim()}
                        className="w-full"
                      >
                        {isGeneratingAdCopy ? (
                          <>Generating...</>
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4 mr-2" />
                            Generate Ad Copy
                          </>
                        )}
                      </Button>

                      {adCopyResult && (
                        <div className="mt-6 space-y-2">
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Generated Ad Copy</h3>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(adCopyResult)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy
                            </Button>
                          </div>
                          <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">{adCopyResult}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Content Moderation Tab */}
              <TabsContent value="moderation" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Content Moderation</CardTitle>
                    <CardDescription>Check if your ad content complies with advertising policies</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Enter content to moderate</label>
                        <Textarea
                          placeholder="Paste your ad content here..."
                          value={contentToModerate}
                          onChange={(e) => setContentToModerate(e.target.value)}
                          rows={6}
                        />
                      </div>

                      <Button
                        onClick={moderateContent}
                        disabled={isModeratingContent || !contentToModerate.trim()}
                        className="w-full"
                      >
                        {isModeratingContent ? (
                          <>Analyzing...</>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Check Content
                          </>
                        )}
                      </Button>

                      {moderationResult && (
                        <div className="mt-6 space-y-4">
                          <div className="flex items-center gap-2">
                            <Badge variant={moderationResult.approved ? "success" : "destructive"}>
                              {moderationResult.approved ? "Approved" : "Needs Review"}
                            </Badge>
                            <span className="text-sm font-medium">
                              {moderationResult.approved
                                ? "This content appears to comply with standard advertising policies."
                                : "This content may violate advertising policies."}
                            </span>
                          </div>

                          {!moderationResult.approved && moderationResult.reason && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Reason:</h4>
                              <p className="text-sm text-muted-foreground">{moderationResult.reason}</p>
                            </div>
                          )}

                          {!moderationResult.approved && moderationResult.suggestions && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium">Suggestions:</h4>
                              <div className="bg-muted p-4 rounded-md text-sm">
                                <p className="whitespace-pre-wrap">{moderationResult.suggestions}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-12 bg-muted/30">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">How Our AI Can Help You</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Leverage the power of AI to enhance your advertising strategy
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <div className="bg-primary/10 p-3 rounded-lg w-fit mb-4">
                    <Wand2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>AI-Generated Ad Copy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Create compelling ad copy for different platforms in seconds. Our AI understands your product and
                    target audience to generate high-converting text.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="bg-primary/10 p-3 rounded-lg w-fit mb-4">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>24/7 Marketing Assistant</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Get instant answers to your advertising questions, platform guidance, and marketing strategy advice
                    from our AI assistant.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="bg-primary/10 p-3 rounded-lg w-fit mb-4">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Content Moderation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Ensure your ad content complies with platform policies before submission. Our AI checks for
                    potential issues and suggests improvements.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

