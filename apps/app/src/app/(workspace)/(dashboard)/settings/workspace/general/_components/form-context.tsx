"use client";

import { useWorkspace } from "@/hooks/auth/use-workspace";
import { ConvexError, api, useMutation } from "@firebuzz/convex";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { type ReactNode, createContext, useContext, useState } from "react";
import { z } from "zod";

const formSchema = z.object({
	title: z
		.string()
		.min(1, "Title is required")
		.min(3, "Title must be at least 3 characters"),
	logo: z.string().optional(),
});

interface WorkspaceGeneralFormContextType {
	form: ReturnType<typeof useForm<z.infer<typeof formSchema>>>;
	isLoading: boolean;
	onSubmit: () => void;
	canSave: boolean;
}

const WorkspaceGeneralFormContext =
	createContext<WorkspaceGeneralFormContextType | null>(null);

export const useWorkspaceGeneralForm = () => {
	const context = useContext(WorkspaceGeneralFormContext);
	return context; // Return null if not available instead of throwing
};

interface WorkspaceGeneralFormProviderProps {
	children: ReactNode;
}

export const WorkspaceGeneralFormProvider = ({
	children,
}: WorkspaceGeneralFormProviderProps) => {
	const { currentWorkspace } = useWorkspace();
	const updateWorkspaceMutation = useMutation(
		api.collections.workspaces.mutations.update,
	);
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: currentWorkspace?.title || "",
			logo: currentWorkspace?.logo || "",
		},
		mode: "onChange",
	});

	const onSubmitHandler = async (data: z.infer<typeof formSchema>) => {
		if (!currentWorkspace) {
			toast.error("Workspace not found", {
				id: "update-workspace-error",
			});
			return;
		}

		try {
			setIsLoading(true);
			await updateWorkspaceMutation({
				id: currentWorkspace._id,
				title: data.title,
				logo: data.logo || undefined,
			});

			toast.success("Workspace updated successfully", {
				id: "update-workspace",
			});

			// Reset form dirty state
			form.reset(data);
		} catch (error) {
			const errorMessage =
				error instanceof ConvexError ? error.data : "Unexpected error occurred";

			toast.error("Failed to update workspace", {
				id: "update-workspace-error",
				description: errorMessage,
			});
		} finally {
			setIsLoading(false);
		}
	};

	const onSubmit = () => {
		form.handleSubmit(onSubmitHandler)();
	};

	const canSave = form.formState.isDirty && !isLoading && !!currentWorkspace;

	const value = {
		form,
		isLoading,
		onSubmit,
		canSave,
	};

	return (
		<WorkspaceGeneralFormContext.Provider value={value}>
			{children}
		</WorkspaceGeneralFormContext.Provider>
	);
};
