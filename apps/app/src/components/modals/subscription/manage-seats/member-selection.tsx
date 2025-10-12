"use client";

import { api, useCachedRichQuery } from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Checkbox } from "@firebuzz/ui/components/ui/checkbox";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useMemo } from "react";
import { useWorkspace } from "@/hooks/auth/use-workspace";

interface MemberSelectionProps {
	decreaseAmount: number;
	selectedMembers: string[];
	onSelectionChange: (memberIds: string[]) => void;
	onConfirm: () => void;
	onCancel: () => void;
	isLoading?: boolean;
}

export const MemberSelection = ({
	decreaseAmount,
	selectedMembers,
	onSelectionChange,
	onConfirm,
	onCancel,
	isLoading = false,
}: MemberSelectionProps) => {
	const { currentWorkspace } = useWorkspace();
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
	// Get all members for the workspace
	const { data: members, isPending: isMembersPending } = useCachedRichQuery(
		api.collections.members.queries.getByWorkspace,
		!currentWorkspace ? "skip" : undefined,
	);

	// Filter removable members (exclude owners)
	const removableMembers = useMemo(() => {
		if (!members || !currentWorkspace) return [];

		return members.filter((member) => {
			// Can't remove workspace owner
			if (member.userId === currentWorkspace.ownerId) return false;

			return true;
		});
	}, [members, currentWorkspace]);

	const handleMemberToggle = (memberId: string) => {
		if (selectedMembers.includes(memberId)) {
			onSelectionChange(selectedMembers.filter((id) => id !== memberId));
		} else {
			if (selectedMembers.length < decreaseAmount) {
				onSelectionChange([...selectedMembers, memberId]);
			}
		}
	};

	const isSelectionComplete = selectedMembers.length === decreaseAmount;

	if (isMembersPending) {
		return (
			<div className="flex justify-center items-center p-8">
				<Spinner size="sm" />
			</div>
		);
	}

	if (!removableMembers.length) {
		return (
			<div className="space-y-4">
				<div className="p-6 text-sm text-center text-muted-foreground">
					No removable members found. You can only remove non-owner members.
				</div>
				<div className="flex justify-between items-center">
					<Button
						size="sm"
						className="w-full"
						variant="outline"
						onClick={onCancel}
					>
						Cancel
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="px-4 pt-4">
				<h3 className="text-sm font-medium">Select Members to Remove</h3>
			</div>

			{/* Member List */}
			<div className="overflow-y-auto px-4 space-y-2 max-h-64">
				{removableMembers.map((member) => {
					const isSelected = selectedMembers.includes(member.userExternalId);
					const isDisabled =
						!isSelected && selectedMembers.length >= decreaseAmount;

					return (
						<div
							key={member._id}
							className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
								isSelected
									? "bg-destructive/10 border-destructive/20"
									: "hover:bg-muted/50"
							} ${isDisabled ? "opacity-50" : ""}`}
						>
							<Checkbox
								checked={isSelected}
								onCheckedChange={() =>
									handleMemberToggle(member.userExternalId)
								}
								disabled={isDisabled}
							/>

							<Avatar className="w-8 h-8">
								<AvatarImage
									src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${member.user?.imageKey}`}
									alt={member.user?.fullName || ""}
								/>
								<AvatarFallback>
									{member.user?.firstName?.[0] ||
										member.user?.fullName?.[0] ||
										"U"}
								</AvatarFallback>
							</Avatar>

							<div className="flex-1 min-w-0">
								<div className="flex gap-2 items-center">
									<p className="text-sm font-medium truncate">
										{member.user?.fullName ||
											member.user?.firstName ||
											"Unknown"}
									</p>
									<Badge variant="outline" className="text-xs capitalize">
										{member.role.split(":")[1]}
									</Badge>
								</div>
								<p className="text-xs truncate text-muted-foreground">
									{member.user?.email}
								</p>
							</div>
						</div>
					);
				})}
			</div>

			{/* Selection Status */}
			<div className="text-xs text-center text-muted-foreground">
				{selectedMembers.length} of {decreaseAmount} member
				{decreaseAmount > 1 ? "s" : ""} selected
			</div>

			{/* Actions */}
			<div className="flex justify-between items-center px-4 py-4 border-t">
				<Button
					onClick={onConfirm}
					size="sm"
					disabled={!isSelectionComplete || isLoading}
					variant="destructive"
					className="w-full"
				>
					{isLoading ? (
						<Spinner size="xs" />
					) : (
						`Remove ${decreaseAmount} Member${decreaseAmount > 1 ? "s" : ""}`
					)}
				</Button>
			</div>
		</div>
	);
};
