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
  Bot,
  ChevronRight,
  Folder,
  Settings2,
  SquareTerminal,
} from "@firebuzz/ui/icons/lucide";

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
        url: "/assets/ads",
      },
      {
        title: "Landing Pages",
        url: "/assets/landing-pages",
      },
      {
        title: "Forms",
        url: "/assets/forms",
      },
      {
        title: "Email Templates",
        url: "/assets/email-templates",
      },
    ],
  },
  {
    title: "Campaign",
    url: "#",
    icon: Bot,
    items: [
      {
        title: "New Campaign",
        url: "/campaign",
      },
      {
        title: "All Campaigns",
        url: "/campaign/all-campaigns",
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
        url: "/storage/knowledge-base",
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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
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
