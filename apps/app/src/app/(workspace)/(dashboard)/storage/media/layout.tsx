import {
	SidebarProvider,
	SidebarRegistryProvider,
} from "@firebuzz/ui/components/ui/sidebar";
import { MediaSidebar } from "./_components/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<SidebarRegistryProvider>
			{children}
			<SidebarProvider
				config={{ keyboardShortcut: "l" }}
				className="w-fit"
				name="images-sidebar"
				defaultOpen={false}
			>
				<MediaSidebar />
			</SidebarProvider>
		</SidebarRegistryProvider>
	);
}
