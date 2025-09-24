import { Campaign } from "./sections/campaign";
import { ClosingCta } from "./sections/closing-cta";
import { Editor } from "./sections/editor";
import { Flow } from "./sections/flow";
import { Hero } from "./sections/hero";
import { Testimonial } from "./sections/testimonial";

export const Homepage = () => {
  return (
    <div className="relative min-h-screen">
      {/* Outer Container */}
      <div className="relative mx-auto max-w-7xl border-x">
        {/* Inner Container */}
        <div className="">
          {/* Content */}
          <Hero />
          <Editor />
          <Flow />
          <Testimonial />
          <Campaign />
          <ClosingCta />
        </div>
      </div>
    </div>
  );
};
