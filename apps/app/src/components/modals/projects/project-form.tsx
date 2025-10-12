"use client";

import type { Doc } from "@firebuzz/convex";
import { api, ConvexError, useMutation } from "@firebuzz/convex";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent, CardHeader } from "@firebuzz/ui/components/ui/card";
import {
	ColorPicker,
	colorPickerColorZodEnum,
} from "@firebuzz/ui/components/ui/color-picker";
import { ColoredIconPreview } from "@firebuzz/ui/components/ui/colored-icon-preview";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@firebuzz/ui/components/ui/form";
import {
	IconPicker,
	iconPickerIconZodEnum,
} from "@firebuzz/ui/components/ui/icon-picker";
import { Input } from "@firebuzz/ui/components/ui/input";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Info } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useState } from "react";
import { z } from "zod";
import { useWorkspace } from "@/hooks/auth/use-workspace";

const formSchema = z.object({
	title: z.string().min(3, "Title must be at least 3 characters"),
	color: colorPickerColorZodEnum,
	icon: iconPickerIconZodEnum,
});

interface ProjectFormProps {
	onSuccess?: () => void;
	project?: Doc<"projects">;
	mode?: "create" | "edit";
}

export const ProjectForm = ({
	onSuccess,
	project,
	mode = "create",
}: ProjectFormProps) => {
	const { currentWorkspace } = useWorkspace();
	const createProjectMutation = useMutation(
		api.collections.projects.mutations.create,
	);
	const updateProjectMutation = useMutation(
		api.collections.projects.mutations.update,
	);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: project?.title || "",
			color: (project?.color || "sky") as z.infer<
				typeof colorPickerColorZodEnum
			>,
			icon: (project?.icon || "target") as z.infer<
				typeof iconPickerIconZodEnum
			>,
		},
	});

	const watchedTitle = form.watch("title");
	const watchedColor = form.watch("color");
	const watchedIcon = form.watch("icon");

	const [isLoading, setIsLoading] = useState(false);

	const onSubmitHandler = async (data: z.infer<typeof formSchema>) => {
		try {
			setIsLoading(true);

			if (mode === "edit" && project) {
				await updateProjectMutation({
					projectId: project._id,
					name: data.title,
					color: data.color,
					icon: data.icon,
				});

				toast.success("Project updated", {
					id: "update-project",
					description: "Your project has been successfully updated.",
				});
			} else {
				await createProjectMutation({
					title: data.title,
					color: data.color,
					icon: data.icon,
				});

				toast.success("Project created", {
					id: "create-project",
					description: "You will be redirected to your new project.",
				});
			}

			onSuccess?.();
		} catch (error) {
			const errorMessage =
				error instanceof ConvexError ? error.data : "Unexpected error occurred";

			toast.error(
				mode === "edit"
					? "Failed to update project."
					: "Failed to create project.",
				{
					id: mode === "edit" ? "update-project-error" : "create-project-error",
					description: errorMessage,
				},
			);
		} finally {
			setIsLoading(false);
		}
	};

	const isCreate = mode === "create";

	return (
		<div className="flex overflow-hidden flex-col flex-1 h-full">
			<div className="overflow-auto flex-1 p-4">
				<div className="flex flex-col justify-center items-center">
					<Card className="w-full">
						<CardHeader className="space-y-1">
							<div className="flex gap-2 items-center">
								<ColoredIconPreview color={watchedColor} icon={watchedIcon} />
								<div className="">
									<div className="font-medium leading-none">
										{watchedTitle || "New Project"}
									</div>
									<div className="text-xs text-muted-foreground">
										{currentWorkspace?.title}
									</div>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<Form {...form}>
								<form
									className="space-y-4"
									onSubmit={form.handleSubmit(onSubmitHandler)}
								>
									{/* Title */}
									<FormField
										control={form.control}
										name="title"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Title</FormLabel>
												<FormControl>
													<Input
														className="h-8"
														placeholder="My Project"
														{...field}
														disabled={isLoading}
														onChange={(e) => {
															field.onChange(e);
														}}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<div className="flex gap-4 items-center">
										{/* Color Picker */}
										<FormField
											control={form.control}
											name="color"
											render={({ field }) => (
												<FormItem className="flex-1">
													<FormLabel>Color</FormLabel>
													<FormControl>
														<ColorPicker
															value={field.value}
															onChange={field.onChange}
														/>
													</FormControl>
												</FormItem>
											)}
										/>
										{/* Icon Picker */}
										<FormField
											control={form.control}
											name="icon"
											render={({ field }) => (
												<FormItem className="flex-1">
													<FormLabel>Icon</FormLabel>
													<FormControl>
														<IconPicker
															value={field.value}
															onChange={field.onChange}
														/>
													</FormControl>
												</FormItem>
											)}
										/>
									</div>
								</form>
							</Form>
						</CardContent>
					</Card>

					{/* Information */}
					{isCreate && (
						<div className="flex gap-2 items-center p-3 mt-4 w-full rounded-lg border border-border">
							<div className="p-1.5 rounded-md bg-muted border border-border">
								<Info className="w-3.5 h-3.5" />
							</div>
							<div className="text-sm text-muted-foreground">
								Projects help you manage your contents and campaigns
								consistently.
							</div>
						</div>
					)}
				</div>
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
							{isCreate ? "Creating..." : "Updating..."}
						</div>
					) : (
						<>
							{isCreate ? "Create Project" : "Update Project"}
							<ButtonShortcut>⌘S</ButtonShortcut>
						</>
					)}
				</Button>
			</div>
		</div>
	);
};
