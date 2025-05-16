import { useAttachmentPreviewModal } from "@/hooks/ui/use-attachment-preview-modal";
import { attachmentsAtom } from "@/lib/workbench/atoms";
import { Button } from "@firebuzz/ui/components/ui/button";
import { FileAudio, FileText, FileVideo, X } from "@firebuzz/ui/icons/lucide";
import { getAttachmentType } from "@firebuzz/utils";
import { useAtom } from "jotai";
import { motion } from "motion/react";

import { AnimatePresence } from "motion/react";
import Image from "next/image";

export const Attachment = ({
	clearAttachments,
}: {
	clearAttachments: () => void;
}) => {
	const [, setAttachmentState] = useAttachmentPreviewModal();
	const [attachments, setAttachments] = useAtom(attachmentsAtom);

	const removeAttachment = (index: number) => {
		if (attachments) {
			// If there is only one attachment, clear the attachment state
			if (attachments.length === 1) {
				console.log("clearing attachments");
				clearAttachments();
			}

			setAttachments((prev) =>
				prev ? prev.filter((_, i) => i !== index) : [],
			);
		}
	};

	if (!attachments || attachments.length === 0) {
		return null;
	}

	return (
		<AnimatePresence>
			{attachments && attachments.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 10 }}
					transition={{ duration: 0.2 }}
					className="px-4 pb-2"
				>
					<div className="relative px-4 py-2 border rounded-md bg-secondary/20">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => {
								clearAttachments();
							}}
							className="absolute top-2 right-2"
						>
							<X className="size-3" />
						</Button>
						<div className="flex flex-wrap gap-2">
							{attachments.map((attachment, index) => {
								const key = attachment.url.split(".com/")[1];
								const placement = "chat-input";
								return (
									<div key={key} className="relative group max-w-12">
										<motion.div
											key={`media-${key}-item`}
											initial={{ opacity: 0, y: 10 + index * 10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: 10 + index * 10 }}
											transition={{ duration: 0.2 }}
											layoutId={`media-${key}-${placement}`}
											onClick={() => {
												setAttachmentState({
													key,
													type: getAttachmentType(attachment.contentType),
													placement,
												});
											}}
											className="relative overflow-hidden truncate border rounded-md cursor-pointer aspect-square size-10 border-border"
										>
											{getAttachmentType(attachment.contentType) === "image" ? (
												<Image
													src={attachment.url}
													alt={attachment.name}
													fill
													className="object-cover"
												/>
											) : getAttachmentType(attachment.contentType) ===
												"video" ? (
												<div className="flex items-center justify-center w-full h-full bg-background-subtle">
													<FileVideo className="size-4 text-muted-foreground" />
												</div>
											) : getAttachmentType(attachment.contentType) ===
												"audio" ? (
												<div className="flex items-center justify-center w-full h-full bg-background-subtle">
													<FileAudio className="size-4 text-muted-foreground" />
												</div>
											) : (
												<div className="flex flex-col items-center justify-center w-full h-full gap-2 bg-background-subtle">
													<FileText className="size-4 text-muted-foreground" />
												</div>
											)}
											{/* Overlay on Hover */}
											<div className="absolute inset-0 transition-opacity duration-200 opacity-0 bg-black/50 group-hover:opacity-100">
												<Button
													variant="ghost"
													size="iconSm"
													className="absolute p-0 rounded-full -top-2 -right-2"
													onClick={(e) => {
														e.stopPropagation();
														removeAttachment(index);
													}}
												>
													<X className="size-2" />
												</Button>
											</div>
										</motion.div>
										{/* File Name */}
										<div className="text-xs font-medium truncate text-muted-foreground">
											{attachment.name}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
