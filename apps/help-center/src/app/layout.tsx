import "@/app/global.css";
import { RootProvider } from "fumadocs-ui/provider";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { cn } from "@/lib/utils";

const geistSans = GeistSans;
const geistMono = GeistMono;

export default function Layout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={cn(
					"flex flex-col min-h-screen antialiased",
					geistSans.variable,
					geistMono.variable,
				)}
			>
				<RootProvider>{children}</RootProvider>
			</body>
		</html>
	);
}
