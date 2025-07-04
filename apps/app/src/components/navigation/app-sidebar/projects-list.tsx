"use client";

import { useProject } from "@/hooks/auth/use-project";
import { api, useCachedRichQuery } from "@firebuzz/convex";
import { ColoredIconPreview } from "@firebuzz/ui/components/ui/colored-icon-preview";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@firebuzz/ui/components/ui/sidebar";
import { Plus } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import Link from "next/link";

export const ProjectsSidebarList = () => {
	const { data: projects, isPending } = useCachedRichQuery(
		api.collections.projects.queries.getAllByWorkspace,
	);
	const { changeProject } = useProject();

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
								<div className="flex gap-2 items-center w-full">
									<div className="rounded-md size-5 bg-sidebar-foreground/10" />
									<div className="w-full h-5 rounded-md bg-sidebar-foreground/10" />
								</div>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))
				) : projects?.length === 0 ? (
					// Empty state
					<SidebarMenuItem>
						<SidebarMenuButton asChild>
							<Link href="/project/new" className="flex gap-2 items-center">
								<Plus className="size-4" />
								Create Project
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				) : (
					// Existing projects list
					projects?.map((item) => (
						<SidebarMenuItem key={item._id}>
							<SidebarMenuButton onClick={() => changeProject(item._id)}>
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
							</SidebarMenuButton>
						</SidebarMenuItem>
					))
				)}
			</SidebarMenu>
		</SidebarGroup>
	);
};
