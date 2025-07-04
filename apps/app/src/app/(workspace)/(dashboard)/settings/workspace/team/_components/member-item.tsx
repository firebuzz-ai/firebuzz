"use client";

import type { Doc } from "@firebuzz/convex";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import {
	Crown,
	Mail,
	MoreHorizontal,
	Shield,
	Trash,
	User,
} from "@firebuzz/ui/icons/lucide";

interface MemberItemProps {
	member: Doc<"members"> & {
		user: Doc<"users"> | null;
	};
}

export const MemberItem = ({ member }: MemberItemProps) => {
	const isAdmin = member.role === "admin";
	const user = member.user;

	const handleChangeRole = () => {
		// TODO: Implement role change logic
		console.log("Change role clicked");
	};

	const handleRemoveMember = () => {
		// TODO: Implement remove member logic
		console.log("Remove member clicked");
	};

	const handleResendInvite = () => {
		// TODO: Implement resend invite logic
		console.log("Resend invite clicked");
	};

	return (
		<Card className="relative transition-all duration-200 group hover:shadow-md bg-muted">
			<CardContent className="p-4">
				<div className="space-y-3 w-full min-w-0">
					{/* Top */}
					<div className="flex gap-3 items-center">
						<Avatar className="size-10">
							<AvatarImage
								src={user?.imageUrl}
								alt={user?.firstName || "User"}
							/>
							<AvatarFallback className="bg-primary/10">
								{user?.firstName?.[0]?.toUpperCase() ||
									user?.lastName?.[0]?.toUpperCase() || (
										<User className="size-4" />
									)}
							</AvatarFallback>
						</Avatar>

						{/* User Info */}
						<div className="flex flex-col flex-1 min-w-0">
							<div className="flex gap-2 items-center">
								<h3
									className="font-medium truncate"
									title={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
								>
									{user?.firstName || user?.lastName
										? `${user.firstName || ""} ${user.lastName || ""}`.trim()
										: "Unknown User"}
								</h3>
								{isAdmin && (
									<Crown className="flex-shrink-0 text-yellow-500 size-3.5" />
								)}
							</div>
							<p
								className="text-sm truncate text-muted-foreground"
								title={user?.email}
							>
								{user?.email || "No email"}
							</p>
						</div>

						{/* Right Part */}
						<div className="flex gap-2 items-center">
							<Badge
								variant={isAdmin ? "default" : "outline"}
								className="text-xs"
							>
								{isAdmin ? "Admin" : "Member"}
							</Badge>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="iconXs"
										onClick={(e) => {
											e.stopPropagation();
										}}
									>
										<MoreHorizontal className="size-3.5" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent side="bottom" align="end">
									<DropdownMenuItem onClick={handleChangeRole}>
										<Shield className="size-3.5" />
										{isAdmin ? "Make Member" : "Make Admin"}
									</DropdownMenuItem>
									<DropdownMenuItem onClick={handleResendInvite}>
										<Mail className="size-3.5" />
										Resend Invite
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
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

					<Separator className="w-full" />

					{/* Bottom */}
					<div className="flex gap-2 items-center text-xs text-muted-foreground">
						<span>
							Joined {new Date(member.updatedAt).toLocaleDateString()}
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
