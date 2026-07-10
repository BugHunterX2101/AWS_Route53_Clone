/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        aws: {
          orange: "#FF9900",
          "orange-dark": "#EC7211",
          blue: "#232F3E",
          "blue-light": "#37475A",
          navy: "#1A2332",
          teal: "#00A1C9",
          "teal-dark": "#007F9E",
          green: "#1D8102",
          red: "#D13212",
          yellow: "#FBBF24",
          gray: "#545B64",
          "gray-light": "#EAEDED",
          "gray-mid": "#D5DBDB",
        },
      },
      fontFamily: {
        sans: ["Amazon Ember", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        aws: "0 1px 1px 0 rgba(0,28,36,0.3), 1px 1px 1px 0 rgba(0,28,36,0.15), -1px 1px 1px 0 rgba(0,28,36,0.15)",
        "aws-lg": "0 4px 8px 0 rgba(0,28,36,0.3)",
      },
      animation: {
        "slide-in": "slideIn 0.2s ease-out",
        "fade-in": "fadeIn 0.15s ease-out",
        "spin-slow": "spin 2s linear infinite",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
