"use client";

import Link from "next/link";
import { useState } from "react";
import EmailSignIn from "./email";
import OAuthSignIn from "./oauth";
import OTPVerification from "./otp-verification";

const SignIn = () => {
	// STATES
	const [isVerificationOpen, setIsVerificationOpen] = useState(false);
	const [email, setEmail] = useState("");

	// VERIFICATION
	if (isVerificationOpen) {
		return (
			<div className="space-y-14">
				{/* Heading */}
				<div className="space-y-2">
					<h1 className="text-5xl font-bold">Verify</h1>
					<div className="leading-normal text-muted-foreground">
						Enter the 6-digit OTP code you get via email.
						<br />
						You want to change account?{" "}
						<Link
							className="text-foreground underline underline-offset-4 decoration-primary hover:text-foreground/70 hover:decoration-primary/70 duration-200 transition-colors ease-in-out"
							href="/sign-in"
						>
							Sign In
						</Link>
					</div>
				</div>
				<OTPVerification email={email} />
			</div>
		);
	}

	return (
		<div className="space-y-14">
			{/* Heading */}
			<div className="space-y-2">
				<h1 className="text-5xl font-bold">Sign In</h1>
				<div className="leading-normal text-muted-foreground">
					Please use one of the provided methods to sign in. <br />
					New to Firebuzz?{" "}
					<Link
						className="text-foreground underline underline-offset-4 decoration-primary hover:text-foreground/70 hover:decoration-primary/70 duration-200 transition-colors ease-in-out"
						href="/sign-up"
					>
						Create a new account.
					</Link>
				</div>
			</div>
			{/* Form */}
			<div>
				<OAuthSignIn />
				<div className="flex items-center justify-between gap-2 my-6">
					<div className="bg-border h-px w-full" />
					<div className="text-nowrap text-sm text-muted-foreground">
						or continue with email
					</div>
					<div className="bg-border h-px w-full" />
				</div>
				<EmailSignIn
					setIsVerificationOpen={setIsVerificationOpen}
					setEmail={setEmail}
				/>
			</div>
		</div>
	);
};

export default SignIn;
