import { getFontFamilyWithFallbacks } from "@/lib/theme/utils";
import { api, useCachedRichQuery } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
  ArrowRight,
  Award,
  Check,
  Globe,
  Lock,
  Mail,
  MapPin,
  Menu,
  Moon,
  Phone,
  Play,
  Quote,
  RefreshCw,
  Shield,
  Star,
  Sun,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { ThemeFormType } from "./form";

interface ThemePanelProps {
  hasChanges: boolean;
  onSave: (() => Promise<void>) | null;
  isSaving: boolean;
  formValues?: ThemeFormType | null;
}

const DottedGridBackground = ({ isDark }: { isDark: boolean }) => (
  <div
    className="absolute inset-0"
    style={{
      backgroundImage: `radial-gradient(circle, ${isDark ? "#71717a" : "#a1a1aa"} 1px, transparent 1px)`,
      backgroundSize: "20px 20px",
      backgroundPosition: "0 0, 10px 10px",
    }}
  />
);

// Dynamic font loading utility
const loadedFonts = new Set<string>();

const loadGoogleFont = (fontName: string) => {
  // Skip if already loaded or if it's a system font
  if (loadedFonts.has(fontName)) return;

  // Check if it's a system font (shouldn't be loaded)
  const systemFonts = [
    "Arial",
    "Helvetica",
    "Helvetica Neue",
    "Segoe UI",
    "San Francisco",
    "system-ui",
    "sans-serif",
    "Times New Roman",
    "Georgia",
    "Times",
    "serif",
    "Monaco",
    "Consolas",
    "SF Mono",
    "Menlo",
    "Courier New",
    "Courier",
    "monospace",
  ];

  if (systemFonts.includes(fontName)) return;

  // Create Google Fonts URL
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName.replace(/\s+/g, "+"))}:wght@400;500;600&display=swap`;

  // Check if font is already loaded in document
  const existingLink = document.querySelector(`link[href="${fontUrl}"]`);
  if (existingLink) {
    loadedFonts.add(fontName);
    return;
  }

  // Create and inject font link
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = fontUrl;
  link.onload = () => {
    loadedFonts.add(fontName);
  };
  document.head.appendChild(link);
};

const LandingPagePreview = ({
  previewMode,
  brandData,
  onThemeToggle,
}: {
  previewMode: "light" | "dark";
  brandData: {
    name: string;
    logo?: string;
    favicon?: string;
    description?: string;
    website?: string;
  };
  onThemeToggle: (checked: boolean) => void;
}) => (
  <div className="h-full max-w-4xl max-h-full mx-auto overflow-hidden border rounded-lg shadow-xl bg-background">
    {/* Browser Header - NO THEME STYLES APPLIED HERE */}
    <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/50">
      {/* Traffic Lights */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-red-500 rounded-full" />
        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
        <div className="w-3 h-3 bg-green-500 rounded-full" />
      </div>

      {/* Address Bar */}
      <div className="flex items-center flex-1 gap-2 ml-4">
        <div className="flex items-center bg-background border rounded-md px-3 py-1.5 flex-1 max-w-lg">
          <div className="flex items-center gap-1">
            {brandData.favicon ? (
              <Image
                src={brandData.favicon}
                alt="Favicon"
                width={12}
                height={12}
                className="object-contain w-3 h-3"
                unoptimized
              />
            ) : (
              <Lock className="w-3 h-3 text-green-600" />
            )}
            <span className="text-sm text-muted-foreground">https://</span>
          </div>
          <span className="text-sm font-medium">
            {brandData.website
              ? brandData.website.replace(/^https?:\/\//, "")
              : `${brandData.name.toLowerCase().replace(/\s+/g, "")}.com`}
          </span>
        </div>

        <Button variant="outline" size="sm" className="px-1.5">
          <RefreshCw className="!size-3.5" />
        </Button>
      </div>

      {/* Browser Tab */}
      <div className="hidden md:flex items-center gap-2 bg-background border rounded-t-md px-3 py-1.5 min-w-0">
        {brandData.favicon ? (
          <Image
            src={brandData.favicon}
            alt="Favicon"
            width={16}
            height={16}
            className="object-contain w-4 h-4"
            unoptimized
          />
        ) : (
          <Globe className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium truncate max-w-32">
          {brandData.name}
        </span>
      </div>
    </div>

    {/* Website Content - THEME STYLES APPLIED ONLY HERE */}
    <div className="h-full max-h-full pb-16 overflow-y-auto themed-content bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              {brandData.logo ? (
                <Image
                  src={brandData.logo}
                  alt={`${brandData.name} logo`}
                  height={32}
                  width={128}
                  className="object-contain h-8"
                  unoptimized
                />
              ) : (
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded bg-primary">
                    <span className="text-sm font-bold text-primary-foreground">
                      {brandData.name.charAt(0)}
                    </span>
                  </div>
                  <span className="ml-2 text-lg font-bold">
                    {brandData.name}
                  </span>
                </div>
              )}
            </div>

            {/* Navigation Links */}
            <div className="items-center hidden space-x-8 md:flex">
              <span className="text-sm font-medium transition-colors cursor-pointer hover:text-primary">
                Home
              </span>
              <span className="text-sm font-medium transition-colors cursor-pointer text-muted-foreground hover:text-primary">
                Products
              </span>
              <span className="text-sm font-medium transition-colors cursor-pointer text-muted-foreground hover:text-primary">
                About
              </span>
              <span className="text-sm font-medium transition-colors cursor-pointer text-muted-foreground hover:text-primary">
                Contact
              </span>
            </div>

            {/* Right Side - Theme Switcher & CTA */}
            <div className="flex items-center gap-4">
              {/* Theme Switcher */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onThemeToggle(!previewMode.includes("dark"))}
                  className="relative p-2 transition-all duration-300 hover:scale-110"
                >
                  <div className="relative w-5 h-5">
                    <Sun
                      className={`absolute inset-0 w-5 h-5 transition-all duration-500 ${
                        previewMode === "dark"
                          ? "rotate-90 scale-0 opacity-0"
                          : "rotate-0 scale-100 opacity-100"
                      }`}
                    />
                    <Moon
                      className={`absolute inset-0 w-5 h-5 transition-all duration-500 ${
                        previewMode === "dark"
                          ? "rotate-0 scale-100 opacity-100"
                          : "-rotate-90 scale-0 opacity-0"
                      }`}
                    />
                  </div>
                </Button>
              </div>

              <Button size="sm" className="hidden sm:inline-flex">
                Get Started
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-muted/20">
        <div className="px-4 py-16 mx-auto max-w-7xl sm:px-6 lg:px-8 lg:py-20">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              <Star className="w-3 h-3 mr-1" />
              {previewMode === "dark" ? "Dark" : "Light"} Theme Preview
            </Badge>

            <h1 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Welcome to <span className="text-primary">{brandData.name}</span>
            </h1>

            <p className="max-w-2xl mx-auto mb-8 text-lg text-muted-foreground">
              {brandData.description ||
                `Experience how your custom theme looks and feels across different components and layouts. 
                See your colors, typography, and styling in action.`}
            </p>

            <div className="flex flex-col items-center justify-center gap-4 mb-12 sm:flex-row">
              <Button size="lg" className="px-8 text-base">
                <Play className="w-4 h-4 mr-2" />
                Get Started Now
              </Button>
              <Button variant="secondary" size="lg" className="px-8 text-base">
                Learn More
              </Button>
            </div>

            {/* Info Box */}
            <div className="mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 mx-auto rounded-md bg-muted">
                <Check className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm">
                  No credit card required
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid max-w-2xl grid-cols-1 gap-8 mx-auto sm:grid-cols-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-bold">10k+</span>
                </div>
                <p className="text-sm text-muted-foreground">Happy Customers</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-bold">99%</span>
                </div>
                <p className="text-sm text-muted-foreground">Uptime</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-bold">100%</span>
                </div>
                <p className="text-sm text-muted-foreground">Secure</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Preview */}
      <div className="py-12 bg-muted/30">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold">
              Why Choose Our Platform?
            </h2>
            <p className="text-muted-foreground">
              Everything you need to build amazing experiences
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                id: "easy-setup",
                title: "Easy Setup",
                desc: "Get started in minutes with our simple onboarding process",
                icon: Zap,
              },
              {
                id: "powerful-features",
                title: "Powerful Features",
                desc: "Advanced tools and integrations to scale your business",
                icon: Target,
              },
              {
                id: "award-winning",
                title: "Award Winning",
                desc: "Recognized by industry leaders for innovation and quality",
                icon: Award,
              },
            ].map((feature) => (
              <div
                key={feature.id}
                className="p-6 transition-shadow border rounded-lg bg-background hover:shadow-md"
              >
                <div className="flex items-center justify-center w-10 h-10 mb-4 rounded-lg bg-primary/10">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-12 bg-background">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold">What Our Customers Say</h2>
            <p className="text-muted-foreground">
              Real feedback from real customers
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                id: "sarah-johnson",
                name: "Sarah Johnson",
                role: "Marketing Director",
                content:
                  "This platform perfectly captures our brand identity. The customization options are incredible.",
              },
              {
                id: "mike-chen",
                name: "Mike Chen",
                role: "Startup Founder",
                content:
                  "The ease of use is amazing. We were able to launch our brand in record time.",
              },
              {
                id: "emma-davis",
                name: "Emma Davis",
                role: "Design Lead",
                content:
                  "Professional, modern, and clean. Our team productivity has increased significantly.",
              },
            ].map((testimonial) => (
              <div
                key={testimonial.id}
                className="p-6 border rounded-lg bg-card"
              >
                <Quote className="w-8 h-8 mb-4 text-muted-foreground" />
                <p className="mb-4 text-sm italic">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                    <span className="text-sm font-medium text-muted-foreground">
                      {testimonial.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Form Section */}
      <div className="py-12 bg-muted/30">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Contact Info */}
            <div>
              <h2 className="mb-4 text-2xl font-bold">Get In Touch</h2>
              <p className="mb-8 text-muted-foreground">
                Ready to transform your business? Let's discuss your project and
                see how we can help.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      hello@{brandData.name.toLowerCase().replace(/\s+/g, "")}
                      .com
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">
                      +1 (555) 123-4567
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Office</p>
                    <p className="text-sm text-muted-foreground">
                      123 Business St, City, State 12345
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="p-6 border rounded-lg bg-card">
              <h3 className="mb-4 text-lg font-semibold">Send us a message</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      First Name
                    </Label>
                    <Input id="firstName" placeholder="John" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Last Name
                    </Label>
                    <Input id="lastName" placeholder="Doe" className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="message" className="text-sm font-medium">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about your project..."
                    className="mt-1 min-h-[100px]"
                  />
                </div>

                <Button className="w-full">
                  <Check className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-12 bg-primary/5">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold">Ready to Get Started?</h2>
            <p className="text-muted-foreground">
              Join thousands of satisfied customers and transform your business
              today
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="px-8 text-base">
              Start Your Journey
            </Button>
            <Button variant="secondary" size="lg" className="px-8 text-base">
              Schedule a Demo
            </Button>
            <Button variant="outline" size="lg" className="px-8 text-base">
              <a
                href="#contact"
                className="text-accent-foreground hover:underline"
              >
                View Pricing
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ThemePanel = ({
  hasChanges,
  onSave,
  isSaving,
  formValues,
}: ThemePanelProps) => {
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
  const [cssVariables, setCssVariables] = useState<Record<string, string>>({});

  // Fetch brand data
  const { data: brand } = useCachedRichQuery(
    api.collections.brands.queries.getCurrent
  );

  // Convert HSL values to CSS custom properties and update whenever formValues change
  useEffect(() => {
    if (!formValues) {
      setCssVariables({});
      return;
    }

    console.log(formValues);

    const themeData = formValues[`${previewMode}Theme`];
    console.log(themeData);
    const variables: Record<string, string> = {};

    // Apply color variables - convert HSL to the format CSS expects
    for (const [key, value] of Object.entries(themeData)) {
      if (key !== "radius") {
        const cssVariableName = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
        variables[cssVariableName] = value;
      }
    }

    // Apply radius as CSS length value (not HSL)
    variables["--radius"] = themeData.radius;

    // Load Google Fonts for the current fonts
    loadGoogleFont(formValues.fonts.sans);
    loadGoogleFont(formValues.fonts.serif);
    loadGoogleFont(formValues.fonts.mono);

    // Apply font families with proper fallbacks
    variables["--font-sans"] = getFontFamilyWithFallbacks(
      formValues.fonts.sans,
      "sans"
    );
    variables["--font-serif"] = getFontFamilyWithFallbacks(
      formValues.fonts.serif,
      "serif"
    );
    variables["--font-mono"] = getFontFamilyWithFallbacks(
      formValues.fonts.mono,
      "mono"
    );

    // Override Tailwind font classes by setting CSS properties directly
    variables.fontFamily = getFontFamilyWithFallbacks(
      formValues.fonts.sans,
      "sans"
    ); // Default font for the container

    console.log(variables);

    setCssVariables(variables);
  }, [formValues, previewMode]);

  // Create CSS overrides for Tailwind font classes - Apply only to themed content
  const fontOverrideStyles = formValues
    ? `
    .themed-content {
      font-family: ${getFontFamilyWithFallbacks(formValues.fonts.sans, "sans")} !important;
      color: hsl(var(--foreground)) !important;
    }
    .themed-content .font-sans {
      font-family: ${getFontFamilyWithFallbacks(formValues.fonts.sans, "sans")} !important;
    }
    .themed-content .font-serif {
      font-family: ${getFontFamilyWithFallbacks(formValues.fonts.serif, "serif")} !important;
    }
    .themed-content .font-mono {
      font-family: ${getFontFamilyWithFallbacks(formValues.fonts.mono, "mono")} !important;
    }
    .themed-content h1, .themed-content h2, .themed-content h3, .themed-content h4, .themed-content h5, .themed-content h6 {
      color: hsl(var(--foreground)) !important;
    }
    .themed-content p, .themed-content span, .themed-content div {
      color: inherit;
    }
  `
    : "";

  if (!formValues) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-sm font-medium">Theme Preview</h3>
          <Button disabled size="sm">
            Save
          </Button>
        </div>
        <div className="flex items-center justify-center flex-1">
          <p className="text-sm text-muted-foreground">
            Loading theme preview...
          </p>
        </div>
      </div>
    );
  }

  // Use brand data for preview
  const brandData = {
    name: brand?.name || "Your Brand",
    logo: brand?.logo,
    favicon: brand?.favicon,
    description: brand?.description,
    website: brand?.website,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Inject font override styles - Apply only to themed content */}
      {fontOverrideStyles && (
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Safe CSS injection for font overrides
        <style dangerouslySetInnerHTML={{ __html: fontOverrideStyles }} />
      )}

      {/* Header with save button only */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <h3 className="text-sm font-medium">Theme Preview</h3>

        <Button
          variant="outline"
          onClick={async () => {
            if (onSave) {
              await onSave();
            }
          }}
          disabled={!hasChanges || isSaving}
          size="sm"
          className="font-medium"
        >
          {isSaving ? (
            <>
              <Spinner size="sm" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>

      {/* Preview Content */}
      <div className="relative flex-1 overflow-hidden bg-muted">
        <DottedGridBackground isDark={previewMode === "dark"} />

        <div className="relative z-10 h-full p-8">
          {/* Apply theme styles only to the .themed-content inside the browser mockup */}
          <div
            className={cn(
              "h-full transition-colors duration-200",
              previewMode === "dark" ? "dark" : ""
            )}
          >
            <style>
              {/* Apply CSS variables only to .themed-content */}
              {`.themed-content { ${Object.entries(cssVariables)
                .map(([key, value]) => `${key}: ${value};`)
                .join(" ")} }`}
            </style>
            <LandingPagePreview
              previewMode={previewMode}
              brandData={brandData}
              onThemeToggle={(checked) =>
                setPreviewMode(checked ? "dark" : "light")
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};
