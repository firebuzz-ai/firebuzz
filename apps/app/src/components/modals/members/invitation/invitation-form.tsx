"use client";

import { api, useAction } from "@firebuzz/convex";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@firebuzz/ui/components/ui/form";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { z } from "zod";

const inviteMemberSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	role: z.enum(["org:admin", "org:member"], {
		required_error: "Please select a role",
	}),
});

type InviteMemberForm = z.infer<typeof inviteMemberSchema>;

interface InvitationFormProps {
	onSuccess: () => void;
}

export const InvitationForm = ({ onSuccess }: InvitationFormProps) => {
	const createInvitation = useAction(
		api.lib.clerk.createOrganizationInvitation,
	);

	const form = useForm<InviteMemberForm>({
		resolver: zodResolver(inviteMemberSchema),
		defaultValues: {
			email: "",
			role: "org:member",
		},
	});

	const isLoading = form.formState.isSubmitting;

	const onSubmit = async (data: InviteMemberForm) => {
		try {
			await createInvitation({
				email: data.email,
				role: data.role,
			});

			toast.success(`Invitation sent to ${data.email}`);
			form.reset();
			onSuccess();
		} catch (error) {
			console.error("Error inviting member:", error);
			toast.error("Failed to send invitation. Please try again.");
		}
	};

	return (
		<div className="flex overflow-hidden flex-col flex-1 h-full">
			<div className="overflow-auto flex-1 p-4">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email Address</FormLabel>
									<FormControl>
										<Input
											placeholder="member@example.com"
											type="email"
											{...field}
											disabled={isLoading}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Role</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
										disabled={isLoading}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select a role" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="org:member">
												Member{" "}
												<span className="text-xs text-muted-foreground">
													- Can't manage team or subscription settings.
												</span>
											</SelectItem>
											<SelectItem value="org:admin">
												Admin{" "}
												<span className="text-xs text-muted-foreground">
													- Full access to all workspace features.
												</span>
											</SelectItem>
										</SelectContent>
									</Select>
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
					onClick={form.handleSubmit(onSubmit)}
					disabled={isLoading}
				>
					{isLoading ? (
						<Spinner size="xs" />
					) : (
						<>
							Send Invitation <ButtonShortcut>⌘S</ButtonShortcut>
						</>
					)}
				</Button>
			</div>
		</div>
	);
};
