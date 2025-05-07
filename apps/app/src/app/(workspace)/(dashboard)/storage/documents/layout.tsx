import {
  SidebarProvider,
  SidebarRegistryProvider,
} from "@firebuzz/ui/components/ui/sidebar";
import { DocumentsSidebar } from "./_components/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarRegistryProvider>
      {children}
      <SidebarProvider
        config={{ keyboardShortcut: "l" }} // TODO: Change shortcut if needed
        className="w-fit"
        name="documents-sidebar" // Changed name to documents-sidebar
        defaultOpen={false}
      >
        <DocumentsSidebar />
      </SidebarProvider>
    </SidebarRegistryProvider>
  );
}
