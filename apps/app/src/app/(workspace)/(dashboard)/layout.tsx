import { AppSidebar } from "@/components/navigation/app-sidebar/app-sidebar";
import { SidebarProvider } from "@firebuzz/ui/components/ui/sidebar";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider defaultOpen={false} name="app-sidebar">
      <AppSidebar />
      <main vaul-drawer-wrapper="true" className="flex flex-1 overflow-hidden">
        {children}
      </main>
    </SidebarProvider>
  );
};

export default DashboardLayout;
