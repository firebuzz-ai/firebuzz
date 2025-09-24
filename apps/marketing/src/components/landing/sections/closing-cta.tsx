import { Button } from "@firebuzz/ui/components/ui/button";
import Image from "next/image";

const features = [
  "AI-powered landing page generation",
  "Real-time collaboration tools",
  "Advanced analytics and insights",
  "Custom domain support",
  "Mobile-responsive designs",
  "SEO optimization built-in",
  "A/B testing capabilities",
  "Integration with popular tools",
  "Multi-language support",
  "Conversion rate optimization",
  "Template library access",
  "Brand consistency tools",
];

export const ClosingCta = () => {
  return (
    <div className="px-8 py-16 mx-auto max-w-6xl">
      <div className="grid grid-cols-12 rounded-lg border bg-muted">
        <div className="overflow-hidden col-span-full row-span-2 border-r border-b sm:col-span-6">
          <div className="px-8 pt-8">
            <h2 className="text-lg font-medium">Integrations</h2>
            <p className="text-sm text-muted-foreground">
              Connect Firebuzz with your favorite tools and services.
            </p>
          </div>
          <div className="relative bg-muted">
            {/* Overlay */}
            <div
              className="absolute inset-0 z-10"
              style={{
                background:
                  "radial-gradient(circle at center, transparent 8%, hsl(var(--muted) / 0.3) 35%, hsl(var(--muted) / 0.8) 100%)",
              }}
            />
            <div className="absolute inset-x-0 top-0 z-10 h-5 bg-gradient-to-b to-muted/40 from-muted via-muted/70" />
            <div className="absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t to-muted/40 from-muted via-muted/70" />

            <Image
              src="/landing/integrations.svg"
              unoptimized
              alt="Firebuzz"
              width={530}
              height={170}
              className="p-0 w-full"
              style={{
                imageRendering: "crisp-edges",
                shapeRendering: "crispEdges",
              }}
            />
          </div>
        </div>
        <div className="overflow-hidden col-span-full row-span-2 border-b sm:col-span-6">
          <div className="px-8 pt-8">
            <h2 className="text-lg font-medium">State of the Art AI Models</h2>
            <p className="text-sm text-muted-foreground">
              Latest AI Models for the best results.
            </p>
          </div>

          <div className="relative bg-muted">
            {/* Overlay */}
            <div
              className="absolute inset-0 z-10"
              style={{
                background:
                  "radial-gradient(circle at center, transparent 8%, hsl(var(--muted) / 0.3) 35%, hsl(var(--muted) / 0.8) 100%)",
              }}
            />
            <div className="absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b to-muted/40 from-muted via-muted/70" />
            <div className="absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t to-muted/40 from-muted via-muted/70" />

            <Image
              src="/landing/ai-models.svg"
              unoptimized
              alt="Firebuzz"
              width={530}
              height={170}
              className="p-0 w-full"
              style={{
                imageRendering: "crisp-edges",
                shapeRendering: "crispEdges",
              }}
            />
          </div>
        </div>
        <div className="col-span-full p-4 border-b">
          {/* Marquee list of features */}
          <div className="flex overflow-hidden relative justify-center items-center h-12">
            <div className="group flex overflow-hidden [--gap:1rem] [gap:var(--gap)] flex-row [--duration:40s]">
              {/* First set of features */}
              <div className="flex shrink-0 [gap:var(--gap)] animate-marquee flex-row group-hover:[animation-play-state:paused]">
                {features.map((feature, index) => {
                  const positions = [
                    "left",
                    "center",
                    "right",
                    "top left",
                    "top right",
                    "bottom left",
                    "bottom right",
                  ];
                  const position = positions[index % positions.length];

                  return (
                    <div
                      key={`first-${feature}`}
                      className="flex-shrink-0 px-3 py-1.5 text-sm relative font-medium whitespace-nowrap rounded-md border bg-background/50 mr-4 overflow-hidden"
                    >
                      <div
                        className="absolute inset-0 z-10"
                        style={{
                          background: `radial-gradient(circle at ${position}, transparent 8%, hsl(var(--muted) / 0.5) 35%, hsl(var(--muted) / 0.8) 100%)`,
                        }}
                      />
                      {feature}
                    </div>
                  );
                })}
              </div>
              {/* Duplicate set for seamless loop */}
              <div className="flex shrink-0 [gap:var(--gap)] animate-marquee flex-row group-hover:[animation-play-state:paused] overflow-hidden">
                {features.map((feature, index) => {
                  const positions = [
                    "left",
                    "center",
                    "right",
                    "top left",
                    "top right",
                    "bottom left",
                    "bottom right",
                  ];
                  const position = positions[index % positions.length];

                  return (
                    <div
                      key={`second-${feature}`}
                      className="flex-shrink-0 px-3 py-1.5 text-sm font-medium whitespace-nowrap rounded-md border mr-4 relative overflow-hidden"
                    >
                      <div
                        className="absolute inset-0 z-10"
                        style={{
                          background: `radial-gradient(circle at ${position}, transparent 8%, hsl(var(--muted) / 0.5) 35%, hsl(var(--muted) / 0.8) 100%)`,
                        }}
                      />
                      {feature}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Left fade */}
            <div className="absolute inset-y-0 left-0 w-8 pointer-events-none">
              <div className="w-full h-full bg-gradient-to-r to-transparent from-muted via-muted/80" />
            </div>
            {/* Right fade */}
            <div className="absolute inset-y-0 right-0 w-8 pointer-events-none">
              <div className="w-full h-full bg-gradient-to-l to-transparent from-muted via-muted/80" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 col-span-full sm:grid-cols-2">
          <div className="px-8 py-8 border-b sm:border-b-0 sm:border-r">
            <div className="text-sm text-muted-foreground">Firebuzz Pro</div>
            <h2 className="max-w-sm text-2xl font-bold leading-tight">
              All the power of Firebuzz starting at $99/month
            </h2>
            <div className="flex gap-2 mt-4">
              <Button className="h-8" size="sm">
                Start Free Trial
              </Button>
              <Button variant="ghost" size="sm" className="h-8">
                Pricing
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-0 text-sm text-center text-muted-foreground md:text-base">
            <div className="flex justify-center items-center py-8 font-medium text-center border-r border-b">
              Unlimited Leads
            </div>
            <div className="flex justify-center items-center py-8 font-medium text-center border-b">
              Unlimited Landing Pages
            </div>
            <div className="flex justify-center items-center py-8 font-medium text-center border-r">
              20k traffic / per month
            </div>
            <div className="flex justify-center items-center py-8 font-medium text-center">
              250 Credits / per month
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
