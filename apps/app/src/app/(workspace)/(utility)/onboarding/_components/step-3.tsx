import { ConvexError, type Doc, api, useMutation } from "@firebuzz/convex";
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
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { InfoIcon } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { z } from "zod";

const formSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  brandDescription: z.string().min(1, "Brand description is required"),
  brandPersona: z.string().min(1, "Brand persona is required"),
});

type Step3Props = {
  onboardingData: Doc<"onboarding">;
};

export const Step3 = ({ onboardingData }: Step3Props) => {
  const [isHandlingBack, setIsHandlingBack] = useState(false);
  const [isHandlingStep, setIsHandlingStep] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brandName: onboardingData.step3?.formData?.brandName ?? "",
      brandDescription: onboardingData.step3?.formData?.brandDescription ?? "",
      brandPersona: onboardingData.step3?.formData?.brandPersona ?? "",
    },
  });

  const handleBackMutation = useMutation(
    api.collections.onboarding.mutations.handleBackStep
  );

  const handleClearError = useMutation(
    api.collections.onboarding.mutations.handleClearError
  );

  const handleStartMutation = useMutation(
    api.collections.onboarding.mutations.startStep3
  );

  const onSubmitHandler = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsHandlingStep(true);
      await handleStartMutation({
        onboardingId: onboardingData._id,
        brandName: data.brandName,
        brandDescription: data.brandDescription,
        brandPersona: data.brandPersona,
      });
    } catch (error) {
      console.log(error);
      setIsHandlingStep(false);
      if (error instanceof ConvexError) {
        toast.error(error.data);
      }
    }
  };

  const handleBack = useCallback(async () => {
    setIsHandlingBack(true);
    try {
      await handleBackMutation({
        onboardingId: onboardingData._id,
        step: 2,
      });
    } catch (error) {
      if (error instanceof ConvexError) {
        toast.error(error.data);
      }
    } finally {
      setIsHandlingBack(false);
    }
  }, [handleBackMutation, onboardingData._id]);

  // Handle Processing State
  useEffect(() => {
    setIsHandlingStep(onboardingData.isProcessing ?? false);
  }, [onboardingData.isProcessing]);

  // Keyboard shortcuts
  useHotkeys(
    "enter",
    () => {
      if (!isHandlingStep && form.formState.isValid) {
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
      if (!isHandlingBack) {
        handleBack();
      }
    },
    {
      preventDefault: true,
    }
  );

  // Handle Error
  useEffect(() => {
    if (onboardingData.error) {
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
      key="step-3"
      initial={{ opacity: 0, y: 100 }}
      exit={{ opacity: 0, transition: { duration: 0.1, ease: "easeInOut" } }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.3, ease: "easeInOut" },
      }}
      className="flex flex-col items-start justify-center flex-1 w-full gap-8 overflow-hidden"
    >
      {/* Middle */}
      <div className="flex flex-col items-start justify-center flex-1 w-full max-h-full overflow-hidden">
        {/* Title */}
        <div className="flex flex-col w-full gap-2 px-8 text-left">
          <h1 className="max-w-sm text-4xl font-bold">
            Fine-tune your <span className="font-mono italic">#brand</span>
          </h1>
          <p className="max-w-sm text-base text-muted-foreground">
            We'll use this information to create your brand identity and prefill
            your brand assets.
          </p>
        </div>
        {/* Form */}
        <div className="flex flex-col w-full max-h-full gap-4 px-8 mt-8 overflow-y-auto">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitHandler)}
              className="flex-1 w-full space-y-4"
            >
              <FormField
                control={form.control}
                name="brandName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Brand Name"
                        className="h-8"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brandDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Description{" "}
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger>
                          <InfoIcon className="size-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            A short description of your brand. It's a one-liner
                            that captures the essence of your brand.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Brand Description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brandPersona"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Persona{" "}
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger>
                          <InfoIcon className="size-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Characteristics of your brand. How do you want your
                            brand to be perceived? It's voice, tone, and
                            personality etc.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Brand Persona" />
                    </FormControl>
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
          onClick={handleBack}
          size="sm"
          variant="ghost"
          className=" text-muted-foreground"
          disabled={isHandlingBack}
        >
          {isHandlingBack ? (
            <div className="flex items-center gap-2">
              <Spinner size="xs" className="mb-0.5" />
              <span>Processing...</span>
            </div>
          ) : (
            <>
              Back <ButtonShortcut>Esc</ButtonShortcut>
            </>
          )}
        </Button>
        <Button
          onClick={form.handleSubmit(onSubmitHandler)}
          size="sm"
          className="w-full"
          disabled={isHandlingStep || !form.formState.isValid}
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
