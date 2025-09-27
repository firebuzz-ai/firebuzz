import { AnimatedButton } from "@/components/reusables/animated-button";
import {
  ConvexError,
  type Doc,
  api,
  useAction,
  useCachedRichQuery,
} from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@firebuzz/ui/components/ui/card";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Switch } from "@firebuzz/ui/components/ui/switch";
import { CheckIcon } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";

type Step5Props = {
  onboardingData: Doc<"onboarding">;
};

export const Step5 = ({ onboardingData }: Step5Props) => {
  const [isHandlingCheckout, setIsHandlingCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isYearly, setIsYearly] = useState(false);

  const { data: plans, isPending: isPlansLoading } = useCachedRichQuery(
    api.collections.stripe.products.queries.getSubscriptionPlansWithPrices
  );

  console.log("plans", plans);

  const createCheckoutAction = useAction(
    api.collections.onboarding.actions.createCheckoutSession
  );

  const handlePlanSelect = useCallback(
    async (
      planName: string,
      stripeLineItems: {
        price: string;
        quantity: number;
        adjustable_quantity?: {
          enabled: boolean;
          minimum: number;
          maximum: number;
        };
      }[]
    ) => {
      try {
        setIsHandlingCheckout(true);
        setSelectedPlan(planName);

        const checkoutUrl = await createCheckoutAction({
          onboardingId: onboardingData._id,
          stripeLineItems,
          baseUrl: window.location.origin,
          isTrialActive: onboardingData.isTrialActive,
        });

        // Redirect to Stripe Checkout
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        }
      } catch (error) {
        console.error("Error creating checkout session:", error);
        setIsHandlingCheckout(false);
        setSelectedPlan(null);
        if (error instanceof ConvexError) {
          toast.error(error.data);
        } else {
          toast.error("Failed to create checkout session. Please try again.");
        }
      }
    },
    [createCheckoutAction, onboardingData.isTrialActive, onboardingData._id]
  );

  const formatPrice = (amount: number | undefined, currency: string) => {
    if (!amount) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getPlanFeatures = (
    planName: string,
    metadata?: Record<string, string>
  ) => {
    if (metadata) {
      const features = [];
      if (metadata.seats)
        features.push(
          `${metadata.seats} seat${Number(metadata.seats) > 1 ? "s" : ""}`
        );
      if (metadata.projects)
        features.push(
          `${metadata.projects} project${Number(metadata.projects) > 1 ? "s" : ""}`
        );
      if (metadata.credits) features.push(`${metadata.credits} credits/month`);
      if (metadata.traffic)
        features.push(
          `${Number(metadata.traffic).toLocaleString().slice(0, -4)}k traffic/month`
        );
      return features;
    }

    // Fallback for old format
    const features = {
      Pro: ["1 seat", "1 project", "300 credits/month", "20k traffic/month"],
      Scale: [
        "3 seats",
        "3 projects",
        "750 credits/month",
        "50k traffic/month",
      ],
      Agency: [
        "7 seats",
        "7 projects",
        "1,500 credits/month",
        "100k traffic/month",
      ],
    };
    return features[planName as keyof typeof features] || [];
  };

  // Filter and organize plans - get all public subscription plans
  const availablePlans =
    plans?.filter(
      (plan) =>
        plan.metadata?.isPublic === "true" &&
        plan.metadata?.type === "subscription"
    ) || [];

  // Create plan configs dynamically from available plans
  const planConfigs = availablePlans.map((plan) => {
    const getDescription = (planName: string) => {
      switch (planName) {
        case "Pro":
          return "Best for starting with Firebuzz";
        case "Scale":
          return "Perfect for growing teams";
        case "Agency":
          return "For agencies and large teams";
        default:
          return plan.description || "Custom plan";
      }
    };

    return {
      name: plan.name,
      description: getDescription(plan.name),
      plan: plan,
      popular: plan.name === "Scale", // Mark Scale as popular
    };
  });

  if (isPlansLoading) {
    return (
      <div className="flex flex-1 justify-center items-center">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <motion.div
      key="step-5"
      initial={{ opacity: 0, y: 100 }}
      exit={{ opacity: 0, transition: { duration: 0.1, ease: "easeInOut" } }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.3, ease: "easeInOut" },
      }}
      className="flex overflow-hidden flex-col flex-1 gap-8 justify-center items-start w-full max-h-full"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 px-8 w-full text-left">
        <h1 className="max-w-sm text-4xl font-bold">
          Choose your <span className="font-mono italic">#plan</span>
        </h1>
        <p className="max-w-sm text-base text-muted-foreground">
          Select the perfect plan for your needs. Start with a 14-day free
          trial.
        </p>

        {/* Billing Toggle */}
        <div className="flex gap-3 items-center mt-4 h-10">
          <span
            className={`text-sm ${!isYearly ? "font-medium" : "text-muted-foreground"}`}
          >
            Monthly
          </span>
          <Switch checked={isYearly} onCheckedChange={setIsYearly} />
          <span
            className={`text-sm ${isYearly ? "font-medium" : "text-muted-foreground"}`}
          >
            Yearly
          </span>
          <AnimatePresence>
            {isYearly && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Badge className="text-xs">Save one month</Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Plans */}
      <div className="flex overflow-y-auto flex-col gap-4 px-8 pb-8 w-full max-h-full">
        <div className="grid gap-4">
          {planConfigs.map((config) => {
            // Find monthly and yearly prices (excluding shadow prices)
            const monthlyPrice = config.plan.prices.find(
              (price) =>
                price.interval === "month" &&
                price.metadata?.type === "subscription" &&
                price.metadata?.isShadow !== "true" &&
                price.unitAmount
            );

            const yearlyPrice = config.plan.prices.find(
              (price) =>
                price.interval === "year" &&
                price.metadata?.type === "subscription" &&
                price.metadata?.isShadow !== "true" &&
                price.unitAmount
            );

            const currentPrice = isYearly ? yearlyPrice : monthlyPrice;
            const displayPrice = formatPrice(
              currentPrice?.unitAmount,
              currentPrice?.currency || "usd"
            );

            // All plans now have fixed seats - no adjustable quantity
            const currentLineItems = [
              {
                price: currentPrice?.stripePriceId ?? "",
                quantity: 1,
              },
            ];

            if (config.popular) {
              return (
                <AnimatedButton
                  key={config.name}
                  variant="outline"
                  showAnimation={true}
                  className="relative p-0 w-full h-auto transition-colors duration-200 cursor-pointer hover:shadow-md bg-muted hover:bg-muted/50"
                  onClick={() =>
                    handlePlanSelect(config.name, currentLineItems)
                  }
                >
                  <div className="w-full">
                    <div className="absolute -top-2 left-1/2 z-20 transform -translate-x-1/2">
                      <Badge variant="default" className="text-xs">
                        Most Popular
                      </Badge>
                    </div>
                    <CardHeader className="!p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2 items-center">
                          <div>
                            <CardTitle className="flex gap-2 items-center text-xl">
                              {config.name}
                            </CardTitle>
                            <CardDescription className="text-sm text-muted-foreground">
                              {config.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">
                            {displayPrice}
                            {currentPrice && (
                              <span className="text-sm font-normal text-muted-foreground">
                                /{isYearly ? "year" : "month"}
                              </span>
                            )}
                          </div>
                          {isYearly && monthlyPrice && yearlyPrice && (
                            <div className="text-xs text-muted-foreground">
                              <span className="line-through">
                                {formatPrice(
                                  (monthlyPrice.unitAmount ?? 0) * 12,
                                  monthlyPrice.currency
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {" "}
                                when billed monthly
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="!px-4 !pb-4 !pt-0">
                      <div className="flex flex-wrap gap-2 items-center">
                        {getPlanFeatures(config.name, config.plan.metadata).map(
                          (feature) => (
                            <Badge
                              key={feature}
                              variant="outline"
                              className="flex gap-1 items-center text-xs"
                            >
                              <CheckIcon className="flex-shrink-0 text-emerald-500 size-3" />
                              <span className="text-xs">{feature}</span>
                            </Badge>
                          )
                        )}
                        <AnimatePresence mode="wait">
                          {isHandlingCheckout &&
                          selectedPlan === config.name ? (
                            <motion.div
                              className="ml-auto"
                              key="handling-checkout-badge"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Badge
                                variant="outline"
                                className="flex gap-2 items-center text-xs"
                              >
                                <Spinner size="xs" className="mb-0.5" />{" "}
                                Processing...
                              </Badge>
                            </motion.div>
                          ) : (
                            <motion.div
                              className="ml-auto"
                              key="free-trial-badge"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Badge
                                variant="brand"
                                className="flex gap-2 items-center text-xs"
                              >
                                {onboardingData.isTrialActive
                                  ? "Free for 14 days"
                                  : "No trial"}
                              </Badge>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </CardContent>
                  </div>
                </AnimatedButton>
              );
            }

            return (
              <Card
                onClick={() => handlePlanSelect(config.name, currentLineItems)}
                key={config.name}
                className="relative transition-colors duration-200 cursor-pointer hover:shadow-md bg-muted hover:bg-muted/50"
              >
                <CardHeader className="!p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                      <div>
                        <CardTitle className="flex gap-2 items-center text-xl">
                          {config.name}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                          {config.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        {displayPrice}
                        {currentPrice && (
                          <span className="text-sm font-normal text-muted-foreground">
                            /{isYearly ? "year" : "month"}
                          </span>
                        )}
                      </div>
                      {isYearly && monthlyPrice && yearlyPrice && (
                        <div className="text-xs text-muted-foreground">
                          <span className="line-through">
                            {formatPrice(
                              (monthlyPrice.unitAmount ?? 0) * 12,
                              monthlyPrice.currency
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {" "}
                            when billed monthly
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="!px-4 !pb-4 !pt-0">
                  <div className="flex flex-wrap gap-2 items-center">
                    {getPlanFeatures(config.name, config.plan.metadata).map(
                      (feature) => (
                        <Badge
                          key={feature}
                          variant="outline"
                          className="flex gap-1 items-center text-xs"
                        >
                          <CheckIcon className="flex-shrink-0 text-emerald-500 size-3" />
                          <span className="text-xs">{feature}</span>
                        </Badge>
                      )
                    )}
                    <AnimatePresence mode="wait">
                      {isHandlingCheckout && selectedPlan === config.name ? (
                        <motion.div
                          className="ml-auto"
                          key="handling-checkout-badge"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Badge
                            variant="outline"
                            className="flex gap-2 items-center text-xs"
                          >
                            <Spinner size="xs" className="mb-0.5" />{" "}
                            Processing...
                          </Badge>
                        </motion.div>
                      ) : (
                        <motion.div
                          className="ml-auto"
                          key="free-trial-badge"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Badge
                            variant="brand"
                            className="flex gap-2 items-center text-xs"
                          >
                            {onboardingData.isTrialActive
                              ? "Free for 14 days"
                              : "No trial"}
                          </Badge>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <div className="flex justify-center items-center px-8 w-full text-xs text-muted-foreground">
        <span className="flex gap-1 items-center">
          We will inform you{" "}
          <span className="font-bold">2 days before you are charged</span> to
          prevent any surprises.
        </span>
      </div>
    </motion.div>
  );
};
