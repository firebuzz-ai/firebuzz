"use client";

import {
	useAuth,
	useOrganization,
	useOrganizationList,
	useSignIn,
	useSignUp,
	useUser,
} from "@clerk/nextjs";
import type { UserOrganizationInvitationResource } from "@clerk/types";
import { api, useMutation } from "@firebuzz/convex";
import { Icon } from "@firebuzz/ui/components/brand/icon";
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
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import Footer from "../auth-footer";
import TestimonialSection from "../auth-testimonial";

const signUpFormSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	email: z.string().email("Please enter a valid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

const AcceptInvitationPage = () => {
	const {
		isLoaded: signUpLoaded,
		signUp,
		setActive: setActiveSignUp,
	} = useSignUp();
	const { signIn, setActive: setActiveSignIn } = useSignIn();
	const { organization } = useOrganization();
	const {
		userInvitations,
		userMemberships,
		isLoaded: isOrganizationListLoaded,
	} = useOrganizationList({
		userInvitations: {
			infinite: true,
			status: "pending",
			pageSize: 5,
		},
		userMemberships: true,
	});
	const { signOut } = useAuth();
	const { isSignedIn, isLoaded: isUserLoaded } = useUser();
	const router = useRouter();
	const searchParams = useSearchParams();

	const [isHandling, setIsHandling] = useState(false);
	const updateUserCurrentWorkspace = useMutation(
		api.collections.users.mutations.updateCurrentWorkspaceByExternalId,
	);

	// Get the token and account status from the query params
	const token = searchParams.get("__clerk_ticket");
	const accountStatus = searchParams.get("__clerk_status");
	const prefilledEmail = searchParams.get("email");

	const form = useForm<z.infer<typeof signUpFormSchema>>({
		resolver: zodResolver(signUpFormSchema),
		defaultValues: {
			firstName: "",
			lastName: "",
			email: prefilledEmail || "",
			password: "",
		},
	});

	// If there is no invitation token, restrict access to this page
	if (!token) {
		return (
			<>
				{/* Left Container */}
				<div className="flex flex-col flex-1 gap-20 justify-between p-8 md:max-w-xl">
					{/* Logo */}
					<div className="p-2 rounded-lg border bg-muted border-border max-w-fit">
						<Icon className="w-5" />
					</div>

					<div className="space-y-14">
						<div className="space-y-2">
							<h1 className="text-4xl font-bold">Invalid Invitation</h1>
							<div className="leading-normal text-muted-foreground">
								No invitation token found. Please check your invitation link or
								contact your organization administrator.
							</div>
						</div>
					</div>

					<Footer />
				</div>
				{/* Right Container */}
				<TestimonialSection />
			</>
		);
	}

	// Handle sign-in for existing users
	const handleSignIn = async () => {
		if (!signIn || !token) return;

		try {
			setIsHandling(true);

			const signInAttempt = await signIn.create({
				strategy: "ticket",
				ticket: token,
			});

			if (signInAttempt.status === "complete") {
				await setActiveSignIn({
					session: signInAttempt.createdSessionId,
				});

				router.push("/select/project");
			} else {
				console.error(
					"Sign-in incomplete:",
					JSON.stringify(signInAttempt, null, 2),
				);
				toast.error("Failed to complete sign-in. Please try again.", {
					id: "invitation-signin",
				});
			}
		} catch (err) {
			console.error("Sign-in error:", JSON.stringify(err, null, 2));

			toast.error("Failed to sign in with invitation.", {
				// @ts-expect-error - err is of type unknown
				description: err.errors?.[0]?.message ?? "Something went wrong.",
				id: "invitation-signin",
			});
		} finally {
			setIsHandling(false);
		}
	};

	// Handle sign-up for new users
	const handleSignUp = async (values: z.infer<typeof signUpFormSchema>) => {
		if (!signUpLoaded || !token) return;

		try {
			setIsHandling(true);
			toast.loading("Creating your account...", { id: "invitation-signup" });

			const signUpAttempt = await signUp.create({
				strategy: "ticket",
				ticket: token,
				firstName: values.firstName,
				lastName: values.lastName,
				password: values.password,
			});

			if (signUpAttempt.status === "complete") {
				await setActiveSignUp({ session: signUpAttempt.createdSessionId });
				toast.success("Account created! Welcome to the organization.", {
					id: "invitation-signup",
				});
				router.push("/select/workspace");
			} else {
				console.error(
					"Signup incomplete:",
					JSON.stringify(signUpAttempt, null, 2),
				);
				if (signUpAttempt.status === "missing_requirements") {
					toast.error(
						"Additional information required. Please contact support.",
						{ id: "invitation-signup" },
					);
				} else {
					toast.error("Failed to create account. Please try again.", {
						id: "invitation-signup",
					});
				}
			}
		} catch (err) {
			console.error("Email signup error:", JSON.stringify(err, null, 2));
			const errorMessage =
				err instanceof Error
					? err.message
					: ((err as { errors?: Array<{ message: string }> })?.errors?.[0]
							?.message ?? "Failed to create account. Please try again.");

			toast.error(errorMessage, { id: "invitation-signup" });
		} finally {
			setIsHandling(false);
		}
	};

	// Handle accept invitation
	const handleAcceptInvitation = async (
		invitation: UserOrganizationInvitationResource,
	) => {
		try {
			setIsHandling(true);

			await invitation.accept();

			if (userMemberships?.revalidate) {
				await userMemberships.revalidate();
				await updateUserCurrentWorkspace({
					currentWorkspaceExternalId: invitation.publicOrganizationData.id,
				});
				router.push("/select/project");
			}
		} catch (error) {
			console.error("Error accepting invitation:", error);
			toast.error("Failed to accept invitation", { id: "accept-invitation" });
		} finally {
			setIsHandling(false);
		}
	};

	// Render based on account status
	const renderContent = () => {
		// If user is already signed in but status is sign_up, show a message
		if (accountStatus === "sign_up" && isSignedIn && isUserLoaded) {
			return (
				<div className="space-y-14">
					<div className="space-y-2">
						<h1 className="text-4xl font-bold">Welcome Back</h1>
						<div className="leading-normal text-muted-foreground">
							This account can't be used to accept the organization invitation.
							Please sign out and try again.
						</div>
					</div>
					<Button onClick={() => signOut()}>Sign Out</Button>
				</div>
			);
		}
		// If user is already signed in, show a message
		if (
			accountStatus === "sign_in" &&
			isSignedIn &&
			isUserLoaded &&
			isOrganizationListLoaded &&
			!userInvitations.isLoading
		) {
			return (
				<div className="space-y-14">
					<div className="space-y-2">
						<h1 className="text-4xl font-bold">Join a Workspace</h1>
						<div className="leading-normal text-muted-foreground">
							Please select a workspace from the list below to join.
						</div>
					</div>
					<div className="flex flex-col gap-2">
						{userInvitations?.data?.map((invitation) => (
							<Button
								key={invitation.id}
								onClick={() => handleAcceptInvitation(invitation)}
							>
								{isHandling ? (
									<div className="flex gap-2 items-center">
										<Spinner size="xs" variant="default" />
										Joining workspace...
									</div>
								) : (
									`Join ${invitation.publicOrganizationData.name}`
								)}
							</Button>
						))}
					</div>
				</div>
			);
		}

		// If user is not signed in, show the sign in form
		if (accountStatus === "sign_in" && !isSignedIn && isUserLoaded) {
			return (
				<div className="space-y-14">
					<div className="space-y-2">
						<h1 className="text-4xl font-bold">Join Workspace</h1>
						<div className="leading-normal text-muted-foreground">
							Click below to accept the organization invitation.
						</div>
					</div>

					<Button
						onClick={handleSignIn}
						className="w-full"
						disabled={isHandling}
					>
						{isHandling ? (
							<div className="flex gap-2 items-center">
								<Spinner size="xs" variant="default" />
								Signing you in...
							</div>
						) : (
							"Accept Invitation"
						)}
					</Button>
				</div>
			);
		}

		// If user is not signed in, show the sign up form
		if (accountStatus === "sign_up") {
			return (
				<div className="space-y-14">
					<div className="space-y-2">
						<h1 className="text-4xl font-bold">Join Organization</h1>
						<div className="leading-normal text-muted-foreground">
							{prefilledEmail
								? "Complete your details to join the organization."
								: "Enter your details to join the organization."}
						</div>
					</div>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(handleSignUp)}
							className="space-y-6"
						>
							<div className="flex gap-4 justify-between items-center">
								<FormField
									control={form.control}
									name="firstName"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel>First Name</FormLabel>
											<FormControl>
												<Input placeholder="John" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="lastName"
									render={({ field }) => (
										<FormItem className="flex-1">
											<FormLabel>Last Name</FormLabel>
											<FormControl>
												<Input placeholder="Doe" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input
												type="email"
												placeholder="john@example.com"
												readOnly={!!prefilledEmail}
												className={
													prefilledEmail ? "cursor-not-allowed bg-muted" : ""
												}
												{...field}
											/>
										</FormControl>
										{prefilledEmail && (
											<p className="text-xs text-muted-foreground">
												This email address was provided with your invitation.
											</p>
										)}
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Password</FormLabel>
										<FormControl>
											<Input
												type="password"
												placeholder="Enter your password"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button type="submit" className="w-full" disabled={isHandling}>
								{isHandling ? (
									<div className="flex gap-2 items-center">
										<Spinner size="xs" variant="default" />
										Creating account...
									</div>
								) : (
									"Join Organization"
								)}
							</Button>
						</form>
					</Form>

					<div id="clerk-captcha" />
				</div>
			);
		}

		if (accountStatus === "complete" || organization) {
			return (
				<div className="space-y-14">
					<div className="space-y-2">
						<h1 className="text-4xl font-bold">Welcome!</h1>
						<div className="leading-normal text-muted-foreground">
							Your organization invitation has been accepted successfully. You
							can now access all organization resources.
						</div>
					</div>

					<Button
						onClick={() => router.push("/select/workspace")}
						className="w-full"
					>
						Go to Dashboard
					</Button>
				</div>
			);
		}

		// Loading state
		return (
			<div className="space-y-14">
				<div className="flex justify-center items-center h-full">
					<Spinner size="sm" />
				</div>
			</div>
		);
	};

	return (
		<>
			{/* Left Container */}
			<div className="flex flex-col flex-1 gap-20 justify-between p-8 md:max-w-xl">
				{/* Logo */}
				<div className="p-2 rounded-lg border bg-muted border-border max-w-fit">
					<Icon className="w-5" />
				</div>

				{renderContent()}

				<Footer />
			</div>
			{/* Right Container */}
			<TestimonialSection />
		</>
	);
};

export default AcceptInvitationPage;
