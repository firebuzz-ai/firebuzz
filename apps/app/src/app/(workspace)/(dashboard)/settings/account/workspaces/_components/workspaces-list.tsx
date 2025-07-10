"use client";

import { useUser } from "@/hooks/auth/use-user";
import { useWorkspace } from "@/hooks/auth/use-workspace";
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
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	Building,
	LogOut,
	MoreHorizontal,
	Users,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { useCallback, useState } from "react";

export const WorkspacesList = () => {
	const { user } = useUser();
	const { workspaces, currentWorkspace } = useWorkspace();
	const [leavingWorkspaceId, setLeavingWorkspaceId] = useState<string | null>(
		null,
	);

	const handleLeaveWorkspace = useCallback(async (workspaceId: string) => {
		setLeavingWorkspaceId(workspaceId);
		toast.loading("Leaving workspace...", { id: "leave-workspace" });

		try {
			// TODO: Implement leave workspace logic
			await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate API call
			toast.success("Successfully left workspace", { id: "leave-workspace" });
		} catch (error) {
			console.error("Error leaving workspace:", error);
			toast.error("Failed to leave workspace", { id: "leave-workspace" });
		} finally {
			setLeavingWorkspaceId(null);
		}
	}, []);

	return (
		<div className="p-6 space-y-6 border-b">
			<div>
				<h1 className="text-lg font-semibold">Your Workspaces</h1>
				<p className="text-sm text-muted-foreground">
					Manage your workspace memberships and switch between workspaces.
				</p>
			</div>

			<div className="space-y-2 max-w-2xl">
				<div className="flex justify-between items-center">
					<h2 className="font-medium">
						Workspaces{" "}
						<span className="text-sm text-muted-foreground">
							({workspaces?.length || 0})
						</span>
					</h2>
				</div>

				<div className="space-y-2">
					{workspaces && workspaces.length > 0 ? (
						workspaces.map((workspace) => {
							const isCurrentWorkspace =
								currentWorkspace?._id === workspace._id;
							const isOwner = workspace.ownerId === user?._id;
							const isCurrentlyLeaving = leavingWorkspaceId === workspace._id;

							return (
								<div
									key={workspace._id}
									className="flex justify-between items-center px-4 py-3 rounded-lg border transition-colors bg-muted hover:bg-muted/50"
								>
									<div className="flex gap-3 items-center">
										<Avatar className="border size-8">
											<AvatarImage src={workspace.logo} alt={workspace.title} />
											<AvatarFallback className="bg-primary/10">
												{workspace.title?.[0]?.toUpperCase() || (
													<Building className="size-4" />
												)}
											</AvatarFallback>
										</Avatar>

										<div className="flex flex-col min-w-0 leading-none">
											<div className="flex gap-2 items-center">
												<span className="text-sm font-medium truncate">
													{workspace.title}
												</span>
												{isCurrentWorkspace && (
													<span className="text-xs bg-primary/10 rounded-md px-1.5 py-0.5 font-medium">
														Active
													</span>
												)}
											</div>
											<span className="text-xs truncate text-muted-foreground">
												{workspace.workspaceType === "team"
													? "Team workspace"
													: "Personal workspace"}
											</span>
										</div>
									</div>

									<div className="flex gap-4 items-center">
										<Badge
											variant={isOwner ? "brand" : "outline"}
											className="text-xs"
										>
											{isOwner ? "Owner" : "Member"}
										</Badge>

										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="iconXs"
													disabled={isCurrentlyLeaving}
												>
													{isCurrentlyLeaving ? (
														<Spinner size="xs" />
													) : (
														<MoreHorizontal className="size-3.5" />
													)}
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent side="bottom" align="end">
												<DropdownMenuItem
													disabled={isOwner || isCurrentlyLeaving}
													onClick={() => handleLeaveWorkspace(workspace._id)}
													className="text-destructive focus:text-destructive"
												>
													<LogOut className="size-3.5" />
													Leave Workspace
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							);
						})
					) : (
						<div className="py-8 text-center">
							<div className="flex flex-col gap-3 items-center">
								<Users className="size-8 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">No workspaces found</p>
									<p className="text-xs text-muted-foreground">
										You are not a member of any workspaces yet.
									</p>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
