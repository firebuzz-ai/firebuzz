import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

export function Hero() {
  return (
    <section className="relative flex-1 py-20 h-full bg-gradient-to-br lg:py-28 from-background to-muted/50">
      <div className="container px-4 mx-auto">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 mb-6 text-sm font-medium rounded-full bg-primary/10 text-primary">
              🚀 Catchy Fact or Statistic
            </div>

            {/* Headline */}
            <h1 className="mb-6 text-5xl font-bold tracking-tight lg:text-7xl">
              Supporting Headline
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                {" "}
                For
              </span>
              <br />
              Your Primary Action
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mb-8 max-w-3xl text-xl lg:text-2xl text-muted-foreground">
              Supporting statement for your primary action. This is where you
              can add a few sentences to support your primary action.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-4 justify-center mb-12 sm:flex-row">
              <Button size="lg" className="px-8 py-6 text-lg">
                Primary Action
              </Button>
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg">
                Secondary Action
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col gap-8 justify-center items-center text-sm sm:flex-row text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-4 h-4 text-amber-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span>Catchy Statistic</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Catchy Benefit</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Catchy Benefit</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="overflow-hidden absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 w-96 h-96 rounded-full blur-3xl transform -translate-x-1/2 bg-primary/5" />
        <div className="absolute right-0 bottom-0 w-64 h-64 rounded-full blur-2xl bg-primary/10" />
      </div>
    </section>
  );
}
