import { Icon } from "@firebuzz/ui/components/brand/icon";
import {
	Collapsible,
	CollapsibleContent,
} from "@firebuzz/ui/components/ui/collapsible";
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
import AvatarMenu from "./avatar-menu";
import { ProjectSwitcher } from "./project-switcher";
import { ProjectsSidebarList } from "./projects-list";
import { SidebarGroupButton } from "./sidebar-group-button";
import { SidebarLink } from "./sidebar-link";
import { SidebarSingleLink } from "./sidebar-single-link";
import { SubscriptionStatus } from "./subscription-status";

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
				title: "Templates",
				url: "/assets/templates",
			},
			{
				title: "Blocks",
				url: "/assets/blocks",
				isComingSoon: true,
			},

			{
				title: "Components",
				url: "/assets/components",
				isComingSoon: true,
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
			{
				title: "Domains",
				url: "/brand/domains",
			},
		],
	},
	{
		title: "Settings",
		url: "/settings",
		icon: Settings2,
		items: [
			{
				title: "Account",
				url: "/settings/account",
			},
			{
				title: "Workspace",
				url: "/settings/workspace",
			},
			{
				title: "Subscription",
				url: "/settings/subscription",
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
					<SidebarMenuItem className="flex gap-2 justify-between">
						<div className="border border-border bg-muted rounded-md p-1.5 max-w-fit w-full shrink-0">
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
												hasChildren={items.length > 0}
											/>

											<CollapsibleContent>
												<SidebarMenuSub>
													{items?.map((subItem) => (
														<SidebarMenuSubItem key={subItem.title}>
															<SidebarLink
																isComingSoon={subItem.isComingSoon}
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
					<SidebarMenuItem className="mb-6 group-data-[collapsible=icon]:hidden">
						<SubscriptionStatus />
					</SidebarMenuItem>
					<SidebarMenuItem>
						<AvatarMenu />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
