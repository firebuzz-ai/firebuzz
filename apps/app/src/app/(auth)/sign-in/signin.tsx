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
							className="underline transition-colors duration-200 ease-in-out text-foreground underline-offset-4 decoration-primary hover:text-foreground/70 hover:decoration-primary/70"
							href="/sign-in"
						>
							Sign In
						</Link>
					</div>
				</div>
				<OTPVerification email={email} />
				<div id="clerk-captcha" />
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
						className="underline transition-colors duration-200 ease-in-out text-foreground underline-offset-4 decoration-primary hover:text-foreground/70 hover:decoration-primary/70"
						href="/sign-up"
					>
						Create a new account.
					</Link>
				</div>
			</div>
			{/* Form */}
			<div>
				{/* CAPTCHA Widget - Place at top for better availability */}
				<div id="clerk-captcha" />
				<OAuthSignIn />
				<div className="flex items-center justify-between gap-2 my-6">
					<div className="w-full h-px bg-border" />
					<div className="text-sm text-nowrap text-muted-foreground">
						or continue with email
					</div>
					<div className="w-full h-px bg-border" />
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
