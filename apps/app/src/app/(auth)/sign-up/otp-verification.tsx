"use client";

import { useSignUp } from "@clerk/nextjs";
import { FakeDash, OTPInput, Slot } from "@firebuzz/ui/components/ui/input-otp";
import { toast } from "@firebuzz/ui/lib/utils";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

const OTPVerification = ({ email }: { email: string }) => {
	const router = useRouter();
	const { signUp, isLoaded: signUpLoaded, setActive } = useSignUp();
	// STATES
	const [isResending, setIsResending] = useState(false);

	// HANDLERS
	const handleVerification = useCallback(
		async (code: string) => {
			if (!signUpLoaded || !email || !code) return;
			try {
				toast.loading("Verifying...", { id: "verification" });

				// Use the code provided by the user and attempt verification
				const completeSignup = await signUp.attemptEmailAddressVerification({
					code,
				});

				// This mainly for debuggin while developing.
				if (completeSignup.status !== "complete") {
					console.log(JSON.stringify(completeSignup, null, 2));
				}

				// Set Active Session
				await setActive({ session: completeSignup.createdSessionId });
				toast.success("Successfully signed up.", {
					id: "verification",
					description: "Redirecting...",
					duration: 1000,
				});
				setTimeout(() => {
					router.refresh();
					router.push("/");
				}, 1000);
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error && "errors" in error
						? (error as { errors: Array<{ longMessage?: string }> })
								?.errors?.[0]?.longMessage
						: "Something went wrong. Please try again.";
				console.log(error);
				toast.error(errorMessage ?? "Something went wrong. Please try again.", {
					id: "verification",
				});
			}
		},
		[signUp, signUpLoaded, setActive, email, router],
	);

	const handleResendCode = async () => {
		// Check if already resending
		if (isResending) return;
		// Check if loaded
		if (!signUpLoaded) return;

		try {
			setIsResending(true);
			toast.loading("Resending the code...", {
				id: "resend-code-flow",
			});

			// Start Signin Flow
			await signUp.create({
				emailAddress: email,
			});

			// Start the Verification
			await signUp.prepareEmailAddressVerification();

			setIsResending(false);

			toast.success("Check your email.", {
				description: "We have sent you a code to sign up.",
				id: "resend-code-flow",
			});
		} catch (error: unknown) {
			setIsResending(false);
			const errorMessage =
				error instanceof Error && "errors" in error
					? (error as { errors: Array<{ message?: string }> })?.errors?.[0]
							?.message
					: "Something went wrong. Please try again.";
			console.log(error);
			toast.error(errorMessage ?? "Something went wrong. Please try again.", {
				id: "resend-code-flow",
			});
		}
	};

	return (
		<div className="flex flex-1 items-center justify-center">
			{/* OTP Input */}
			<div>
				<h1 className="text-3xl font-bold mb-4">Verify your email</h1>
				<p className="mb-4">
					We&apos;ve sent a 6-digit code to your email. Please enter it below.
				</p>
				<OTPInput
					maxLength={6}
					onComplete={handleVerification}
					render={({ slots }) => (
						<div className="flex gap-2">
							<div className="flex">
								{slots.slice(0, 3).map((slot, idx) => (
									<Slot
										key={`slot-${
											// biome-ignore lint/suspicious/noArrayIndexKey: OTP input boxes indexed by position
											idx
										}-1`}
										{...slot}
									/>
								))}
							</div>

							<FakeDash />

							<div className="flex">
								{slots.slice(3).map((slot, idx) => (
									<Slot
										key={`slot-${
											// biome-ignore lint/suspicious/noArrayIndexKey: OTP input boxes indexed by position
											idx
										}-2`}
										{...slot}
									/>
								))}
							</div>
						</div>
					)}
				/>
				<div className="mt-6 text-sm text-muted-foreground flex items-center gap-2">
					<p>Didn&apos;t you recieve the code?</p>{" "}
					<button
						type="button"
						onClick={handleResendCode}
						className="text-foreground underline underline-offset-4 decoration-primary hover:text-foreground/70 hover:decoration-primary/70 duration-200 transition-colors ease-in-out bg-transparent"
					>
						Resend
					</button>
				</div>
			</div>
		</div>
	);
};

export default OTPVerification;
