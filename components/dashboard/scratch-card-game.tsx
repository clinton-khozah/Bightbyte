"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Sparkles } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import styles from "./scratch-card-game.module.css";

interface ScratchCardGameProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

type EducationIcon = "📚" | "✏️" | "🎓" | "📝" | "🔬" | "🧮" | "📖" | "💡";

const EDUCATION_ICONS: EducationIcon[] = [
  "📚",
  "✏️",
  "🎓",
  "📝",
  "🔬",
  "🧮",
  "📖",
  "💡",
];

export function ScratchCardGame({
  isOpen,
  onClose,
  userId,
}: ScratchCardGameProps) {
  const [isScratching, setIsScratching] = useState(false);
  const [scratched, setScratched] = useState(false);
  const [icons, setIcons] = useState<EducationIcon[]>([]);
  const [discount, setDiscount] = useState<number | null>(null);
  const [discountCode, setDiscountCode] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Check total discounts given today and calculate available discount
  const getAvailableDiscount = async (): Promise<number> => {
    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;

      // Get sum of all discount percentages created today
      const { data, error } = await supabase
        .from("discount_codes")
        .select("discount_percentage")
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay);

      if (error) {
        console.error("Error fetching daily discounts:", error);
        return 300; // Default to full budget if error
      }

      const totalGivenToday = data?.reduce((sum, code) => {
        return sum + Number(code.discount_percentage);
      }, 0) || 0;

      const available = 300 - totalGivenToday;
      return Math.max(0, available); // Don't return negative
    } catch (error) {
      console.error("Error calculating available discount:", error);
      return 300; // Default to full budget if error
    }
  };

  // Generate random education icons for the card
  const generateIcons = async (): Promise<EducationIcon[]> => {
    const generated: EducationIcon[] = [];
    
    // Check available discount budget
    const availableDiscount = await getAvailableDiscount();
    
    // If no discount budget left, no wins allowed
    if (availableDiscount <= 0) {
      // Generate 3 different icons (no win)
      const shuffled = [...EDUCATION_ICONS].sort(() => Math.random() - 0.5);
      generated.push(shuffled[0], shuffled[1], shuffled[2]);
      return generated;
    }

    // Calculate win probability based on available budget
    // More budget = higher chance to win, but cap at 30% max
    const winProbability = Math.min(0.3, availableDiscount / 1000); // Scale based on budget
    const willWin = Math.random() < winProbability;

    if (willWin) {
      // Pick a random icon for winning
      const winningIcon =
        EDUCATION_ICONS[Math.floor(Math.random() * EDUCATION_ICONS.length)];
      generated.push(winningIcon, winningIcon, winningIcon);
    } else {
      // Generate 3 different icons (no win)
      const shuffled = [...EDUCATION_ICONS].sort(() => Math.random() - 0.5);
      generated.push(shuffled[0], shuffled[1], shuffled[2]);
    }

    return generated;
  };

  // Initialize card when opened
  useEffect(() => {
    if (isOpen) {
      // Reset all state when modal opens
      generateIcons().then((icons) => {
        setIcons(icons);
      });
      setIsScratching(false);
      setScratched(false);
      setDiscount(null);
      setDiscountCode("");
      setHasWon(false);

      // Reset canvas after state is reset
      let timeoutId: NodeJS.Timeout | undefined;
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          timeoutId = setTimeout(() => {
            // Check if canvas still exists before drawing
            if (!canvasRef.current || !canvasRef.current.parentElement) {
              return;
            }

            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            // Draw opaque silver scratch surface
            const gradient = ctx.createLinearGradient(
              0,
              0,
              canvas.width,
              canvas.height
            );
            gradient.addColorStop(0, "#c0c0c0");
            gradient.addColorStop(0.5, "#e8e8e8");
            gradient.addColorStop(1, "#c0c0c0");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw "SCRATCH ME" text
            ctx.fillStyle = "#666";
            ctx.font = "bold 24px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("SCRATCH ME", canvas.width / 2, canvas.height / 2);
          }, 150);
        }
      }

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [isOpen]);

  // Canvas setup and scratch functionality
  useEffect(() => {
    if (!canvasRef.current || !isOpen || scratched) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let timeoutId: NodeJS.Timeout;

    // Initialize canvas after DOM is ready
    const initCanvas = () => {
      // Set canvas size to match display size
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Set actual canvas size (accounting for device pixel ratio)
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      // Scale context to match device pixel ratio
      ctx.scale(dpr, dpr);

      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Draw opaque silver scratch surface (fully opaque to hide fruits)
      const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      gradient.addColorStop(0, "#c0c0c0");
      gradient.addColorStop(0.5, "#e8e8e8");
      gradient.addColorStop(1, "#c0c0c0");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Draw "SCRATCH ME" text
      ctx.fillStyle = "#666";
      ctx.font = `bold ${24 * dpr}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SCRATCH ME", rect.width / 2, rect.height / 2);
    };

    // Initialize canvas after a small delay to ensure DOM is ready
    timeoutId = setTimeout(initCanvas, 200);

    // Scratch functionality
    const handleMouseDown = (e: MouseEvent) => {
      isDrawingRef.current = true;
      setIsScratching(true);
      const rect = canvas.getBoundingClientRect();
      scratch(e.clientX - rect.left, e.clientY - rect.top);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDrawingRef.current) {
        const rect = canvas.getBoundingClientRect();
        scratch(e.clientX - rect.left, e.clientY - rect.top);
      }
    };

    const handleMouseUp = () => {
      isDrawingRef.current = false;
      checkScratchProgress();
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = true;
      setIsScratching(true);
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      scratch(touch.clientX - rect.left, touch.clientY - rect.top);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (isDrawingRef.current) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        scratch(touch.clientX - rect.left, touch.clientY - rect.top);
      }
    };

    const handleTouchEnd = () => {
      isDrawingRef.current = false;
      checkScratchProgress();
    };

    const scratch = (x: number, y: number) => {
      if (scratched) return;

      // Get device pixel ratio for accurate coordinate conversion
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Since we scaled the context by dpr, we can use coordinates directly
      // Use destination-out to erase the scratch layer and reveal fruits underneath
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 35, 0, Math.PI * 2);
      ctx.fill();
    };

    const checkScratchProgress = () => {
      if (scratched) return;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let scratchedPixels = 0;
      const totalPixels = pixels.length / 4;

      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] === 0) {
          scratchedPixels++;
        }
      }

      const scratchedPercentage = (scratchedPixels / totalPixels) * 100;

      // If 50% or more is scratched, reveal the result
      if (scratchedPercentage >= 50) {
        setScratched(true);
        setIsScratching(false);
        // Check win with current icons - use the icons from the closure
        if (icons.length === 3) {
          const allMatch = icons[0] === icons[1] && icons[1] === icons[2];
          if (allMatch) {
            // Check available discount before awarding
            getAvailableDiscount().then(async (availableDiscount) => {
              if (availableDiscount > 0) {
                setHasWon(true);
                // Generate random discount between 5% and 30%, but not more than available
                const maxDiscount = Math.min(30, availableDiscount);
                const minDiscount = Math.min(5, maxDiscount);
                const randomDiscount = Math.floor(Math.random() * (maxDiscount - minDiscount + 1)) + minDiscount;
                setDiscount(randomDiscount);
                // Record play and generate discount code
                await recordPlay();
                await generateDiscountCode(randomDiscount);
              } else {
                // No budget left, treat as loss
                setHasWon(false);
                await recordPlay();
              }
            });
          } else {
            setHasWon(false);
            recordPlay();
          }
        }
      }
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchmove", handleTouchMove);
    canvas.addEventListener("touchend", handleTouchEnd);

    return () => {
      clearTimeout(timeoutId);
      // Check if canvas still exists before removing listeners
      if (canvas && canvasRef.current) {
        try {
          canvas.removeEventListener("mousedown", handleMouseDown);
          canvas.removeEventListener("mousemove", handleMouseMove);
          canvas.removeEventListener("mouseup", handleMouseUp);
          canvas.removeEventListener("touchstart", handleTouchStart);
          canvas.removeEventListener("touchmove", handleTouchMove);
          canvas.removeEventListener("touchend", handleTouchEnd);
        } catch (error) {
          // Silently handle if canvas is already removed
          console.warn("Error removing event listeners:", error);
        }
      }
    };
  }, [isOpen, scratched, icons]);

  const recordPlay = async () => {
    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

      await supabase.from("scratch_card_plays").insert({
        user_id: userId,
        play_date: today,
      });
    } catch (error) {
      console.error("Error recording scratch card play:", error);
      // Don't block the game if recording fails
    }
  };

  const generateDiscountCode = async (discountPercent: number) => {
    setIsGenerating(true);
    try {
      // Generate unique code
      const code = `SCRATCH${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

      // Calculate expiration (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Save to database
      const { data, error } = await supabase
        .from("discount_codes")
        .insert({
          user_id: userId,
          code: code,
          discount_percentage: discountPercent,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error generating discount code:", error);
        // Still show the code even if DB save fails
        setDiscountCode(code);
      } else {
        setDiscountCode(code);
      }
    } catch (error) {
      console.error("Error generating discount code:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = () => {
    if (discountCode) {
      navigator.clipboard.writeText(discountCode);
      // You could add a toast notification here
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.closeButton} onClick={onClose}>
              <X className="w-5 h-5" />
            </button>

            <div className={styles.content}>
              <div className={styles.header}>
                <div className={styles.logoContainer}>
                  <Image
                    src="/images/logo1.png"
                    alt="BrightByt Logo"
                    width={60}
                    height={60}
                    className={styles.logo}
                  />
                </div>
                <h2 className={styles.title}>Daily Scratch Card</h2>
                <p className={styles.subtitle}>
                  Scratch to reveal education icons and win a discount!
                </p>
              </div>

              {!scratched ? (
                <div className={styles.cardContainer}>
                  <div className={styles.card}>
                    <canvas ref={canvasRef} className={styles.canvas} />
                    <div className={styles.fruitsUnderlay}>
                      <div className={styles.fruitSlot}>{icons[0]}</div>
                      <div className={styles.fruitSlot}>{icons[1]}</div>
                      <div className={styles.fruitSlot}>{icons[2]}</div>
                    </div>
                  </div>
                  <p className={styles.instruction}>
                    {isScratching
                      ? "Keep scratching..."
                      : "Drag your finger or mouse to scratch"}
                  </p>
                </div>
              ) : (
                <div className={styles.resultContainer}>
                  {hasWon ? (
                    <motion.div
                      className={styles.winResult}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", duration: 0.5 }}
                    >
                      <Gift className={styles.giftIcon} />
                      <h3 className={styles.winTitle}>
                        Congratulations! You Won!
                      </h3>
                      <div className={styles.fruitsReveal}>
                        <div className={styles.fruitReveal}>{icons[0]}</div>
                        <div className={styles.fruitReveal}>{icons[1]}</div>
                        <div className={styles.fruitReveal}>{icons[2]}</div>
                      </div>
                      <div className={styles.discountInfo}>
                        <p className={styles.discountText}>
                          You won a{" "}
                          <span className={styles.discountPercent}>
                            {discount}%
                          </span>{" "}
                          discount!
                        </p>
                        {isGenerating ? (
                          <div className={styles.loading}>
                            Generating your code...
                          </div>
                        ) : discountCode ? (
                          <div className={styles.codeContainer}>
                            <div className={styles.codeBox}>
                              <span className={styles.code}>
                                {discountCode}
                              </span>
                              <button
                                onClick={copyCode}
                                className={styles.copyButton}
                              >
                                Copy
                              </button>
                            </div>
                            <p className={styles.codeInfo}>
                              Use this code when booking a tutor. Valid for 30
                              days.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      className={styles.loseResult}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", duration: 0.5 }}
                    >
                      <h3 className={styles.loseTitle}>
                        Better luck next time!
                      </h3>
                      <div className={styles.fruitsReveal}>
                        <div className={styles.fruitReveal}>{icons[0]}</div>
                        <div className={styles.fruitReveal}>{icons[1]}</div>
                        <div className={styles.fruitReveal}>{icons[2]}</div>
                      </div>
                      <p className={styles.loseText}>
                        The icons don't match. Try again tomorrow! 😊
                      </p>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
