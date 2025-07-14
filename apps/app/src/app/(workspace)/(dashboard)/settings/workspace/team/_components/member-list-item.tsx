"use client";

import { useUser } from "@/hooks/auth/use-user";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import type { Doc } from "@firebuzz/convex";
import { api, useMutation } from "@firebuzz/convex";
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
import { toast } from "@firebuzz/ui/lib/utils";
import { useMemo, useState } from "react";

interface MemberListItemProps {
	member: Doc<"members"> & {
		user: Doc<"users"> | null;
	};
}

export const MemberListItem = ({ member }: MemberListItemProps) => {
	const { user: currentUser } = useUser();
	const { currentWorkspace } = useWorkspace();
	const [isLoading, setIsLoading] = useState(false);

	const changeRoleMutation = useMutation(
		api.collections.members.mutations.handleChangeRole,
	);
	const removeMemberMutation = useMutation(
		api.collections.members.mutations.handleRemoveMember,
	);

	const isMemberCurrentUser = member.userId === currentUser?._id;
	const isMemberOwner = currentWorkspace?.ownerId === member.userId;
	const isMemberAdmin = member.role === "org:admin" && !isMemberOwner;
	const isCurrentUserAdmin = currentUser?.currentRole === "org:admin";
	const isCurrentUserOwner = currentWorkspace?.ownerId === currentUser?._id;

	const isCurrentMemberRemovable = useMemo(() => {
		// if the current user is the owner, they can remove any member
		if (isCurrentUserOwner) return !isMemberCurrentUser;
		// if the current user is an admin, they can remove any member except the owner
		if (isCurrentUserAdmin) return !isMemberOwner && !isMemberAdmin;
		return false;
	}, [
		isCurrentUserOwner,
		isCurrentUserAdmin,
		isMemberOwner,
		isMemberAdmin,
		isMemberCurrentUser,
	]);

	const isCurrentMemberPromotable = useMemo(() => {
		// if the current user is the owner, they can promote members to admin
		if (isCurrentUserOwner) return !isMemberAdmin && !isMemberOwner;

		return false;
	}, [isCurrentUserOwner, isMemberAdmin, isMemberOwner]);

	const isCurrentMemberDemotable = useMemo(() => {
		// if the current user is the owner, they can demote admins to members
		if (isCurrentUserOwner) return isMemberAdmin;

		return false;
	}, [isCurrentUserOwner, isMemberAdmin]);

	const user = member.user;

	const handleChangeRole = async (role: "org:admin" | "org:member") => {
		if (!user?.externalId) {
			toast.error("Cannot change role: User external ID not found");
			return;
		}

		setIsLoading(true);
		try {
			await changeRoleMutation({
				userExternalId: user.externalId,
				newRole: role,
			});

			toast.success(
				`Successfully ${role === "org:admin" ? "promoted" : "demoted"} ${user.firstName || user.email}`,
			);
		} catch (error) {
			console.error("Error changing role:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to change role",
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleRemoveMember = async () => {
		if (!user?.externalId) {
			toast.error("Cannot remove member: User external ID not found");
			return;
		}

		setIsLoading(true);
		try {
			await removeMemberMutation({
				userExternalId: user.externalId,
			});

			toast.success(
				`Successfully removed ${user.firstName || user.email} from the workspace`,
			);
		} catch (error) {
			console.error("Error removing member:", error);
			toast.error(
				error instanceof Error ? error.message : "Failed to remove member",
			);
		} finally {
			setIsLoading(false);
		}
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
						{isMemberCurrentUser && (
							<span className="text-xs bg-primary/10 rounded-md px-1.5 py-0.5 font-medium">
								You
							</span>
						)}
					</div>
					<span className="text-xs truncate text-muted-foreground">
						{user?.email || "No email"}
					</span>
				</div>
			</div>

			<div className="flex gap-4 items-center">
				<Badge
					variant={
						isMemberOwner ? "brand" : isMemberAdmin ? "default" : "outline"
					}
					className="text-xs"
				>
					{isMemberOwner ? "Owner" : isMemberAdmin ? "Admin" : "Member"}
				</Badge>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="iconXs" disabled={isLoading}>
							<MoreHorizontal className="size-3.5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="bottom" align="end">
						<DropdownMenuItem
							disabled={!isCurrentMemberPromotable || isLoading}
							onClick={() => handleChangeRole("org:admin")}
						>
							<ArrowUpFromDot className="size-3.5" />
							Promote to Admin
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={!isCurrentMemberDemotable || isLoading}
							onClick={() => handleChangeRole("org:member")}
						>
							<ArrowDownToDot className="size-3.5" />
							Demote to Member
						</DropdownMenuItem>

						<DropdownMenuSeparator />
						<DropdownMenuItem
							disabled={!isCurrentMemberRemovable || isLoading}
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
