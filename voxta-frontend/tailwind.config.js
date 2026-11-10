/** @type {import('tailwindcss').Config} */
// Palette sampled from the Voxta logo: cyan #159DFC, royal #233DF0, violet #5836F0, orchid #BB67FC, navy #141527.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cool, clean surfaces that sit well with the logo's white background
        paper: { DEFAULT: "#F7F8FC", raised: "#FFFFFF", sunken: "#EFF1F9", line: "#E5E8F3" },
        // Soft violet tints taken from the logo's orchid and violet
        lavender: {
          50: "#F7F6FF", 100: "#EEEBFF", 200: "#DED8FD", 300: "#C5BBFA",
          400: "#A998F6", 500: "#8D78F0",
        },
        // Text and accents. 50 to 500 are muted for text, 600 and up are the brand blue-violet.
        indigo: {
          50: "#F1F2FF", 100: "#E3E6FE", 200: "#C8CDF7", 300: "#A3A8D9",
          400: "#6C71A6", 500: "#535990", 600: "#4B3DE8", 700: "#3B31C2",
          800: "#26276F", 900: "#1B1C3A", 950: "#141527",
        },
        brand: { cyan: "#159DFC", blue: "#256BFD", royal: "#233DF0", violet: "#5836F0", orchid: "#BB67FC" },
        sage: { 50: "#EFF7F2", 100: "#D9EDE0", 500: "#3F9D69", 700: "#2B6E49" },
        amber: { 50: "#FFF7E8", 100: "#F8E7BE", 500: "#C48A1C", 700: "#8A5F0F" },
        rose: { 50: "#FEF1F1", 100: "#F8D9D9", 500: "#D14B4B", 700: "#9A2F2F" },
      },
      fontFamily: {
        sans: ['"Manrope Variable"', "Segoe UI", "system-ui", "sans-serif"],
        display: ['"Manrope Variable"', "Segoe UI", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Page titles use 4xl. Smaller and bolder than before, as modern product UIs do.
        "4xl": ["2rem", { lineHeight: "2.4rem", letterSpacing: "-0.025em" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,21,39,0.04), 0 8px 24px -12px rgba(60,55,170,0.12)",
        lift: "0 2px 4px rgba(20,21,39,0.05), 0 18px 40px -14px rgba(75,61,232,0.28)",
        btn: "inset 0 1px 0 rgba(255,255,255,0.28), 0 6px 16px -6px rgba(75,61,232,0.55)",
        focus: "0 0 0 3px rgba(121,85,253,0.30)",
      },
      borderRadius: { xl2: "1.25rem" },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #256BFD 0%, #4B3DE8 55%, #7955FD 100%)",
        "hero-gradient":
          "radial-gradient(60rem 28rem at 100% 0%, rgba(187,103,252,0.55) 0%, transparent 60%), radial-gradient(40rem 24rem at 0% 100%, rgba(21,157,252,0.45) 0%, transparent 60%), linear-gradient(135deg, #233DF0 0%, #4B35E6 55%, #6B3FF0 100%)",
        wash: "linear-gradient(180deg, #F3F2FF 0%, #F7F8FC 60%)",
      },
    },
  },
  plugins: [],
};