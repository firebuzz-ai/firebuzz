"use client";

import { useCachedQuery } from "@firebuzz/convex";
import { api } from "@firebuzz/convex/nextjs";
import type { Id } from "@firebuzz/convex/nextjs";
import { envCloudflarePublic } from "@firebuzz/env";
import { InputGroupButton } from "@firebuzz/ui/components/ui/input-group";
import { IconFile, IconX } from "@firebuzz/ui/icons/tabler";
import Image from "next/image";

interface AttachmentPreviewProps {
	attachment: { type: "media" | "document"; id: Id<"media"> | Id<"documents"> };
	onRemove: () => void;
}

export const AttachmentPreview = ({
	attachment,
	onRemove,
}: AttachmentPreviewProps) => {
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

	// Call hooks unconditionally, using "skip" for the one we don't need
	const media = useCachedQuery(
		api.collections.storage.media.queries.getById,
		attachment.type === "media"
			? { id: attachment.id as Id<"media"> }
			: "skip",
	);

	const document = useCachedQuery(
		api.collections.storage.documents.queries.getById,
		attachment.type === "document"
			? { id: attachment.id as Id<"documents"> }
			: "skip",
	);

	// Render based on type
	if (attachment.type === "media") {
		if (!media) return null;

		return (
			<InputGroupButton
				size="icon-sm"
				variant="secondary"
				className="rounded-md relative p-0 overflow-hidden"
				onClick={onRemove}
			>
				<Image
					src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${media.key}`}
					alt={media.name}
					width={32}
					height={32}
					className="object-cover"
				/>
				<div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
					<IconX className="size-4 text-white" />
				</div>
			</InputGroupButton>
		);
	}

	if (!document) return null;

	return (
		<InputGroupButton
			size="sm"
			variant="secondary"
			className="rounded-full !pl-2"
			onClick={onRemove}
		>
			<IconFile className="size-4" />
			{document.name}
			<IconX className="size-4" />
		</InputGroupButton>
	);
};
