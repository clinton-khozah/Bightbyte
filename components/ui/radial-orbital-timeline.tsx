"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Link, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { SignInModal } from "@/components/auth/sign-in-modal";
import { SignUpModal } from "@/components/auth/sign-up-modal";

interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
}

export default function RadialOrbitalTimeline({
  timelineData,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
    {}
  );
  const [viewMode, setViewMode] = useState<"orbital">("orbital");
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(false);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false;
        }
      });

      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);

        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);

        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(false);
        setPulseEffect({});
      }

      return newState;
    });
  };

  // Auto-rotation disabled - component stays still
  useEffect(() => {
    // Rotation is disabled, so we don't need any timer
    return () => {
      // Cleanup not needed since we're not using timers
    };
  }, [autoRotate, viewMode]);

  const centerViewOnNode = (nodeId: number) => {
    if (viewMode !== "orbital" || !nodeRefs.current[nodeId]) return;

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;

    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = isMobile ? 120 : 250;
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.4,
      Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2))
    );

    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "text-white bg-blue-600 border-blue-600";
      case "in-progress":
        return "text-blue-600 bg-blue-50 border-blue-600";
      case "pending":
        return "text-gray-600 bg-gray-100 border-gray-300";
      default:
        return "text-gray-600 bg-gray-100 border-gray-300";
    }
  };

  return (
    <div
      className="w-full h-[70vh] min-h-[350px] md:min-h-[600px] flex flex-col items-center justify-center overflow-visible p-4 md:p-8"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full max-w-5xl h-full flex items-center justify-center overflow-visible">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          <div className="absolute w-12 h-12 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-500 via-blue-400 to-blue-600 flex items-center justify-center z-10 shadow-lg">
            <div className="w-10 h-10 md:w-20 md:h-20 rounded-full bg-white flex items-center justify-center">
              <Image
                src="/images/logo1.png"
                alt="Brightbyt Logo"
                width={32}
                height={32}
                className="object-contain w-8 h-8 md:w-14 md:h-14"
              />
            </div>
          </div>

          <div className="absolute w-[250px] h-[250px] md:w-[500px] md:h-[500px] rounded-full border-2 md:border-[3px] border-blue-200"></div>

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div
                key={item.id}
                ref={(el) => (nodeRefs.current[item.id] = el)}
                className="absolute transition-all duration-700 cursor-pointer"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                <div
                  className={`absolute rounded-full -inset-1 ${
                    isPulsing ? "animate-pulse duration-1000" : ""
                  } md:hidden`}
                  style={{
                    background: `radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0) 70%)`,
                    width: `${item.energy * 0.25 + 20}px`,
                    height: `${item.energy * 0.25 + 20}px`,
                    left: `-${(item.energy * 0.25 + 20 - 20) / 2}px`,
                    top: `-${(item.energy * 0.25 + 20 - 20) / 2}px`,
                  }}
                ></div>
                <div
                  className={`absolute rounded-full -inset-1 ${
                    isPulsing ? "animate-pulse duration-1000" : ""
                  } hidden md:block`}
                  style={{
                    background: `radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0) 70%)`,
                    width: `${item.energy * 0.5 + 40}px`,
                    height: `${item.energy * 0.5 + 40}px`,
                    left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                    top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                  }}
                ></div>

                <div
                  className={`
                  w-10 h-10 md:w-20 md:h-20 rounded-full flex items-center justify-center
                  ${
                    isExpanded
                      ? "bg-blue-600 text-white"
                      : isRelated
                      ? "bg-blue-100 text-blue-600"
                      : "bg-white text-blue-600"
                  }
                  border-2 md:border-[3px] 
                  ${
                    isExpanded
                      ? "border-blue-600 shadow-lg shadow-blue-200"
                      : isRelated
                      ? "border-blue-400"
                      : "border-blue-300"
                  }
                  transition-all duration-300 transform
                  ${isExpanded ? "scale-150 md:scale-150" : ""}
                `}
                >
                  <Icon className="w-4 h-4 md:w-7 md:h-7" />
                </div>

                <div
                  className={`
                  absolute top-12 md:top-24 whitespace-nowrap
                  text-[10px] md:text-base font-semibold tracking-wider
                  transition-all duration-300
                  ${isExpanded ? "text-blue-400 scale-125" : "text-blue-400"}
                `}
                >
                  {item.title}
                </div>
                <div
                  className={`
                  absolute top-16 md:top-36 whitespace-nowrap
                  text-[9px] md:text-sm font-medium tracking-wider
                  transition-all duration-300
                  ${isExpanded ? "text-blue-400 scale-110" : "text-blue-400/80"}
                `}
                >
                  {item.date}
                </div>

                {isExpanded && (
                  <Card className="absolute top-24 md:top-32 left-1/2 -translate-x-1/2 w-64 md:w-80 bg-white border border-gray-200 shadow-lg rounded-xl md:rounded-2xl overflow-visible">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-gray-200"></div>
                    <CardHeader className="pb-2 p-4 md:p-6">
                      <div className="flex justify-between items-center">
                        <Badge
                          className={`px-1.5 md:px-2 text-[10px] md:text-xs ${getStatusStyles(
                            item.status
                          )}`}
                        >
                          {item.status === "completed"
                            ? "COMPLETE"
                            : item.status === "in-progress"
                            ? "IN PROGRESS"
                            : "PENDING"}
                        </Badge>
                        <span className="text-[10px] md:text-xs font-mono text-gray-500">
                          {item.date}
                        </span>
                      </div>
                      <CardTitle className="text-sm md:text-lg mt-2 font-bold text-gray-900">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs md:text-sm text-gray-700 p-4 md:p-6 pt-0">
                      <div className="mb-3 md:mb-4 whitespace-pre-line leading-relaxed">
                        {item.content.split('\n').map((line, idx) => {
                          // Check if line is a tip bullet point
                          if (line.trim().startsWith('•') || line.trim().startsWith('💡')) {
                            return (
                              <div key={idx} className="mb-1.5 md:mb-2 flex items-start gap-2">
                                <span className="text-blue-600 font-semibold mt-0.5 flex-shrink-0">
                                  {line.trim().startsWith('💡') ? '💡' : '•'}
                                </span>
                                <span className="flex-1">{line.replace(/^[•💡]\s*/, '').trim()}</span>
                              </div>
                            );
                          }
                          // Regular paragraph
                          return (
                            <p key={idx} className={idx === 0 ? "mb-2 md:mb-3" : "mb-1.5 md:mb-2"}>
                              {line}
                            </p>
                          );
                        })}
                      </div>
                      {item.id === 1 && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSignInOpen(true);
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs md:text-sm h-8 md:h-10"
                        >
                          Sign In
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sign In Modal */}
      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        onSignUp={() => {
          setIsSignInOpen(false);
          setIsSignUpOpen(true);
        }}
      />

      {/* Sign Up Modal */}
      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
      />
    </div>
  );
}
