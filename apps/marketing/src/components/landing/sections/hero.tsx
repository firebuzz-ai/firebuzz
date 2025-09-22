"use client";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { DotScreenShader } from "../animated-grid";
import { HeroGridNumbers } from "../hero-grid-numbers";

export const Hero = () => {
  return (
    <div className="relative pt-10 border-b">
      <DotScreenShader />
      {/* Content */}
      <div className="px-8 mx-auto max-w-6xl">
        <Badge
          variant="outline"
          className="relative z-10 text-muted-foreground py-1.5 gap-1 bg-muted"
        >
          <div className="w-2 h-2 rounded-full animate-pulse bg-brand" />
          Why We Built Firebuzz?
        </Badge>
        <div className="relative z-10 mt-6 space-y-2 max-w-2xl">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            Build. Analyze. Optimize. Manage your PPC campaigns like a Pro.
          </h1>
          <p className="text-muted-foreground">
            Firebuzz helps you achieve 10x better results with AI-native landing
            page creation, integrated analytics, and automated optimization.
          </p>
        </div>
        {/* CTA Buttons */}
        <div className="mt-10">
          {" "}
          <div className="flex relative z-10 gap-4 max-w-fit">
            {" "}
            <Button size="sm" className="h-8" variant="brand">
              Get Started
            </Button>
            <Button size="sm" className="h-8" variant="outline">
              Schedule a Demo
            </Button>
          </div>
          <div className="relative z-10 mt-4 text-xs text-muted-foreground">
            Start 14 days free trial - hassle free cancellation
          </div>
        </div>
      </div>

      {/* Corner Grid */}
      <HeroGridNumbers />
    </div>
  );
};
