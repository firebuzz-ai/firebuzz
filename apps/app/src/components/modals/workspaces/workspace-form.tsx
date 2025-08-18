"use client";

import { ConvexError, api, useMutation } from "@firebuzz/convex";
import { Avatar, AvatarFallback } from "@firebuzz/ui/components/ui/avatar";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent, CardHeader } from "@firebuzz/ui/components/ui/card";
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
import { Building, Info } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

const formSchema = z.object({
	title: z
		.string()
		.min(1, "Workspace name is required")
		.max(50, "Workspace name must be less than 50 characters"),
});

type FormData = z.infer<typeof formSchema>;

interface WorkspaceFormProps {
	onSuccess?: () => void;
}

export const WorkspaceForm = ({ onSuccess }: WorkspaceFormProps) => {
	const router = useRouter();
	const createWorkspace = useMutation(
		api.collections.workspaces.mutations.createWorkspace,
	);

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: "",
		},
	});

	const watchedTitle = form.watch("title");
	const [isLoading, setIsLoading] = useState(false);

	const onSubmitHandler = async (data: FormData) => {
		try {
			setIsLoading(true);
			toast.loading("Creating workspace...", { id: "create-workspace" });

			await createWorkspace({
				title: data.title,
			});

			toast.success("Workspace created", {
				id: "create-workspace",
				description: "You will be redirected to your new workspace.",
			});

			// Close the modal
			onSuccess?.();

			// Redirect to the new workspace
			router.push("/select/project");
		} catch (error) {
			console.error("Error creating workspace:", error);
			toast.error("Failed to create workspace", {
				id: "create-workspace",
				description:
					error instanceof ConvexError
						? error.data
						: "Unexpected error occurred",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex overflow-hidden flex-col flex-1 h-full">
			<div className="overflow-auto flex-1 p-4">
				<div className="flex flex-col justify-center items-center">
					<Card className="w-full">
						<CardHeader className="space-y-1">
							<div className="flex gap-2 items-center">
								<Avatar className="border size-10">
									<AvatarFallback className="bg-primary/10">
										{watchedTitle?.[0]?.toUpperCase() || (
											<Building className="size-4" />
										)}
									</AvatarFallback>
								</Avatar>
								<div className="">
									<div className="font-medium leading-none">
										{watchedTitle || "New Workspace"}
									</div>
									<div className="text-xs text-muted-foreground">
										Personal workspace
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
												<FormLabel>Name</FormLabel>
												<FormControl>
													<Input
														className="h-8"
														placeholder="My Workspace"
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
								</form>
							</Form>
						</CardContent>
					</Card>

					{/* Information */}
					<div className="flex gap-2 items-center p-3 mt-4 w-full rounded-lg border border-border">
						<div className="p-1.5 rounded-md bg-muted border border-border">
							<Info className="w-3.5 h-3.5" />
						</div>
						<div className="text-sm text-muted-foreground">
							Workspaces help you organize your projects and collaborate with
							teams.
						</div>
					</div>
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
							Creating...
						</div>
					) : (
						<>
							Create Workspace
							<ButtonShortcut>⌘S</ButtonShortcut>
						</>
					)}
				</Button>
			</div>
		</div>
	);
};
