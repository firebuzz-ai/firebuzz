import { Badge } from "@firebuzz/ui/components/ui/badge";
import Image from "next/image";
import HeroLightImage from "../../../../public/landing/hero-2-light.png";
import HeroDarkImage from "../../../../public/landing/hero-3-dark.png";

export const AppPreview = () => {
  return (
    <div className="py-10 border-b">
      <div className="px-8 mx-auto max-w-6xl">
        {/* Image */}
        <div className="overflow-hidden relative z-10 bg-gradient-to-br to-transparent via-brand from-brand">
          <div className="pt-2 pl-2 w-full h-full md:pt-3 md:pl-3">
            <picture>
              <source
                srcSet={HeroDarkImage.src}
                media="(prefers-color-scheme: dark)"
              />
              <Image
                src={HeroLightImage}
                alt="Firebuzz"
                priority
                quality={100}
                width={1200}
                height={628}
                className="object-cover rounded-tl-xl rounded-br-xl border"
              />
            </picture>
          </div>
        </div>
        {/* Content */}
        <div className="mt-10">
          <Badge
            variant="outline"
            className="mb-4 bg-muted py-1.5 px-3 text-brand"
          >
            Magic Link
          </Badge>
          <h2 className="text-3xl font-bold">
            One landing page. Works for everything, everywhere, every time.
          </h2>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Create a single landing page once and deploy it to multiple
            channels. Firebuzz handles the technical implementation, so you can
            focus on your marketing strategy.
          </p>
        </div>

        {/* Testimonial */}
        <div className="flex flex-col items-center mt-10 rounded-lg border md:flex-row bg-muted">
          <div className="flex-1 p-6 border-r">
            <blockquote className="leading-relaxed text-muted-foreground">
              "I can't get over how insanely easy it is to scaffold large stores
              of content with Firebuzz. My entire marketing site and a large
              bulk of our content (blog, media, campaigns) is delivered with
              Firebuzz. The platform is top-notch... highly recommended!"
            </blockquote>
          </div>
          <div className="flex flex-col gap-3 justify-center items-center px-6 py-6 h-full md:py-0">
            <div className="flex justify-center items-center p-2 rounded-full border size-8">
              <span className="text-sm font-semibold text-brand">ES</span>
            </div>
            <div>
              <div className="font-semibold">Evan Stewart</div>
              <div className="text-sm text-muted-foreground">
                CEO, BasewellHQ
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
