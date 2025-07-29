import { AppSidebar } from "@/components/navigation/app-sidebar/app-sidebar";
import { AppQueryClientProvider } from "@/components/providers/app/query-client";
import { SidebarProvider } from "@firebuzz/ui/components/ui/sidebar";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AppQueryClientProvider>
      <SidebarProvider defaultOpen={false} name="app-sidebar">
        <AppSidebar />
        <main className="flex overflow-hidden flex-1 max-h-screen bg-background">
          {children}
        </main>
      </SidebarProvider>
    </AppQueryClientProvider>
  );
};

export default DashboardLayout;
