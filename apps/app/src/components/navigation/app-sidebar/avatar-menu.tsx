"use client";
import { useUser } from "@/hooks/auth/use-user";
import { useAuth } from "@clerk/nextjs";
import { AvatarFallback, AvatarImage } from "@firebuzz/ui/components/ui/avatar";

import { Avatar } from "@firebuzz/ui/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import {
	SidebarMenuButton,
	useSidebar,
} from "@firebuzz/ui/components/ui/sidebar";
import {
	BadgeCheck,
	Bell,
	ChevronsUpDown,
	Computer,
	CreditCard,
	LogOut,
	Moon,
	Palette,
	Sparkles,
	Sun,
} from "@firebuzz/ui/icons/lucide";
import { useTheme } from "next-themes";

const AvatarMenu = () => {
	const { signOut } = useAuth();
	const { setTheme } = useTheme();
	const { user } = useUser();
	const { isMobile, state } = useSidebar();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<SidebarMenuButton
					size="lg"
					className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
				>
					<Avatar className="h-8 w-8 rounded-lg">
						<AvatarImage
							className="rounded-lg object-cover object-center w-full h-full"
							src={user?.imageUrl}
							alt={user?.fullName ?? ""}
						/>
						<AvatarFallback className="rounded-lg">CN</AvatarFallback>
					</Avatar>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-semibold">{user?.fullName}</span>
						<span className="truncate text-xs">{user?.email}</span>
					</div>
					<ChevronsUpDown className="ml-auto size-4" />
				</SidebarMenuButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
				side={isMobile ? "bottom" : state === "collapsed" ? "right" : "bottom"}
				align="end"
				sideOffset={16}
			>
				<DropdownMenuLabel className="p-0 font-normal">
					<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
						<Avatar className="h-8 w-8 rounded-lg">
							<AvatarImage
								className="rounded-lg object-cover w-full h-full"
								src={user?.imageUrl}
								alt={user?.fullName ?? ""}
							/>
							<AvatarFallback className="rounded-lg">CN</AvatarFallback>
						</Avatar>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold">{user?.fullName}</span>
							<span className="truncate text-xs">{user?.email}</span>
						</div>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<Sparkles />
						Upgrade to Pro
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<BadgeCheck />
						Account
					</DropdownMenuItem>
					<DropdownMenuItem>
						<CreditCard />
						Billing
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Bell />
						Notifications
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<Palette />
						Theme
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent sideOffset={24}>
						<DropdownMenuItem onClick={() => setTheme("light")}>
							<Sun />
							Light
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme("dark")}>
							<Moon />
							Dark
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setTheme("system")}>
							<Computer />
							System
						</DropdownMenuItem>
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuItem onClick={() => signOut()}>
					<LogOut />
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default AvatarMenu;
