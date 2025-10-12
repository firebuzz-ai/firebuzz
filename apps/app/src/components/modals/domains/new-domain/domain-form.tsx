import { api, ConvexError, useAction } from "@firebuzz/convex";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
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
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useState } from "react";
import { z } from "zod";
import { useProject } from "@/hooks/auth/use-project";
import { useWorkspace } from "@/hooks/auth/use-workspace";

const domainFormSchema = z.object({
	hostname: z
		.string()
		.min(1, "Domain is required")
		.regex(
			/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
			"Please enter a valid domain name (e.g., example.com or subdomain.example.com)",
		),
});

type DomainFormValues = z.infer<typeof domainFormSchema>;

interface DomainFormProps {
	onSuccess?: () => void;
}

export const DomainForm = ({ onSuccess }: DomainFormProps) => {
	const [isCreating, setIsCreating] = useState(false);
	const createDomain = useAction(
		api.collections.domains.custom.actions.createCustomDomain,
	);
	const { currentProject } = useProject();
	const { currentWorkspace } = useWorkspace();

	const form = useForm<DomainFormValues>({
		resolver: zodResolver(domainFormSchema),
		defaultValues: {
			hostname: "",
		},
		mode: "onChange",
		shouldUseNativeValidation: false,
	});

	const handleSubmit = async (data: DomainFormValues) => {
		try {
			setIsCreating(true);

			if (!currentWorkspace?._id) {
				throw new Error("Workspace is required");
			}

			if (!currentProject?._id) {
				throw new Error("Project is required");
			}

			await createDomain({
				hostname: data.hostname,
				workspaceId: currentWorkspace._id,
				projectId: currentProject._id,
			});

			toast.success("Domain created successfully!", {
				description: "Your domain has been added and is being validated.",
				id: "create-domain",
			});

			// Reset form
			form.reset();

			// Call success callback
			onSuccess?.();
		} catch (error) {
			console.error("Failed to create domain:", error);
			if (error instanceof ConvexError) {
				toast.error("Failed to create domain", {
					description: error.data,
					id: "create-domain",
				});
			} else {
				toast.error("Failed to create domain", {
					description: "Please try again.",
					id: "create-domain",
				});
			}
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<div className="flex overflow-hidden flex-col flex-1 h-full">
			<div className="overflow-auto flex-1 p-4">
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-6"
					>
						<FormField
							control={form.control}
							name="hostname"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Domain Name</FormLabel>
									<FormControl>
										<Input
											placeholder="example.com"
											{...field}
											disabled={isCreating}
										/>
									</FormControl>
									<FormDescription>
										Enter your custom domain name (e.g., example.com or
										subdomain.example.com)
									</FormDescription>
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
					onClick={form.handleSubmit(handleSubmit)}
					disabled={isCreating}
				>
					{isCreating ? (
						<Spinner size="xs" />
					) : (
						<>
							Add Domain <ButtonShortcut>⌘S</ButtonShortcut>
						</>
					)}
				</Button>
			</div>
		</div>
	);
};
