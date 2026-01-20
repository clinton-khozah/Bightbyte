"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export function GoogleAdSenseFooterAd() {
  const pathname = usePathname();
  
  // Don't show ads on dashboard pages
  const isDashboard = pathname?.startsWith("/dashboard");
  
  useEffect(() => {
    if (!isDashboard && typeof window !== "undefined") {
      // Load ad immediately
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.error("AdSense error:", err);
      }
    }
  }, [isDashboard]);

  // Force ad refresh on mount for faster loading
  useEffect(() => {
    if (!isDashboard && typeof window !== "undefined" && window.adsbygoogle) {
      const timer = setTimeout(() => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (err) {
          // Silent fail
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isDashboard]);

  if (isDashboard) {
    return null;
  }

  return (
    <div className="w-full flex justify-center my-6 md:my-8 py-4 md:py-6 px-4">
      <div className="w-full max-w-6xl">
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", minHeight: "100px" }}
          data-ad-format="autorelaxed"
          data-ad-client="ca-pub-4896993903038581"
          data-ad-slot="9326127928"
        />
      </div>
    </div>
  );
}
