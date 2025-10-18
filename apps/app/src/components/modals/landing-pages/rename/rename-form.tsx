"use client";

import type { Id } from "@firebuzz/convex";
import { api, ConvexError, useMutation } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
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
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useState } from "react";
import { z } from "zod";

const formSchema = z.object({
	title: z.string().min(3, "Title must be at least 3 characters"),
});

type FormData = z.infer<typeof formSchema>;

interface RenameLandingPageFormProps {
	landingPageId: Id<"landingPages">;
	currentTitle: string;
	onSuccess?: () => void;
}

export const RenameLandingPageForm = ({
	landingPageId,
	currentTitle,
	onSuccess,
}: RenameLandingPageFormProps) => {
	const updateLandingPageMutation = useMutation(
		api.collections.landingPages.mutations.update,
	);

	const [isLoading, setIsLoading] = useState(false);

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: currentTitle,
		},
	});

	const onSubmitHandler = async (data: FormData) => {
		try {
			setIsLoading(true);
			toast.loading("Renaming landing page...", {
				id: "rename-landing-page",
			});

			await updateLandingPageMutation({
				id: landingPageId,
				title: data.title,
			});

			toast.success("Landing page renamed", {
				id: "rename-landing-page",
				description: "Your landing page has been successfully renamed.",
			});

			onSuccess?.();
		} catch (error) {
			console.error("Error renaming landing page:", error);
			const errorMessage =
				error instanceof ConvexError ? error.data : "Unexpected error occurred";

			toast.error("Failed to rename landing page", {
				id: "rename-landing-page",
				description: errorMessage,
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex overflow-hidden flex-col flex-1 h-full">
			<div className="overflow-auto flex-1 p-4">
				<Form {...form}>
					<form
						className="space-y-4"
						onSubmit={form.handleSubmit(onSubmitHandler)}
					>
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Title</FormLabel>
									<FormControl>
										<Input
											className="h-8"
											placeholder="My Landing Page"
											{...field}
											disabled={isLoading}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</form>
				</Form>
			</div>

			{/* Footer with Submit Button */}
			<div className="p-4 border-t">
				<Button
					type="submit"
					size="sm"
					variant="outline"
					className="w-full"
					onClick={form.handleSubmit(onSubmitHandler)}
					disabled={isLoading}
				>
					{isLoading ? (
						<div className="flex gap-2 items-center">
							<Spinner size="xs" variant="default" />
							Renaming...
						</div>
					) : (
						"Rename Landing Page"
					)}
				</Button>
			</div>
		</div>
	);
};
