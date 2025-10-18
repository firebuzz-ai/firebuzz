"use client";

import { useAttachmentPreviewModal } from "@/hooks/ui/use-attachment-preview-modal";
import type { ToolSet } from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { GeminiIcon } from "@firebuzz/ui/icons/ai-providers";
import { Paintbrush } from "@firebuzz/ui/icons/lucide";
import type { UIToolInvocation } from "ai";
import Image from "next/image";
import { useMemo } from "react";

interface EditImageProps {
	part: UIToolInvocation<ToolSet["editImage"]>;
}

export const EditImage = ({ part }: EditImageProps) => {
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
	const [, setAttachmentState] = useAttachmentPreviewModal();

	const status = useMemo(() => {
		if (part.state === "input-available" || part.state === "input-streaming") {
			return "loading";
		}

		if (part.state === "output-available" && part.output?.success) {
			return "success";
		}

		return "error";
	}, [part.state, part.output]);

	const isLoading = status === "loading" || !part.output;
	const hasOutput = part.output?.success && part.output.cdnUrl;
	const hasError = status === "error" && part.output;

	// Get model and credits info
	const model = part.output?.model || "Google Gemini";
	const credits = part.output?.credits;

	// Extract key from CDN URL for preview modal
	const key = part.output?.cdnUrl
		? part.output.cdnUrl.split(`${NEXT_PUBLIC_R2_PUBLIC_URL}/`)[1] ||
			part.output.cdnUrl
		: "";

	return (
		<div className="flex flex-col gap-2 w-full group/tool">
			{/* Header */}
			<div className="flex gap-4 justify-between items-center text-xs text-muted-foreground">
				{/* Left: Tool name and icon */}
				<div className="flex gap-2 items-center">
					{status === "success" && (
						<div className="bg-emerald-600 rounded-[2px] size-2" />
					)}
					{status === "error" && (
						<div className="bg-red-600 rounded-[2px] size-2" />
					)}
					{isLoading && (
						<Paintbrush className="w-3 h-3 text-blue-500 animate-pulse" />
					)}
					<span className="text-xs font-medium">Edit Image</span>
				</div>

				{/* Right: Model and credits (visible on hover) */}
				<div className="flex flex-row gap-2 items-center opacity-0 transition-opacity duration-150 ease-in-out group-hover/tool:opacity-100">
					<div className="flex gap-1 items-center text-xs font-medium text-muted-foreground">
						<div className="p-1 rounded-sm border bg-muted">
							<div className="size-3">
								<GeminiIcon />
							</div>
						</div>
						<div className="text-muted-foreground">{model}</div>
					</div>
					{credits && (
						<>
							<div className="rounded-[2px] size-2 bg-brand/10 border-brand border" />
							<span className="text-xs text-muted-foreground">
								{credits} credits
							</span>
						</>
					)}
				</div>
			</div>

			{/* Content: Loading or Image */}
			{isLoading && (
				<div className="flex overflow-hidden relative justify-center items-center w-full rounded-md border animate-pulse aspect-square border-border bg-muted">
					<Paintbrush className="w-8 h-8 text-blue-500 animate-pulse" />
				</div>
			)}

			{hasOutput && part.output?.cdnUrl && (
				<div
					className="flex-shrink-0 w-full cursor-pointer"
					onClick={() => {
						setAttachmentState({
							key,
							type: "image",
							placement: "chat-attachment",
						});
					}}
				>
					<div className="flex overflow-hidden relative justify-center items-center w-full rounded-md border transition-colors aspect-square border-border hover:border-brand/50">
						<Image
							unoptimized
							src={part.output.cdnUrl as string}
							alt="Edited image"
							fill
							className="object-cover object-center"
						/>
					</div>
				</div>
			)}

			{hasError && part.output?.error && (
				<span className="text-xs text-destructive">
					{part.output.error.message}
				</span>
			)}
		</div>
	);
};
