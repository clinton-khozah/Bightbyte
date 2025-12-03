"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Bot, Send, Sparkles, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar-client"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

type Message = {
  role: "user" | "assistant"
  content: string
}

export function AIAssistantButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi there! I'm your AI assistant. How can I help you with advertising today?",
    },
  ])
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
          "You are a helpful AI assistant for All Things Ads, a platform that connects advertisers, ad buyers, and affiliates. Provide concise, helpful responses about advertising and marketing. Keep answers brief and to the point.",
        temperature: 0.7,
        maxTokens: 200,
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

  return (
    <>
      {/* Floating button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.5,
        }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-14 w-14 shadow-lg p-0 relative overflow-hidden bg-gradient-to-r from-primary-600 to-secondary-500"
          size="icon"
        >
          <motion.div
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 20,
              ease: "linear",
              repeat: Number.POSITIVE_INFINITY,
            }}
            className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-20 rounded-full"
          />
          <Sparkles className="h-6 w-6 relative z-10 text-white" />
        </Button>
      </motion.div>

      {/* Chat dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-[400px] sm:max-h-[600px] h-[70vh] flex flex-col"
            >
              <Card className="w-full h-full flex flex-col rounded-t-lg sm:rounded-lg shadow-lg">
                <CardHeader className="border-b px-4 py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-primary" />
                    AI Assistant
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Link href="/ai-assistant">
                      <Button variant="ghost" size="sm" className="h-8 text-xs">
                        Full Version
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-4">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                      >
                        {message.role === "assistant" && (
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src="/images/favicon.png" alt="AI Assistant" />
                            <AvatarFallback>
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`px-3 py-2 rounded-lg max-w-[80%] ${
                            message.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </motion.div>
                    ))}
                    {isGenerating && (
                      <div className="flex justify-start">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src="/images/favicon.png" />
                          <AvatarFallback>
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="px-3 py-2 rounded-lg bg-muted">
                          <div className="flex space-x-1">
                            <motion.div
                              animate={{ scale: [0.5, 1, 0.5] }}
                              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: "easeInOut" }}
                              className="h-2 w-2 bg-primary/40 rounded-full"
                            />
                            <motion.div
                              animate={{ scale: [0.5, 1, 0.5] }}
                              transition={{
                                repeat: Number.POSITIVE_INFINITY,
                                duration: 1,
                                ease: "easeInOut",
                                delay: 0.2,
                              }}
                              className="h-2 w-2 bg-primary/40 rounded-full"
                            />
                            <motion.div
                              animate={{ scale: [0.5, 1, 0.5] }}
                              transition={{
                                repeat: Number.POSITIVE_INFINITY,
                                duration: 1,
                                ease: "easeInOut",
                                delay: 0.4,
                              }}
                              className="h-2 w-2 bg-primary/40 rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </CardContent>
                <CardFooter className="border-t p-3">
                  <form onSubmit={handleSubmit} className="flex w-full gap-2">
                    <Input
                      placeholder="Ask about advertising..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isGenerating}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={isGenerating || !input.trim()}
                      className="transition-all duration-200 hover:scale-105 bg-gradient-to-r from-primary-600 to-secondary-500"
                    >
                      <Send className="h-4 w-4 text-white" />
                    </Button>
                  </form>
                </CardFooter>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

