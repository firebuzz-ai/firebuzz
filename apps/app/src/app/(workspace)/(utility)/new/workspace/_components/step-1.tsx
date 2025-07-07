import { type Doc, api, useAction, useMutation } from "@firebuzz/convex";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { CheckCheck, Link, X } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useDebounce } from "use-debounce";
import { z } from "zod";

const INITIAL_BLACK_LISTED_DOMAINS = [
  "firebuzz.com",
  "firebuzz.ai",
  "amazon.com",
  "google.com",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "linkedin.com",
  "github.com",
  "stackoverflow.com",
  "reddit.com",
  "pinterest.com",
  "tiktok.com",
  "twitch.tv",
  "discord.com",
  "slack.com",
  "telegram.org",
  "whatsapp.com",
  "snapchat.com",
];

const formSchema = z.object({
  domain: z
    .string()
    .min(1, "Domain is required")
    .refine((domain) => {
      // Basic domain validation
      const domainRegex =
        /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
      return domainRegex.test(
        domain.replace(/^https?:\/\//, "").replace(/\/$/, "")
      );
    }, "Please enter a valid domain"),
});

type Step1Props = {
  onboardingData: Doc<"onboarding">;
};

export const Step1 = ({ onboardingData }: Step1Props) => {
  const [isHandlingStep, setIsHandlingStep] = useState(false);
  const [isHandlingSkip, setIsHandlingSkip] = useState(false);
  const [blackListedDomains, setBlackListedDomains] = useState(
    INITIAL_BLACK_LISTED_DOMAINS
  );
  const [status, setStatus] = useState<
    "idle" | "valid" | "invalid" | "checking"
  >("idle");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange", // This ensures validation happens on every change
    defaultValues: {
      domain: onboardingData.step1?.formData?.domain ?? "",
    },
  });

  const watchedDomain = form.watch("domain");

  // Check if the current domain value is valid according to our schema
  const isFormValid = watchedDomain
    ? formSchema.safeParse({ domain: watchedDomain }).success
    : false;

  const checkDomainAction = useAction(
    api.collections.onboarding.actions.checkDomain
  );

  const handleStepAction = useMutation(
    api.collections.onboarding.mutations.startStep1
  );

  const handleSkipMutation = useMutation(
    api.collections.onboarding.mutations.handleSkip
  );

  const handleClearError = useMutation(
    api.collections.onboarding.mutations.handleClearError
  );

  const handleCheckDomain = useCallback(
    async (domain: string) => {
      if (!domain) {
        setStatus("idle");
        return;
      }

      const isDomainBlackListedInitialy = blackListedDomains.includes(domain);
      if (isDomainBlackListedInitialy) {
        setStatus("invalid");
        return;
      }

      setStatus("checking");

      try {
        const response = await checkDomainAction({ domain });

        if (response.isValid && response.isReachable) {
          setStatus("valid");
        } else {
          setStatus("invalid");
          setBlackListedDomains([...blackListedDomains, domain]);
        }
      } catch (error) {
        console.log({ error });
        setStatus("invalid");
      }
    },
    [blackListedDomains, checkDomainAction]
  );

  const onSubmitHandler = async (data: z.infer<typeof formSchema>) => {
    if (status !== "valid") {
      return;
    }

    setIsHandlingStep(true);
    try {
      await handleStepAction({
        domain: data.domain,
        onboardingId: onboardingData._id,
      });
    } catch (error) {
      console.log({ error });
      toast.error("Something went wrong while trying to handle step 1");
      setIsHandlingStep(false);
    }
  };

  const handleSkip = useCallback(async () => {
    setIsHandlingSkip(true);
    try {
      await handleSkipMutation({
        onboardingId: onboardingData._id,
      });
    } catch (error) {
      console.log({ error });
      toast.error("Something went wrong while trying to skip");
      setIsHandlingSkip(false);
    }
  }, [handleSkipMutation, onboardingData._id]);

  // Handle Processing State
  useEffect(() => {
    setIsHandlingStep(onboardingData.isProcessing);
  }, [onboardingData.isProcessing]);

  // Keyboard shortcuts
  useHotkeys(
    "enter",
    () => {
      if (status === "valid" && !isHandlingStep && isFormValid) {
        form.handleSubmit(onSubmitHandler)();
      }
    },
    {
      preventDefault: true,
    }
  );

  useHotkeys(
    "esc",
    () => {
      if (!isHandlingSkip) {
        handleSkip();
      }
    },
    {
      preventDefault: true,
    }
  );

  const [debouncedDomain] = useDebounce(watchedDomain, 1000);

  useEffect(() => {
    handleCheckDomain(debouncedDomain);
  }, [debouncedDomain, handleCheckDomain]);

  useEffect(() => {
    if (watchedDomain.length === 0) {
      setStatus("idle");
    }
  }, [watchedDomain]);

  // Handle Error
  useEffect(() => {
    if (onboardingData.error) {
      console.log({ error: onboardingData.error });
      toast.error(onboardingData.error, {
        description: "Please try again",
        id: "onboarding-error",
        duration: 3000,
      });
      handleClearError({ onboardingId: onboardingData._id });
    }
  }, [onboardingData.error, handleClearError, onboardingData._id]);

  return (
    <motion.div
      key="step-1"
      initial={{ opacity: 0, y: 100 }}
      exit={{ opacity: 0, transition: { duration: 0.1, ease: "easeInOut" } }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.3, ease: "easeInOut" },
      }}
      className="flex flex-col items-start justify-center flex-1 w-full gap-8"
    >
      {/* Middle */}
      <div className="flex flex-col items-start justify-center flex-1 w-full">
        {/* Title */}
        <div className="flex flex-col w-full gap-2 px-8 text-left">
          <h1 className="max-w-sm text-4xl font-bold">
            Tell us about your <span className="font-mono italic">#brand</span>
          </h1>
          <p className="max-w-sm text-base text-muted-foreground">
            We'll use your website to learn more about your brand.
          </p>
        </div>
        {/* Form */}
        <div className="flex flex-col w-full gap-2 px-8 mt-8">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitHandler)}
              className="w-full space-y-2"
            >
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Website</FormLabel>
                    <div className="relative">
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div className="absolute top-0 bottom-0 left-0 z-10 flex items-center justify-center w-8 h-full border cursor-default select-none text-primary bg-muted rounded-l-md">
                            <AnimatePresence mode="wait">
                              {status === "idle" && (
                                <motion.div
                                  key="link"
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -5 }}
                                  className="cursor-default select-none"
                                >
                                  <Link className="size-3.5" />
                                </motion.div>
                              )}
                              {status === "checking" && (
                                <motion.div
                                  key="spinner"
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -5 }}
                                  className="cursor-default select-none"
                                >
                                  <Spinner size="xs" className="mb-0.5" />
                                </motion.div>
                              )}
                              {status === "valid" && (
                                <motion.div
                                  key="valid"
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -5 }}
                                  className="cursor-default select-none"
                                >
                                  <CheckCheck className="size-3.5 text-emerald-500" />
                                </motion.div>
                              )}
                              {status === "invalid" && (
                                <motion.div
                                  key="invalid"
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -5 }}
                                  className="cursor-default select-none"
                                >
                                  <X className="size-3.5 text-red-500" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          sideOffset={10}
                          side="bottom"
                          align="start"
                        >
                          {status === "idle" && "Link to your brand website"}
                          {status === "checking" &&
                            "Checking if the domain is valid"}
                          {status === "valid" &&
                            "Your brand website is valid and reachable"}
                          {status === "invalid" &&
                            "Your brand website is invalid or unreachable"}
                        </TooltipContent>
                      </Tooltip>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="yourwebsite.com"
                          className="relative w-full h-8 pl-10 text-muted-foreground"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-row justify-between w-full gap-8 px-8">
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={handleSkip}
          disabled={isHandlingSkip}
        >
          {isHandlingSkip ? (
            <Spinner />
          ) : (
            <>
              Skip <ButtonShortcut>Esc</ButtonShortcut>
            </>
          )}
        </Button>
        <Button
          disabled={status !== "valid" || isHandlingStep || !isFormValid}
          size="sm"
          className="w-full"
          onClick={form.handleSubmit(onSubmitHandler)}
        >
          {isHandlingStep ? (
            <div className="flex items-center gap-2">
              <Spinner size="xs" className="mb-0.5" />
              <span>Processing...</span>
            </div>
          ) : (
            <>
              Continue <ButtonShortcut>Return</ButtonShortcut>
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};
