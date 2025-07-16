import { useUser } from "@/hooks/auth/use-user";
import {
	actionsAtom,
	artifactsAtom,
	currentPreviewVersionAtom,
	currentVersionAtom,
	parsedFilesAtom,
} from "@/lib/workbench/atoms";
import type { ParsedFile } from "@/lib/workbench/parser/current-files-parser";
import { parseFileSystemTree } from "@/lib/workbench/parser/current-files-parser";
import { getWebcontainerInstance } from "@/lib/workbench/webcontainer";
import { useMutation } from "@firebuzz/convex";
import type { Id } from "@firebuzz/convex/nextjs";
import { api, fetchQuery } from "@firebuzz/convex/nextjs";
import { Button } from "@firebuzz/ui/components/ui/button";
import { ChevronDown, ChevronRight } from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import type { Message } from "ai";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { nanoid } from "nanoid";
import { useParams } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionList } from "./action-list";

interface ArtifactProps {
	id: string;
	setMessages: Dispatch<SetStateAction<Message[]>>;
}

export const Artifact = ({ id, setMessages }: ArtifactProps) => {
	const { id: landingPageId } = useParams();
	const currentVersion = useAtomValue(currentVersionAtom);
	const [currentPreviewVersion, setCurrentPreviewVersion] = useAtom(
		currentPreviewVersionAtom,
	);

	const artifacts = useAtomValue(artifactsAtom);
	const actions = useAtomValue(actionsAtom);
	const setInitialFiles = useSetAtom(parsedFilesAtom);
	const [isRestoring, setIsRestoring] = useState(false);
	const [isViewing, setIsViewing] = useState(false);
	const { getToken } = useUser();
	const artifact = artifacts.find((a) => a.id === id);
	const artifactActions = actions.filter((action) => action.artifactId === id);
	const [isActionsVisible, setIsActionsVisible] = useState(
		artifact && !artifact.closed,
	);
	const isClosed = artifact?.closed;
	const isSaving = artifact?.isSaving;
	const versionId = artifact?.versionId;
	const versionNumber = artifact?.versionNumber;
	const isPreviewCurrent = useMemo(() => {
		return currentPreviewVersion?._id === versionId;
	}, [currentPreviewVersion, versionId]);
	const isCurrentVersion = useMemo(() => {
		return currentVersion?._id === versionId;
	}, [currentVersion, versionId]);

	const updateLandingPageVersion = useMutation(
		api.collections.landingPages.mutations.updateLandingPageVersion,
	);
	const createLandingPageMessage = useMutation(
		api.collections.landingPages.messages.mutations.create,
	);

	useEffect(() => {
		if (isClosed) {
			setIsActionsVisible(false);
		} else {
			setIsActionsVisible(true);
		}
	}, [isClosed]);

	// Handlers
	const getFiles = useCallback(
		async (versionId: Id<"landingPageVersions">) => {
			const files = await fetchQuery(
				api.collections.landingPages.versions.queries.getById,
				{
					id: versionId as Id<"landingPageVersions">,
				},
				{
					token: (await getToken({ template: "convex" })) ?? undefined,
				},
			);

			return files;
		},
		[getToken],
	);

	const handleRestore = async () => {
		setIsRestoring(true);
		try {
			const webcontainerInstance = await getWebcontainerInstance();

			if (!versionId || !landingPageId) return;

			// 1. Get files from the version
			const files = await getFiles(versionId as Id<"landingPageVersions">);

			if (!files || !files.signedUrl) {
				toast.error("Failed to get version files.");
				return;
			}

			// 2. Download files
			const initialFilesResponse = await fetch(files.signedUrl);
			const initialFiles = await initialFilesResponse.json();

			// 3. Update landing page version in Convex
			await updateLandingPageVersion({
				id: landingPageId as Id<"landingPages">,
				landingPageVersionId: versionId as Id<"landingPageVersions">,
			});

			// 4. Set files
			setInitialFiles(
				initialFiles
					? parseFileSystemTree(initialFiles)
					: new Map<string, ParsedFile>(),
			);

			// 5. Mount files
			await webcontainerInstance.mount(initialFiles, {
				mountPoint: `${landingPageId}`,
			});

			// 6. Add system message about version restoration
			setMessages((messages) => [
				...messages,
				{
					id: `version-restored-${Date.now()}`,
					role: "user",
					content: JSON.stringify({
						type: "version-reference",
						version: {
							versionId: versionId as Id<"landingPageVersions">,
							versionNumber: versionNumber || 0,
						},
					}),
					metadata: {
						isSystem: true,
					},
				},
			]);

			// 7. Save this message to the database
			await createLandingPageMessage({
				landingPageId: landingPageId as Id<"landingPages">,
				messages: [
					{
						id: `version-restored-${Date.now()}`,
						parts: [
							{
								type: "text",
								text: JSON.stringify({
									type: "version-reference",
									version: {
										versionId: versionId as Id<"landingPageVersions">,
										versionNumber: versionNumber || 0,
									},
								}),
							},
						],
						role: "user",
						groupId: nanoid(5),
						createdAt: new Date().toISOString(),
						metadata: {
							isSystem: true,
						},
					},
				],
			});

			toast.success(`Successfully restored to version ${versionNumber}`);
		} catch (error) {
			console.error("Failed to restore version:", error);
			toast.error("Failed to restore version.");
		} finally {
			setIsRestoring(false);
		}
	};

	const handlePreview = async () => {
		try {
			if (!versionId) return;
			setIsViewing(true);
			const webcontainerInstance = await getWebcontainerInstance();

			const files = await getFiles(versionId as Id<"landingPageVersions">);

			if (!files || !files.signedUrl) {
				toast.error("Failed to get version files.");
				return;
			}

			// Download files
			const initialFilesResponse = await fetch(files.signedUrl);
			const initialFiles = await initialFilesResponse.json();

			// Set files
			setInitialFiles(
				initialFiles
					? parseFileSystemTree(initialFiles)
					: new Map<string, ParsedFile>(),
			);

			// Mount files
			await webcontainerInstance.mount(initialFiles, {
				mountPoint: `${landingPageId}`,
			});

			// Set current preview version
			setCurrentPreviewVersion({
				_id: versionId,
				number: versionNumber || 1,
				signedUrl: files.signedUrl,
			});
		} catch (error) {
			console.error(error);
			toast.error("Failed to view version files.");
		} finally {
			setIsViewing(false);
		}
	};

	if (!artifact) return null;

	return (
		<div
			className={cn("border rounded-md overflow-hidden w-full max-w-full", {
				"border-brand": isCurrentVersion,
				"border-primary": isPreviewCurrent && !isCurrentVersion,
			})}
		>
			{/* Header */}
			<div className="flex items-center justify-between max-w-full gap-2 py-2 pl-2 pr-3 overflow-hidden">
				{/* Left Part */}
				<div className="flex items-center gap-1 overflow-hidden">
					<Button
						variant="ghost"
						className="!h-6 w-6 !p-0"
						onClick={() => setIsActionsVisible(!isActionsVisible)}
					>
						{isActionsVisible ? <ChevronDown /> : <ChevronRight />}
					</Button>
					<div className="pr-1 text-left truncate">
						<div className="text-sm font-medium truncate text-primary">
							{artifact.title}
						</div>
					</div>
				</div>
				{/* Right Part */}
				{isClosed && isSaving && !versionId && (
					<div className="text-sm text-muted-foreground">Saving...</div>
				)}
				{isClosed && versionId && (
					<div className="flex items-center gap-1">
						<div
							className={cn("text-sm text-muted-foreground whitespace-nowrap", {
								"text-brand font-medium": isCurrentVersion,
								"text-primary font-medium": isPreviewCurrent,
							})}
						>
							{isCurrentVersion
								? "Current"
								: isPreviewCurrent
									? "Preview"
									: `Version ${versionNumber}`}
						</div>
						<ChevronRight className="ml-2 size-3" />
						<div className="flex items-center gap-1">
							<Button
								disabled={isPreviewCurrent || isCurrentVersion}
								variant="ghost"
								className="h-6"
								size="sm"
								onClick={handleRestore}
							>
								{isRestoring ? "Restoring..." : "Restore"}
							</Button>
							<Button
								disabled={
									isPreviewCurrent ||
									(isCurrentVersion && !currentPreviewVersion)
								}
								variant="outline"
								className="h-6"
								size="sm"
								onClick={handlePreview}
							>
								{isViewing ? "Previewing..." : "Preview"}
							</Button>
						</div>
					</div>
				)}
				{!versionId && !isSaving && (
					<div className="text-sm text-muted-foreground">Unsaved</div>
				)}
			</div>

			<AnimatePresence initial={false}>
				{isActionsVisible && artifactActions.length > 0 && (
					<motion.div
						initial={{ height: 0 }}
						animate={{ height: "auto" }}
						exit={{ height: 0 }}
						className="overflow-hidden"
					>
						<div className="h-px bg-border" />
						<div className="px-3 py-2 bg-muted/50">
							<ActionList actions={artifactActions} />
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
