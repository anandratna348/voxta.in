/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm white surfaces
        paper: { DEFAULT: "#FBF9F6", raised: "#FFFFFF", sunken: "#F5F2EE", line: "#ECE7E1" },
        // Soft lavender accents
        lavender: {
          50: "#F7F5FD", 100: "#EFEBFA", 200: "#E1D9F5", 300: "#CBBEEE",
          400: "#AE9BE3", 500: "#917ED6",
        },
        // Deep indigo brand and text
        indigo: {
          50: "#EEF0FB", 100: "#DADFF5", 200: "#B7C0EA", 300: "#8E9ADB",
          400: "#6B76C9", 500: "#4F55B3", 600: "#3F4194", 700: "#33357A",
          800: "#272A5E", 900: "#1C1E45", 950: "#12132E",
        },
        // Muted status colors, deliberately not saturated
        sage: { 50: "#F1F6F2", 100: "#DDEAE0", 500: "#5E8C6A", 700: "#3F6249" },
        amber: { 50: "#FBF6EC", 100: "#F4E8CC", 500: "#B98A2E", 700: "#85601A" },
        rose: { 50: "#FAF1F1", 100: "#F3DADA", 500: "#B25252", 700: "#7F3333" },
      },
      fontFamily: {
        sans: ['"Manrope Variable"', "Segoe UI", "system-ui", "sans-serif"],
        display: ['"Fraunces Variable"', "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,30,69,0.04), 0 4px 16px -4px rgba(28,30,69,0.06)",
        lift: "0 2px 4px rgba(28,30,69,0.05), 0 12px 32px -8px rgba(51,53,122,0.14)",
        focus: "0 0 0 3px rgba(145,126,214,0.35)",
      },
      borderRadius: { xl2: "1.25rem" },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #3F4194 0%, #4F55B3 55%, #6B76C9 100%)",
        "wash": "linear-gradient(180deg, #F7F5FD 0%, #FBF9F6 60%)",
      },
    },
  },
  plugins: [],
};