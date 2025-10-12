"use client";
import { api, type Id, useCachedRichQuery } from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@firebuzz/ui/components/ui/card";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { useMemo } from "react";
import { useSandbox } from "@/hooks/agent/use-sandbox";

export const SandboxCard = () => {
	const sandbox = useSandbox();

	// Get all commands for this sandbox
	const { data: commands } = useCachedRichQuery(
		api.collections.sandboxes.commands.queries.getAllCommandsBySandbox,
		sandbox.sandboxDbId
			? { sandboxId: sandbox.sandboxDbId as Id<"sandboxes"> }
			: "skip",
	);

	const installStatus = useMemo(() => {
		if (!commands) return "pending";
		const installCmd = commands.find((cmd) => cmd._id === sandbox.installCmdId);
		return installCmd?.status || "pending";
	}, [commands, sandbox.installCmdId]);

	const devStatus = useMemo(() => {
		if (!commands) return "pending";
		const devCmd = commands.find((cmd) => cmd._id === sandbox.devCmdId);
		return devCmd?.status || "pending";
	}, [commands, sandbox.devCmdId]);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "running":
				return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
			case "completed":
				return "bg-green-500/10 text-green-600 dark:text-green-400";
			case "pending":
				return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
			case "failed":
			case "error":
				return "bg-red-500/10 text-red-600 dark:text-red-400";
			case "stopping":
			case "stopped":
				return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
			default:
				return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
		}
	};

	if (!sandbox.sandboxId) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex justify-between items-center">
					<div>
						<CardTitle>Sandbox Environment</CardTitle>
						<CardDescription>Vercel Sandbox Instance</CardDescription>
					</div>
					<Badge className={getStatusColor(sandbox.sandboxStatus)}>
						{sandbox.sandboxStatus}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-2 gap-4 text-sm">
					<div>
						<p className="text-muted-foreground">Sandbox ID</p>
						<p className="font-mono text-xs truncate">{sandbox.sandboxId}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Runtime</p>
						<p className="font-medium">{sandbox.runtime}</p>
					</div>
					<div>
						<p className="text-muted-foreground">vCPUs</p>
						<p className="font-medium">{sandbox.vcpus}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Timeout</p>
						<p className="font-medium">{sandbox.timeout}ms</p>
					</div>
					<div className="col-span-2">
						<p className="text-muted-foreground">Working Directory</p>
						<p className="font-mono text-xs">{sandbox.cwd}</p>
					</div>
				</div>

				<Separator />

				<div className="grid grid-cols-2 gap-4 text-sm">
					<div>
						<p className="text-muted-foreground mb-2">Dependencies</p>
						<Badge variant="outline" className={getStatusColor(installStatus)}>
							{installStatus}
						</Badge>
					</div>
					<div>
						<p className="text-muted-foreground mb-2">Dev Server</p>
						<Badge variant="outline" className={getStatusColor(devStatus)}>
							{devStatus}
						</Badge>
					</div>
				</div>

				{sandbox.ports.length > 0 && (
					<>
						<Separator />
						<div>
							<p className="mb-2 text-sm text-muted-foreground">
								Exposed Ports
							</p>
							<div className="flex gap-2">
								{sandbox.ports.map((port) => (
									<Badge key={`port-${port}`} variant="outline">
										{port}
									</Badge>
								))}
							</div>
						</div>
					</>
				)}

				{sandbox.previewURL && (
					<>
						<Separator />
						<div>
							<p className="mb-2 text-sm text-muted-foreground">Preview URL</p>
							<a
								href={sandbox.previewURL}
								target="_blank"
								rel="noopener noreferrer"
								className="font-mono text-sm text-blue-600 hover:underline dark:text-blue-400 break-all"
							>
								{sandbox.previewURL}
							</a>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
};
