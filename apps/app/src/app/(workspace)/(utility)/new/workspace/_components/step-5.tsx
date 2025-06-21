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
    [createCheckoutAction, onboardingData._id]
  );

  const formatPrice = (amount: number | undefined, currency: string) => {
    if (!amount) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getPlanFeatures = (planName: string) => {
    const features = {
      Pro: ["300 credits/month", "1 project"],
      Team: ["500 credits/seat/month", "3 projects"],
    };
    return features[planName as keyof typeof features] || [];
  };

  // Filter and organize plans
  const proPlans = plans?.filter((plan) => plan.name === "Pro") || [];
  const teamPlans = plans?.filter((plan) => plan.name === "Team") || [];

  const planConfigs = [
    {
      name: "Pro",
      description: "Individuals and small teams",
      plans: proPlans,
      popular: false,
    },
    {
      name: "Team",
      description: "Growing teams and businesses",
      plans: teamPlans,
      popular: true,
    },
  ];

  if (isPlansLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
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
      className="flex flex-col items-start justify-center flex-1 w-full max-h-full gap-8 overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-col w-full gap-4 px-8 text-left">
        <h1 className="max-w-sm text-4xl font-bold">
          Choose your <span className="font-mono italic">#plan</span>
        </h1>
        <p className="max-w-sm text-base text-muted-foreground">
          Select the perfect plan for your needs. Start with a 7-day free trial.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center h-10 gap-3 mt-4">
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
            {!isYearly && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Badge className="text-xs ">Save 2 months</Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Plans */}
      <div className="flex flex-col w-full max-h-full gap-4 px-8 pb-8 overflow-y-auto">
        <div className="grid gap-4">
          {planConfigs.map((config) => {
            const monthlyPrice = config.plans
              .find((p) => p.prices.some((price) => price.interval === "month"))
              ?.prices.find(
                (price) => price.interval === "month" && price.unitAmount
              );

            const yearlyPrice = config.plans
              .find((p) => p.prices.some((price) => price.interval === "year"))
              ?.prices.find(
                (price) => price.interval === "year" && price.unitAmount
              );

            const currentPrice = isYearly ? yearlyPrice : monthlyPrice;
            const displayPrice = formatPrice(
              currentPrice?.unitAmount,
              currentPrice?.currency || "usd"
            );

            const isTeam = config.name === "Team";

            const currentLineItems = isYearly
              ? [
                  {
                    price: currentPrice?.stripePriceId ?? "",
                    quantity: 1,
                    adjustable_quantity: {
                      enabled: true,
                      minimum: 1,
                      maximum: 15,
                    },
                  },
                ]
              : [
                  {
                    price: currentPrice?.stripePriceId ?? "",
                    quantity: 1,
                  },
                ];

            return (
              <Card
                onClick={() => handlePlanSelect(config.name, currentLineItems)}
                key={config.name}
                className="relative transition-colors duration-200 cursor-pointer hover:shadow-md bg-muted hover:bg-muted/50"
              >
                <CardHeader className="!p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
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
                            {isTeam ? "/seat" : ""}
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
                  <div className="flex items-center gap-2">
                    {getPlanFeatures(config.name).map((feature) => (
                      <Badge
                        key={feature}
                        variant="outline"
                        className="flex items-center gap-1 text-xs"
                      >
                        <CheckIcon className="flex-shrink-0 size-3 text-emerald-500" />
                        <span className="text-xs">{feature}</span>
                      </Badge>
                    ))}
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
                            className="flex items-center gap-2 text-xs"
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
                            className="flex items-center gap-2 text-xs"
                          >
                            Free for 7 days
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
      <div className="flex items-center justify-center w-full px-8 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          We will inform you{" "}
          <span className="font-bold">2 days before you are charged</span> to
          prevent any surprises.
        </span>
      </div>
    </motion.div>
  );
};
