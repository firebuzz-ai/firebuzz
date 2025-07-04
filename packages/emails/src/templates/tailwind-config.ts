export const tailwindConfig = {
  theme: {
    extend: {
      colors: {
        // Main colors
        background: "#FFFFFF", // --background: 0 0% 100%
        foreground: "#18181B", // --foreground: 240 5.9% 10%

        // Brand colors
        brand: "#F97316", // --brand: 25 94.6% 56.5%
        "brand-foreground": "#18181B",

        // Border and input
        border: "#F4F4F5", // --border: 240 4.8% 95.9%
        input: "#F4F4F5",

        // Muted colors
        muted: "#FAFAF9", // --muted: 60 9% 98%
        "muted-foreground": "#737373", // --muted-foreground: 240 3.83% 46.08%
        "muted-bg": "#FAFAF9",

        // Primary colors
        primary: "#18181B", // --primary: 240 5.9% 10%
        "primary-foreground": "#FFFFFF", // --primary-foreground: 0 0% 100%

        // Secondary colors
        secondary: "#F4F4F5", // --secondary: 240 4.8% 95.9%
        "secondary-foreground": "#404040", // --secondary-foreground: 240 5.3% 26.1%

        // Accent colors
        accent: "#FAFAFA", // --accent: 0 0% 98%
        "accent-foreground": "#18181B", // --accent-foreground: 240 5.9% 10%

        // Destructive colors
        destructive: "#DC2626", // --destructive: 346.84 77.17% 49.8%
        "destructive-foreground": "#FEF2F2", // --destructive-foreground: 355.71 100% 97.25%

        // Legacy compatibility
        "light-border": "#F4F4F5",
      },
      spacing: {
        0: "0px",
        5: "5px",
        20: "20px",
        45: "45px",
      },
      fontFamily: {
        sans: ["Geist", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
    },
  },
};
