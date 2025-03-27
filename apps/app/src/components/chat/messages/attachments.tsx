"use client";

import type { Message as MessageType } from "ai";
import Image from "next/image";

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
		return message.experimental_attachments.filter((attachment) =>
			attachment.contentType?.startsWith("image/"),
		);
	}

	// Check for stored attachments from database
	// @ts-ignore - attachments might be in metadata or directly on the message
	if (message.attachments?.length > 0) {
		// @ts-ignore
		return message.attachments;
	}

	// @ts-ignore - attachments might be in metadata
	if (message.metadata?.attachments?.length > 0) {
		// @ts-ignore
		return message.metadata.attachments;
	}

	return [];
};

export const Attachments = ({ message }: AttachmentsProps) => {
	const attachments = getAttachments(message);

	if (attachments.length === 0) return null;

	// Determine grid columns based on attachment count
	const getGridClass = (count: number) => {
		if (count === 1) return "grid-cols-2";
		if (count === 2) return "grid-cols-2";
		if (count === 3 || count === 4) return "grid-cols-2";
		return "grid-cols-3"; // 5 or more
	};

	return (
		<div className="mb-4">
			<div
				className={`grid gap-2 ${getGridClass(attachments.length)} max-w-2xl`}
			>
				{attachments.map((attachment, index) => (
					<div
						key={`${message.id}-attachment-${index}`}
						className={`${attachments.length === 1 ? "col-span-1" : attachments.length === 3 && index === 2 ? "col-span-2" : ""}`}
					>
						<div className="relative w-full aspect-square rounded-md overflow-hidden border border-border">
							<Image
								src={attachment.url}
								alt={attachment.name ?? `Image ${index + 1}`}
								fill
								className="object-cover object-center"
							/>
						</div>
						{attachment.name && (
							<p className="text-xs text-muted-foreground mt-1 truncate">
								{attachment.name}
							</p>
						)}
					</div>
				))}
			</div>
		</div>
	);
};
