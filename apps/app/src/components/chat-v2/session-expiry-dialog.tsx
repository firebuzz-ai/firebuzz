"use client";

import { api, ConvexError, useMutation } from "@firebuzz/convex";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@firebuzz/ui/components/ui/alert-dialog";
import { toast } from "@firebuzz/ui/lib/utils";
import { useEffect, useState } from "react";
import { useAgentSession } from "@/hooks/agent/use-agent-session";

const WARNING_THRESHOLD = 2 * 60 * 1000; // Show warning 2 minutes before shutdown

export const SessionExpiryDialog = () => {
	const { session } = useAgentSession();
	const [showWarning, setShowWarning] = useState(false);
	const [timeRemaining, setTimeRemaining] = useState<string>("");
	const [isExtending, setIsExtending] = useState(false);

	const extendSessionMutation = useMutation(
		api.collections.agentSessions.mutations.extendSessionPublic,
	);

	// Calculate if we should show warning based on shutdownAt
	const shouldShowWarning = session?.shutdownAt
		? new Date(session.shutdownAt).getTime() - Date.now() <=
				WARNING_THRESHOLD && new Date(session.shutdownAt).getTime() > Date.now()
		: false;

	// Update time remaining display every second
	useEffect(() => {
		if (!shouldShowWarning || !session?.shutdownAt) {
			setShowWarning(false);
			return;
		}

		setShowWarning(true);

		const updateTimer = setInterval(() => {
			const shutdownTime = new Date(session.shutdownAt as string).getTime();
			const remaining = shutdownTime - Date.now();

			if (remaining <= 0) {
				setShowWarning(false);
				clearInterval(updateTimer);
				return;
			}

			const minutes = Math.floor(remaining / 60000);
			const seconds = Math.floor((remaining % 60000) / 1000);
			setTimeRemaining(minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`);
		}, 1000);

		return () => clearInterval(updateTimer);
	}, [shouldShowWarning, session?.shutdownAt]);

	const handleExtend = async () => {
		if (!session?._id) return;

		setIsExtending(true);
		try {
			await extendSessionMutation({
				sessionId: session._id,
			});
			toast.success("Session extended", {
				id: "session-extended",
				description: "Your session has been extended successfully",
			});
			setShowWarning(false);
		} catch (error) {
			const errorMessage =
				error instanceof ConvexError ? error.data : "Failed to extend session";
			toast.error("Failed to extend session", {
				id: "session-extend-failed",
				description: errorMessage,
			});
		} finally {
			setIsExtending(false);
		}
	};

	const handleDismiss = () => {
		setShowWarning(false);
	};

	if (!session) return null;

	return (
		<AlertDialog open={showWarning} onOpenChange={setShowWarning}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
					<AlertDialogDescription>
						Your agent session will end in <strong>{timeRemaining}</strong> due
						to {session.shutdownReason === "idle" ? "inactivity" : "time limit"}
						. Would you like to extend your session?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={handleDismiss} disabled={isExtending}>
						Let it expire
					</AlertDialogCancel>
					<AlertDialogAction onClick={handleExtend} disabled={isExtending}>
						{isExtending ? "Extending..." : "Extend Session"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
