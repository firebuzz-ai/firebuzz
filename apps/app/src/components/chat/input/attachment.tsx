import { attachmentsAtom } from "@/lib/workbench/atoms";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Loader2, X } from "@firebuzz/ui/icons/lucide";
import { useAtomValue } from "jotai";
import { motion } from "motion/react";

import { AnimatePresence } from "motion/react";
import Image from "next/image";

export const Attachment = ({
	isUploading,
	clearAttachments,
}: {
	isUploading: boolean;
	clearAttachments: () => void;
}) => {
	const attachments = useAtomValue(attachmentsAtom);

	return (
		<AnimatePresence>
			{isUploading && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 10 }}
					transition={{ duration: 0.2 }}
					className="px-4 pb-2"
				>
					<div className="flex items-center gap-2 p-2 bg-secondary/20 rounded-md">
						<div className="w-16 h-16 flex items-center justify-center rounded-md border border-border">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
						<div className="flex-1">
							<p className="text-sm font-medium">Uploading image...</p>
							<p className="text-xs text-muted-foreground">Please wait</p>
						</div>
					</div>
				</motion.div>
			)}

			{!isUploading && attachments && attachments.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 10 }}
					transition={{ duration: 0.2 }}
					className="px-4 pb-2"
				>
					<div className="flex items-center gap-2 p-2 bg-secondary/20 rounded-md">
						<div className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
							<Image
								src={attachments[0].url}
								alt={attachments[0].name}
								fill
								className="object-cover"
							/>
						</div>
						<div className="flex-1">
							<p className="text-sm font-medium truncate">
								{attachments[0].name}
							</p>
							<p className="text-xs text-muted-foreground">
								{(attachments[0].size / 1024).toFixed(1)} KB
							</p>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => {
								clearAttachments();
							}}
							className="h-8 w-8"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
