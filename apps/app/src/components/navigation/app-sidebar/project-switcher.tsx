"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import {
	SidebarMenuButton,
	useSidebar,
} from "@firebuzz/ui/components/ui/sidebar";
import {
	ArrowRightLeft,
	ChevronsUpDown,
	Plus,
} from "@firebuzz/ui/icons/lucide";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProject } from "@/hooks/auth/use-project";
import { useWorkspace } from "@/hooks/auth/use-workspace";

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
					className="data-[state=open]:bg-sidebar-accent h-10 group-data-[collapsible=icon]:hidden flex w-full"
				>
					<div className="grid flex-1 text-sm leading-tight text-left">
						<span className="font-semibold truncate">
							{currentProject.title}
						</span>
						<span className="text-xs truncate">{currentWorkspace?.title}</span>
					</div>
					<ChevronsUpDown className="ml-auto" />
				</SidebarMenuButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				style={
					{
						"--sidebar-width": "240px",
					} as React.CSSProperties
				}
				className="w-[--sidebar-width] rounded-lg"
				align="start"
				side={isMobile ? "bottom" : state === "collapsed" ? "right" : "bottom"}
				sideOffset={8}
				alignOffset={isMobile ? 0 : state === "collapsed" ? 0 : -38}
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
					<div className="flex justify-center items-center rounded-md border size-6 bg-background">
						<Plus className="size-3" />
					</div>
					<div className="font-medium text-muted-foreground">Add project</div>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild className="flex gap-2 p-2">
					<Link href="/select/workspace">
						<div className="flex justify-center items-center rounded-md border size-6 bg-background">
							<ArrowRightLeft className="size-3" />
						</div>
						<div className="font-medium text-muted-foreground">
							Switch workspace
						</div>
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
