"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface LoadingLogoProps {
  size?: number;
  className?: string;
}

export function LoadingLogo({ size = 44, className = "" }: LoadingLogoProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative flex items-center justify-center"
      >
        <Image
          src="/images/loader.png"
          alt="BrightByt Loader"
          width={size}
          height={size}
          className="overflow-hidden"
          priority
          style={{
            objectFit: "contain",
          }}
        />
      </motion.div>
    </div>
  );
}
