import type { Config } from "tailwindcss";

// REWAAS palette — sindoor coral (token "wine"), warm ivory/peach, rose-copper gold, warm ink.
// Token names are kept stable so components never hard-code colours.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        wine: { DEFAULT: "#C4553D", 50: "#FDF1EC", 100: "#FADFD4", 200: "#F2B9A6", 400: "#D9715A", 600: "#C4553D", 700: "#A8432F", 800: "#8C3626", 900: "#4A1F17" },
        ivory: { DEFAULT: "#FFF8F2", 50: "#FFFCF9", 100: "#FFF8F2", 200: "#FBEDE3", 300: "#F5DDCD" },
        gold: { DEFAULT: "#C08552", 300: "#E8C39E", 400: "#D9A574", 500: "#C08552", 600: "#9F6A3D" },
        ink: { DEFAULT: "#2B2220", 400: "#6F605A", 300: "#9A8B84", 200: "#D8CBC2" },
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", "'Playfair Display'", "Georgia", "serif"],
        sans: ["Jost", "'Helvetica Neue'", "Arial", "sans-serif"],
      },
      letterSpacing: { luxe: "0.22em", wideish: "0.08em" },
      maxWidth: { site: "1440px" },
      keyframes: {
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        fadeUp: { "0%": { opacity: "0", transform: "translateY(14px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideIn: { "0%": { transform: "translateX(100%)" }, "100%": { transform: "translateX(0)" } },
        heroZoom: { "0%": { transform: "scale(1.06)" }, "100%": { transform: "scale(1)" } },
      },
      animation: {
        fadeUp: "fadeUp .7s cubic-bezier(.2,.7,.2,1) both",
        fadeIn: "fadeIn .4s ease both",
        slideIn: "slideIn .35s cubic-bezier(.2,.7,.2,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
