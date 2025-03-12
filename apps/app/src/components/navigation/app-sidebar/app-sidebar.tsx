import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
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
  CollapsibleTrigger,
} from "@firebuzz/ui/components/ui/collapsible";
import Link from "next/link";
import AvatarMenu from "./avatar-menu";
import { ProjectSwitcher } from "./project-switcher";
import { ProjectsSidebarList } from "./projects-list";

// This is sample data.
const navLinks = [
  {
    title: "Asset",
    url: "#",
    icon: SquareTerminal,
    isActive: true,
    items: [
      {
        title: "Ads",
        url: "/assets/ad",
      },
      {
        title: "Landing Pages",
        url: "/assets/landing",
      },
      {
        title: "Forms",
        url: "/assets/landing-pages/edit/1",
      },
      {
        title: "Email Templates",
        url: "/assets/landing-pages/edit/2",
      },
    ],
  },
  {
    title: "Campaign",
    url: "#",
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
    url: "#",
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
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
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
