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
  Fingerprint,
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
import { SidebarSingleLink } from "./sidebar-single-link";

// This is sample data.
const navLinks = [
  {
    title: "Campaign",
    url: "/campaigns",
    icon: Workflow,
  },
  {
    title: "Asset",
    url: "/assets",
    icon: SquareTerminal,
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
    title: "Storage",
    url: "/storage",
    icon: Folder,
    items: [
      {
        title: "Media",
        url: "/storage/media",
      },
      {
        title: "Documents",
        url: "/storage/documents",
      },
      {
        title: "Knowledge Bases",
        url: "/storage/knowledge-bases",
      },
    ],
  },
  {
    title: "Brand",
    url: "/brand",
    icon: Fingerprint,
    items: [
      {
        title: "Identity",
        url: "/brand/identity",
      },
      {
        title: "Themes",
        url: "/brand/themes",
      },
      {
        title: "Marketing",
        url: "/brand/marketing?tab=audiences",
      },
      {
        title: "SEO",
        url: "/brand/seo",
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
            {navLinks.map((navItem) => {
              const items = navItem.items;
              // Collapsible
              if (items && items.length > 0) {
                return (
                  <Collapsible
                    key={navItem.title}
                    asChild
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <SidebarGroupButton
                        icon={navItem.icon && <navItem.icon />}
                        title={navItem.title}
                        url={navItem.url}
                      />

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {items?.map((subItem) => (
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
                );
              }
              // Single Item
              return (
                <SidebarMenuItem key={navItem.title}>
                  <SidebarSingleLink
                    href={navItem.url}
                    label={navItem.title}
                    icon={navItem.icon && <navItem.icon size={16} />}
                  />
                </SidebarMenuItem>
              );
            })}
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
