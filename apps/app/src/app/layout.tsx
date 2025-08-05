import { AppProviders } from "@/components/providers/app";
import "@/styles/terminal.css";
import { Toaster } from "@firebuzz/ui/components/ui/sonner";
import "@firebuzz/ui/globals.css";
import { cn } from "@firebuzz/ui/lib/utils";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
	title: "Firebuzz",
	description:
		"AI powered automation tool for PPC marketers. Generate assets, iterate, optimize and convert.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html className="h-full" lang="en" suppressHydrationWarning>
			<body
				vaul-drawer-wrapper="true"
				className={cn(
					"w-full h-full flex bg-background antialiased",
					geistSans.variable,
					geistMono.variable,
				)}
			>
				<AppProviders>{children}</AppProviders>
				<Toaster />
			</body>
		</html>
	);
}
