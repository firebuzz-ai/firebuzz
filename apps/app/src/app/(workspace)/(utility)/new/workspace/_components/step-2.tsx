import { api, ConvexError, type Doc, useMutation } from "@firebuzz/convex";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Globe, Home, Lock } from "@firebuzz/ui/icons/lucide";
import { cn, toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { z } from "zod";

const formSchema = z.object({
	urls: z.array(z.string()).refine((urls) => {
		const filledUrls = urls.filter((url) => url.trim() !== "");
		return filledUrls.length > 0;
	}, "Please fill at least one URL"),
});

interface Step2Props {
	onboardingData: Doc<"onboarding">;
}

export const Step2 = ({ onboardingData }: Step2Props) => {
	const [isHandlingBack, setIsHandlingBack] = useState(false);
	const [isHandlingStep, setIsHandlingStep] = useState(false);
	const stepData = useMemo(() => {
		if (!onboardingData?.step2) return null;
		return onboardingData.step2;
	}, [onboardingData?.step2]);

	// Initialize with exactly 5 URLs from stepData or empty strings
	const initialUrls = useMemo(() => {
		const existingUrls = stepData?.formData?.urls || [];
		const urlArray = new Array(5).fill("");
		// Fill with existing URLs up to 5
		for (let i = 0; i < Math.min(5, existingUrls.length); i++) {
			urlArray[i] = existingUrls[i] || "";
		}
		// Set the first URL to the domain from step 1 if available
		if (urlArray[0] === "" && onboardingData.step1?.formData?.domain) {
			urlArray[0] = onboardingData.step1.formData.domain;
		}
		return urlArray;
	}, [stepData?.formData?.urls, onboardingData.step1?.formData?.domain]);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			urls: initialUrls,
		},
	});

	const watchedUrls = form.watch("urls");
	const filledUrls = watchedUrls.filter((url) => url.trim() !== "").length;

	const handleBackStep = useMutation(
		api.collections.onboarding.mutations.handleBackStep,
	);

	const startStep2 = useMutation(
		api.collections.onboarding.mutations.startStep2,
	);

	const handleClearError = useMutation(
		api.collections.onboarding.mutations.handleClearError,
	);

	const handleBack = useCallback(async () => {
		setIsHandlingBack(true);
		try {
			await handleBackStep({
				onboardingId: onboardingData._id,
				step: 1,
			});
		} catch (error) {
			if (error instanceof ConvexError) {
				toast.error(error.data);
			}
		} finally {
			setIsHandlingBack(false);
		}
	}, [handleBackStep, onboardingData._id]);

	// Create stable URL slots with fixed IDs
	const urlSlots = useMemo(
		() => [
			{ id: "url-1", index: 0 },
			{ id: "url-2", index: 1 },
			{ id: "url-3", index: 2 },
			{ id: "url-4", index: 3 },
			{ id: "url-5", index: 4 },
		],
		[],
	);

	const onSubmitHandler = async (data: z.infer<typeof formSchema>) => {
		try {
			setIsHandlingStep(true);
			await startStep2({
				onboardingId: onboardingData._id,
				urls: data.urls,
			});
		} catch (error) {
			console.log(error);
			setIsHandlingStep(false);
			if (error instanceof ConvexError) {
				toast.error(error.data);
			}
		}
	};

	// Handle Processing State
	useEffect(() => {
		setIsHandlingStep(onboardingData.isProcessing ?? false);
	}, [onboardingData.isProcessing]);

	// Keyboard shortcuts
	useHotkeys(
		"enter",
		() => {
			if (filledUrls > 0 && !isHandlingStep && form.formState.isValid) {
				form.handleSubmit(onSubmitHandler)();
			}
		},
		{
			preventDefault: true,
		},
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
		},
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
			key="step-2"
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
						Select URLs for{" "}
						<span className="font-mono italic">
							{(stepData?.formData?.domain ?? "your brand")
								.replace("https://", "")
								.replace("http://", "")}
						</span>
					</h1>
					<p className="max-w-sm text-base text-muted-foreground">
						Let&apos;s find the best pages to understand your brand better. We
						will scrape these pages.
					</p>
				</div>

				{/* Form */}
				<div className="flex flex-col w-full gap-6 px-8 mt-8">
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmitHandler)}
							className="w-full space-y-4"
						>
							{/* URLs Section */}
							<FormField
								control={form.control}
								name="urls"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											URLs{" "}
											<span className="text-xs text-muted-foreground">
												({filledUrls}/5)
											</span>
										</FormLabel>
										<div className="space-y-3">
											{urlSlots.map((slot) => (
												<motion.div
													key={slot.id}
													initial={{ opacity: 0, x: -20 }}
													animate={{
														opacity: 1,
														x: 0,
														transition: {
															duration: 0.3,
															delay: slot.index * 0.1,
															ease: "easeOut",
														},
													}}
													className="flex items-center gap-2"
												>
													<div className="relative flex-1">
														<div className="absolute top-0 bottom-0 left-0 z-10 flex items-center justify-center w-8 h-full border cursor-default select-none text-primary bg-muted rounded-l-md">
															{slot.index === 0 ? (
																<Home className="size-3.5 text-brand" />
															) : (
																<Globe className="size-3.5" />
															)}
														</div>

														<Input
															readOnly={slot.index === 0}
															value={field.value[slot.index] || ""}
															onChange={(e) => {
																const newUrls = [...field.value];
																newUrls[slot.index] = e.target.value;
																field.onChange(newUrls);
															}}
															placeholder="yourwebsite.com"
															className={cn(
																"relative w-full h-8 pl-10 text-muted-foreground",
																slot.index === 0 &&
																	"cursor-default bg-muted text-brand",
															)}
														/>
														{slot.index === 0 && (
															<div className="absolute top-0 bottom-0 right-0 flex items-center justify-center w-8">
																<Lock className="size-3.5 text-border" />
															</div>
														)}
													</div>
												</motion.div>
											))}
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
					className="text-muted-foreground min-w-[25%]"
					onClick={handleBack}
					disabled={isHandlingBack}
				>
					{isHandlingBack ? (
						<Spinner />
					) : (
						<>
							Back <ButtonShortcut>Esc</ButtonShortcut>
						</>
					)}
				</Button>
				<Button
					disabled={
						filledUrls === 0 || isHandlingStep || !form.formState.isValid
					}
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
