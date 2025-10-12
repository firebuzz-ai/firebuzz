"use client";

import { useUser } from "@clerk/nextjs";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
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
import { ArrowRight, Key, ShieldCheck } from "@firebuzz/ui/icons/lucide";
import { toast, useForm, zodResolver } from "@firebuzz/ui/lib/utils";
import { useEffect, useState } from "react";
import { z } from "zod";

const createPasswordSchema = (hasPassword: boolean) => {
	return z
		.object({
			currentPassword: hasPassword
				? z.string().min(1, "Current password is required")
				: z.string().optional(),
			newPassword: z.string().min(8, "Password must be at least 8 characters"),
			confirmPassword: z.string().min(1, "Please confirm your password"),
		})
		.refine((data) => data.newPassword === data.confirmPassword, {
			message: "Passwords don't match",
			path: ["confirmPassword"],
		});
};

type PasswordFormData = {
	currentPassword?: string;
	newPassword: string;
	confirmPassword: string;
};

export const PasswordSettings = () => {
	const { user, isLoaded } = useUser();
	const [isUpdating, setIsUpdating] = useState(false);
	const [isResetting, setIsResetting] = useState(false);

	const hasPassword = user?.passwordEnabled;

	const form = useForm<PasswordFormData>({
		resolver: zodResolver(createPasswordSchema(hasPassword || false)),
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
	});

	// Update form when password status changes
	/* biome-ignore lint/correctness/useExhaustiveDependencies: <We need to reset the form when the password status changes> */
	useEffect(() => {
		form.reset();
	}, [hasPassword, form]);

	const handleSetPassword = async (data: PasswordFormData) => {
		console.log("Setting password with data:", data);
		if (!user) return;

		setIsUpdating(true);
		try {
			// For users without a password, use updatePassword without currentPassword
			await user.updatePassword({
				newPassword: data.newPassword,
				signOutOfOtherSessions: false,
			});

			form.reset();
			toast.success("Password set successfully");
		} catch (error: unknown) {
			console.error("Error setting password:", error);
			const errorMessage =
				error instanceof Error && "errors" in error
					? (error as { errors: Array<{ longMessage?: string }> })?.errors?.[0]
							?.longMessage || "Failed to set password"
					: "Failed to set password";
			toast.error(errorMessage);
		} finally {
			setIsUpdating(false);
		}
	};

	const handleUpdatePassword = async (data: PasswordFormData) => {
		console.log("Updating password with data:", data);
		if (!user) return;

		setIsUpdating(true);
		try {
			await user.updatePassword({
				currentPassword: data.currentPassword,
				newPassword: data.newPassword,
				signOutOfOtherSessions: true,
			});

			form.reset();
			toast.success("Password updated successfully");
		} catch (error: unknown) {
			console.error("Error updating password:", error);
			const errorMessage =
				error instanceof Error && "errors" in error
					? (error as { errors: Array<{ longMessage?: string }> })?.errors?.[0]
							?.longMessage || "Failed to update password"
					: "Failed to update password";
			toast.error(errorMessage);
		} finally {
			setIsUpdating(false);
		}
	};

	const handlePasswordSubmit = async (data: PasswordFormData) => {
		console.log("Form submitted with data:", data, "hasPassword:", hasPassword);
		if (hasPassword) {
			await handleUpdatePassword(data);
		} else {
			await handleSetPassword(data);
		}
	};

	const handleResetPassword = async () => {
		if (!user?.primaryEmailAddress) return;

		setIsResetting(true);
		try {
			// This will send a password reset email
			const { startEmailLinkFlow } =
				user.primaryEmailAddress.createEmailLinkFlow();

			await startEmailLinkFlow({
				redirectUrl: `${window.location.origin}/reset-password`,
			});

			toast.success("Password reset email sent to your primary email");
		} catch (error: unknown) {
			console.error("Error initiating password reset:", error);
			const errorMessage =
				error instanceof Error && "errors" in error
					? (error as { errors: Array<{ longMessage?: string }> })?.errors?.[0]
							?.longMessage || "Failed to send reset email"
					: "Failed to send reset email";
			toast.error(errorMessage);
		} finally {
			setIsResetting(false);
		}
	};

	if (!isLoaded) {
		return (
			<div className="flex justify-center items-center p-6">
				<Spinner size="sm" />
			</div>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<div className="p-6 space-y-6 w-full border-b">
			{/* Header */}
			<div>
				<h2 className="text-lg font-semibold">Password</h2>
				<p className="text-sm text-muted-foreground">
					{hasPassword
						? "Update your account password or reset it via email."
						: "Set a password for your account to enable password-based sign-in."}
				</p>
			</div>

			<div className="space-y-4 max-w-xl">
				{/* Password Status */}
				<Card className="bg-muted">
					<CardContent className="p-4">
						<div className="flex gap-3 items-center">
							<div className="flex justify-center items-center p-1 rounded-md border bg-muted size-10">
								<Key className="text-muted-foreground size-5" />
							</div>
							<div className="flex-1">
								<h3 className="font-medium">
									{hasPassword ? "Password enabled" : "No password set"}
								</h3>
								<p className="text-sm text-muted-foreground">
									{hasPassword
										? "You can sign in using your email and password"
										: "You currently sign in using social accounts or email links"}
								</p>
							</div>
							<div className="flex gap-2 items-center">
								{hasPassword ? (
									<ShieldCheck className="text-emerald-500 size-4" />
								) : (
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											// Focus on new password field if no current password
											const newPasswordField = document.querySelector(
												'input[name="newPassword"]',
											) as HTMLInputElement;
											newPasswordField?.focus();
										}}
									>
										Set password
									</Button>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
				{/* Password Form */}
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handlePasswordSubmit)}
						className="space-y-4"
					>
						{hasPassword && (
							<FormField
								control={form.control}
								name="currentPassword"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Current Password</FormLabel>
										<FormControl>
											<Input
												type="password"
												placeholder="Enter your current password"
												{...field}
												disabled={isUpdating}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						<FormField
							control={form.control}
							name="newPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{hasPassword ? "New Password" : "Password"}
									</FormLabel>
									<FormControl>
										<Input
											type="password"
											placeholder="Enter your new password"
											{...field}
											disabled={isUpdating}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Confirm Password</FormLabel>
									<FormControl>
										<Input
											type="password"
											placeholder="Confirm your new password"
											{...field}
											disabled={isUpdating}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex gap-3 justify-between pt-2">
							<Button
								type="submit"
								variant="outline"
								disabled={isUpdating}
								size="sm"
								className="flex-1"
							>
								{isUpdating ? (
									<>
										<Spinner size="xs" className="mr-2" />
										{hasPassword ? "Updating..." : "Setting..."}
									</>
								) : hasPassword ? (
									"Update password"
								) : (
									"Set password"
								)}
							</Button>

							{hasPassword && (
								<Button
									className="flex-1"
									type="button"
									variant="ghost"
									size="sm"
									onClick={handleResetPassword}
									disabled={isResetting}
								>
									{isResetting ? (
										<>
											<Spinner size="xs" />
											Sending...
										</>
									) : (
										<>
											Reset via email
											<ArrowRight className="size-3.5" />
										</>
									)}
								</Button>
							)}
						</div>
					</form>
				</Form>
			</div>
		</div>
	);
};
