import { api, ConvexError, type Doc, useMutation } from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { InfoIcon } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { hslToHex } from "@firebuzz/utils";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { z } from "zod";
import { ColorSelectorModal } from "@/components/modals/color-selector/modal";
import { MediaGalleryModal } from "@/components/modals/media/gallery/gallery-modal";
import { ImagePreview } from "@/components/reusables/image-preview";
import { ImageSelect } from "@/components/reusables/image-select";
import { useColorSelectorModal } from "@/hooks/ui/use-color-selector-modal";

const formSchema = z.object({
	logo: z.string().optional(),
	primaryColor: z.string().min(1, "Primary color is required"),
	secondaryColor: z.string().min(1, "Secondary color is required"),
});

type Step4Props = {
	onboardingData: Doc<"onboarding">;
};

export const Step4 = ({ onboardingData }: Step4Props) => {
	const [isHandlingBack, setIsHandlingBack] = useState(false);
	const [isHandlingStep, setIsHandlingStep] = useState(false);
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			logo: onboardingData.step4?.formData?.logo
				? `${NEXT_PUBLIC_R2_PUBLIC_URL}/${onboardingData.step4?.formData?.logo}`
				: "",
			primaryColor: hslToHex(
				onboardingData.step4?.formData?.theme?.darkTheme?.primary ??
					"25 94.6% 56.5%",
			), // Default Firebuzz Orange
			secondaryColor: hslToHex(
				onboardingData.step4?.formData?.theme?.darkTheme?.secondary ??
					"160.1 84.1% 39.4%",
			), // Default Emerald 500
		},
	});

	const { setState } = useColorSelectorModal();

	const handleBackMutation = useMutation(
		api.collections.onboarding.mutations.handleBackStep,
	);

	const handleClearError = useMutation(
		api.collections.onboarding.mutations.handleClearError,
	);

	const handleStartMutation = useMutation(
		api.collections.onboarding.mutations.startStep4,
	);

	const onSubmitHandler = async (data: z.infer<typeof formSchema>) => {
		try {
			setIsHandlingStep(true);
			await handleStartMutation({
				onboardingId: onboardingData._id,
				primaryColor: data.primaryColor,
				secondaryColor: data.secondaryColor,
				logo: data.logo?.split(`${NEXT_PUBLIC_R2_PUBLIC_URL}/`).pop() ?? "",
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
				step: 3,
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

	const handleColorClick = (
		colorType: "primary" | "secondary",
		currentColor: string,
	) => {
		setState((prev) => ({
			...prev,
			isOpen: true,
			color: currentColor,
			activeTab: "library",
			onSelect: (selectedColor: string) => {
				if (colorType === "primary") {
					form.setValue("primaryColor", selectedColor);
				} else {
					form.setValue("secondaryColor", selectedColor);
				}
			},
		}));
	};

	return (
		<>
			<motion.div
				key="step-4"
				initial={{ opacity: 0, y: 100 }}
				exit={{ opacity: 0, transition: { duration: 0.1, ease: "easeInOut" } }}
				animate={{
					opacity: 1,
					y: 0,
					transition: { duration: 0.3, ease: "easeInOut" },
				}}
				className="flex overflow-hidden flex-col flex-1 gap-8 justify-center items-start w-full"
			>
				{/* Middle */}
				<div className="flex overflow-hidden flex-col flex-1 justify-center items-start w-full max-h-full">
					{/* Title */}
					<div className="flex flex-col gap-2 px-8 w-full text-left">
						<h1 className="max-w-sm text-4xl font-bold">
							Visual <span className="font-mono italic">#identity</span>
						</h1>
						<p className="max-w-sm text-base text-muted-foreground">
							Upload your logo and select your brand colors to create a cohesive
							visual identity.
						</p>
					</div>

					{/* Form */}
					<div className="flex overflow-y-auto flex-col gap-6 px-8 mt-8 w-full max-h-full">
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmitHandler)}
								className="space-y-6 w-full"
							>
								{/* Logo Section */}
								<FormField
									control={form.control}
									name="logo"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="flex gap-2 items-center">
												Logo{" "}
												<Tooltip delayDuration={0}>
													<TooltipTrigger>
														<InfoIcon className="size-3.5 text-muted-foreground" />
													</TooltipTrigger>
													<TooltipContent className="max-w-xs">
														<p>
															Upload your brand logo. This will be used across
															your campaigns and materials.
														</p>
													</TooltipContent>
												</Tooltip>
											</FormLabel>
											<FormControl>
												<div className="w-full">
													{!field.value ? (
														<ImageSelect
															allowedSources={["gallery", "upload"]}
															activeTab="upload"
															onChange={field.onChange}
														/>
													) : (
														<ImagePreview
															src={field.value}
															handleDeselect={() => field.onChange("")}
														/>
													)}
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{/* Colors Section */}
								<div className="space-y-4 w-full">
									<div>
										<FormLabel className="flex gap-2 items-center">
											Brand Colors{" "}
											<Tooltip delayDuration={0}>
												<TooltipTrigger>
													<InfoIcon className="size-3.5 text-muted-foreground" />
												</TooltipTrigger>
												<TooltipContent className="max-w-xs">
													<p>
														Choose your primary and secondary brand colors.
														These will be used throughout your campaigns.
													</p>
												</TooltipContent>
											</Tooltip>
										</FormLabel>
									</div>

									<div className="flex gap-6 w-full">
										{/* Primary Color */}
										<FormField
											control={form.control}
											name="primaryColor"
											render={({ field }) => (
												<FormItem className="w-full">
													<FormControl>
														<button
															type="button"
															onClick={() =>
																handleColorClick("primary", field.value)
															}
															className="flex gap-3 items-center p-3 w-full rounded-lg border transition-all duration-200 border-border/40 hover:border-border hover:shadow-sm hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-background active:scale-98 active:duration-75"
														>
															<div
																className="w-8 h-8 rounded-lg border shadow-sm border-border/40 shrink-0"
																style={{ backgroundColor: field.value }}
															/>
															<div className="flex-1 text-left">
																<div className="text-sm font-medium text-foreground">
																	Primary
																</div>
																<div className="font-mono text-xs text-muted-foreground">
																	{field.value}
																</div>
															</div>
														</button>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										{/* Secondary Color */}
										<FormField
											control={form.control}
											name="secondaryColor"
											render={({ field }) => (
												<FormItem className="w-full">
													<FormControl>
														<button
															type="button"
															onClick={() =>
																handleColorClick("secondary", field.value)
															}
															className="flex gap-3 items-center p-3 w-full rounded-lg border transition-all duration-200 border-border/40 hover:border-border hover:shadow-sm hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-background active:scale-98 active:duration-75"
														>
															<div
																className="w-8 h-8 rounded-lg border shadow-sm border-border/40 shrink-0"
																style={{ backgroundColor: field.value }}
															/>
															<div className="flex-1 text-left">
																<div className="text-sm font-medium text-foreground">
																	Secondary
																</div>
																<div className="font-mono text-xs text-muted-foreground">
																	{field.value}
																</div>
															</div>
														</button>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								</div>
							</form>
						</Form>
					</div>
				</div>

				{/* Buttons */}
				<div className="flex flex-row gap-8 justify-between px-8 w-full">
					<Button
						onClick={handleBack}
						size="sm"
						variant="ghost"
						className="text-muted-foreground"
						disabled={isHandlingBack}
					>
						{isHandlingBack ? (
							<div className="flex gap-2 items-center">
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
							<div className="flex gap-2 items-center">
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

			{/* Media Gallery Modal for logo selection */}
			<MediaGalleryModal />
			{/* Color Selector Modal for color selection */}
			<ColorSelectorModal />
		</>
	);
};
