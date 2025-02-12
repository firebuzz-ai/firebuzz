"use client";

import { api, useCachedRichQuery } from "@firebuzz/convex";
import { ColoredIconPreview } from "@firebuzz/ui/components/ui/colored-icon-preview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@firebuzz/ui/components/ui/sidebar";
import {
  Folder,
  Forward,
  MoreHorizontal,
  Plus,
  Trash2,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import Link from "next/link";

export const ProjectsSidebarList = () => {
  const { data: projects, isPending } = useCachedRichQuery(
    api.collections.projects.getAllByWorkspace
  );

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {isPending ? (
          Array.from({ length: 3 }).map((_, index) => (
            <SidebarMenuItem
              key={`skeleton-${
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                index
              }`}
            >
              <SidebarMenuButton
                className={cn("animate-pulse", index === 1 && "delay-200")}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="size-5 rounded-md bg-sidebar-foreground/10" />
                  <div className="h-5 w-full rounded-md bg-sidebar-foreground/10" />
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))
        ) : projects?.length === 0 ? (
          // Empty state
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/project/new" className="flex items-center gap-2">
                <Plus className="size-4" />
                Create Project
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : (
          // Existing projects list
          projects?.map((item) => (
            <SidebarMenuItem key={item._id}>
              <SidebarMenuButton asChild>
                <Link
                  href={`/project/${item._id}`}
                  className="flex items-center gap-2"
                >
                  <ColoredIconPreview
                    className="size-5"
                    iconClassName="h-3 w-3"
                    // @ts-expect-error
                    color={item.color}
                    // @ts-expect-error
                    icon={item.icon}
                  />
                  <div>
                    <span>{item.title}</span>
                  </div>
                </Link>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 rounded-lg"
                  side="bottom"
                  align="end"
                >
                  <DropdownMenuItem>
                    <Folder className="text-muted-foreground" />
                    <span>View Project</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Forward className="text-muted-foreground" />
                    <span>Share Project</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Trash2 className="text-muted-foreground" />
                    <span>Delete Project</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))
        )}
        {projects?.length !== 0 && (
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link
                href="/project/"
                className="flex items-center gap-2 text-sidebar-foreground/70"
              >
                <MoreHorizontal />
                <span>More</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
};
