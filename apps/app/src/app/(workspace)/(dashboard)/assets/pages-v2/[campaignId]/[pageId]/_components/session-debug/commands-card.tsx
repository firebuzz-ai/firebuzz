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
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@firebuzz/ui/components/ui/tabs";
import { useEffect, useRef, useState } from "react";
import { useSandbox } from "@/hooks/agent/use-sandbox";

export const CommandsCard = () => {
	const sandbox = useSandbox();
	const bottomRef = useRef<HTMLDivElement>(null);
	const [selectedCommand, setSelectedCommand] = useState<string | null>(null);

	const { data: commands } = useCachedRichQuery(
		api.collections.sandboxes.commands.queries.getAllCommandsBySandbox,
		sandbox.sandboxDbId
			? { sandboxId: sandbox.sandboxDbId as Id<"sandboxes"> }
			: "skip",
	);

	// Auto-select first command
	useEffect(() => {
		if (commands && commands.length > 0 && !selectedCommand) {
			setSelectedCommand(commands[0]._id);
		}
	}, [commands, selectedCommand]);

	// Auto-scroll to bottom when new logs arrive
	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on log updates
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [commands]);

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
			default:
				return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
		}
	};

	if (!commands || commands.length === 0) {
		return (
			<Card className="h-full">
				<CardHeader>
					<CardTitle>Commands</CardTitle>
					<CardDescription>No commands executed yet</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card className="flex flex-col h-full">
			<CardHeader>
				<CardTitle>Commands</CardTitle>
				<CardDescription>Command execution logs</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col flex-1 min-h-0">
				<Tabs
					value={selectedCommand || commands[0]._id}
					onValueChange={setSelectedCommand}
					className="flex flex-col flex-1"
				>
					<TabsList className="flex-shrink-0 justify-start w-full">
						{commands.map((cmd) => (
							<TabsTrigger
								key={`tab-${cmd._id}`}
								value={cmd._id}
								className="flex gap-2 items-center"
							>
								<span className="capitalize">{cmd.type}</span>
								<Badge variant="outline" className={getStatusColor(cmd.status)}>
									{cmd.status}
								</Badge>
							</TabsTrigger>
						))}
					</TabsList>
					{commands.map((cmd) => (
						<TabsContent
							key={`content-${cmd._id}`}
							value={cmd._id}
							className="flex flex-col flex-1 mt-4 min-h-0"
						>
							<div className="flex flex-shrink-0 justify-between items-center mb-2 text-sm">
								<div className="font-mono text-xs text-muted-foreground">
									{cmd.command} {cmd.args.join(" ")}
								</div>
								{cmd.exitCode !== undefined && (
									<Badge variant="outline">Exit: {cmd.exitCode}</Badge>
								)}
							</div>
							<div className="overflow-y-auto flex-1 p-3 rounded-md border bg-muted/50">
								{cmd.logs.length > 0 ? (
									<div className="space-y-1 font-mono text-xs">
										{cmd.logs.map((log, index) => (
											<div
												key={`log-${cmd._id}-${index}-${log.timestamp}`}
												className={
													log.stream === "stderr"
														? "text-red-400"
														: "text-foreground/80"
												}
											>
												<span className="mr-2 text-muted-foreground">
													[{new Date(log.timestamp).toLocaleTimeString()}]
												</span>
												{log.data}
											</div>
										))}
										<div ref={bottomRef} />
									</div>
								) : (
									<p className="text-sm text-muted-foreground">
										No logs available yet...
									</p>
								)}
							</div>
						</TabsContent>
					))}
				</Tabs>
			</CardContent>
		</Card>
	);
};
