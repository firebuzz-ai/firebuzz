import { Badge } from "@firebuzz/ui/components/ui/badge";
import Image from "next/image";
import { FeaturedTabsCampaign } from "../feature-tabs-campaign";

export const Campaign = () => {
  return (
    <div className="py-10 border-b">
      <div className="px-8 mx-auto max-w-6xl">
        {/* Image */}
        <div className="overflow-hidden relative z-10 bg-gradient-to-b rounded-t-xl from-brand via-brand/10 to-background">
          <div
            className="absolute inset-0 z-10"
            style={{
              background:
                "radial-gradient(circle at center, transparent 8%, hsl(var(--background) / 0.3) 35%, hsl(var(--background) / 0.8) 100%)",
            }}
          />
          <div className="pt-2 pr-2 pl-2 w-full h-full md:pt-3 md:pl-3 md:pr-3">
            <Image
              src="/landing/campaign-1.png"
              alt="Firebuzz"
              priority
              quality={100}
              width={1200}
              height={628}
              className="object-cover rounded-t-xl"
            />
          </div>
        </div>
        {/* Content */}
        <div className="mt-10">
          <Badge
            variant="outline"
            className="mb-4 bg-muted py-1.5 px-4 text-brand"
          >
            Campaign Management
          </Badge>
          <h2 className="text-3xl font-bold">
            One Campaign. One Link. Unlimited Landing Pages.
          </h2>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Campaign management has never been easier. Create a campaign, design
            your landing pages for each segment, language, AB testing, and more.
          </p>
        </div>
        {/* Features */}
        <FeaturedTabsCampaign />
      </div>
    </div>
  );
};
