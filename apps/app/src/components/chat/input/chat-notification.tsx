"use client";

import { api, useMutation } from "@firebuzz/convex";
import type { Id } from "@firebuzz/convex/nextjs";
import { envCloudflarePublic } from "@firebuzz/env";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { CircleAlert } from "@firebuzz/ui/icons/lucide";
import {
	IconArrowUpDashed,
	IconCoin,
	IconCreditCard,
	IconServer,
	IconX,
} from "@firebuzz/ui/icons/tabler";
import { toast } from "@firebuzz/ui/lib/utils";
import { formatRelativeTimeShort } from "@firebuzz/utils";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo } from "react";
import { useAgentSession } from "@/hooks/agent/use-agent-session";
import { useSandbox } from "@/hooks/agent/use-sandbox";
import { useSubscription } from "@/hooks/auth/use-subscription";

type NotificationType =
	| "subscription"
	| "credit"
	| "session"
	| "sandbox"
	| "message-queue";

interface QueuedMessage {
	id: string;
	prompt: string;
	createdBy: Id<"users">;
	createdAt: string;
	order: number;
	attachments: Array<
		| { type: "media"; id: Id<"media"> }
		| { type: "document"; id: Id<"documents"> }
	>;
}

interface Notification {
	type: NotificationType;
	priority: number;
	title: string;
	action?: {
		label: string;
		onClick: () => void | Promise<void>;
	};
	link?: {
		label: string;
		href: string;
	};
	showClose?: boolean;
	queuedMessages?: QueuedMessage[];
}

const CREDIT_LOW_THRESHOLD = 5;

export const ChatNotification = () => {
	const { isActive, creditBalance } = useSubscription();
	const { session, renewSession } = useAgentSession();
	const { sandboxStatus, renewSandbox } = useSandbox();
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

	const removeQueuedMessageMutation = useMutation(
		api.collections.agentSessions.mutations.removeQueuedMessage,
	);

	const notification = useMemo<Notification | null>(() => {
		const notifications: Notification[] = [];

		// 1. Subscription - No active subscription (Priority 1 - Highest)
		if (!isActive) {
			notifications.push({
				type: "subscription",
				priority: 1,
				title: "No Active Subscription",
				link: {
					label: "Upgrade Plan",
					href: "/settings/workspace/billing",
				},
			});
		}

		// 2. Credit - Low credit balance (Priority 2)
		if (creditBalance < CREDIT_LOW_THRESHOLD) {
			notifications.push({
				type: "credit",
				priority: 2,
				title: `Low Credit Balance (${creditBalance} remaining)`,
				link: {
					label: "Add Credits",
					href: "/settings/workspace/billing",
				},
			});
		}

		// 3. Session Status - Session completed (Priority 3)
		if (session && session.status === "completed") {
			notifications.push({
				type: "session",
				priority: 3,
				title: "Session is expired.",
				action: {
					label: "Renew Session",
					onClick: async () => {
						try {
							await renewSession();
							toast.success("Session renewed successfully");
						} catch (error) {
							const errorMessage =
								error instanceof Error
									? error.message
									: "Failed to renew session";
							toast.error(errorMessage);
						}
					},
				},
			});
		}

		// 4. Sandbox Status - Sandbox not running (Priority 4)
		if (sandboxStatus === "stopped" || sandboxStatus === "failed") {
			notifications.push({
				type: "sandbox",
				priority: 4,
				title: "Sandbox Not Running",
				action: {
					label: "Restart Sandbox",
					onClick: async () => {
						try {
							await renewSandbox();
							toast.success("Sandbox restarted successfully");
						} catch (error) {
							const errorMessage =
								error instanceof Error
									? error.message
									: "Failed to restart sandbox";
							toast.error(errorMessage);
						}
					},
				},
			});
		}

		// 5. Message Queue - Pending messages (Priority 5 - Lowest)
		if (session?.messageQueue && session.messageQueue.length > 0) {
			notifications.push({
				type: "message-queue",
				priority: 5,
				title: `Queued Messages`,
				showClose: true,
				queuedMessages: session.messageQueue,
			});
		}

		// Return notification with lowest priority number (highest importance)
		if (notifications.length === 0) return null;

		return notifications.reduce((highest, current) =>
			current.priority < highest.priority ? current : highest,
		);
	}, [
		isActive,
		creditBalance,
		session,
		sandboxStatus,
		renewSession,
		renewSandbox,
	]);

	const handleRemoveQueuedMessage = async (order: number) => {
		if (!session?._id) return;

		try {
			await removeQueuedMessageMutation({
				sessionId: session._id,
				order,
			});
			toast.success("Message removed from queue");
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to remove message";
			toast.error(errorMessage);
		}
	};

	const getIcon = (type: NotificationType) => {
		switch (type) {
			case "subscription":
				return <IconCreditCard className="text-amber-500 size-3" />;
			case "credit":
				return <IconCoin className="text-amber-500 size-3" />;
			case "session":
				return <CircleAlert className="text-amber-500 size-3" />;
			case "sandbox":
				return <IconServer className="text-amber-500 size-3" />;
			case "message-queue":
				return <IconArrowUpDashed className="size-3" />;
		}
	};

	if (!notification) return null;

	return (
		<AnimatePresence mode="wait">
			<motion.div
				key={notification.type}
				initial={{ opacity: 0, height: 0 }}
				animate={{ opacity: 1, height: "auto" }}
				exit={{ opacity: 0, height: 0 }}
				transition={{ duration: 0.2 }}
				className="overflow-hidden"
			>
				<div className="flex gap-3 items-center px-4 py-1.5 rounded-t-[0.35rem] border border-b-0 bg-background-subtle">
					{notification.type !== "message-queue" && (
						<div className="flex justify-center items-center p-1 rounded-md border bg-muted">
							{getIcon(notification.type)}
						</div>
					)}

					<div className="flex-1">
						{/* Regular Notification */}
						{notification.type !== "message-queue" && (
							<div className="text-sm font-medium">{notification.title}</div>
						)}
						{notification.type === "message-queue" && (
							<div className="flex gap-2 items-center pt-1 text-xs font-medium">
								{
									<div className="flex justify-center items-center p-1 rounded-md border bg-muted">
										{getIcon(notification.type)}
									</div>
								}
								{notification.title}
							</div>
						)}

						{/* Message Queue - Show avatars */}
						{notification.type === "message-queue" &&
							notification.queuedMessages &&
							session && (
								<div className="flex flex-col gap-2 pb-1 mt-2">
									<AnimatePresence mode="popLayout">
										{notification.queuedMessages.map((msg) => {
											const creator = session.joinedUsers.find(
												(user) => user._id === msg.createdBy,
											);
											const userInitials = creator
												? (creator.firstName?.[0] || "") +
													(creator.lastName?.[0] || "")
												: msg.createdBy.slice(0, 2).toUpperCase();
											const attachmentCount = msg.attachments?.length || 0;

											return (
												<motion.div
													key={msg.id}
													initial={{ opacity: 0, scale: 0.95, height: 0 }}
													animate={{ opacity: 1, scale: 1, height: "auto" }}
													exit={{ opacity: 0, scale: 0.95, height: 0 }}
													transition={{ duration: 0.2 }}
													className="group relative flex items-center gap-2 justify-between rounded-lg [--radius:1.5rem] border bg-muted px-2 py-1.5"
												>
													<Tooltip>
														<TooltipTrigger asChild>
															<div className="flex gap-2 items-center">
																<Avatar className="size-5">
																	<AvatarImage
																		src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${creator?.imageKey}`}
																	/>
																	<AvatarFallback className="text-[10px]">
																		{userInitials}
																	</AvatarFallback>
																</Avatar>
																<span className="max-w-[200px] truncate text-xs">
																	{msg.prompt}
																</span>
																{attachmentCount > 0 && (
																	<span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
																		{attachmentCount}
																	</span>
																)}
															</div>
														</TooltipTrigger>
														<TooltipContent>
															<div className="space-y-1">
																<p className="font-medium">
																	{creator
																		? `${creator.firstName || ""} ${creator.lastName || ""}`.trim() ||
																			creator.email
																		: "Unknown User"}
																</p>
																{attachmentCount > 0 && (
																	<p className="text-xs text-muted-foreground">
																		{attachmentCount} attachment
																		{attachmentCount > 1 ? "s" : ""}
																	</p>
																)}
																<p className="text-xs text-muted-foreground">
																	{formatRelativeTimeShort(msg.createdAt)} ago.
																</p>
															</div>
														</TooltipContent>
													</Tooltip>
													<Button
														variant="ghost"
														size="iconXs"
														onClick={() => handleRemoveQueuedMessage(msg.order)}
														className="opacity-0 transition-opacity group-hover:opacity-100"
													>
														<IconX className="size-3" />
													</Button>
												</motion.div>
											);
										})}
									</AnimatePresence>
								</div>
							)}
					</div>

					{/* Action Button */}
					{notification.action && (
						<Button
							variant="ghost"
							size="sm"
							onClick={notification.action.onClick}
							className="text-xs shrink-0"
						>
							{notification.action.label}
						</Button>
					)}

					{/* Link */}
					{notification.link && (
						<Button
							variant="ghost"
							size="sm"
							className="text-xs shrink-0"
							asChild
						>
							<Link href={notification.link.href}>
								{notification.link.label}
							</Link>
						</Button>
					)}
				</div>
			</motion.div>
		</AnimatePresence>
	);
};
