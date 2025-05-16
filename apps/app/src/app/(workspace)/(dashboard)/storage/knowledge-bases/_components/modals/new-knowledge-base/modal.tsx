"use client";

import { useNewKnowledgeBaseModal } from "@/hooks/ui/use-new-knowledgebase-modal";
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

const newKnowledgeBaseFormSchema = z.object({
	name: z.string().min(3, "Name must be at least 3 characters long."),
	description: z.string().optional(),
});

type NewKnowledgeBaseFormValues = z.infer<typeof newKnowledgeBaseFormSchema>;

export const NewKnowledgeBaseModal = () => {
	const [isLoading, setIsLoading] = useState(false);
	const [state, setState] = useNewKnowledgeBaseModal();
	const createKnowledgeBaseMutation = useMutation(
		api.collections.storage.knowledgeBases.mutations.create,
	);

	const form = useForm<NewKnowledgeBaseFormValues>({
		resolver: zodResolver(newKnowledgeBaseFormSchema),
		defaultValues: {
			name: "",
			description: "",
		},
	});

	const onSubmitHandler = async (data: NewKnowledgeBaseFormValues) => {
		try {
			setIsLoading(true);
			await createKnowledgeBaseMutation({
				name: data.name,
				description: data.description || "",
			});

			toast.success("Knowledge Base created", {
				id: "create-knowledge-base",
				description: "Your new knowledge base has been created successfully.",
			});
			form.reset();
			setState(null);
		} catch (error) {
			const errorMessage =
				error instanceof ConvexError ? error.data : "Unexpected error occurred";
			toast.error("Failed to create Knowledge Base.", {
				id: "create-knowledge-base-error",
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
					<DialogTitle>New Knowledge Base</DialogTitle>
					<DialogDescription>
						Create a new knowledge base to store and manage your information.
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
										<Input
											placeholder="e.g., Product Documentation"
											{...field}
										/>
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
											placeholder="e.g., A comprehensive guide to our product features and functionalities."
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
