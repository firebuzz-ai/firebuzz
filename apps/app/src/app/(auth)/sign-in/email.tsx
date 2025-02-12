"use client";
import { useSignIn } from "@clerk/nextjs";
import type { EmailCodeFactor } from "@clerk/types";
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

import { type Dispatch, type SetStateAction, useState } from "react";
import { z } from "zod";

const formSchema = z.object({
	email: z
		.string({ required_error: "Email is required." })
		.email({ message: "Invalid email." }),
});

interface Props {
	setIsVerificationOpen: Dispatch<SetStateAction<boolean>>;
	setEmail: Dispatch<SetStateAction<string>>;
}

const EmailSignIn = ({ setIsVerificationOpen, setEmail }: Props) => {
	const { isLoaded, signIn } = useSignIn();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
		},
	});
	// STATES
	const [isHandling, setIsHandling] = useState(false);
	// HANDLERS
	const handleEmailCodeSignIn = async (values: { email: string }) => {
		// Check if already handling
		if (isHandling) return;
		// Check if loaded
		if (!isLoaded) return;

		try {
			setIsHandling(true);
			toast.loading("Signing in...", {
				id: "signin-code-flow",
			});

			// Start Signin Flow
			const { supportedFirstFactors } = await signIn.create({
				identifier: values.email,
			});

			// Filter the returned array to find the 'phone_code' entry
			const firstEmailFactor = supportedFirstFactors?.find((factor) => {
				return factor.strategy === "email_code";
			}) as EmailCodeFactor; // Type assertion to EmailCodeFactor due to bug in Clerk's types

			if (!firstEmailFactor) {
				setIsHandling(false);
				toast.error("Email code is not supported.", {
					id: "signin-code-flow",
				});
				return;
			}

			const { emailAddressId } = firstEmailFactor;

			// Send the OTP code to the user
			await signIn.prepareFirstFactor({
				strategy: "email_code",
				emailAddressId,
			});

			setIsHandling(false);
			setEmail(values.email);
			setIsVerificationOpen(true);

			toast.success("Check your email.", {
				description: "We have sent you a code to sign in.",
				id: "signin-code-flow",
			});
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		} catch (error: any) {
			setIsHandling(false);
			console.log(error?.errors);
			toast.error(
				error?.errors?.[0].message ?? "Something went wrong. Please try again.",
				{ id: "signin-code-flow" },
			);
		}
	};
	return (
		<div>
			<Form {...form}>
				<form
					className="space-y-4"
					onSubmit={form.handleSubmit((values) => {
						handleEmailCodeSignIn(values);
					})}
				>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Email</FormLabel>
								<FormControl>
									<Input placeholder="youremail@mail.com" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button className="w-full" variant="outline" type="submit">
						{isHandling ? (
							<div className="flex items-center gap-2">
								<Spinner size="xs" variant="default" /> Sending email...
							</div>
						) : (
							"Sign in with Email"
						)}
					</Button>
				</form>
			</Form>
		</div>
	);
};

export default EmailSignIn;
