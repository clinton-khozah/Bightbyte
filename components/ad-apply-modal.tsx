"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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
  const [adLoaded, setAdLoaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Require minimum 3 seconds before allowing continue
      const timer = setTimeout(() => {
        setMinTimeElapsed(true);
      }, 3000);

      // Load ad after a short delay to ensure DOM is ready
      const adTimer = setTimeout(() => {
        try {
          if (typeof window !== "undefined" && window.adsbygoogle) {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            setAdLoaded(true);
          }
        } catch (err) {
          console.error("AdSense error:", err);
          setAdLoaded(true);
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        clearTimeout(adTimer);
      };
    } else {
      setAdLoaded(false);
      setMinTimeElapsed(false);
    }
  }, [isOpen]);

  const handleContinue = () => {
    if (minTimeElapsed) {
      onContinue();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl font-bold text-gray-900">
            Apply for {jobTitle || "this position"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
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

          {/* Continue Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!minTimeElapsed}
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {minTimeElapsed ? "Continue to Apply" : "Please wait..."}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
