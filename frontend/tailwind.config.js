/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#161C27",
        paper: "#EEF0F1",
        accent: "#A8813C",
        accentSoft: "#F2E8D5",
        accentDark: "#8A6829",
        line: "#E0E2E4",
        alert: "#B3541E",
        alertSoft: "#F5E6DC",
        muted: "#6B7280",
        surface: "#FFFFFF",
      },
      fontFamily: {
        display: ["'Poppins'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(22,28,39,0.04), 0 6px 16px -6px rgba(22,28,39,0.08)",
        card: "0 2px 6px -2px rgba(22,28,39,0.08), 0 16px 32px -16px rgba(22,28,39,0.14)",
        popover: "0 12px 32px -8px rgba(22,28,39,0.24)",
        glow: "0 0 0 1px rgba(168,129,60,0.16), 0 10px 28px -10px rgba(168,129,60,0.4)",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideOverIn: {
          "0%": { opacity: "0", transform: "translateX(8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.35s ease-out both",
        "scale-in": "scaleIn 0.16s ease-out both",
        "slide-over-in": "slideOverIn 0.2s ease-out both",
      },
    },
  },
  plugins: [],
};
