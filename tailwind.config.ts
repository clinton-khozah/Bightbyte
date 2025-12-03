import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        sm: "2rem",
        md: "2.5rem",
        lg: "3rem",
        xl: "4rem",
        "2xl": "5rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "hsl(260, 100%, 95%)",
          100: "hsl(260, 100%, 90%)",
          200: "hsl(260, 100%, 80%)",
          300: "hsl(260, 100%, 70%)",
          400: "hsl(260, 100%, 60%)",
          500: "hsl(260, 100%, 50%)",
          600: "hsl(260, 100%, 40%)",
          700: "hsl(260, 100%, 30%)",
          800: "hsl(260, 100%, 20%)",
          900: "hsl(260, 100%, 14%)",
          950: "hsl(260, 100%, 10%)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          50: "hsl(346, 77.8%, 95%)",
          100: "hsl(346, 77.8%, 90%)",
          200: "hsl(346, 77.8%, 85%)",
          300: "hsl(346, 77.8%, 80%)",
          400: "hsl(346, 77.8%, 75%)",
          500: "hsl(346, 77.8%, 69.8%)",
          600: "hsl(346, 77.8%, 60%)",
          700: "hsl(346, 77.8%, 50%)",
          800: "hsl(346, 77.8%, 40%)",
          900: "hsl(346, 77.8%, 30%)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          50: "hsl(189, 94.5%, 90%)",
          100: "hsl(189, 94.5%, 85%)",
          200: "hsl(189, 94.5%, 80%)",
          300: "hsl(189, 94.5%, 75%)",
          400: "hsl(189, 94.5%, 72.7%)",
          500: "hsl(189, 94.5%, 65%)",
          600: "hsl(189, 94.5%, 55%)",
          700: "hsl(189, 94.5%, 45%)",
          800: "hsl(189, 94.5%, 35%)",
          900: "hsl(189, 94.5%, 25%)",
        },
        highlight: {
          DEFAULT: "hsl(var(--highlight))",
          foreground: "hsl(var(--highlight-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        button: "0 4px 14px 0 rgba(0, 0, 0, 0.1)",
        "button-hover": "0 6px 20px rgba(0, 0, 0, 0.15)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        meteor: {
          "0%": { transform: "rotate(215deg) translateX(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": {
            transform: "rotate(215deg) translateX(-500px)",
            opacity: "0",
          },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "button-glow": {
          "0%, 100%": {
            boxShadow: "0 0 5px 0 rgba(var(--primary), 0.3)",
          },
          "50%": {
            boxShadow: "0 0 20px 5px rgba(var(--primary), 0.5)",
          },
        },
        "meteor-effect": {
          "0%": { transform: "rotate(215deg) translateX(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": {
            transform: "rotate(215deg) translateX(-500px)",
            opacity: "0",
          },
        },
        "card-zoom": {
          "0%, 100%": { transform: "scale(0.8)" },
          "50%": { transform: "scale(1.3)" },
        },
        "border-rotate": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "meteor-effect": "meteor-effect 3s linear infinite",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "spin-slow": "spin-slow 15s linear infinite",
        "button-glow": "button-glow 2s ease-in-out infinite",
        "card-zoom": "card-zoom 3s ease-in-out infinite",
        "border-rotate": "border-rotate 3s linear infinite",
      },
      fontFamily: {
        sans: ["Calibri", "Segoe UI", "system-ui", "sans-serif"],
        heading: ["Calibri", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
