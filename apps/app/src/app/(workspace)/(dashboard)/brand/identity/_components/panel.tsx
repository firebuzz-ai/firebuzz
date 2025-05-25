"use client";

import { api, useCachedRichQuery } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
  ArrowRight,
  Globe,
  Lock,
  Menu,
  Play,
  RefreshCw,
  Shield,
  Star,
  TrendingUp,
  Users,
} from "@firebuzz/ui/icons/lucide";
import Image from "next/image";

const DottedGridBackground = () => (
  <div
    className="absolute inset-0 opacity-30"
    style={{
      backgroundImage:
        "radial-gradient(circle, hsl(var(--muted-foreground)) 1px, transparent 1px)",
      backgroundSize: "20px 20px",
      backgroundPosition: "0 0, 10px 10px",
    }}
  />
);

const BrowserMockup = ({
  favicon,
  brandName,
  logo,
  description,
  website,
}: {
  favicon?: string;
  brandName: string;
  logo?: string;
  description?: string;
  website?: string;
}) => (
  <div className="h-full max-w-4xl max-h-full mx-auto overflow-hidden border rounded-lg shadow-xl bg-background">
    {/* Browser Header */}
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
            {favicon ? (
              <Image
                src={favicon}
                alt="Favicon"
                width={12}
                height={12}
                className="object-contain w-3 h-3"
                unoptimized
              />
            ) : (
              <Lock className="w-3 h-3 text-green-600" />
            )}
            <span className="text-xs text-muted-foreground">
              {website?.startsWith("http") ? "" : "https://"}
            </span>
          </div>
          <span className="text-sm font-medium">
            {website
              ? website.replace(/^https?:\/\//, "")
              : `${brandName.toLowerCase().replace(/\s+/g, "")}.com`}
          </span>
        </div>

        <Button variant="ghost" size="sm" className="px-2">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Browser Tab */}
      <div className="hidden md:flex items-center gap-2 bg-background border rounded-t-md px-3 py-1.5 min-w-0">
        {favicon ? (
          <Image
            src={favicon}
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
          {brandName}
        </span>
      </div>
    </div>

    {/* Website Content - Make this scrollable */}
    <div className="h-full max-h-full overflow-y-auto bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Remove brand name */}
            <div className="flex items-center">
              {logo ? (
                <Image
                  src={logo}
                  alt={`${brandName} logo`}
                  height={128}
                  width={128}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <div className="flex items-center justify-center w-8 h-8 rounded bg-primary">
                  <span className="text-sm font-bold text-primary-foreground">
                    {brandName.charAt(0)}
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

            {/* CTA Button */}
            <div className="flex items-center gap-4">
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
              New Release
            </Badge>

            <h1 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Welcome to <span className="text-primary">{brandName}</span>
            </h1>

            <p className="max-w-2xl mx-auto mb-8 text-lg text-muted-foreground">
              {description ||
                `Discover the power of ${brandName}. Transform your business with our innovative solutions and take your growth to the next level.`}
            </p>

            <div className="flex flex-col items-center justify-center gap-4 mb-12 sm:flex-row">
              <Button size="lg" className="px-8 text-base">
                <Play className="w-4 h-4 mr-2" />
                Start Free Trial
              </Button>
              <Button variant="outline" size="lg" className="px-8 text-base">
                Watch Demo
              </Button>
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
      <div className="py-12 bg-muted/20">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold">Why Choose {brandName}?</h2>
            <p className="text-muted-foreground">
              Everything you need to succeed
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Simple demo feature cards with no dynamic data
              <div key={i} className="p-6 border rounded-lg bg-background">
                <div className="flex items-center justify-center w-10 h-10 mb-4 rounded-lg bg-primary/10">
                  <div className="w-5 h-5 rounded bg-primary" />
                </div>
                <h3 className="mb-2 font-semibold">Feature {i + 1}</h3>
                <p className="text-sm text-muted-foreground">
                  Powerful feature that helps you achieve your goals faster and
                  more efficiently.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Content Section */}
      <div className="py-12 bg-background">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold">Get Started Today</h2>
            <p className="text-muted-foreground">
              Join thousands of satisfied customers
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="px-8 text-base">
              Start Your Journey
            </Button>
            <Button variant="outline" size="lg" className="px-8 text-base">
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

interface PanelProps {
  hasChanges: boolean;
  onSave: (() => Promise<void>) | null;
  isSaving: boolean;
  formValues: {
    name: string;
    website?: string;
    description?: string;
    persona?: string;
    logo?: string;
    favicon?: string;
  } | null;
}

export const Panel = ({
  hasChanges = false,
  onSave,
  isSaving = false,
  formValues,
}: PanelProps) => {
  const { data: brand, isPending: isLoading } = useCachedRichQuery(
    api.collections.brands.queries.getCurrent
  );

  // Use form values for preview if available, otherwise fall back to saved brand data
  const previewData = formValues || brand;

  if (isLoading) {
    return (
      <div className="relative flex-1 p-6 overflow-hidden bg-muted/30">
        <DottedGridBackground />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="space-y-4 text-center">
            <Skeleton className="w-48 h-8 mx-auto" />
            <Skeleton className="w-64 h-4 mx-auto" />
            <div className="max-w-4xl mx-auto overflow-hidden border rounded-lg shadow-xl bg-background">
              <div className="px-4 py-3 border-b bg-muted/50">
                <Skeleton className="w-full h-6" />
              </div>
              <div className="p-8 space-y-6">
                <Skeleton className="w-3/4 h-12 mx-auto" />
                <Skeleton className="w-full h-6" />
                <Skeleton className="w-5/6 h-6" />
                <div className="flex justify-center gap-4">
                  <Skeleton className="w-32 h-10" />
                  <Skeleton className="w-32 h-10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className="relative flex-1 p-6 overflow-hidden bg-muted/30">
        <DottedGridBackground />
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="space-y-4 text-center">
            <h3 className="text-lg font-medium text-muted-foreground">
              No Brand Data Available
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure your brand identity to see the preview
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full max-h-full overflow-hidden bg-muted">
      <DottedGridBackground />

      {/* Header */}
      <div className="relative z-10 px-6 py-4 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Brand Preview</h2>
            <p className="text-sm text-muted-foreground">
              See how your brand identity appears across platforms
              {hasChanges && (
                <span className="ml-1 font-medium text-brand">
                  • Live Preview
                </span>
              )}
            </p>
          </div>
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
      </div>

      {/* Preview Content */}
      <div className="relative z-10 max-h-full p-8 overflow-hidden">
        <BrowserMockup
          favicon={previewData.favicon}
          brandName={previewData.name}
          logo={previewData.logo}
          description={previewData.description}
          website={previewData.website}
        />
      </div>
    </div>
  );
};
