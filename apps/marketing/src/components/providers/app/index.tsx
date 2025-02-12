import { TooltipProvider } from "@firebuzz/ui/components/ui/tooltip";

import { NuqsProvider } from "./nuqs";
import { ThemeProvider } from "./theme";

export const AppProviders = ({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) => {
	return (
		<NuqsProvider>
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				enableSystem
				disableTransitionOnChange
			>
				<TooltipProvider>{children}</TooltipProvider>
			</ThemeProvider>
		</NuqsProvider>
	);
};
