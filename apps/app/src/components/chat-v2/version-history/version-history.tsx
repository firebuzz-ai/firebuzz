"use client";

import { useAgentSession } from "@/hooks/agent/use-agent-session";
import { useLandingPageContext } from "@/hooks/agent/use-landing-page";
import { useSandbox } from "@/hooks/agent/use-sandbox";
import {
	api,
	ConvexError,
	useCachedQuery,
	useMutation,
} from "@firebuzz/convex";
import type { Id } from "@firebuzz/convex/nextjs";
import { TextShimmer } from "@firebuzz/ui/components/reusable/text-shimmer";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { CornerDownRight, GitCommit } from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface VersionHistoryProps {
	landingPageId: Id<"landingPages">;
}

export const VersionHistory = ({ landingPageId }: VersionHistoryProps) => {
	const { landingPage, currentVersionId } = useLandingPageContext();
	const { session } = useAgentSession();
	const { sandboxStatus } = useSandbox();
	const [confirmRevertId, setConfirmRevertId] =
		useState<Id<"landingPageVersions"> | null>(null);

	const versions = useCachedQuery(
		api.collections.landingPages.versions.queries.listByLandingPageId,
		landingPageId ? { landingPageId } : "skip",
	);

	const isLoading = versions === undefined;

	// Check if revert is available
	const canRevert = session?.status === "active" && sandboxStatus === "running";
	const isReverting = !!landingPage?.revertingToVersionId;

	const revertMutation = useMutation(
		api.collections.landingPages.versions.mutations.revert,
	);

	const handleRevert = async (versionId: Id<"landingPageVersions">) => {
		try {
			toast.loading("Reverting to version...", { id: "revert-version" });

			await revertMutation({
				landingPageId,
				versionId,
			});

			toast.success("Version reverted successfully", {
				id: "revert-version",
				description:
					"Your landing page has been reverted to the selected version",
			});

			setConfirmRevertId(null);
		} catch (error) {
			if (error instanceof ConvexError) {
				toast.error("Failed to revert version", {
					id: "revert-version",
					description: error.data,
				});
			} else {
				toast.error("Failed to revert version", {
					id: "revert-version",
					description: "An unexpected error occurred",
				});
			}
		}
	};

	// Loading state
	if (isLoading) {
		return (
			<div className="flex justify-center items-center w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	// Empty state
	if (!versions || versions.length === 0) {
		return (
			<div className="flex flex-col justify-center items-center p-8 h-full">
				<h2 className="mb-2 text-xl font-semibold">No Versions Yet</h2>
				<p className="text-center text-muted-foreground">
					Versions will appear here as you save changes to your landing page
				</p>
			</div>
		);
	}

	const confirmingVersion = versions?.find((v) => v._id === confirmRevertId);

	return (
		<>
			<div className="flex overflow-y-auto flex-col pt-4 pr-4 pl-1 h-full">
				<div className="relative">
					{versions.map((version, index) => {
						const isCurrent = version._id === currentVersionId;
						const isPublished =
							version._id === landingPage?.lastPublishedVersionId;
						const isRevertingToThis =
							version._id === landingPage?.revertingToVersionId;
						const timeAgo = formatDistanceToNow(version._creationTime, {
							addSuffix: true,
						});
						const isLast = index === versions.length - 1;

						return (
							<div key={version._id} className="flex relative gap-3 pb-8">
								{/* Timeline */}
								<div className="flex relative flex-col items-center">
									{/* Commit dot */}
									<div
										className={cn(
											"z-10 flex items-center justify-center rounded-full border-2 size-8",
											{
												"border-brand bg-brand/20": isCurrent,
												"border-emerald-600 bg-emerald-600/20":
													isPublished && !isCurrent,
												"border-border bg-muted": !isCurrent && !isPublished,
											},
										)}
									>
										<GitCommit
											className={cn("size-4", {
												"text-brand": isCurrent,
												"text-emerald-600": isPublished && !isCurrent,
												"text-muted-foreground": !isCurrent && !isPublished,
											})}
										/>
									</div>

									{/* Vertical line */}
									{!isLast && (
										<div className="absolute top-8 w-[2px] h-full bg-border" />
									)}
								</div>

								{/* Content */}
								<div className="flex-1 px-3 py-2 rounded-md border bg-muted">
									{/* Header */}
									<div className="flex justify-between items-start mb-2">
										<div className="flex flex-wrap gap-2 items-center">
											<span className="text-sm font-semibold">
												Version {version.number}
											</span>
											{isCurrent && <Badge variant="brand">Current</Badge>}
											{isPublished && (
												<Badge variant="emerald">Published</Badge>
											)}
										</div>
										{!isCurrent &&
											(isRevertingToThis ? (
												<TextShimmer
													as="span"
													duration={1.5}
													className="text-xs font-medium"
													active={true}
												>
													Reverting...
												</TextShimmer>
											) : (
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant="ghost"
															size="sm"
															className="px-2 -mt-1 h-7 text-xs"
															onClick={() => setConfirmRevertId(version._id)}
															disabled={!canRevert || isReverting}
														>
															Revert
														</Button>
													</TooltipTrigger>
													{(!canRevert || isReverting) && (
														<TooltipContent>
															{isReverting
																? "Another version is being reverted"
																: session?.status !== "active"
																	? "Session is not active"
																	: "Sandbox is not running"}
														</TooltipContent>
													)}
												</Tooltip>
											))}
									</div>

									{/* Commit message */}
									{version.commitMessage && (
										<div className="flex gap-1 items-start mb-3">
											<CornerDownRight className="size-3 shrink-0" />
											<p className="font-mono text-xs text-muted-foreground">
												{version.commitMessage}
											</p>
										</div>
									)}

									{/* Meta info */}
									<div className="flex gap-3 items-center pt-3 pb-2 text-xs border-t text-muted-foreground">
										<div className="flex gap-2 items-center">
											<Avatar className="size-5">
												<AvatarImage src={version.createdBy.avatarUrl} />
												<AvatarFallback className="text-[10px]">
													{version.createdBy.fullName
														?.split(" ")
														.map((n) => n[0])
														.join("")
														.toUpperCase() || "?"}
												</AvatarFallback>
											</Avatar>
											<span className="font-medium">
												{version.createdBy.fullName}
											</span>
										</div>
										<div className="border rounded-[2px] size-2 bg-brand/20 border-brand" />
										<span>{timeAgo}</span>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Confirmation Dialog */}
			<Dialog
				open={confirmRevertId !== null}
				onOpenChange={(open) => !open && setConfirmRevertId(null)}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							Revert to Version {confirmingVersion?.number}?
						</DialogTitle>
						<DialogDescription>
							This will replace your current work with version. You can always
							revert to a another version later.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							size="sm"
							className="w-full h-8"
							variant="outline"
							onClick={() => setConfirmRevertId(null)}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							className="w-full h-8"
							onClick={() => confirmRevertId && handleRevert(confirmRevertId)}
						>
							Revert
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};
