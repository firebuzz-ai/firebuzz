import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarRail,
} from "@firebuzz/ui/components/ui/sidebar";

import {
  ChevronRight,
  Folder,
  Settings2,
  SquareTerminal,
  Workflow,
} from "@firebuzz/ui/icons/lucide";

import { Icon } from "@firebuzz/ui/components/brand/icon";
import {
  Collapsible,
  CollapsibleContent,
} from "@firebuzz/ui/components/ui/collapsible";
import AvatarMenu from "./avatar-menu";
import { ProjectSwitcher } from "./project-switcher";
import { ProjectsSidebarList } from "./projects-list";
import { SidebarGroupButton } from "./sidebar-group-button";
import { SidebarLink } from "./sidebar-link";

// This is sample data.
const navLinks = [
  {
    title: "Asset",
    url: "/assets",
    icon: SquareTerminal,
    isActive: true,
    items: [
      {
        title: "Ads",
        url: "/assets/ads",
      },
      {
        title: "Landing Pages",
        url: "/assets/landing-pages",
      },

      {
        title: "Email Templates",
        url: "/assets/email-templates",
      },
    ],
  },
  {
    title: "Campaign",
    url: "/campaigns",
    icon: Workflow,
    items: [
      {
        title: "New Campaign",
        url: "/campaigns/new",
      },
      {
        title: "All Campaigns",
        url: "/campaigns",
      },
    ],
  },
  {
    title: "Storage",
    url: "/storage",
    icon: Folder,
    items: [
      {
        title: "Knowledge Base",
        url: "/components/buttons",
      },
      {
        title: "Images",
        url: "/storage/images",
      },
    ],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings2,
    items: [
      {
        title: "General",
        url: "#",
      },
      {
        title: "Team",
        url: "#",
      },
      {
        title: "Billing",
        url: "#",
      },
      {
        title: "Limits",
        url: "#",
      },
    ],
  },
];

export function AppSidebar({
  collapsible = "icon",
  variant = "sidebar",
  side = "left",
  className,
}: {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
  className?: string;
}) {
  return (
    <Sidebar
      variant={variant}
      collapsible={collapsible}
      side={side}
      className={className}
    >
      <SidebarHeader className="group-data-[state=expanded]:border-b">
        <SidebarMenu>
          <SidebarMenuItem className="flex justify-between gap-2">
            <div className="border border-border bg-muted rounded-md p-1.5 max-w-fit w-full">
              <Icon className="h-6" />
            </div>
            <ProjectSwitcher />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {navLinks.map((item) => (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={item.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <SidebarGroupButton title={item.title} url={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarGroupButton>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarLink
                            href={subItem.url}
                            label={subItem.title}
                          />
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <ProjectsSidebarList />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <AvatarMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
