import { z } from "zod";

// The schema we used in Server (Convex)
export const themeSchema = z.object({
  background: z.string(),
  foreground: z.string(),
  muted: z.string(),
  mutedForeground: z.string(),
  popover: z.string(),
  popoverForeground: z.string(),
  border: z.string(),
  input: z.string(),
  card: z.string(),
  cardForeground: z.string(),
  primary: z.string(),
  primaryForeground: z.string(),
  secondary: z.string(),
  secondaryForeground: z.string(),
  accent: z.string(),
  accentForeground: z.string(),
  destructive: z.string(),
  destructiveForeground: z.string(),
  ring: z.string(),
  radius: z.string(),
});
