import "@/app/globals.css"
import { Metadata } from "next"
import { ChatBot } from "@/components/chat-bot"
import { LoadingProvider } from "@/providers/loading-provider"
import { StarsBackground } from "@/components/stars-background"
import { ThemeProvider } from "@/components/theme-provider"
import { TranslationProvider } from "@/contexts/TranslationContext"
import { PageTranslator } from "@/components/page-translator"

export const metadata: Metadata = {
  title: "Brightbyt",
  description: "Connecting students with expert tutors and mentors worldwide. Your journey to academic excellence starts here.",
  icons: {
    icon: '/images/logo1.png',
    shortcut: '/images/logo1.png',
    apple: '/images/logo1.png',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      </head>
      <body className="font-sans">
        <TranslationProvider>
          <PageTranslator />
          <ThemeProvider>
            <LoadingProvider>
              <StarsBackground />
              {children}
            </LoadingProvider>
            <ChatBot />
          </ThemeProvider>
        </TranslationProvider>
      </body>
    </html>
  )
}