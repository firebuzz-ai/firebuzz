"use client";

import { useNewThemeModal } from "@/hooks/ui/use-new-theme-modal";
import { ConvexError, api, useMutation } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
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
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useState } from "react";
import { z } from "zod";
import { defaultDarkTheme, defaultLightTheme } from "../../../theme-variables";

const newThemeFormSchema = z.object({
	name: z.string().min(3, "Name must be at least 3 characters long."),
	description: z.string().optional(),
});

type NewThemeFormValues = z.infer<typeof newThemeFormSchema>;

export const NewThemeModal = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [state, setState] = useNewThemeModal();
	const createThemeMutation = useMutation(
		api.collections.brands.themes.mutations.create,
	);

	const form = useForm<NewThemeFormValues>({
		resolver: zodResolver(newThemeFormSchema),
		defaultValues: {
			name: "",
			description: "",
		},
	});

	const onSubmitHandler = async (data: NewThemeFormValues) => {
		try {
			setIsLoading(true);
			await createThemeMutation({
				name: data.name,
				description: data.description || "",
				lightTheme: defaultLightTheme,
				darkTheme: defaultDarkTheme,
				fonts: [
					{
						name: "Inter",
						type: "google",
						family: "sans",
					},
				],
			});

			toast.success("Theme created", {
				id: "create-theme",
				description: "Your new theme has been created successfully.",
			});
			form.reset();
			setState(null);
		} catch (error) {
			const errorMessage =
				error instanceof ConvexError ? error.data : "Unexpected error occurred";
			toast.error("Failed to create Theme.", {
				id: "create-theme-error",
				description: errorMessage as string,
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog
			open={state?.create ?? false}
			onOpenChange={(val: boolean) => setState(val ? { create: true } : null)}
		>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>New Theme</DialogTitle>
					<DialogDescription>
						Create a new theme to store and manage your information.
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						className="space-y-4"
						onSubmit={form.handleSubmit(onSubmitHandler)}
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input placeholder="e.g., Default" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description (Optional)</FormLabel>
									<FormControl>
										<Textarea
											placeholder="e.g., A theme for the default brand."
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" className="w-full mt-4" disabled={isLoading}>
							{isLoading ? (
								<div className="flex items-center gap-2">
									<Spinner size="xs" variant="default" /> Creating...
								</div>
							) : (
								"Create"
							)}
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};
