/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "Geist", "ui-sans-serif", "system-ui"] },
      colors: {
        antbox: { black: "#050505", charcoal: "#111827", slate: "#1F2937", muted: "#F5F7FA", green: "#22C55E", emerald: "#10B981", blue: "#38BDF8", purple: "#8B5CF6" }
      },
      boxShadow: { soft: "0 18px 50px rgba(15, 23, 42, 0.08)" }
    }
  },
  plugins: []
};
