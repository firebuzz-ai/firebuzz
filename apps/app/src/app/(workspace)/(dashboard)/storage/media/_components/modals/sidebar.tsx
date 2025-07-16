import { useCachedQuery, useMutation } from "@firebuzz/convex";
import { type Id, api } from "@firebuzz/convex/nextjs";
import { envCloudflarePublic } from "@firebuzz/env";
import { ReadonlyInputWithClipboard } from "@firebuzz/ui/components/reusable/readonly-input-with-clipboard";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	FileAudio,
	FileVideo,
	Image as ImageIcon,
	X,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { formatFileSize, formatRelativeTimeShort } from "@firebuzz/utils";
import { parseAsString, useQueryStates } from "nuqs";

// Helper to get media type icon and label
const getMediaTypeInfo = (type: string | undefined) => {
	switch (type) {
		case "audio":
			return { icon: <FileAudio className="size-3" />, label: "Audio" };
		case "video":
			return { icon: <FileVideo className="size-3" />, label: "Video" };
		default:
			return { icon: <ImageIcon className="size-3" />, label: "Image" };
	}
};

export const DetailsSidebar = () => {
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
	const [{ mediaId }, setMediaState] = useQueryStates(
		{
			mediaId: parseAsString,
		},
		{
			urlKeys: {
				mediaId: "id",
			},
		},
	);

	const isOpen = Boolean(mediaId);

	// Fetch media details
	const media = useCachedQuery(
		api.collections.storage.media.queries.getById,
		isOpen ? { id: mediaId as Id<"media"> } : "skip",
	);

	const archiveMedia = useMutation(
		api.collections.storage.media.mutations.archive,
	);
	const deleteMedia = useMutation(
		api.collections.storage.media.mutations.deleteTemporary,
	);
	const restoreMedia = useMutation(
		api.collections.storage.media.mutations.restore,
	);

	const handleClose = () => {
		setMediaState(null);
	};

	const handleArchiveMedia = async (id: Id<"media">) => {
		try {
			toast.loading("Archiving media...", {
				description: "This may take a few seconds...",
				id: "archive-media",
			});
			await archiveMedia({ id });
			toast.success("Media Archived", {
				description: "The media has been archived from your storage.",
				id: "archive-media",
			});
		} catch (error) {
			console.error("Error archiving media:", error);
			toast.error("Failed to archive media", {
				description: "Please try again later.",
				id: "archive-media",
			});
		}
	};

	const handleRestoreMedia = async (id: Id<"media">) => {
		try {
			toast.loading("Restoring media...", {
				description: "This may take a few seconds...",
				id: "restore-media",
			});
			await restoreMedia({ id });
			toast.success("Media Restored", {
				description: "The media has been restored from your storage.",
				id: "restore-media",
			});
		} catch (error) {
			console.error("Error restoring media:", error);
			toast.error("Failed to restore media", {
				description: "Please try again later.",
				id: "restore-media",
			});
		}
	};

	const handleDeleteMedia = async (id: Id<"media">) => {
		try {
			toast.loading("Deleting media...", {
				description: "This may take a few seconds...",
				id: "delete-media",
			});
			await deleteMedia({ id });
			handleClose();
			toast.success("Media Deleted", {
				description: "The media has been deleted from your storage.",
				id: "delete-media",
			});
		} catch (error) {
			console.error("Error deleting media:", error);
			toast.error("Failed to delete media", {
				description: "Please try again later.",
				id: "delete-media",
			});
		}
	};

	const mediaTypeInfo = media
		? getMediaTypeInfo(media.type)
		: { icon: null, label: "Media" };

	return (
		<div className="flex flex-col p-4 w-80 border-l bg-muted border-border">
			<div className="flex justify-between items-center mb-4">
				<h3 className="text-lg font-semibold">Media Details</h3>
				<Button variant="ghost" size="icon" onClick={handleClose}>
					<X className="w-4 h-4" />
				</Button>
			</div>

			{/* Details */}
			{media ? (
				<div className="space-y-4">
					<div className="space-y-1">
						<Label className="text-muted-foreground">File name</Label>
						<p className="text-sm font-medium">{media.name}</p>
					</div>

					<div className="space-y-1">
						<Label className="text-muted-foreground">Type</Label>
						<div>
							<Badge
								variant="outline"
								className="flex gap-1 items-center max-w-fit"
							>
								{mediaTypeInfo.icon}
								{mediaTypeInfo.label}
							</Badge>
						</div>
					</div>

					<div className="space-y-1">
						<Label className="text-muted-foreground">Size</Label>
						<div>
							<Badge variant="outline">
								{media.size ? `${formatFileSize(media.size)} MB` : "N/A"}
							</Badge>
						</div>
					</div>

					<div className="space-y-1">
						<Label className="text-muted-foreground">Source</Label>
						<div>
							<Badge variant="outline" className="capitalize">
								{media.source}
							</Badge>
						</div>
					</div>

					<div className="space-y-1">
						<Label className="text-muted-foreground">Created At</Label>
						<div>
							<Badge variant="outline" className="capitalize">
								{formatRelativeTimeShort(media._creationTime)}
							</Badge>
						</div>
					</div>

					<div className="space-y-1">
						<Label className="text-muted-foreground">Created By</Label>
						<div className="flex gap-2 items-center">
							<Avatar className="w-8 h-8 rounded-lg">
								<AvatarImage
									className="object-cover object-center w-full h-full rounded-lg"
									src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${media.createdBy?.imageKey}`}
									alt={media.createdBy?.fullName ?? ""}
								/>
								<AvatarFallback className="rounded-lg">
									{media.createdBy?.fullName?.slice(0, 2)}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-sm leading-tight text-left">
								<span className="font-semibold truncate">
									{media.createdBy?.fullName}
								</span>
								<span className="text-xs truncate">
									{media.createdBy?.email}
								</span>
							</div>
						</div>
					</div>

					<Separator />

					<div className="space-y-2">
						<div className="space-y-1">
							<Label className="text-muted-foreground">Public URL</Label>
							<ReadonlyInputWithClipboard
								value={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${media.key}`}
							/>
						</div>
					</div>
					<Separator />
					{/* Actions */}
					<div className="flex gap-2 items-center">
						<Button
							onClick={
								media.isArchived
									? () => handleRestoreMedia(media._id)
									: () => handleArchiveMedia(media._id)
							}
							variant="outline"
							className="w-full h-8"
						>
							{media.isArchived ? "Restore" : "Archive"}
						</Button>
						<Button
							onClick={() => handleDeleteMedia(media._id)}
							variant="destructive"
							className="w-full h-8"
						>
							Delete
						</Button>
					</div>
					<div className="mt-2 text-xs text-muted-foreground">
						You can always restore archived media from your archive. Archived
						media is not deleted from your storage. Deleting media is
						irreversible.
					</div>
				</div>
			) : (
				<div className="flex flex-1 justify-center items-center">
					<Spinner size="xs" />
				</div>
			)}
		</div>
	);
};
