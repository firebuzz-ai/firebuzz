import { PDFViewer } from "@/app/(workspace)/(dashboard)/storage/documents/_components/modals/pdf-viewer";
import { useAttachmentPreviewModal } from "@/hooks/ui/use-attachment-preview-modal";
import { envCloudflarePublic } from "@firebuzz/env";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button, buttonVariants } from "@firebuzz/ui/components/ui/button";
import { ExternalLink, EyeOff, X } from "@firebuzz/ui/icons/lucide";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useHotkeys } from "react-hotkeys-hook";

const MediaRenderer = ({
	mediaUrl,
	mediaType,
}: {
	mediaUrl: string;
	mediaType:
		| "image"
		| "video"
		| "audio"
		| "pdf"
		| "csv"
		| "md"
		| "html"
		| "txt"
		| "docx"
		| "json"
		| "unknown";
}) => {
	if (mediaType === "image") {
		return (
			<Image
				unoptimized
				src={mediaUrl}
				alt="Media content"
				fill
				sizes="(max-width: 1200px) 100vw"
				className="object-contain"
				priority={true}
			/>
		);
	}

	if (mediaType.startsWith("video")) {
		return (
			<video
				src={mediaUrl}
				controls
				className="object-contain w-full h-full"
				autoPlay
			>
				<track kind="captions" label="English" />
				Your browser does not support the video tag.
			</video>
		);
	}

	if (mediaType.startsWith("audio")) {
		return (
			<div className="flex flex-col items-center justify-center w-full h-full">
				<div className="p-8 mb-4 bg-accent rounded-xl">
					<svg
						width="64"
						height="64"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M9 18V5l12-2v13" />
						<circle cx="6" cy="18" r="3" />
						<circle cx="18" cy="16" r="3" />
					</svg>
				</div>
				<audio src={mediaUrl} controls className="w-3/4 max-w-md" autoPlay>
					<track kind="captions" label="English" />
					Your browser does not support the audio tag.
				</audio>
			</div>
		);
	}

	if (mediaType === "pdf") {
		return (
			<div className="w-full h-full p-10">
				<PDFViewer src={mediaUrl} />
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-center w-full h-full bg-muted/30">
			<div className="flex items-center justify-center p-4 mb-4 border rounded-full bg-muted">
				<EyeOff className="size-8 animate-pulse" />
			</div>
			<div className="mb-6 text-center">
				<p className="text-lg font-bold">Preview Not Available</p>
				<div className="max-w-sm mt-1 text-sm">
					Direct preview for{" "}
					<Badge variant="outline" className="uppercase">
						{mediaType}
					</Badge>{" "}
					files is not currently supported.
				</div>
			</div>
			<a
				href={mediaUrl}
				target="_blank"
				rel="noopener noreferrer"
				className={buttonVariants({ variant: "outline", size: "sm" })}
			>
				Open in New Tab <ExternalLink className="size-4" />
			</a>
		</div>
	);
};

export const AttachmentPreviewModal = () => {
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
	const [{ key, type }, setAttachmentState] = useAttachmentPreviewModal();

	const handleClose = () => {
		setAttachmentState(null);
	};

	useHotkeys("esc", handleClose);

	return (
		<AnimatePresence initial={false}>
			{key && type && (
				<motion.div
					layout
					className="fixed inset-0 z-50 bg-background/95"
					onClick={handleClose}
				>
					<motion.div
						layout
						className="container flex items-center justify-center h-full max-w-7xl"
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.9, y: 10 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.9, y: 10 }}
							transition={{
								duration: 0.2,
								ease: "easeOut",
							}}
							className="flex bg-background border border-border rounded-lg shadow-lg overflow-hidden h-full max-h-[90vh] w-full relative"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Close button */}
							<Button
								variant="ghost"
								size="icon"
								className="absolute z-10 top-2 right-2"
								onClick={handleClose}
							>
								<X />
							</Button>
							<div className="relative flex-1 p-2">
								<MediaRenderer
									mediaUrl={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`}
									mediaType={type}
								/>
							</div>
						</motion.div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};
