import type { Doc } from "@firebuzz/convex";
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
import { Button, buttonVariants } from "@firebuzz/ui/components/ui/button";
import { Label } from "@firebuzz/ui/components/ui/label";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	Download,
	FileArchive,
	FileChartColumn, // Placeholder
	FileCode,
	FileSpreadsheet, // Placeholder, can be refined
	FileText, // Placeholder for CSV
	X,
} from "@firebuzz/ui/icons/lucide";
import { toast } from "@firebuzz/ui/lib/utils";
import { formatFileSize, formatRelativeTimeShort } from "@firebuzz/utils";
import { parseAsString, useQueryStates } from "nuqs";

// Helper to get document type icon and label
const getDocumentTypeInfo = (type: Doc<"documents">["type"] | undefined) => {
	switch (type) {
		case "md":
			return { icon: <FileCode className="size-3" />, label: "Markdown" };
		case "html":
			return { icon: <FileCode className="size-3" />, label: "HTML" };
		case "txt":
			return { icon: <FileText className="size-3" />, label: "Text" };
		case "pdf":
			return { icon: <FileChartColumn className="size-3" />, label: "PDF" };
		case "csv":
			return { icon: <FileSpreadsheet className="size-3" />, label: "CSV" };
		case "docx":
			return {
				icon: <FileArchive className="size-3" />,
				label: "Word Document",
			};
		default:
			return { icon: <FileText className="size-3" />, label: "Document" };
	}
};

// Helper to get vectorization status info
const getVectorizationStatusInfo = (
	status: Doc<"documents">["vectorizationStatus"] | undefined,
) => {
	switch (status) {
		case "not-indexed":
			return {
				color: "bg-gray-500",
				label: "Not Indexed",
			};
		case "queued":
			return {
				color: "bg-yellow-500",
				label: "Queued",
			};
		case "processing":
			return {
				color: "bg-blue-500",
				label: "Processing",
			};
		case "indexed":
			return {
				color: "bg-green-500",
				label: "Indexed",
			};
		case "failed":
			return {
				color: "bg-red-500",
				label: "Failed",
			};
		default:
			return {
				color: "bg-gray-400",
				label: "Unknown",
			};
	}
};

export const DetailsSidebar = () => {
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
	const [{ documentId, documentKey }, setDocumentState] = useQueryStates(
		{
			documentId: parseAsString,
			documentKey: parseAsString, // For constructing the public URL
		},
		{
			urlKeys: {
				documentId: "docId",
				documentKey: "docKey",
			},
		},
	);

	const isOpen = Boolean(documentId);

	// Fetch document details
	const document = useCachedQuery(
		api.collections.storage.documents.queries.getById,
		isOpen && documentId ? { id: documentId as Id<"documents"> } : "skip",
	);

	const archiveDocument = useMutation(
		api.collections.storage.documents.mutations.archive,
	);
	const deleteDocument = useMutation(
		api.collections.storage.documents.mutations.deleteTemporary,
	);
	const restoreDocument = useMutation(
		api.collections.storage.documents.mutations.restore,
	);

	const handleClose = () => {
		setDocumentState({ documentId: null, documentKey: null });
	};

	const handleArchiveDocument = async (id: Id<"documents">) => {
		try {
			toast.loading("Archiving document...", {
				description: "This may take a few seconds...",
				id: "archive-document",
			});
			await archiveDocument({ id });
			toast.success("Document Archived", {
				description: "The document has been archived.",
				id: "archive-document",
			});
		} catch (error) {
			console.error("Error archiving document:", error);
			toast.error("Failed to archive document", {
				description: "Please try again later.",
				id: "archive-document",
			});
		}
	};

	const handleRestoreDocument = async (id: Id<"documents">) => {
		try {
			toast.loading("Restoring document...", {
				description: "This may take a few seconds...",
				id: "restore-document",
			});
			await restoreDocument({ id });
			toast.success("Document Restored", {
				description: "The document has been restored.",
				id: "restore-document",
			});
		} catch (error) {
			console.error("Error restoring document:", error);
			toast.error("Failed to restore document", {
				description: "Please try again later.",
				id: "restore-document",
			});
		}
	};

	const handleDeleteDocument = async (id: Id<"documents">) => {
		try {
			toast.loading("Deleting document...", {
				description: "This may take a few seconds...",
				id: "delete-document",
			});
			await deleteDocument({ id });
			handleClose();
			toast.success("Document Deleted", {
				description: "The document has been moved to trash.",
				id: "delete-document",
			});
		} catch (error) {
			console.error("Error deleting document:", error);
			toast.error("Failed to delete document", {
				description: "Please try again later.",
				id: "delete-document",
			});
		}
	};

	const documentTypeInfo = document
		? getDocumentTypeInfo(document.type)
		: { icon: null, label: "Document" };

	const vectorizationStatusInfo = document
		? getVectorizationStatusInfo(document.vectorizationStatus)
		: getVectorizationStatusInfo(undefined);

	return (
		<div className="flex flex-col p-4 border-l w-80 bg-muted border-border">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-lg font-semibold">Document Details</h3>
				<Button variant="ghost" size="icon" onClick={handleClose}>
					<X className="w-4 h-4" />
				</Button>
			</div>

			{/* Details */}
			{document ? (
				<div className="space-y-4">
					<div className="space-y-1">
						<Label className="text-muted-foreground">File name</Label>
						<p className="text-sm font-medium truncate">{document.name}</p>
					</div>

					<div className="space-y-1">
						<Label className="text-muted-foreground">Type</Label>
						<div>
							<Badge
								variant="outline"
								className="flex items-center gap-1 max-w-fit"
							>
								{documentTypeInfo.icon}
								{documentTypeInfo.label}
							</Badge>
						</div>
					</div>

					<div className="space-y-1">
						<Label className="text-muted-foreground">Size</Label>
						<div>
							<Badge variant="outline">
								{document.size ? `${formatFileSize(document.size)} MB` : "N/A"}
							</Badge>
						</div>
					</div>

					<div className="space-y-1">
						<Label className="text-muted-foreground">
							Vectorization Status
						</Label>
						<div>
							<Badge
								variant="outline"
								className="flex items-center gap-1.5 max-w-fit"
							>
								<span
									className={`inline-block transition-colors duration-300 ease-in-out size-2 rounded-full ${vectorizationStatusInfo.color}`}
								/>
								{vectorizationStatusInfo.label}
							</Badge>
						</div>
					</div>

					<div className="space-y-1">
						<Label className="text-muted-foreground">Created At</Label>
						<div>
							<Badge variant="outline">
								{formatRelativeTimeShort(document._creationTime)} ago
							</Badge>
						</div>
					</div>

					<div className="space-y-1">
						<Label className="text-muted-foreground">Created By</Label>
						<div className="flex items-center gap-2">
							<Avatar className="w-8 h-8 rounded-lg">
								<AvatarImage
									className="object-cover object-center w-full h-full rounded-lg"
									src={document.createdBy?.imageUrl} // Assuming createdBy structure is similar
									alt={document.createdBy?.fullName ?? ""}
								/>
								<AvatarFallback className="rounded-lg">
									{document.createdBy?.fullName?.slice(0, 2) ?? "--"}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-sm leading-tight text-left">
								<span className="font-semibold truncate">
									{document.createdBy?.fullName ?? "Unknown User"}
								</span>
								<span className="text-xs truncate">
									{document.createdBy?.email ?? "No email"}
								</span>
							</div>
						</div>
					</div>

					<Separator />

					<div className="space-y-2">
						<div className="space-y-1">
							<Label className="text-muted-foreground">Public URL</Label>
							{documentKey ? (
								<ReadonlyInputWithClipboard
									value={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${documentKey}`}
								/>
							) : (
								<p className="text-sm text-muted-foreground">
									URL not available
								</p>
							)}
						</div>
					</div>

					<Separator />
					{/* Actions */}
					<div className="space-y-4">
						{/* Download Button */}
						<div className="space-y-1">
							<a
								href={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${documentKey}`}
								download
								target="_blank"
								rel="noopener noreferrer"
								className={buttonVariants({
									variant: "outline",
									className: "w-full h-8",
								})}
							>
								Download <Download className="size-4" />
							</a>
						</div>
						<div className="flex items-center gap-2">
							<Button
								onClick={
									document.isArchived
										? () => handleRestoreDocument(document._id)
										: () => handleArchiveDocument(document._id)
								}
								variant="outline"
								className="w-full h-8"
								disabled={!document._id} // Disable if no ID
							>
								{document.isArchived ? "Restore" : "Archive"}
							</Button>
							<Button
								onClick={() => handleDeleteDocument(document._id)}
								variant="destructive"
								className="w-full h-8"
								disabled={!document._id} // Disable if no ID
							>
								Delete
							</Button>
						</div>
					</div>

					<div className="mt-2 text-xs text-muted-foreground">
						You can restore archived documents. Deleted documents are moved to
						trash.
					</div>
				</div>
			) : (
				<div className="flex items-center justify-center flex-1">
					<Spinner size="xs" />
				</div>
			)}
		</div>
	);
};
