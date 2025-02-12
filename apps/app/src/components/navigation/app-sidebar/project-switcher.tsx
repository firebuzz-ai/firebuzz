"use client";

import { useProject } from "@/hooks/project";
import { useWorkspace } from "@/hooks/workspace";
import type { ColorPickerColorType } from "@firebuzz/ui/components/ui/color-picker";
import { ColoredIconPreview } from "@firebuzz/ui/components/ui/colored-icon-preview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import type { IconPickerIconType } from "@firebuzz/ui/components/ui/icon-picker";
import {
  SidebarMenuButton,
  useSidebar,
} from "@firebuzz/ui/components/ui/sidebar";
import {
  ArrowRightLeft,
  ChevronsUpDown,
  Plus,
} from "@firebuzz/ui/icons/lucide";
import { useRouter } from "next/navigation";

export const ProjectSwitcher = () => {
  const router = useRouter();
  const { currentProject, projects, changeProject } = useProject();
  const { currentWorkspace } = useWorkspace();
  const { state, isMobile } = useSidebar();

  if (!currentProject) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex"
        >
          <div>
            <ColoredIconPreview
              icon={currentProject.icon as IconPickerIconType}
              color={currentProject.color as ColorPickerColorType}
              className="size-8"
            />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">
              {currentProject.title}
            </span>
            <span className="truncate text-xs">{currentWorkspace?.title}</span>
          </div>
          <ChevronsUpDown className="ml-auto" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        align="start"
        side={isMobile ? "bottom" : state === "collapsed" ? "right" : "bottom"}
        sideOffset={16}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Projects
        </DropdownMenuLabel>
        {projects.map((project, index) => (
          <DropdownMenuItem
            key={project._id}
            onClick={() => changeProject(project._id)}
            className="gap-2 p-2"
          >
            {project.title}
            <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/select/project")}
          className="gap-2 p-2"
        >
          <div className="flex size-6 items-center justify-center rounded-md border bg-background">
            <Plus className="size-3" />
          </div>
          <div className="font-medium text-muted-foreground">Add project</div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/select/project")}
          className="gap-2 p-2"
        >
          <div className="flex size-6 items-center justify-center rounded-md border bg-background">
            <ArrowRightLeft className="size-3" />
          </div>
          <div className="font-medium text-muted-foreground">
            Switch workspace
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
