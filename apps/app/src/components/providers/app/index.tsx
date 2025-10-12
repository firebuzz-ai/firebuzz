import { ClerkProvider } from "@clerk/nextjs";
import { envClerk } from "@firebuzz/env";
import { TooltipProvider } from "@firebuzz/ui/components/ui/tooltip";
import { ConvexClientProvider } from "./convex";
import { NuqsProvider } from "./nuqs";
import { ThemeProvider } from "./theme";

const clerkEnv = envClerk();

export const AppProviders = ({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) => {
	return (
		<ClerkProvider
			signInForceRedirectUrl="/campaigns"
			signUpForceRedirectUrl="/new"
			signInFallbackRedirectUrl="/campaigns"
			signUpFallbackRedirectUrl="/new"
			publishableKey={clerkEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
			dynamic
		>
			<NuqsProvider>
				<ConvexClientProvider>
					<ThemeProvider
						attribute="class"
						defaultTheme="dark"
						enableSystem
						disableTransitionOnChange
					>
						<TooltipProvider>{children}</TooltipProvider>
					</ThemeProvider>
				</ConvexClientProvider>
			</NuqsProvider>
		</ClerkProvider>
	);
};
