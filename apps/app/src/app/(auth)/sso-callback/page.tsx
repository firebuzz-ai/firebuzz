import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
	return <AuthenticateWithRedirectCallback signInUrl="/" signUpUrl="/new" />;
}
