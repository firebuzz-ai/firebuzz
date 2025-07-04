"use client";

import { useUser } from "@/hooks/auth/use-user";
import type { Doc } from "@firebuzz/convex";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import {
	ArrowDownToDot,
	ArrowUpFromDot,
	MoreHorizontal,
	Trash,
	User,
} from "@firebuzz/ui/icons/lucide";

interface MemberListItemProps {
	member: Doc<"members"> & {
		user: Doc<"users"> | null;
	};
}

export const MemberListItem = ({ member }: MemberListItemProps) => {
	const isAdmin = member.role === "admin";
	const { user: currentUser } = useUser();
	const isCurrentUser = member.userId === currentUser?._id;
	const isCurrentUserAdmin = currentUser?.currentRole === "org:admin";

	const user = member.user;

	const handleChangeRole = () => {
		// TODO: Implement role change logic
		console.log("Change role clicked");
	};

	const handleRemoveMember = () => {
		// TODO: Implement remove member logic
		console.log("Remove member clicked");
	};

	return (
		<div className="flex justify-between items-center px-4 py-3 rounded-lg border transition-colors bg-muted bg-card hover:bg-muted/50">
			<div className="flex gap-3 items-center">
				<Avatar className="border size-8">
					<AvatarImage src={user?.imageUrl} alt={user?.firstName || "User"} />
					<AvatarFallback className="bg-primary/10">
						{user?.firstName?.[0]?.toUpperCase() ||
							user?.lastName?.[0]?.toUpperCase() || <User className="size-4" />}
					</AvatarFallback>
				</Avatar>

				<div className="flex flex-col min-w-0 leading-none">
					<div className="flex gap-2 items-center">
						<span className="text-sm font-medium truncate">
							{user?.firstName || user?.lastName
								? `${user.firstName || ""} ${user.lastName || ""}`.trim()
								: "Unknown User"}
						</span>
					</div>
					<span className="text-xs truncate text-muted-foreground">
						{user?.email || "No email"}
					</span>
				</div>
			</div>

			<div className="flex gap-4 items-center">
				<Badge variant={isAdmin ? "brand" : "outline"} className="text-xs">
					{isAdmin ? "Admin" : "Member"}
				</Badge>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="iconXs">
							<MoreHorizontal className="size-3.5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="bottom" align="end">
						<DropdownMenuItem
							disabled={!isCurrentUserAdmin || isCurrentUser}
							onClick={handleChangeRole}
						>
							{isAdmin ? (
								<ArrowDownToDot className="size-3.5" />
							) : (
								<ArrowUpFromDot className="size-3.5" />
							)}
							{isAdmin ? "Demote to Member" : "Promote to Admin"}
						</DropdownMenuItem>

						<DropdownMenuSeparator />
						<DropdownMenuItem
							disabled={isAdmin || isCurrentUser}
							onClick={handleRemoveMember}
							className="text-destructive focus:text-destructive"
						>
							<Trash className="size-3.5" />
							Remove Member
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
};
