import { Badge } from "@firebuzz/ui/components/ui/badge";
import Image from "next/image";

export const Flow = () => {
  return (
    <div className="py-10 border-b">
      <div className="px-8 mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-16">
          <Badge
            variant="outline"
            className="mb-4 bg-muted py-1.5 px-4 text-brand"
          >
            Branching
          </Badge>
          <h2 className="max-w-4xl text-3xl font-bold lg:text-4xl">
            Safely review your changes before publishing them to your audience.
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Firebuzz creates a two-branch for your landing pages and the whole
            campaign structure. You can review your changes before publishing
            them to your audience.
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          {/* Step 1 - Make Changes */}
          <div className="overflow-hidden rounded-lg border bg-muted">
            <div className="px-3 pt-4 space-y-2">
              <div className="flex gap-3 items-center">
                <div className="flex justify-center items-center text-sm font-medium tabular-nums rounded-lg border size-8">
                  1
                </div>
                <h3 className="text-base font-semibold">Make Changes</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Change your landing page design or campaign structure freely.
              </p>
            </div>
            <div className="relative">
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b to-muted/40 from-muted via-muted/70" />
              <Image
                src="/landing/flow-1.svg"
                unoptimized
                alt="Firebuzz"
                width={530}
                height={340}
                priority
                style={{
                  imageRendering: "crisp-edges",
                  shapeRendering: "crispEdges",
                }}
              />
            </div>
          </div>

          {/* Step 2 - Review Changes */}
          <div className="overflow-hidden rounded-lg border bg-muted">
            <div className="px-3 pt-4 space-y-2">
              <div className="flex gap-3 items-center">
                <div className="flex justify-center items-center text-sm font-medium tabular-nums rounded-lg border size-8">
                  2
                </div>
                <h3 className="text-base font-semibold">Review Changes</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Review your changes before making them live. Test everything in
                real-time.
              </p>
            </div>
            <div className="relative">
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b to-muted/40 from-muted via-muted/70" />
              <Image
                src="/landing/flow-2.svg"
                unoptimized
                alt="Firebuzz"
                width={530}
                height={340}
                priority
                style={{
                  imageRendering: "crisp-edges",
                  shapeRendering: "crispEdges",
                }}
              />
            </div>
          </div>

          {/* Step 3 - Publish */}
          <div className="overflow-hidden col-span-full rounded-lg border bg-muted md:col-span-1">
            <div className="px-3 pt-4 space-y-2">
              <div className="flex gap-3 items-center">
                <div className="flex justify-center items-center text-sm font-medium tabular-nums rounded-lg border size-8">
                  3
                </div>
                <h3 className="text-base font-semibold">Make it Live</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Make your changes live instantly to your audience with a single
                click.
              </p>
            </div>
            <div className="relative">
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b to-muted/40 from-muted via-muted/70" />
              <Image
                src="/landing/flow-3.svg"
                unoptimized
                alt="Firebuzz"
                width={530}
                height={340}
                priority
                style={{
                  imageRendering: "crisp-edges",
                  shapeRendering: "crispEdges",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
