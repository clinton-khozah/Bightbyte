import "@/app/globals.css"
import { Metadata } from "next"
import { ChatBot } from "@/components/chat-bot"
import { LoadingProvider } from "@/providers/loading-provider"
import { StarsBackground } from "@/components/stars-background"
import { ThemeProvider } from "@/components/theme-provider"
import { TranslationProvider } from "@/contexts/TranslationContext"
import { PageTranslator } from "@/components/page-translator"
import Script from "next/script"
import dynamic from "next/dynamic"

// Dynamically import GoogleAnalytics to avoid SSR issues with usePathname
const GoogleAnalytics = dynamic(
  () => import("@/components/google-analytics").then((mod) => ({
    default: mod.GoogleAnalytics,
  })),
  { ssr: false }
)

export const metadata: Metadata = {
  title: "Brightbyt",
  description: "Connecting job seekers with career opportunities worldwide. Your journey to professional success starts here.",
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
        {/* Google Analytics - Standard Implementation */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=G-3WTZLZ9TTE`}
        />
        <Script
          id="google-analytics-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-3WTZLZ9TTE', {
                  page_path: window.location.pathname,
                  page_location: window.location.href,
                  page_title: document.title,
                  send_page_view: true,
                  // Enable enhanced measurement
                  allow_enhanced_conversions: true,
                  allow_google_signals: true,
                  allow_ad_personalization_signals: true
                });
                // Track initial page view
                gtag('event', 'page_view', {
                  page_path: window.location.pathname,
                  page_location: window.location.href,
                  page_title: document.title
                });
                console.log('✅ Google Analytics initialized with ID: G-3WTZLZ9TTE');
                console.log('📊 DataLayer:', window.dataLayer);
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans">
        <GoogleAnalytics />
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
        {/* Preload critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </body>
    </html>
  )
}