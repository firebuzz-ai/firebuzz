"use client";

import { useAgentSession } from "@/hooks/agent/use-agent-session";
import { useLandingChat } from "@/hooks/agent/use-landing-chat";
import { useProject } from "@/hooks/auth/use-project";
import { useDocumentsSelectorModal } from "@/hooks/ui/use-documents-selector-modal";
import { useMediaGalleryModal } from "@/hooks/ui/use-media-gallery-modal";
import {
	api,
	useCachedQuery,
	useMutation,
	useUploadFile,
} from "@firebuzz/convex";
import type { Id } from "@firebuzz/convex/nextjs";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@firebuzz/ui/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "@firebuzz/ui/components/ui/input-group";
import { ScrollArea } from "@firebuzz/ui/components/ui/scroll-area";
import { Switch } from "@firebuzz/ui/components/ui/switch";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	IconArrowUp,
	IconBook,
	IconFile,
	IconPhoto,
	IconPlayerPause,
	IconPlus,
	IconUpload,
} from "@firebuzz/ui/icons/tabler";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { isMediaFile } from "@firebuzz/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { type Accept, type FileRejection, useDropzone } from "react-dropzone";
import { MODEL_CONFIG } from "../models";
import { AttachmentPreview } from "./attachment-preview";

interface ChatInputProps {
	landingPageId: Id<"landingPages">;
}

// Sanitize user input by escaping HTML entities
const sanitizeUserInput = (input: string): string => {
	return input
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
};

export const ChatInput = ({ landingPageId }: ChatInputProps) => {
	const {
		sendMessage,
		chatStatus,
		abortStream,
		availableKnowledgeBases,
		selectedKnowledgeBases,
		updateKnowledgeBases,
		model,
		updateModelMutation,
		attachments,
		addAttachment,
		removeAttachment,
	} = useLandingChat({ landingPageId });

	const { session } = useAgentSession();
	const { currentProject } = useProject();
	const { setState: setGalleryModalState } = useMediaGalleryModal();
	const { setState: setDocumentsModalState } = useDocumentsSelectorModal();

	const [inputValue, setInputValue] = useState("");
	const [filesMenuOpen, setFilesMenuOpen] = useState(false);
	const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
	const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
	const [isUploading, setIsUploading] = useState(false);

	const uploadFile = useUploadFile(api.components.r2);
	const createMedia = useMutation(
		api.collections.storage.media.mutations.create,
	);
	const createDocument = useMutation(
		api.collections.storage.documents.mutations.create,
	);

	const totalSize = useCachedQuery(
		api.collections.storage.media.queries.getTotalSize,
		currentProject ? { projectId: currentProject._id } : "skip",
	);

	// Constants
	const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
	const MAX_STORAGE = 1024 * 1024 * 1024; // 1GB
	const MAX_FILES = 5;

	const selectedModelConfig = model
		? MODEL_CONFIG[model]
		: MODEL_CONFIG["claude-sonnet-4.5"];
	const isDisabled = chatStatus !== "ready" && chatStatus !== "error";
	const isStreaming = chatStatus === "streaming";

	const openMediaModal = (activeTab: "gallery" | "upload") => {
		setGalleryModalState((prev) => ({
			...prev,
			allowedTypes: ["image"],
			allowMultiple: true,
			maxFiles: 5,
			activeTab: activeTab,
			onSelect: (data) => {
				for (const item of data) {
					addAttachment({
						type: "media",
						id: item.id as Id<"media">,
					});
				}
				setFilesMenuOpen(false);
			},
			isOpen: true,
		}));
	};

	const openDocumentsModal = () => {
		setDocumentsModalState((prev) => ({
			...prev,
			allowedTypes: ["pdf"],
			allowMultiple: true,
			maxFiles: 5,
			activeTab: "documents",
			onSelect: (data) => {
				for (const item of data) {
					addAttachment({
						type: "document",
						id: item.id as Id<"documents">,
					});
				}
				setFilesMenuOpen(false);
			},
			isOpen: true,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inputValue.trim() || isDisabled) return;

		const sanitizedInput = sanitizeUserInput(inputValue);
		await sendMessage(sanitizedInput);
		setInputValue("");
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	const handleAbort = async () => {
		await abortStream();
	};

	const systemKnowledgeBase = availableKnowledgeBases?.find(
		(kb) => kb.isSystem,
	);
	const nonSystemKnowledgeBases =
		availableKnowledgeBases?.filter((kb) => !kb.isSystem) || [];

	const handleKnowledgeBaseToggle = async (
		kbId: Id<"knowledgeBases">,
		checked: boolean,
	) => {
		if (!session?._id) return;

		const currentIds = selectedKnowledgeBases
			?.map((kb) => kb?._id)
			.filter(Boolean) as Id<"knowledgeBases">[];
		const newKnowledgeBases = checked
			? [...currentIds, kbId]
			: currentIds.filter((id) => id !== kbId);

		await updateKnowledgeBases({
			sessionId: session._id,
			knowledgeBases: newKnowledgeBases,
		});
	};

	const handleModelChange = async (modelKey: keyof typeof MODEL_CONFIG) => {
		if (!session?._id) return;

		await updateModelMutation({
			sessionId: session._id,
			model: modelKey,
		});
	};

	// Drag & Drop handlers
	const generateAcceptTypes = (): Accept => {
		return {
			"image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
			"application/pdf": [".pdf"],
		};
	};

	const onDrop = async (acceptedFiles: File[]) => {
		if (!currentProject) return;

		// Check if adding these files would exceed max files
		const totalFiles = attachments.length + acceptedFiles.length;
		if (totalFiles > MAX_FILES) {
			toast.error(
				`You can only attach up to ${MAX_FILES} files. Please remove some attachments first.`,
			);
			return;
		}

		// Check storage limits
		const usedStorage = totalSize ?? 0;
		const totalUploadSize = acceptedFiles.reduce(
			(acc, file) => acc + file.size,
			0,
		);

		if (usedStorage + totalUploadSize > MAX_STORAGE) {
			toast.error("Not enough storage space.", {
				description: "You do not have enough storage to upload these files.",
			});
			return;
		}

		setIsUploading(true);

		// Upload files one by one
		for (const file of acceptedFiles) {
			try {
				const key = await uploadFile(file);
				const isMedia = isMediaFile(file);

				if (isMedia) {
					// Upload as media (image)
					const mediaId = await createMedia({
						key,
						name: file.name,
						type: "image",
						contentType: file.type,
						size: file.size,
						source: "uploaded",
					});

					addAttachment({
						type: "media",
						id: mediaId,
					});
				} else {
					// Upload as document (PDF)
					const documentId = await createDocument({
						key,
						name: file.name,
						type: "pdf",
						contentType: file.type,
						size: file.size,
					});

					addAttachment({
						type: "document",
						id: documentId,
					});
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: `Failed to upload ${file.name}`;
				toast.error(errorMessage);
			}
		}

		setIsUploading(false);
		toast.success(
			`${acceptedFiles.length} file${acceptedFiles.length > 1 ? "s" : ""} uploaded successfully!`,
		);
	};

	const onDropRejected = (fileRejections: FileRejection[]) => {
		for (const fileRejection of fileRejections) {
			const message = fileRejection.errors[0]?.message ?? "Unknown error";
			const fileName = fileRejection.file.name;

			if (message.includes("Too many files")) {
				toast.error(
					`Cannot add ${fileName}: Exceeds max file limit of ${MAX_FILES}.`,
				);
			} else if (message.includes("File is larger than")) {
				toast.error(`Cannot add ${fileName}: Exceeds 50MB size limit.`);
			} else if (message.includes("File type must be one of")) {
				toast.error(
					`Cannot add ${fileName}: Only images and PDF files are allowed.`,
				);
			} else {
				toast.error(`Cannot add ${fileName}: ${message}`);
			}
		}
	};

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		onDropRejected,
		accept: generateAcceptTypes(),
		maxSize: MAX_FILE_SIZE,
		maxFiles: MAX_FILES - attachments.length, // Only allow remaining files
		multiple: true,
		noClick: true,
		noKeyboard: true,
		disabled: isDisabled || isUploading,
	});

	return (
		<div {...getRootProps()} className="relative">
			<input {...getInputProps()} />

			{/* Drag Overlay */}
			<AnimatePresence>
				{isDragActive && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="flex absolute inset-0 z-50 justify-center items-center rounded-lg border-2 border backdrop-blur-sm bg-background/95 pointer-events-none"
					>
						<div className="flex flex-col gap-3 items-center">
							<div className="flex justify-center items-center p-2 rounded-full border bg-muted">
								<IconUpload className="animate-bounce size-4 text-primary" />
							</div>
							<div className="text-center">
								<p className="text-base font-semibold text-foreground">
									Drop files here
								</p>
								<p className="text-xs text-muted-foreground">
									Images and PDFs only (max {MAX_FILES - attachments.length}{" "}
									files)
								</p>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<form onSubmit={handleSubmit}>
				<Field>
					<FieldLabel htmlFor="chat-prompt" className="sr-only">
						Prompt
					</FieldLabel>
					<InputGroup>
					<InputGroupTextarea
						id="chat-prompt"
						placeholder={
							isUploading ? "Uploading files..." : "Ask me anything..."
						}
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						disabled={isDisabled || isUploading}
					/>
					<InputGroupAddon align="block-start">
						<DropdownMenu open={filesMenuOpen} onOpenChange={setFilesMenuOpen}>
							<Tooltip>
								<TooltipTrigger
									asChild
									onFocusCapture={(e) => e.stopPropagation()}
								>
									<DropdownMenuTrigger asChild>
										<InputGroupButton
											variant="outline"
											size="sm"
											className="rounded-full"
										>
											<IconPlus /> Add
										</InputGroupButton>
									</DropdownMenuTrigger>
								</TooltipTrigger>
								<TooltipContent>Add files to your message</TooltipContent>
							</Tooltip>
							<DropdownMenuContent
								align="start"
								side="top"
								className="[--radius:1rem]"
							>
								<DropdownMenuGroup>
									<DropdownMenuLabel className="text-xs text-muted-foreground">
										Files
									</DropdownMenuLabel>
									<DropdownMenuItem
										onClick={(e) => {
											e.preventDefault();
											openMediaModal("upload");
										}}
									>
										<IconUpload className="mr-2 size-4" />
										Upload Images
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={(e) => {
											e.preventDefault();
											openMediaModal("gallery");
										}}
									>
										<IconPhoto className="mr-2 size-4" />
										Gallery
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={(e) => {
											e.preventDefault();
											openDocumentsModal();
										}}
									>
										<IconFile className="mr-2 size-4" />
										Documents
									</DropdownMenuItem>
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
						<div className="no-scrollbar -m-1.5 flex gap-1 overflow-y-auto p-1.5">
							{attachments.map((attachment) => (
								<AttachmentPreview
									key={`${attachment.type}-${attachment.id}`}
									attachment={attachment}
									onRemove={() => removeAttachment(attachment)}
								/>
							))}
						</div>
					</InputGroupAddon>
					<InputGroupAddon align="block-end" className="gap-1">
						<DropdownMenu
							open={modelPopoverOpen}
							onOpenChange={setModelPopoverOpen}
						>
							<Tooltip>
								<TooltipTrigger asChild>
									<DropdownMenuTrigger asChild>
										<InputGroupButton
											size="sm"
											className="rounded-full gap-1.5"
										>
											<span className="size-3.5">
												{<selectedModelConfig.icon />}
											</span>
											{selectedModelConfig.name}
										</InputGroupButton>
									</DropdownMenuTrigger>
								</TooltipTrigger>
								<TooltipContent>Select AI model</TooltipContent>
							</Tooltip>
							<DropdownMenuContent
								side="top"
								align="start"
								className="[--radius:1rem] overflow-hidden "
							>
								<DropdownMenuGroup className="w-48">
									<DropdownMenuLabel className="text-xs text-muted-foreground">
										Select AI Model
									</DropdownMenuLabel>
									<ScrollArea className="h-[200px]">
										{Object.entries(MODEL_CONFIG).map(([key, modelData]) => {
											const ModelIcon = modelData.icon;
											const isSelected = model === key;
											return (
												<DropdownMenuCheckboxItem
													key={key}
													checked={isSelected}
													onCheckedChange={(checked) => {
														if (checked) {
															handleModelChange(
																key as keyof typeof MODEL_CONFIG,
															);
														}
													}}
													className={cn(
														"gap-2 pl-2",
														isSelected && "first:*:hidden",
														!isSelected && "opacity-50",
													)}
												>
													<div className="p-1 rounded-sm border bg-muted">
														<div className="size-4">
															<ModelIcon />
														</div>
													</div>

													<div className="flex flex-col">
														<span className="text-sm font-medium">
															{modelData.name}
														</span>
														<span className="text-xs text-muted-foreground">
															{modelData.provider}
														</span>
													</div>
												</DropdownMenuCheckboxItem>
											);
										})}
									</ScrollArea>
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
						<DropdownMenu open={scopeMenuOpen} onOpenChange={setScopeMenuOpen}>
							<DropdownMenuTrigger asChild>
								<InputGroupButton size="sm" className="rounded-full">
									<IconBook /> Knowledge Bases
								</InputGroupButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								side="top"
								align="end"
								className="[--radius:1rem]"
							>
								<DropdownMenuGroup>
									<DropdownMenuLabel className="text-xs text-muted-foreground">
										Knowledge Bases
									</DropdownMenuLabel>
									{systemKnowledgeBase && (
										<DropdownMenuItem
											asChild
											onSelect={(e) => e.preventDefault()}
										>
											<label htmlFor={`kb-${systemKnowledgeBase._id}`}>
												<IconBook /> {systemKnowledgeBase.name} (System)
												<Switch
													id={`kb-${systemKnowledgeBase._id}`}
													className="ml-auto"
													checked
													disabled
												/>
											</label>
										</DropdownMenuItem>
									)}
									{nonSystemKnowledgeBases.map((kb) => {
										const isSelected = selectedKnowledgeBases?.some(
											(selected) => selected?._id === kb._id,
										);
										return (
											<DropdownMenuItem
												key={kb._id}
												asChild
												onSelect={(e) => e.preventDefault()}
											>
												<label htmlFor={`kb-${kb._id}`}>
													<IconBook /> {kb.name}
													<Switch
														id={`kb-${kb._id}`}
														className="ml-auto"
														checked={isSelected}
														onCheckedChange={(checked) =>
															handleKnowledgeBaseToggle(kb._id, checked)
														}
													/>
												</label>
											</DropdownMenuItem>
										);
									})}
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
						{isStreaming ? (
							<InputGroupButton
								type="button"
								aria-label="Pause"
								className="ml-auto rounded-lg"
								size="icon-sm"
								onClick={handleAbort}
							>
								<IconPlayerPause />
							</InputGroupButton>
						) : (
							<InputGroupButton
								type="submit"
								aria-label="Send"
								className="ml-auto rounded-lg"
								variant="default"
								size="icon-sm"
								disabled={isDisabled || !inputValue.trim()}
							>
								<IconArrowUp />
							</InputGroupButton>
						)}
					</InputGroupAddon>
				</InputGroup>
			</Field>
		</form>
		</div>
	);
};
