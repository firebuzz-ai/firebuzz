"use client";

import { ConvexError, type Doc, api, useMutation } from "@firebuzz/convex";
import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
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
import { Lock } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useState } from "react";
import { z } from "zod";

const formSchema = z.object({
	subdomain: z
		.string()
		.min(5, "Subdomain must be at least 5 characters long")
		.regex(
			/^[a-z0-9-]+$/,
			"Subdomain can only contain lowercase letters, numbers, and hyphens",
		)
		.regex(/^[a-z0-9]/, "Subdomain must start with a letter or number")
		.regex(/[a-z0-9]$/, "Subdomain must end with a letter or number")
		.refine((val) => !val.includes("."), "Subdomain cannot contain dots")
		.refine((val) => !val.includes(" "), "Subdomain cannot contain spaces"),
});

type FormValues = z.infer<typeof formSchema>;

interface ConfigureProjectDomainFormProps {
	domain: Doc<"projectDomains">;
	onClose: () => void;
}

export const ConfigureProjectDomainForm = ({
	domain,
	onClose,
}: ConfigureProjectDomainFormProps) => {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const updateProjectDomain = useMutation(
		api.collections.domains.project.mutations.update,
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			subdomain: domain.subdomain,
		},
	});

	const onSubmit = async (values: FormValues) => {
		setIsSubmitting(true);
		try {
			await updateProjectDomain({
				projectDomainId: domain._id,
				subdomain: values.subdomain,
			});

			toast.success("Project domain updated", {
				id: "update-project-domain",
				description: "Your project domain has been updated successfully.",
			});

			onClose();
		} catch (error) {
			const errorMessage =
				error instanceof ConvexError
					? error.data
					: "Failed to update project domain";
			toast.error("Update failed", {
				id: "update-project-domain-error",
				description: errorMessage as string,
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="flex overflow-hidden flex-col flex-1 h-full">
			<div className="overflow-auto flex-1 p-4">
				<div className="flex flex-col justify-center items-center">
					<Card className="w-full">
						<CardContent className="pt-6">
							<Form {...form}>
								<form
									className="space-y-4"
									onSubmit={form.handleSubmit(onSubmit)}
								>
									{/* Subdomain */}
									<FormField
										control={form.control}
										name="subdomain"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Subdomain</FormLabel>
												<FormControl>
													<div className="flex overflow-hidden gap-2 items-stretch rounded-md border">
														<Input
															{...field}
															placeholder="my-project"
															className="flex-1 max-w-[200px] h-8 text-sm bg-transparent border-none outline-none focus-visible:ring-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
															disabled={isSubmitting}
														/>
														<div className="flex flex-1 justify-between items-center px-2 text-sm border-l text-muted-foreground bg-muted">
															.{domain.domain}
															<Lock className="size-3.5 text-border" />
														</div>
													</div>
												</FormControl>
												<FormDescription>
													Choose a unique subdomain for your project. Must be at
													least 5 characters, lowercase letters, numbers, and
													hyphens only.
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
								</form>
							</Form>
						</CardContent>
					</Card>

					{/* Information */}
					<InfoBox className="mt-4" variant="warning">
						If you change the subdomain,{" "}
						<span className="font-semibold text-primary">
							you will lose access to the campaigns
						</span>{" "}
						hosted on the old subdomain. You will need to republish them to use
						the new subdomain.
					</InfoBox>
				</div>
			</div>

			{/* Footer with Submit Button */}
			<div className="p-4 border-t">
				<Button
					type="submit"
					size="sm"
					variant="outline"
					className="w-full"
					onClick={form.handleSubmit(onSubmit)}
					disabled={isSubmitting}
				>
					{isSubmitting ? (
						<div className="flex gap-2 items-center">
							<Spinner size="xs" variant="default" />
							Updating...
						</div>
					) : (
						"Update Subdomain"
					)}
				</Button>
			</div>
		</div>
	);
};
