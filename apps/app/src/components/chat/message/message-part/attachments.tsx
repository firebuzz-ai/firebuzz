"use client";

import { envCloudflarePublic } from "@firebuzz/env";
import { cn } from "@firebuzz/ui/lib/utils";
import { getAttachmentType } from "@firebuzz/utils";
import type { FileUIPart } from "ai";
import { motion } from "motion/react";
import Image from "next/image";
import { useAttachmentPreviewModal } from "@/hooks/ui/use-attachment-preview-modal";

// Helper type for attachments from message content

interface AttachmentsProps {
	part: FileUIPart;
}

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

export const MessageAttachments = ({ part }: AttachmentsProps) => {
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
	const [, setAttachmentState] = useAttachmentPreviewModal();
	const placement = "chat-attachment";

	const key = part.url.split(`${NEXT_PUBLIC_R2_PUBLIC_URL}/`)[1] || part.url;
	const mediaType = part.mediaType || "";
	const isImage = mediaType.startsWith("image/");

	// Render as image
	if (isImage) {
		return (
			<div
				className="flex-shrink-0 w-32 cursor-pointer snap-start"
				onClick={() => {
					setAttachmentState({
						key,
						type: "image",
						placement,
					});
				}}
			>
				<div className="flex overflow-hidden relative justify-center items-center w-full rounded-md border aspect-square border-border">
					<Image
						unoptimized
						src={part.url}
						alt="Image attachment"
						fill
						className="object-cover object-center"
					/>
				</div>
			</div>
		);
	}

	// Render as document
	const fileName = part.filename || part.url.split("/").pop() || "document";
	const nameParts = fileName.split(".");
	let rawFileExtension: string | undefined;
	let fileExtensionDisplay = "FILE";

	if (nameParts.length > 1) {
		rawFileExtension = nameParts.pop()!.toLowerCase();
		fileExtensionDisplay = rawFileExtension.toUpperCase();
	}

	const typeStyling = getAttachmentTypeStyling(rawFileExtension);

	return (
		<motion.div className="flex flex-col flex-shrink-0 w-32 cursor-pointer snap-start">
			<div
				className="flex overflow-hidden relative justify-center items-center w-full rounded-md border aspect-square border-border"
				onClick={() => {
					setAttachmentState({
						key,
						type: getAttachmentType(
							mediaType || `application/${rawFileExtension}`,
						),
						placement,
					});
				}}
			>
				<div
					className={cn(
						"flex items-center justify-center w-full h-full",
						typeStyling.bgColor,
					)}
				>
					<span className={cn("text-sm font-semibold", typeStyling.textColor)}>
						{fileExtensionDisplay}
					</span>
				</div>
			</div>
			<p className="mt-1 text-xs truncate text-muted-foreground">{fileName}</p>
		</motion.div>
	);
};
