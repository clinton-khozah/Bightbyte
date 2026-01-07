import "@/app/globals.css";
import { Metadata } from "next";
import { ChatBot } from "@/components/chat-bot";
import { LoadingProvider } from "@/providers/loading-provider";
import { StarsBackground } from "@/components/stars-background";
import { ThemeProvider } from "@/components/theme-provider";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { PageTranslator } from "@/components/page-translator";
import Script from "next/script";
import dynamic from "next/dynamic";

// Dynamically import Toaster to avoid SSR issues
const Toaster = dynamic(
  () =>
    import("@/components/ui/sonner").then((mod) => ({ default: mod.Toaster })),
  { ssr: false }
);

// Dynamically import GoogleAnalytics to avoid SSR issues with usePathname
const GoogleAnalytics = dynamic(
  () =>
    import("@/components/google-analytics").then((mod) => ({
      default: mod.GoogleAnalytics,
    })),
  { ssr: false }
);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://brightbyte.co.za";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:
      "Brightbyt - Career Opportunities Platform | Jobs, Internships, Learnerships & Bursaries",
    template: "%s | Brightbyt",
  },
  description:
    "Brightbyt connects job seekers with career opportunities worldwide. Find jobs, internships, learnerships, and bursaries. Post jobs, connect with employers, and advance your career. Your journey to professional success starts here.",
  keywords: [
    "jobs",
    "career opportunities",
    "job search",
    "employment",
    "internships",
    "learnerships",
    "bursaries",
    "job board",
    "career platform",
    "job seekers",
    "employers",
    "recruitment",
    "South Africa jobs",
    "remote jobs",
    "full-time jobs",
    "part-time jobs",
    "IT jobs",
    "engineering jobs",
    "finance jobs",
    "healthcare jobs",
    "marketing jobs",
    "education jobs",
    "sales jobs",
    "human resources jobs",
    "legal jobs",
    "operations jobs",
    "customer service jobs",
    "design jobs",
    "media jobs",
  ],
  authors: [{ name: "Brightbyt Team" }],
  creator: "Brightbyt",
  publisher: "Brightbyt",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/images/logo1.png",
    shortcut: "/images/logo1.png",
    apple: "/images/logo1.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Brightbyt",
    title:
      "Brightbyt - Career Opportunities Platform | Jobs, Internships, Learnerships & Bursaries",
    description:
      "Connect with career opportunities worldwide. Find jobs, internships, learnerships, and bursaries. Post jobs and advance your career.",
    images: [
      {
        url: `${siteUrl}/images/logo1.png`,
        width: 1200,
        height: 630,
        alt: "Brightbyt - Career Opportunities Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brightbyt - Career Opportunities Platform",
    description:
      "Connect with career opportunities worldwide. Find jobs, internships, learnerships, and bursaries.",
    images: [`${siteUrl}/images/logo1.png`],
    creator: "@brightbyt",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code", // Add your Google Search Console verification code
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
  alternates: {
    canonical: siteUrl,
  },
  category: "Career & Employment",
  other: {
    "google-adsense-account": "ca-pub-4896993903038581",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0"
        />
        <meta name="theme-color" content="#2563eb" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="google-adsense-account" content="ca-pub-4896993903038581" />
        <link rel="canonical" href={siteUrl} />
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Brightbyt",
              url: siteUrl,
              description:
                "Career opportunities platform connecting job seekers with employers worldwide",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${siteUrl}/jobs?search={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
              publisher: {
                "@type": "Organization",
                name: "Brightbyt",
                logo: {
                  "@type": "ImageObject",
                  url: `${siteUrl}/images/logo1.png`,
                },
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Brightbyt",
              url: siteUrl,
              logo: `${siteUrl}/images/logo1.png`,
              description:
                "Career opportunities platform connecting job seekers with employers worldwide",
              sameAs: [
                "https://twitter.com/brightbyt",
                "https://facebook.com/brightbyt",
                "https://linkedin.com/company/brightbyt",
              ],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "Customer Service",
                email: "support@brightbyt.com",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "JobPosting",
              hiringOrganization: {
                "@type": "Organization",
                name: "Brightbyt",
              },
              jobLocation: {
                "@type": "Place",
                address: {
                  "@type": "PostalAddress",
                  addressCountry: "ZA",
                },
              },
              employmentType: "FULL_TIME,PART_TIME,CONTRACTOR,INTERN",
            }),
          }}
        />
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
        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4896993903038581"
          crossOrigin="anonymous"
          strategy="afterInteractive"
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
            <Toaster />
          </ThemeProvider>
        </TranslationProvider>
      </body>
    </html>
  );
}
