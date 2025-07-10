"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { api, useAction } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card, CardContent } from "@firebuzz/ui/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	LogOut,
	Monitor,
	MoreHorizontal,
	Smartphone,
} from "@firebuzz/ui/icons/lucide";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

// Interface for session with activities (from Backend API)
interface SessionWithActivitiesResource {
	id: string;
	status: string;
	expireAt: string;
	abandonAt: string;
	lastActiveAt: string;
	latestActivity: SessionActivity | null;
	actor: null | {
		iss: string;
		sid: string;
		sub: string;
	};
}

interface SessionActivity {
	id: string;
	browserName: string | null;
	browserVersion: string | null;
	deviceType: string | null;
	ipAddress: string | null;
	city: string | null;
	country: string | null;
	isMobile: boolean;
}

const getDeviceIcon = (latestActivity?: SessionActivity | null) => {
	if (!latestActivity) return <Monitor className="size-4" />;

	if (latestActivity.isMobile || latestActivity.deviceType === "mobile") {
		return <Smartphone className="size-4" />;
	}
	return <Monitor className="size-4" />;
};

const getDeviceInfo = (latestActivity?: SessionActivity | null) => {
	if (!latestActivity) return { browser: "Unknown", os: "Unknown" };

	return {
		browser: latestActivity.browserName || "Unknown",
		os: latestActivity.deviceType || "Unknown",
	};
};

export const DeviceSettings = () => {
	const { session: currentSession, isLoaded: isSessionLoaded } = useSession();
	const { user } = useUser();
	const [isRevoking, setIsRevoking] = useState<string | null>(null);

	// Convex actions
	const getSessionsWithActivities = useAction(
		api.lib.clerk.getSessionsWithActivities,
	);
	const revokeSessionAction = useAction(api.lib.clerk.revokeSession);

	// Fetch sessions with activities using React Query
	const {
		data: sessionsWithActivities = [],
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["sessions", user?.id],
		queryFn: async () => {
			if (!user || !isSessionLoaded) {
				throw new Error("User not loaded");
			}
			return await getSessionsWithActivities();
		},
		enabled: !!user && isSessionLoaded,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});

	const handleRevokeSession = async (
		sessionToRevoke: SessionWithActivitiesResource,
	) => {
		if (sessionToRevoke.id === currentSession?.id) return; // Can't revoke current session

		setIsRevoking(sessionToRevoke.id);
		try {
			await revokeSessionAction({ sessionId: sessionToRevoke.id });

			// Refetch sessions to update the list
			await refetch();
		} catch (error) {
			console.error("Error ending session:", error);
		} finally {
			setIsRevoking(null);
		}
	};

	if (!isSessionLoaded || !user || isLoading) {
		return (
			<div className="flex justify-center items-center p-6">
				<Spinner size="sm" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 space-y-6 w-full">
				<div>
					<h2 className="text-lg font-semibold">Devices</h2>
					<p className="text-sm text-muted-foreground">
						Manage your active sessions and sign out from devices you don't
						recognize.
					</p>
				</div>
				<div className="p-4 text-sm text-center rounded-lg text-destructive bg-destructive/10">
					<p>
						Error loading sessions:{" "}
						{error instanceof Error
							? error.message
							: "Failed to fetch sessions"}
					</p>
				</div>
			</div>
		);
	}

	if (!sessionsWithActivities || sessionsWithActivities.length === 0) {
		return (
			<div className="p-6 space-y-6 w-full">
				<div>
					<h2 className="text-lg font-semibold">Devices</h2>
					<p className="text-sm text-muted-foreground">
						Manage your active sessions and sign out from devices you don't
						recognize.
					</p>
				</div>
				<div className="p-4 text-sm text-center rounded-lg text-muted-foreground bg-muted/50">
					<p>No active sessions found.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6 w-full">
			{/* Header */}
			<div>
				<h2 className="text-lg font-semibold">Devices</h2>
				<p className="text-sm text-muted-foreground">
					Manage your active sessions and sign out from devices you don't
					recognize.
				</p>
			</div>

			{/* Device List */}
			<div className="space-y-3 max-w-xl">
				{sessionsWithActivities.map((sessionItem) => {
					const isCurrentSession = sessionItem.id === currentSession?.id;
					const isCurrentlyRevoking = isRevoking === sessionItem.id;
					const deviceInfo = getDeviceInfo(sessionItem.latestActivity);

					return (
						<Card
							key={sessionItem.id}
							className="transition-all duration-200 hover:shadow-md bg-muted"
						>
							<CardContent className="p-4">
								<div className="space-y-3 w-full min-w-0">
									{/* Top */}
									<div className="flex gap-3 items-center">
										<div className="p-1 rounded-md border bg-muted">
											{getDeviceIcon(sessionItem.latestActivity)}
										</div>

										{/* Device Info */}
										<div className="flex flex-col flex-1 min-w-0">
											<div className="flex gap-2 items-center">
												<h3 className="font-medium">
													{deviceInfo.browser} on {deviceInfo.os}
												</h3>
											</div>
											<p className="text-sm text-muted-foreground">
												{sessionItem.latestActivity?.ipAddress && (
													<span>
														{sessionItem.latestActivity.ipAddress}
														{sessionItem.latestActivity.city &&
															sessionItem.latestActivity.country && (
																<span>
																	{" "}
																	• {sessionItem.latestActivity.city},{" "}
																	{sessionItem.latestActivity.country}
																</span>
															)}
													</span>
												)}
											</p>
										</div>

										{/* Right Part */}
										<div className="flex gap-2 items-center">
											{isCurrentSession && (
												<Badge variant="brand" className="text-xs">
													Current device
												</Badge>
											)}
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="iconXs"
														disabled={isCurrentlyRevoking}
													>
														{isCurrentlyRevoking ? (
															<Spinner size="xs" />
														) : (
															<MoreHorizontal className="size-3.5" />
														)}
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent
													side="bottom"
													align="end"
													sideOffset={4}
												>
													<DropdownMenuItem
														disabled={isCurrentlyRevoking || isCurrentSession}
														onClick={() => handleRevokeSession(sessionItem)}
														className="text-destructive focus:text-destructive"
													>
														<LogOut className="size-3.5" />
														Revoke device
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>

									<Separator className="w-full" />

									{/* Bottom */}
									<div className="flex gap-2 items-center text-xs text-muted-foreground">
										<span>
											{isCurrentSession ? "Active now" : "Last active"} •
											{sessionItem.lastActiveAt
												? ` ${new Date(sessionItem.lastActiveAt).toLocaleDateString()}`
												: " Unknown"}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>
		</div>
	);
};
