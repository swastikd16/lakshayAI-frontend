import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "secondary-fixed": "#eaddff",
        "primary-fixed": "#d6e3ff",
        tertiary: "#321b00",
        "secondary-container": "#8a4cfc",
        "error-container": "#ffdad6",
        "surface-dim": "#d7dadc",
        "surface-container-high": "#e5e9eb",
        "surface-container": "#ebeef0",
        "secondary-fixed-dim": "#d2bbff",
        "tertiary-fixed": "#ffddba",
        "outline-variant": "#c4c6cf",
        "on-primary": "#ffffff",
        "on-background": "#181c1e",
        background: "#f7fafc",
        surface: "#f7fafc",
        "on-error-container": "#93000a",
        "surface-tint": "#455f88",
        secondary: "#712ae2",
        "on-primary-container": "#86a0cd",
        "inverse-primary": "#adc7f7",
        "tertiary-fixed-dim": "#f2bc82",
        "surface-container-low": "#f1f4f6",
        "on-secondary-fixed": "#25005a",
        error: "#ba1a1a",
        "primary-fixed-dim": "#adc7f7",
        "on-tertiary-container": "#c6955e",
        "on-tertiary": "#ffffff",
        "on-secondary-container": "#fffbff",
        "inverse-on-surface": "#eef1f3",
        "surface-bright": "#f7fafc",
        "primary-container": "#1a365d",
        "on-surface-variant": "#43474e",
        "on-tertiary-fixed": "#2b1700",
        "on-primary-fixed-variant": "#2d476f",
        "on-secondary-fixed-variant": "#5a00c6",
        primary: "#002045",
        "on-surface": "#181c1e",
        "surface-variant": "#e0e3e5",
        "on-primary-fixed": "#001b3c",
        "surface-container-highest": "#e0e3e5",
        "on-tertiary-fixed-variant": "#633f0f",
        "on-secondary": "#ffffff",
        "inverse-surface": "#2d3133",
        outline: "#74777f",
        "surface-container-lowest": "#ffffff",
        "tertiary-container": "#4f2e00",
        "on-error": "#ffffff"
      },
      boxShadow: {
        editorial: "0 24px 48px -12px rgba(0, 32, 69, 0.08)"
      },
      fontFamily: {
        headline: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
