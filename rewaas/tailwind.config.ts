import type { Config } from "tailwindcss";

// REWAAS palette — wine, ivory, antique gold. Keep every surface inside this family.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        wine: { DEFAULT: "#5E1A2E", 50: "#F8EEF0", 100: "#EED6DC", 200: "#D9A9B5", 400: "#93394F", 600: "#5E1A2E", 700: "#4A1324", 800: "#360D1A", 900: "#240811" },
        ivory: { DEFAULT: "#FBF7F1", 50: "#FFFDF9", 100: "#FBF7F1", 200: "#F4ECE0", 300: "#EADDCB" },
        gold: { DEFAULT: "#A9824B", 300: "#D6BC8E", 400: "#C2A06A", 500: "#A9824B", 600: "#8A6735" },
        ink: { DEFAULT: "#221B19", 400: "#6E625D", 300: "#968A84", 200: "#CFC6BF" },
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
