"use client";
import { DocumentsSelectorModal } from "@/components/modals/documents/selector/modal";
import { AIImageModal } from "@/components/modals/media/ai-image/ai-image-modal";
import { MediaGalleryModal } from "@/components/modals/media/gallery/gallery-modal";
import { useSubscription } from "@/hooks/auth/use-subscription";
import {
	attachmentsAtom,
	isElementSelectionEnabledAtom,
	isPreviewVersionDifferentAtom,
	selectedElementAtom,
} from "@/lib/workbench/atoms";
import { Button, ButtonShortcut } from "@firebuzz/ui/components/ui/button";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import { ChevronRight, Plus } from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import type { ChatRequestOptions, CreateMessage, Message } from "ai";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence } from "motion/react";
import { memo, useCallback, useRef, useState } from "react";
import { ActionErrors } from "./action-errors";
import { Attachment } from "./attachment";
import { AttachmentButton } from "./attachment-button";
import { Errors } from "./errors";
import { SelectedElement } from "./selected-element";
import { VersionWarning } from "./version-warning";

export const ChatInput = memo(
	({
		append,
	}: {
		append: (
			message: Message | CreateMessage,
			chatRequestOptions?: ChatRequestOptions,
		) => Promise<string | null | undefined>;
	}) => {
		const { creditBalance } = useSubscription();
		const selectedElement = useAtomValue(selectedElementAtom);
		const [isSending, setIsSending] = useState(false);

		const [inputValue, setInputValue] = useState("");
		const [showShakeAnimation, setShowShakeAnimation] = useState(false);
		const [attachments, setAttachments] = useAtom(attachmentsAtom);
		const fileInputRef = useRef<HTMLInputElement>(null);
		const isPreviewVersionDifferent = useAtomValue(
			isPreviewVersionDifferentAtom,
		);

		const setIsElementSelectionEnabled = useSetAtom(
			isElementSelectionEnabledAtom,
		);
		const setSelectedElement = useSetAtom(selectedElementAtom);

		const onSubmit = useCallback(
			async (message: string) => {
				const experimentalAttachments =
					attachments && attachments.length > 0
						? attachments.map((attachment) => ({
								name: attachment.name,
								url: attachment.url,
								contentType: attachment.contentType,
								id: attachment.id,
							}))
						: undefined;

				// Let the useChat hook handle messages state management
				await append(
					{
						role: "user",
						content: message,
					},
					{
						experimental_attachments: experimentalAttachments,
					},
				);
			},
			[append, attachments],
		);

		const clearAttachments = useCallback(() => {
			setAttachments([]);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}, [setAttachments]);

		const clearStates = useCallback(() => {
			setInputValue("");
			clearAttachments();
			setSelectedElement(null);
			setIsElementSelectionEnabled(false);
		}, [setSelectedElement, setIsElementSelectionEnabled, clearAttachments]);

		const handleSubmit = useCallback(
			async (message: string) => {
				if (
					(!message.trim() && attachments && attachments.length === 0) ||
					isSending
				)
					return;

				if (creditBalance <= 0) {
					toast.error("You don't have enough credits to send a message");
					return;
				}

				// Don't allow sending if there's a version mismatch
				if (
					isPreviewVersionDifferent &&
					(message.trim() || (attachments && attachments.length > 0))
				) {
					setShowShakeAnimation(true);
					// Reset shake animation after a delay
					setTimeout(() => setShowShakeAnimation(false), 600);
					return;
				}

				setIsSending(true);
				clearStates();

				try {
					if (selectedElement) {
						// If there's a selected element, attach it to the message
						const messageWithElement = JSON.stringify({
							type: "element-reference",
							message,
							element: selectedElement,
						});
						await onSubmit(messageWithElement);
					} else {
						// Otherwise just send the regular message
						await onSubmit(message);
					}
				} catch (error) {
					console.error("Failed to send message:", error);
				} finally {
					setIsSending(false);
				}
			},
			[
				onSubmit,
				selectedElement,
				isSending,
				isPreviewVersionDifferent,
				attachments,
				clearStates,
				creditBalance,
			],
		);

		return (
			<AnimatePresence>
				<div className="relative w-full max-w-4xl mx-auto bg-transparent">
					<Errors onSubmit={onSubmit} />
					<ActionErrors onSubmit={onSubmit} />
					<SelectedElement />
					<VersionWarning inputValue={inputValue} shake={showShakeAnimation} />
					<Attachment clearAttachments={clearAttachments} />

					<div className="relative px-4 pb-4">
						<Textarea
							className="w-full bg-background-subtle bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary/10 resize-none pb-16 max-h-[200px] overflow-y-auto"
							placeholder={
								isSending ? "Sending..." : "Type your message here..."
							}
							rows={2}
							value={inputValue}
							onChange={(e) => {
								setInputValue(e.target.value);
								// Auto-resize textarea up to max-height
								e.target.style.height = "auto";
								const newHeight = Math.min(e.target.scrollHeight, 200);
								e.target.style.height = `${newHeight}px`;
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSubmit(inputValue);
								}
							}}
							disabled={isSending}
						/>

						{/* New line button */}
						<div className="flex items-center gap-0.5 absolute bottom-6 left-6 text-xs text-muted-foreground">
							<span className="font-medium bg-muted border shadow-sm rounded-md py-0.5 px-1.5">
								Shift
							</span>{" "}
							<Plus className="size-3" />
							<span className="font-medium bg-muted border shadow-sm rounded-md py-0.5 px-1.5">
								Enter
							</span>
							<ChevronRight className="size-3" />
							<span>New Line</span>
						</div>

						{/* Send and Upload buttons */}
						<div className="absolute flex gap-2 text-xs bottom-6 right-6 text-muted-foreground">
							<AttachmentButton />
							<Button
								disabled={isSending}
								onClick={() => handleSubmit(inputValue)}
								size="sm"
								variant="outline"
							>
								Send <ButtonShortcut>Enter</ButtonShortcut>
							</Button>
						</div>

						{/* Modals */}
						<MediaGalleryModal />
						<DocumentsSelectorModal />
						<AIImageModal />
					</div>
				</div>
			</AnimatePresence>
		);
	},
);
