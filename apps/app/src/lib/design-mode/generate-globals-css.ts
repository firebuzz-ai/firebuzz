import type { ThemeFormType } from "@/app/(workspace)/(dashboard)/brand/themes/_components/theme/form";

export function generateGlobalsCss(theme: ThemeFormType): string {
	const { lightTheme, darkTheme, fonts } = theme;

	return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --font-sans: ${fonts.sans};
    --font-serif: ${fonts.serif};
    --font-mono: ${fonts.mono};
    --background: ${lightTheme.background};
    --foreground: ${lightTheme.foreground};
    --card: ${lightTheme.card};
    --card-foreground: ${lightTheme.cardForeground};
    --popover: ${lightTheme.popover};
    --popover-foreground: ${lightTheme.popoverForeground};
    --primary: ${lightTheme.primary};
    --primary-foreground: ${lightTheme.primaryForeground};
    --secondary: ${lightTheme.secondary};
    --secondary-foreground: ${lightTheme.secondaryForeground};
    --muted: ${lightTheme.muted};
    --muted-foreground: ${lightTheme.mutedForeground};
    --accent: ${lightTheme.accent};
    --accent-foreground: ${lightTheme.accentForeground};
    --destructive: ${lightTheme.destructive};
    --destructive-foreground: ${lightTheme.destructiveForeground};
    --border: ${lightTheme.border};
    --input: ${lightTheme.input};
    --ring: ${lightTheme.ring};
    --radius: ${lightTheme.radius};
    --chart-1: ${lightTheme.chart1};
    --chart-2: ${lightTheme.chart2};
    --chart-3: ${lightTheme.chart3};
    --chart-4: ${lightTheme.chart4};
    --chart-5: ${lightTheme.chart5};
  }

  .dark {
    --background: ${darkTheme.background};
    --foreground: ${darkTheme.foreground};
    --card: ${darkTheme.card};
    --card-foreground: ${darkTheme.cardForeground};
    --popover: ${darkTheme.popover};
    --popover-foreground: ${darkTheme.popoverForeground};
    --primary: ${darkTheme.primary};
    --primary-foreground: ${darkTheme.primaryForeground};
    --secondary: ${darkTheme.secondary};
    --secondary-foreground: ${darkTheme.secondaryForeground};
    --muted: ${darkTheme.muted};
    --muted-foreground: ${darkTheme.mutedForeground};
    --accent: ${darkTheme.accent};
    --accent-foreground: ${darkTheme.accentForeground};
    --destructive: ${darkTheme.destructive};
    --destructive-foreground: ${darkTheme.destructiveForeground};
    --border: ${darkTheme.border};
    --input: ${darkTheme.input};
    --ring: ${darkTheme.ring};
    --chart-1: ${darkTheme.chart1};
    --chart-2: ${darkTheme.chart2};
    --chart-3: ${darkTheme.chart3};
    --chart-4: ${darkTheme.chart4};
    --chart-5: ${darkTheme.chart5};
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;
}
