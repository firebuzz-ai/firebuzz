"use client";

import type { Doc } from "@firebuzz/convex";
import { api, useMutation } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Star } from "@firebuzz/ui/icons/lucide";
import { cn, toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { ImagePreview } from "@/components/sheets/settings/landing-page/image-preview";
import { ImageSelect } from "@/components/sheets/settings/landing-page/image-select";

// Define schema for testimonial creation based on the convex schema
const testimonialSchema = z.object({
	name: z.string().min(1, "Name is required"),
	title: z.string().optional(),
	content: z.string().min(1, "Content is required"),
	rating: z.number().min(1).max(5).optional(),
	avatar: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export type TestimonialFormType = z.infer<typeof testimonialSchema>;

interface TestimonialFormProps {
	setSaveHandler: React.Dispatch<
		React.SetStateAction<(() => Promise<void>) | null>
	>;
	isCreating?: boolean;
	initialValues?: Partial<Doc<"testimonials">>;
	testimonialId?: Doc<"testimonials">["_id"];
	mode?: "create" | "edit";
}

export const TestimonialForm = ({
	setSaveHandler,
	isCreating = false,
	initialValues,
	testimonialId,
	mode = "create",
}: TestimonialFormProps) => {
	const [hoveredRating, setHoveredRating] = useState(0);

	const createTestimonial = useMutation(
		api.collections.brands.testimonials.mutations.create,
	);
	const updateTestimonial = useMutation(
		api.collections.brands.testimonials.mutations.update,
	);

	const form = useForm<TestimonialFormType>({
		resolver: zodResolver(testimonialSchema),
		defaultValues: {
			name: initialValues?.name || "",
			title: initialValues?.title || "",
			content: initialValues?.content || "",
			rating: initialValues?.rating || undefined,
			avatar: initialValues?.avatar || "",
		},
		mode: "onChange",
		shouldUseNativeValidation: false,
	});

	// Save handler that will be exposed to parent component
	const handleSave = useCallback(async (): Promise<void> => {
		if (isCreating) return;

		try {
			// Validate the form
			const valid = await form.trigger();
			if (!valid) {
				toast.error("Please fill in all required fields", {
					id: mode === "create" ? "create-testimonial" : "update-testimonial",
				});
				return;
			}

			// Get form values
			const data = form.getValues();

			if (mode === "edit" && testimonialId) {
				// Update the testimonial
				await updateTestimonial({
					id: testimonialId,
					name: data.name,
					title: data.title,
					content: data.content,
					rating: data.rating,
					avatar: data.avatar,
				});

				toast.success("Testimonial updated successfully", {
					id: "update-testimonial",
				});
			} else {
				// Create the testimonial
				await createTestimonial({
					name: data.name,
					title: data.title,
					content: data.content,
					rating: data.rating,
					avatar: data.avatar,
				});

				toast.success("Testimonial created successfully", {
					id: "create-testimonial",
				});
			}
		} catch (error) {
			console.error(`Failed to ${mode} testimonial:`, error);
			toast.error(`Failed to ${mode} testimonial`, {
				id: mode === "create" ? "create-testimonial" : "update-testimonial",
			});
		}
	}, [
		form,
		createTestimonial,
		updateTestimonial,
		isCreating,
		mode,
		testimonialId,
	]);

	// Set up save handler for parent component
	useEffect(() => {
		setSaveHandler(() => handleSave);
	}, [handleSave, setSaveHandler]);

	const renderStars = (
		rating: number,
		onRatingChange: (rating: number) => void,
	) => {
		const tooltipContent = (starValue: number) => {
			switch (starValue) {
				case 1:
					return "🙁";
				case 2:
					return "😕";
				case 3:
					return "🙂";
				case 4:
					return "😊";
				case 5:
					return "😍";
			}
		};

		return (
			<div className="flex items-center justify-between gap-1 px-2 py-1 border rounded-md">
				<div>
					{Array.from({ length: 5 }).map((_, index) => {
						const starValue = index + 1;
						const isActive = starValue <= (hoveredRating || rating);

						return (
							<Tooltip key={`${index}-${starValue}`}>
								<TooltipTrigger asChild>
									<Button
										// biome-ignore lint/suspicious/noArrayIndexKey: Star rating display, index is appropriate here
										key={index}
										type="button"
										variant="ghost"
										size="iconXs"
										className="relative h-auto p-1 group"
										onClick={() => onRatingChange(starValue)}
										onMouseEnter={() => setHoveredRating(starValue)}
										onMouseLeave={() => setHoveredRating(0)}
									>
										<Star
											className={cn(
												"size-6 transition-all duration-200 ease-out",
												isActive
													? "fill-[hsl(var(--brand))] text-brand scale-110"
													: "text-muted-foreground/30 hover:text-[hsl(var(--brand))]/70 hover:scale-105",
											)}
										/>
									</Button>
								</TooltipTrigger>
								<TooltipContent className="text-lg">
									{tooltipContent(starValue)}
								</TooltipContent>
							</Tooltip>
						);
					})}
				</div>
				{rating > 0 && (
					<div className="text-xs text-muted-foreground">
						{rating} out of 5 stars
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="flex-1 w-full max-h-full px-4 overflow-y-auto">
			<Form {...form}>
				<form onSubmit={(e) => e.preventDefault()}>
					<div className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Customer Name</FormLabel>
									<FormControl>
										<Input
											className="!h-8"
											placeholder="e.g., John Smith"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="flex items-center justify-between">
										Title/Position{" "}
										<span className="text-xs text-muted-foreground">
											Optional
										</span>
									</FormLabel>
									<FormControl>
										<Input
											className="!h-8"
											placeholder="e.g., CEO at Company"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="avatar"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Customer Avatar</FormLabel>
									<div>
										<FormControl>
											<Input
												className="sr-only"
												{...field}
												disabled={isCreating}
											/>
										</FormControl>
										{!field.value ? (
											<ImageSelect onChange={field.onChange} />
										) : (
											<ImagePreview
												src={field.value}
												handleDeselect={() => {
													field.onChange("");
												}}
											/>
										)}
									</div>
									<FormDescription>
										Upload a photo of the customer (recommended: square image,
										200x200px or larger)
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="content"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Testimonial Content</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Write the testimonial content here..."
											className="resize-none"
											rows={4}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="rating"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="flex items-center justify-between">
										Rating{" "}
										<span className="text-xs text-muted-foreground">
											Optional
										</span>
									</FormLabel>
									<FormControl>
										<div className="space-y-2">
											{renderStars(field.value || 0, field.onChange)}
											<FormDescription>
												Click on stars to set rating (1-5 stars)
											</FormDescription>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</form>
			</Form>
		</div>
	);
};
