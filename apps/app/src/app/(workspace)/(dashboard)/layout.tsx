import { AppSidebar } from "@/components/navigation/app-sidebar/app-sidebar";
import AppTopbar from "@/components/navigation/app-sidebar/app-topbar";
import { SidebarProvider } from "@firebuzz/ui/components/ui/sidebar";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider name="app-sidebar">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden max-h-full max-w-full">
        <AppTopbar />
        <main className="flex flex-1 overflow-hidden">{children}</main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
