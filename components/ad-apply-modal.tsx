"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  jobTitle?: string;
}

export function AdApplyModal({ isOpen, onClose, onContinue, jobTitle }: AdApplyModalProps) {
  const [countdown, setCountdown] = useState(7);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCountdown(7);
      setShowButton(false);

      // Countdown timer
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setShowButton(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Load ad after a short delay to ensure DOM is ready
      const adTimer = setTimeout(() => {
        try {
          if (typeof window !== "undefined" && window.adsbygoogle) {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          }
        } catch (err) {
          console.error("AdSense error:", err);
        }
      }, 100);

      return () => {
        clearInterval(countdownInterval);
        clearTimeout(adTimer);
      };
    } else {
      setCountdown(7);
      setShowButton(false);
    }
  }, [isOpen]);

  const handleContinue = () => {
    if (showButton) {
      onContinue();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl font-bold text-gray-900 text-center">
            Apply for {jobTitle || "this position"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Countdown Display */}
          {!showButton && (
            <div className="text-center py-4">
              <div className="text-4xl md:text-6xl font-bold text-blue-600 mb-2">
                {countdown}
              </div>
              <p className="text-gray-600 text-sm md:text-base">
                Please wait while we load the application...
              </p>
            </div>
          )}

          {/* Ad Unit */}
          <div className="w-full flex justify-center py-4 border-2 border-gray-200 rounded-lg bg-gray-50">
            <div className="w-full max-w-lg">
              <ins
                className="adsbygoogle"
                style={{ display: "block", width: "100%", minHeight: "250px" }}
                data-ad-format="fluid"
                data-ad-layout-key="-gw-3+1f-3d+2z"
                data-ad-client="ca-pub-4896993903038581"
                data-ad-slot="5500409462"
              />
            </div>
          </div>

          {/* Continue Button - Only shows after countdown */}
          {showButton && (
            <div className="flex justify-center pt-4 border-t">
              <Button
                onClick={handleContinue}
                className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg"
              >
                Continue to Apply
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
