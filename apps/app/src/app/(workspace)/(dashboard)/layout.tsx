import { AppSidebar } from "@/components/navigation/app-sidebar/app-sidebar";
import { SidebarProvider } from "@firebuzz/ui/components/ui/sidebar";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<SidebarProvider defaultOpen={false} name="app-sidebar">
			<AppSidebar />
			<div className="flex flex-1 flex-col overflow-hidden max-h-full max-w-full">
				<main className="flex flex-1 overflow-hidden">{children}</main>
			</div>
		</SidebarProvider>
	);
};

export default DashboardLayout;
