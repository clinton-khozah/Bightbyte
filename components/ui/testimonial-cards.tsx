"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

interface Testimonial {
  id: string;
  testimonial: string;
  author: string;
  avatar?: string;
  rating?: number;
}

interface TestimonialCardProps {
  handleShuffle: () => void;
  testimonial: string;
  position: string;
  id: string;
  author: string;
  avatar?: string;
  rating?: number;
}

export function TestimonialCard({
  handleShuffle,
  testimonial,
  position,
  id,
  author,
  avatar,
  rating,
}: TestimonialCardProps) {
  const dragRef = React.useRef(0);
  const isFront = position === "front";

  const renderStars = () => {
    if (!rating) return null;
    
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star
            key={i}
            className="h-4 w-4 fill-sky-400 text-sky-400"
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star
            key={i}
            className="h-4 w-4 fill-sky-400/50 text-sky-400"
          />
        );
      } else {
        stars.push(
          <Star
            key={i}
            className="h-4 w-4 fill-none text-sky-400/20"
          />
        );
      }
    }
    return stars;
  };

  return (
    <motion.div
      style={{
        zIndex: position === "front" ? "2" : position === "middle" ? "1" : "0",
        boxShadow: isFront 
          ? "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.1)" 
          : "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(59, 130, 246, 0.05)",
      }}
      animate={{
        rotate:
          position === "front"
            ? "-6deg"
            : position === "middle"
            ? "0deg"
            : "6deg",
        x: position === "front" ? "0%" : position === "middle" ? "33%" : "66%",
      }}
      drag={isFront ? "x" : false}
      dragElastic={0.35}
      dragConstraints={{
        left: -200,
        right: 200,
      }}
      onDragStart={(event, info) => {
        dragRef.current = info.point.x;
      }}
      onDragEnd={(event, info) => {
        if (dragRef.current - info.point.x > 150) {
          handleShuffle();
        }
        dragRef.current = 0;
      }}
      transition={{ duration: 0.35 }}
      className={`absolute left-0 top-0 flex h-[480px] w-[380px] select-none flex-col items-center justify-start rounded-3xl border border-blue-200/60 bg-gradient-to-br from-blue-50/90 via-blue-100/85 to-blue-50/80 p-8 shadow-2xl backdrop-blur-lg ${
        isFront ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      {/* Profile Image with elegant border */}
      <div className="flex-shrink-0 mb-5 relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-200/40 to-blue-300/40 blur-sm -z-10"></div>
        <img
          src={avatar || `https://i.pravatar.cc/128?img=${id}`}
          alt={`Avatar of ${author}`}
          className="pointer-events-none h-28 w-28 rounded-full border-[3px] border-blue-200/80 bg-gradient-to-br from-slate-50 to-slate-100 object-cover shadow-lg ring-2 ring-white/50"
          onError={(e) => {
            (
              e.target as HTMLImageElement
            ).src = `https://i.pravatar.cc/128?img=${id}`;
          }}
        />
      </div>

      {/* Star Rating */}
      {rating && (
        <div className="flex-shrink-0 mb-5">
          <div className="flex items-center justify-center gap-0.5 bg-sky-50/50 px-4 py-2 rounded-full border border-sky-100/50">
            {renderStars()}
          </div>
        </div>
      )}

      {/* Quote Icon */}
      <div className="flex-shrink-0 mb-4">
        <svg 
          className="w-8 h-8 text-blue-300/60" 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l1.017 2.391c-3.312.783-5.538 3.391-5.538 6.609v7h6v6h-10.462zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l1.017 2.391c-3.312.783-5.538 3.391-5.538 6.609v7h6v6h-9.931z"/>
        </svg>
      </div>

      {/* Testimonial Text */}
      <div className="flex-1 flex flex-col justify-center w-full min-h-0 px-2">
        <p className="text-center text-base leading-relaxed font-light text-slate-700 line-clamp-5 overflow-hidden italic">
          {testimonial}
        </p>
      </div>

      {/* Author Name */}
      <div className="flex-shrink-0 mt-6 w-full pt-4 border-t border-blue-100/50">
        <p className="block text-center text-sm font-semibold text-blue-600 truncate tracking-wide">
          {author}
        </p>
      </div>
    </motion.div>
  );
}

export function ShuffleCards() {
  const [testimonials, setTestimonials] = React.useState<Testimonial[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [positions, setPositions] = React.useState(["front", "middle", "back"]);

  // Fetch testimonials from API
  React.useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setLoading(true);
        console.log("Fetching testimonials from API...");
        const response = await fetch(
          "http://127.0.0.1:8000/api/v1/mentors/testimonials/list/",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        console.log("Response status:", response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("HTTP error response:", errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API response data:", data);

        if (data.success) {
          if (data.testimonials && data.testimonials.length > 0) {
            console.log(`Found ${data.testimonials.length} approved testimonials`);
            
            // Map API data to component format
            const mappedTestimonials: Testimonial[] = data.testimonials
              .slice(0, 3)
              .map((testimonial: any) => {
                // Format author string
                let author = testimonial.student_name;
                if (testimonial.student_role) {
                  author += ` - ${testimonial.student_role}`;
                }
                if (testimonial.student_company) {
                  author += ` @ ${testimonial.student_company}`;
                }

                return {
                  id: testimonial.id,
                  testimonial: testimonial.content,
                  author: author,
                  avatar: testimonial.avatar_url,
                  rating: testimonial.rating || testimonial.star_rating || undefined,
                };
              });

            console.log("Mapped testimonials:", mappedTestimonials);

            // Ensure we have at least 3 testimonials (pad with empty if needed)
            while (
              mappedTestimonials.length < 3 &&
              mappedTestimonials.length > 0
            ) {
              mappedTestimonials.push(mappedTestimonials[0]);
            }

            setTestimonials(
              mappedTestimonials.length > 0 ? mappedTestimonials : []
            );
          } else {
            console.log("No approved testimonials found in database");
            console.log("Note: Only testimonials with is_approved=true are shown on the website");
            setTestimonials([]);
          }
        } else {
          console.error("API returned success=false:", data.message);
          setTestimonials([]);
        }
      } catch (error: any) {
        console.error("Error fetching testimonials:", error);
        console.error("Error details:", error.message);
        setTestimonials([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  const handleShuffle = () => {
    const newPositions = [...positions];
    newPositions.unshift(newPositions.pop());
    setPositions(newPositions);
  };

  if (loading) {
    return (
      <div className="grid place-content-center overflow-hidden bg-transparent px-8 py-24 min-h-screen h-full w-full">
        <div className="text-slate-700">Loading testimonials...</div>
      </div>
    );
  }

  if (testimonials.length === 0) {
    return (
      <div className="grid place-content-center overflow-hidden bg-transparent px-8 py-24 min-h-screen h-full w-full">
        <div className="text-center text-slate-700">
          <p>No approved testimonials available yet.</p>
          <p className="text-sm mt-2 text-slate-600">
            Testimonials need to be approved before appearing on the website.
          </p>
          <p className="text-xs mt-1 text-slate-500">
            Check the browser console for API response details.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid place-content-center overflow-hidden bg-transparent px-8 py-24 min-h-screen h-full w-full">
      <div className="relative -ml-[100px] h-[480px] w-[380px] md:-ml-[175px]">
        {testimonials.slice(0, 3).map((testimonial, index) => (
          <TestimonialCard
            key={testimonial.id}
            testimonial={testimonial.testimonial}
            author={testimonial.author}
            id={testimonial.id}
            avatar={testimonial.avatar}
            rating={testimonial.rating}
            handleShuffle={handleShuffle}
            position={positions[index]}
          />
        ))}
      </div>
    </div>
  );
}
