import { AppPreview } from "./sections/app-preview";
import { Flow } from "./sections/flow";
import { Hero } from "./sections/hero";

export const Homepage = () => {
  return (
    <div className="relative min-h-screen">
      {/* Outer Container */}
      <div className="relative mx-auto max-w-7xl border-x">
        {/* Inner Container */}
        <div className="">
          {/* Content */}
          <Hero />
          <AppPreview />
          <Flow />
        </div>
      </div>
    </div>
  );
};
