"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
	// For standard OAuth flows (sign-in/sign-up), use the default callback
	return <AuthenticateWithRedirectCallback signInUrl="/" signUpUrl="/new" />;
}
