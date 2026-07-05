import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core System Colors from Design Mockup
        "surface-variant": "#34343d",
        "primary-container": "rgba(128, 131, 255, 0.15)",
        "surface-tint": "#c0c1ff",
        "tertiary-container": "#d97721",
        "on-primary-fixed": "#07006c",
        "primary-fixed": "#e1e0ff",
        "on-tertiary": "#4f2500",
        "surface-dim": "#13131b",
        "surface-container-lowest": "#0d0d15",
        "surface-container-high": "#292932",
        "secondary-fixed": "#e9ddff",
        "on-primary-container": "#0d0096",
        "surface-container-low": "#1b1b23",
        "on-secondary-fixed": "#23005c",
        "on-surface": "#e4e1ed",
        "on-error": "#690005",
        "outline-variant": "#27272A", // clean dark border
        "tertiary-fixed-dim": "#ffb783",
        "surface-container-highest": "#34343d",
        "primary": "#8083ff", // Indigo/Violet primary
        "secondary-fixed-dim": "#d0bcff",
        "on-error-container": "#ffdad6",
        "tertiary-fixed": "#ffdcc5",
        "on-tertiary-fixed": "#301400",
        "error": "#ffb4ab",
        "outline": "#908fa0",
        "on-tertiary-fixed-variant": "#703700",
        "on-secondary": "#3c0091",
        "inverse-surface": "#e4e1ed",
        "on-background": "#e4e1ed",
        "on-primary-fixed-variant": "#2f2ebe",
        "on-tertiary-container": "#452000",
        "secondary-container": "#571bc1",
        "primary-fixed-dim": "#c0c1ff",
        "on-primary": "#1000a9",
        "error-container": "#93000a",
        "on-secondary-container": "#c4abff",
        "surface-container": "#1f1f27",
        "background": "#09090B", // Dark mode base canvas
        "on-surface-variant": "#c7c4d7",
        "tertiary": "#ffb783",
        "inverse-primary": "#494bd6",
        "on-secondary-fixed-variant": "#5516be",
        "secondary": "#d0bcff",
        "surface": "#18181B", // Elevation card surface
        "surface-bright": "#393841",
        "inverse-on-surface": "#303038"
      },
      spacing: {
        "unit": "4px",
        "stack-sm": "8px",
        "stack-md": "16px",
        "stack-lg": "32px",
        "gutter": "24px",
        "container-padding-mobile": "20px",
        "container-padding-desktop": "40px"
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem"
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
