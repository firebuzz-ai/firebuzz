"use client";

import { cn } from "@firebuzz/ui/lib/utils";
import { getAttachmentType } from "@firebuzz/utils";
import type { Message as MessageType } from "ai";
import { motion } from "motion/react";
import Image from "next/image";
import { useAttachmentPreviewModal } from "@/hooks/ui/use-attachment-preview-modal";

// Helper type for attachments
export interface Attachment {
	name?: string;
	contentType?: string;
	url: string;
	size?: number;
}

interface AttachmentsProps {
	message: MessageType;
}

// Function to get attachments from message
export const getAttachments = (message: MessageType): Attachment[] => {
	// Check for experimental_attachments (fresh messages)
	if (
		message.experimental_attachments &&
		message.experimental_attachments.length > 0
	) {
		return message.experimental_attachments;
	}

	// Check for stored attachments from database
	// @ts-expect-error - attachments property doesn't exist on Message type but may be added at runtime from database
	if (message.attachments?.length > 0) {
		// @ts-expect-error - attachments property doesn't exist on Message type but may be added at runtime from database
		return message.attachments;
	}

	// @ts-expect-error - metadata.attachments property doesn't exist on Message type but may be added at runtime
	if (message.metadata?.attachments?.length > 0) {
		// @ts-expect-error - metadata.attachments property doesn't exist on Message type but may be added at runtime
		return message.metadata.attachments;
	}

	return [];
};

// Helper for styling based on attachment type
const getAttachmentTypeStyling = (extension: string | undefined) => {
	const ext = extension?.toLowerCase();
	switch (ext) {
		case "pdf":
			return {
				textColor: "text-red-700 dark:text-red-400",
				bgColor: "bg-red-100 dark:bg-red-900/50",
			};
		case "csv":
			return {
				textColor: "text-green-700 dark:text-green-400",
				bgColor: "bg-green-100 dark:bg-green-900/50",
			};
		case "html":
			return {
				textColor: "text-orange-700 dark:text-orange-400",
				bgColor: "bg-orange-100 dark:bg-orange-900/50",
			};
		case "docx":
			return {
				textColor: "text-indigo-700 dark:text-indigo-400",
				bgColor: "bg-indigo-100 dark:bg-indigo-900/50",
			};
		case "txt":
			return {
				textColor: "text-gray-700 dark:text-gray-400",
				bgColor: "bg-gray-200 dark:bg-gray-700/50",
			};
		case "md":
			return {
				textColor: "text-blue-700 dark:text-blue-400",
				bgColor: "bg-blue-100 dark:bg-blue-900/50",
			};
		default:
			return {
				textColor: "text-foreground/80",
				bgColor: "bg-muted/70",
			};
	}
};

export const Attachments = ({ message }: AttachmentsProps) => {
	const attachments = getAttachments(message);
	const [, setAttachmentState] = useAttachmentPreviewModal();
	const placement = "chat-attachment";

	if (attachments.length === 0) return null;

	return (
		<div className="mb-4">
			<div className="grid max-w-2xl grid-cols-5 gap-2">
				{attachments.map((attachment) => {
					const key = `${attachment.url.split(".com/")[1]}?messageId=${message.id}`;
					const isImage = attachment.contentType?.startsWith("image/");

					let fileExtensionDisplay = "FILE";
					let rawFileExtension: string | undefined;

					if (attachment.name) {
						const nameParts = attachment.name.split(".");
						if (nameParts.length > 1) {
							rawFileExtension = nameParts.pop()!.toLowerCase();
							fileExtensionDisplay = rawFileExtension.toUpperCase();
						}
					} else {
						const urlPath = attachment.url.split("?")[0];
						const urlSegments = urlPath.split("/");
						const lastUrlSegment = urlSegments.pop();
						if (lastUrlSegment) {
							const urlFileParts = lastUrlSegment.split(".");
							if (urlFileParts.length > 1) {
								rawFileExtension = urlFileParts.pop()!.toLowerCase();
								fileExtensionDisplay = rawFileExtension.toUpperCase();
							}
						}
					}

					if (!rawFileExtension && attachment.contentType) {
						const mimeSubtype = attachment.contentType.split("/")[1];
						if (mimeSubtype) {
							if (
								mimeSubtype ===
								"vnd.openxmlformats-officedocument.wordprocessingml.document"
							)
								rawFileExtension = "docx";
							else if (mimeSubtype === "plain") rawFileExtension = "txt";
							else if (
								mimeSubtype.length <= 4 &&
								/^[a-z0-9]+$/.test(mimeSubtype)
							)
								rawFileExtension = mimeSubtype;

							if (rawFileExtension)
								fileExtensionDisplay = rawFileExtension.toUpperCase();
						}
					}

					const typeStyling = getAttachmentTypeStyling(rawFileExtension);

					return (
						<motion.div
							className="cursor-pointer"
							key={key}
							onClick={() => {
								setAttachmentState({
									key,
									type: getAttachmentType(attachment.contentType ?? ""),
									placement,
								});
							}}
						>
							<div className="relative flex items-center justify-center w-full overflow-hidden border rounded-md aspect-square border-border">
								{isImage ? (
									<Image
										unoptimized
										src={attachment.url}
										alt={attachment.name ?? "Image"}
										fill
										className="object-cover object-center"
									/>
								) : (
									<div
										className={cn(
											"flex items-center justify-center w-full h-full",
											typeStyling.bgColor,
										)}
									>
										<span
											className={cn(
												"text-sm font-semibold",
												typeStyling.textColor,
											)}
										>
											{fileExtensionDisplay}
										</span>
									</div>
								)}
							</div>
							{attachment.name && (
								<p className="mt-1 text-xs truncate text-muted-foreground">
									{attachment.name}
								</p>
							)}
						</motion.div>
					);
				})}
			</div>
		</div>
	);
};
