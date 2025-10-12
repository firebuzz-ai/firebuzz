"use client";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@firebuzz/ui/components/ui/card";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useAgentSession } from "@/hooks/agent/use-agent-session";
import { CommandsCard } from "./commands-card";
import { PreviewCard } from "./preview-card";
import { SandboxCard } from "./sandbox-card";

export const EditLandingPage = () => {
	const { session } = useAgentSession();

	if (!session) {
		return (
			<div className="flex justify-center items-center w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
			case "running":
			case "ready":
				return "bg-green-500/10 text-green-600 dark:text-green-400";
			case "completed":
				return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
			case "paused":
			case "stopped":
				return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
			case "failed":
				return "bg-red-500/10 text-red-600 dark:text-red-400";
			default:
				return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
		}
	};

	return (
		<div className="p-6 h-full">
			<div className="grid grid-cols-2 grid-rows-2 gap-6 h-full">
				{/* Top Left: Session Overview */}
				<Card>
					<CardHeader>
						<div className="flex justify-between items-center">
							<div>
								<CardTitle>Agent Session</CardTitle>
								<CardDescription>
									{session.assetType === "landingPage"
										? "Landing Page"
										: "Form"}{" "}
									Session
								</CardDescription>
							</div>
							<Badge className={getStatusColor(session.status)}>
								{session.status}
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<p className="text-muted-foreground">Session Type</p>
								<p className="font-medium">{session.sessionType}</p>
							</div>
							<div>
								<p className="text-muted-foreground">Started At</p>
								<p className="font-medium">
									{new Date(session.startedAt).toLocaleString()}
								</p>
							</div>
							{session.endedAt && (
								<div>
									<p className="text-muted-foreground">Ended At</p>
									<p className="font-medium">
										{new Date(session.endedAt).toLocaleString()}
									</p>
								</div>
							)}
							{session.pausedAt && (
								<div>
									<p className="text-muted-foreground">Paused At</p>
									<p className="font-medium">
										{new Date(session.pausedAt).toLocaleString()}
									</p>
								</div>
							)}
						</div>
						<Separator />
						<div>
							<p className="mb-2 text-sm text-muted-foreground">Joined Users</p>
							<div className="flex gap-2">
								{session.joinedUsers.map((userId) => (
									<Badge key={userId} variant="outline">
										{userId}
									</Badge>
								))}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Top Right: Preview */}
				<PreviewCard />

				{/* Bottom Left: Sandbox Information */}
				<SandboxCard />

				{/* Bottom Right: Commands */}
				<CommandsCard />
			</div>
		</div>
	);
};
