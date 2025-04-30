import { useNewMediaModal } from "@/hooks/ui/use-new-media-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@firebuzz/ui/components/ui/sidebar";
import { Layers2, Upload } from "@firebuzz/ui/icons/lucide";
import { Unsplash } from "./unsplash";
import { UploadMedia } from "./upload";

const tabs = [
  {
    label: "Upload",
    value: "upload",
    icon: Upload,
  },
  {
    label: "Unsplash",
    value: "unsplash",
    icon: Layers2,
  },
] as const;

export const NewMediaModal = () => {
  const { isOpen, type, setIsOpen, setType } = useNewMediaModal();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="p-0 max-h-[60vh] h-full w-full max-w-2xl overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>New Media</DialogTitle>
        </DialogHeader>
        <SidebarProvider
          config={{
            width: "12rem",
          }}
          name="new-media-modal"
          className="flex items-start max-w-full min-h-0 overflow-hidden"
        >
          <Sidebar collapsible="none" className="hidden border-r md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {tabs.map((item) => (
                      <SidebarMenuItem key={item.value}>
                        <SidebarMenuButton
                          onClick={() => setType(item.value)}
                          isActive={item.value === type}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          {/* Content */}
          <div className="flex flex-col w-full h-full max-w-full overflow-hidden">
            {type === "upload" && <UploadMedia />}
            {type === "unsplash" && <Unsplash />}
          </div>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
};
