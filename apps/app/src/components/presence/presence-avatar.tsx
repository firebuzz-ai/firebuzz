"use client";

import { useUser } from "@/hooks/auth/use-user";
import { envCloudflarePublic } from "@firebuzz/env";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { cn } from "@firebuzz/ui/lib/utils";
import * as React from "react";
import { getInitials, getTimeAgo } from "./helpers";

interface PresenceAvatarProps {
	presence: {
		userId: string;
		fullName: string;
		imageKey: string;
		online: boolean;
		lastDisconnected: number;
	};
	size?: "sm" | "md";
	zIndex?: number;
	showTooltip?: boolean;
}

export const PresenceAvatar: React.FC<PresenceAvatarProps> = ({
	presence,
	size = "md",
	zIndex,
	showTooltip = true,
}) => {
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
	const { user } = useUser();

	const imageSrc = React.useMemo(() => {
		if (presence.imageKey && /^https?:\/\//.test(presence.imageKey))
			return presence.imageKey;
		if (presence.imageKey)
			return `${NEXT_PUBLIC_R2_PUBLIC_URL}/${presence.imageKey}`;
		return undefined;
	}, [presence.imageKey, NEXT_PUBLIC_R2_PUBLIC_URL]);

	const initials = React.useMemo(
		() => getInitials(presence.fullName || presence.userId),
		[presence.fullName, presence.userId],
	);

	const avatarSize = size === "sm" ? "size-6" : "size-8";

	const avatar = (
		<div className="relative" style={zIndex ? { zIndex } : undefined}>
			<Avatar className={cn("border", avatarSize)}>
				{imageSrc ? (
					<AvatarImage
						src={imageSrc}
						alt={presence.fullName || presence.userId}
					/>
				) : (
					<AvatarFallback>{initials}</AvatarFallback>
				)}
			</Avatar>
			<span
				className={cn(
					"absolute bottom-0 right-0 inline-block size-2 rounded-full border",
					presence.online ? "bg-emerald-600" : "bg-muted-foreground",
				)}
				aria-hidden
			/>
		</div>
	);

	if (!showTooltip) return avatar;

	return (
		<Tooltip>
			<TooltipTrigger asChild>{avatar}</TooltipTrigger>
			<TooltipContent side="top" align="center">
				<div className="flex flex-col">
					<span className="text-sm font-medium">
						{presence.userId === user?._id
							? "You"
							: presence.fullName || presence.userId}
					</span>
					<span className="text-xs text-muted-foreground">
						{presence.online
							? "Online now"
							: getTimeAgo(presence.lastDisconnected)}
					</span>
				</div>
			</TooltipContent>
		</Tooltip>
	);
};
