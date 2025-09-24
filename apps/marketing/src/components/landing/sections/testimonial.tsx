import { Badge } from "@firebuzz/ui/components/ui/badge";
import { TestimonialCard } from "../testimonial-card";

const testimonials = [
  {
    author: {
      name: "Emma Thompson",
      handle: "@emmaat",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face",
    },
    text: "This AI platform has transformed how we handle data analysis. The speed and accuracy are unprecedented.",
  },
  {
    author: {
      name: "David Park",
      handle: "@davidtech",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    },
    text: "The API integration is flawless. We've reduced our development time by 60% since implementing this solution.",
  },
  {
    author: {
      name: "Sofia Rodriguez",
      handle: "@sofiaml",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    },
    text: "Finally, an AI tool that actually understands context! The accuracy in natural language processing is impressive.",
  },
  {
    author: {
      name: "Marcus Chen",
      handle: "@marcuscode",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    },
    text: "Using this AI platform has revolutionized how we handle customer data and improved our response accuracy by 40%.",
  },
  {
    author: {
      name: "Sarah Kim",
      handle: "@sarahux",
      avatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    },
    text: "The user experience is seamless and the AI predictions have improved our conversion rates significantly.",
  },
  {
    author: {
      name: "Alex Johnson",
      handle: "@alexdev",
      avatar:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    },
    text: "Game-changing technology! Our team productivity has increased by 50% since we started using this platform.",
  },
];

export const Testimonial = () => {
  return (
    <div className="mx-auto max-w-7xl border-b">
      <div className="px-8 mx-auto max-w-6xl">
        <div className="mx-auto max-w-6xl border-x">
          <div className="flex relative flex-col justify-center items-center py-10 mx-auto w-full text-center border-b">
            {/* Subtle Grid Pattern BG */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                    linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                    linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
                  `,
                backgroundSize: "30px 30px",
              }}
            />
            <div className="absolute inset-0 z-[1] bg-gradient-to-bl to-muted/40 from-muted via-muted/70" />
            <div className="relative z-10">
              <Badge
                variant="outline"
                className="mb-4 bg-muted py-1.5 px-4 text-brand"
              >
                Testimonials
              </Badge>
              <h2 className="max-w-4xl text-3xl font-bold lg:text-4xl">
                Hear from Early Users
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground">
                Marketers and freelancers who are already building the future
                with our AI platform see significant results. Listen what they
                say.
              </p>
            </div>
          </div>
          <div className="flex overflow-hidden relative flex-col justify-center items-center py-10 w-full">
            <div className="group flex overflow-hidden [--gap:1rem] [gap:var(--gap)] flex-row [--duration:30s]">
              {/* First set of testimonials */}
              <div className="flex shrink-0 justify-around [gap:var(--gap)] animate-marquee flex-row group-hover:[animation-play-state:paused]">
                {testimonials.map((testimonial) => (
                  <TestimonialCard
                    key={`first-${testimonial.author.name}-${testimonial.author.handle}`}
                    {...testimonial}
                  />
                ))}
              </div>
              {/* Duplicate set for seamless loop */}
              <div className="flex shrink-0 justify-around [gap:var(--gap)] animate-marquee flex-row group-hover:[animation-play-state:paused]">
                {testimonials.map((testimonial) => (
                  <TestimonialCard
                    key={`second-${testimonial.author.name}-${testimonial.author.handle}`}
                    {...testimonial}
                  />
                ))}
              </div>
            </div>

            {/* Left fade */}
            <div className="hidden absolute inset-y-0 left-0 w-32 pointer-events-none sm:block">
              <div className="w-full h-full bg-gradient-to-r to-transparent from-background via-background/80" />
            </div>
            {/* Right fade */}
            <div className="hidden absolute inset-y-0 right-0 w-32 pointer-events-none sm:block">
              <div className="w-full h-full bg-gradient-to-l to-transparent from-background via-background/80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
