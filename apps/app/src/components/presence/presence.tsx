"use client";

import { usePresence } from "@/hooks/auth/use-presence";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { TooltipProvider } from "@firebuzz/ui/components/ui/tooltip";
import { cn } from "@firebuzz/ui/lib/utils";
import * as React from "react";
import { getTimeAgo } from "./helpers";
import { PresenceAvatar } from "./presence-avatar";

// Presence UI component built with Shadcn UI primitives.
// Logic: a parent should supply presence state from Convex presence.

interface PresenceProps {
	roomId: string;
	maxVisible?: number;
	className?: string;
}

export const Presence: React.FC<PresenceProps> = ({
	roomId,
	maxVisible = 5,
	className,
}) => {
	const { presenceSate } = usePresence({ roomId });
	const visible = React.useMemo(
		() => presenceSate?.slice(0, maxVisible),
		[presenceSate, maxVisible],
	);
	const hidden = React.useMemo(
		() => presenceSate?.slice(maxVisible),
		[presenceSate, maxVisible],
	);

	if (!presenceSate || !visible || !hidden) {
		const placeholders = Array.from({ length: Math.min(3, maxVisible) });
		return (
			<div className={cn("flex items-center", className)}>
				<div className="flex -space-x-2 rtl:space-x-reverse">
					{placeholders.map((_, idx) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: Loading placeholder
						<Skeleton key={idx} className="rounded-full border size-8" />
					))}
				</div>
			</div>
		);
	}

	return (
		<TooltipProvider delayDuration={200}>
			<div className={cn("flex items-center", className)}>
				<div className="flex -space-x-2 rtl:space-x-reverse">
					{visible.map((p, idx) => (
						<PresenceAvatar
							key={p.userId}
							presence={
								p as {
									userId: string;
									fullName: string;
									imageKey: string;
									online: boolean;
									lastDisconnected: number;
								}
							}
							zIndex={visible.length - idx}
						/>
					))}

					{hidden.length > 0 && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<div
									className={cn(
										"inline-flex justify-center items-center text-xs font-medium",
										"rounded-full border size-8 bg-background text-foreground",
										"ring-1 cursor-pointer select-none ring-border hover:bg-muted",
									)}
									aria-label={`+${hidden.length} more`}
									style={{ zIndex: 1 }}
								>
									+{hidden.length}
								</div>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-64">
								{hidden.slice(0, 10).map((p) => (
									<DropdownMenuItem key={p.userId} className="gap-2 py-2">
										<PresenceAvatar
											presence={
												p as {
													userId: string;
													fullName: string;
													imageKey: string;
													online: boolean;
													lastDisconnected: number;
												}
											}
											size="sm"
											showTooltip={false}
										/>
										<div className="flex flex-col min-w-0">
											<span className="text-sm font-medium truncate">
												{p.name || p.userId}
											</span>
											<span className="text-xs truncate text-muted-foreground">
												{p.online
													? "Online now"
													: getTimeAgo(p.lastDisconnected)}
											</span>
										</div>
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</div>
		</TooltipProvider>
	);
};

// Intentionally no default export to follow project convention of named exports.
