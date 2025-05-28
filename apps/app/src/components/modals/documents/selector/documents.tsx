"use client";

import { useProject } from "@/hooks/auth/use-project";
import {
	type Doc,
	api,
	useCachedQuery,
	usePaginatedQuery,
} from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env"; // Assuming documents might also have a public URL base if served similarly to media
import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	AlertCircle,
	Check, // Generic file icon for documents
	Search,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

// Define the structure for a selected document item
interface SelectedDocumentItem {
	id: string;
	url: string;
	key: string;
	fileName: string;
	summary: string;
	isLong: boolean;
	type: Doc<"documents">["type"];
	contentType: string;
	size: number;
}

interface DocumentsTabProps {
	onSelect: (documents: SelectedDocumentItem[]) => void;
	allowedTypes: Doc<"documents">["type"][];
	allowMultiple: boolean;
	maxFiles: number;
	setIsOpen: (isOpen: boolean) => void;
}

// Define available document types for filtering
// These could be dynamically fetched or defined if they are static
const DOCUMENT_TYPES = ["md", "html", "txt", "pdf", "csv", "docx"] as const; // From use-documents-selector-modal.ts & document-item.tsx

export const DocumentsTab = ({
	onSelect,
	allowedTypes,
	allowMultiple,
	maxFiles,
	setIsOpen,
}: DocumentsTabProps) => {
	const { currentProject } = useProject();
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
	const [selectedDocuments, setSelectedDocuments] = useState<
		Doc<"documents">[]
	>([]);
	// Assuming documents might be served via R2 like media, if not, this URL base needs adjustment or removal.
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();
	const [selectedType, setSelectedType] = useState<
		"all" | Doc<"documents">["type"]
	>("all");

	const loaderRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const totalCount = useCachedQuery(
		api.collections.storage.documents.queries.getTotalCount,
		currentProject ? { projectId: currentProject._id } : "skip",
	);

	const { results, status, loadMore } = usePaginatedQuery(
		api.collections.storage.documents.queries.getPaginated,
		currentProject
			? {
					sortOrder: "desc",
					searchQuery: debouncedSearchQuery,
					type: selectedType !== "all" ? selectedType : undefined,
					isArchived: false,
				}
			: "skip",
		{ initialNumItems: 12 },
	);

	const documentItems = results ?? [];

	const handleSelect = () => {
		if (selectedDocuments.length === 0) return;

		onSelect(
			selectedDocuments.map((doc) => ({
				id: doc._id,
				url: `${NEXT_PUBLIC_R2_PUBLIC_URL}/${doc.key}`,
				key: doc.key,
				fileName: doc.name,
				summary: doc.summary ?? "",
				isLong: doc.isLongDocument ?? false,
				type: doc.type,
				contentType: doc.contentType,
				size: doc.size,
			})),
		);

		setIsOpen(false);
		setSelectedDocuments([]);
	};

	const isDocumentTypeAllowed = (docType: Doc<"documents">["type"]) => {
		return allowedTypes.includes(docType);
	};

	const toggleDocumentSelection = (document: Doc<"documents">) => {
		if (!isDocumentTypeAllowed(document.type)) {
			toast.error("Selection not allowed", {
				description: `${document.type.toUpperCase()} selection is not allowed for this operation.`,
				icon: <AlertCircle className="size-4" />,
			});
			return;
		}

		setSelectedDocuments((prev) => {
			const isSelected = prev.some((d) => d._id === document._id);

			if (allowMultiple) {
				if (isSelected) {
					return prev.filter((d) => d._id !== document._id);
				}
				if (prev.length < maxFiles) {
					return [...prev, document];
				}

				toast.info(`You can select up to ${maxFiles} files.`);
				return prev;
			}
			return isSelected ? [] : [document];
		});
	};

	const isDocumentSelected = (documentId: string) => {
		return selectedDocuments.some((doc) => doc._id === documentId);
	};

	useEffect(() => {
		const currentLoaderRef = loaderRef.current;
		if (status !== "CanLoadMore" || !currentLoaderRef) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					void loadMore(12);
				}
			},
			{
				threshold: 0.1,
				root: scrollContainerRef.current,
			},
		);

		observer.observe(currentLoaderRef);

		return () => {
			observer.disconnect();
		};
	}, [status, loadMore]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <We need to re-run this effect when the document items change>
	useLayoutEffect(() => {
		if (
			status === "CanLoadMore" &&
			scrollContainerRef.current &&
			loaderRef.current
		) {
			const container = scrollContainerRef.current;
			const hasRoomToScroll = container.scrollHeight <= container.clientHeight;

			if (hasRoomToScroll) {
				void loadMore(12);
			}
		}
	}, [status, loadMore, documentItems]);

	const filterOptions = [
		{ value: "all", label: "All Types", disabled: false },
		...DOCUMENT_TYPES.map((type) => ({
			value: type,
			label: type.toUpperCase(),
			disabled: !allowedTypes.includes(type),
		})),
	];

	return (
		<div className="flex flex-col h-full">
			{/* Filters */}
			<div className="flex items-center gap-2 px-4 pt-4 pb-2">
				<div className="relative flex-1">
					<Search className="absolute left-2.5 top-2.5 !size-3 text-muted-foreground" />
					<Input
						type="search"
						placeholder="Search documents..."
						className="h-8 pl-7"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<Select
					value={selectedType}
					onValueChange={(value) =>
						setSelectedType(value as "all" | Doc<"documents">["type"])
					}
				>
					<SelectTrigger className="w-[140px] h-8">
						<SelectValue placeholder="Filter by type" />
					</SelectTrigger>
					<SelectContent>
						{filterOptions.map((option) => (
							<SelectItem
								key={option.value}
								value={option.value}
								disabled={option.disabled}
							>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Document Grid with Infinite Scroll */}
			<div
				ref={scrollContainerRef}
				className="flex-1 h-full px-4 pt-4 pb-4 overflow-y-auto"
			>
				{status === "LoadingFirstPage" ? (
					<div className="flex items-center justify-center h-full">
						<Spinner size="sm" />
					</div>
				) : documentItems.length === 0 ? (
					<div className="flex items-center justify-center h-full">
						<p className="text-sm text-muted-foreground">
							{debouncedSearchQuery || selectedType !== "all"
								? "No documents found matching your criteria."
								: "No documents found."}
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{documentItems.map((doc) => (
							<DocumentItemSelector
								key={doc._id}
								document={doc}
								isSelected={isDocumentSelected(doc._id)}
								isAllowed={isDocumentTypeAllowed(doc.type)}
								onSelect={() => toggleDocumentSelection(doc)}
							/>
						))}
						{status === "CanLoadMore" && (
							<div
								ref={loaderRef}
								className="flex justify-center w-full p-4 col-span-full" // Changed col-span-3 to col-span-full for responsiveness
							>
								<Spinner size="xs" />
							</div>
						)}
						{status === "LoadingMore" && (
							<div className="flex items-center justify-center w-full h-12 col-span-full">
								{" "}
								{/* Changed col-span-3 to col-span-full */}
								<Spinner size="xs" />
							</div>
						)}
					</div>
				)}
			</div>

			{/* Footer with Action Button */}
			<div className="flex items-center justify-between px-4 py-2 border-t border-border">
				<div className="text-xs text-muted-foreground">
					{`${documentItems.length} of ${totalCount ?? 0} loaded`}
				</div>
				<Button
					size="sm"
					onClick={handleSelect}
					disabled={selectedDocuments.length === 0}
				>
					Select{" "}
					{selectedDocuments.length > 0 ? `(${selectedDocuments.length})` : ""}
				</Button>
			</div>
		</div>
	);
};

// Document Item Component (Internal to DocumentsTab)
// This is a simplified version for selection purposes.
const getTypeColorAndIcon = (type: Doc<"documents">["type"]) => {
	// Based on DocumentItem from document-item.tsx but simplified
	switch (type) {
		case "md":
			return {
				text: "text-blue-600",
			};
		case "html":
			return {
				text: "text-orange-600",
			};
		case "txt":
			return {
				text: "text-gray-600",
			};
		case "pdf":
			return {
				text: "text-red-600",
			};
		case "csv":
			return {
				text: "text-green-600",
			};
		case "docx":
			return {
				text: "text-indigo-600",
			};
		default: // fallback for other types if any
			return {
				text: "text-brand",
			};
	}
};

const DocumentItemSelector = ({
	document,
	isSelected,
	isAllowed,
	onSelect,
}: {
	document: Doc<"documents">;
	isSelected: boolean;
	isAllowed: boolean;
	onSelect: () => void;
}) => {
	const { text } = getTypeColorAndIcon(document.type);

	return (
		<div
			onClick={isAllowed ? onSelect : undefined} // Only allow click if document type is allowed
			className={cn(
				"relative flex flex-col p-3 rounded-md border overflow-hidden transition-all gap-2 border bg-muted",
				isSelected && "ring-1 ring-brand border-brand",
				!isAllowed && "opacity-50 cursor-not-allowed",
				isAllowed &&
					"cursor-pointer hover:ring-1 hover:ring-brand hover:border-brand",
			)}
			style={{ minHeight: "120px" }} // Ensure a minimum height for consistency
		>
			<div className="flex items-start justify-between w-full">
				<div
					className={cn(
						"flex items-center justify-center size-10 font-semibold border rounded-md shrink-0 overflow-hidden",
					)}
				>
					<div
						className={cn(
							text,

							"w-full flex items-center justify-center text-xs font-bold", // Adjusted font size
						)}
					>
						{document.type?.toUpperCase() || "DOC"}
					</div>
				</div>
				{isSelected && (
					<div className="absolute p-1 text-white rounded-full top-2 right-2 bg-brand">
						<Check className="size-3" />
					</div>
				)}
				{!isAllowed && (
					<div className="absolute p-1 text-white rounded-full top-2 right-2 bg-destructive">
						<AlertCircle className="size-3" />
					</div>
				)}
			</div>

			<div className="flex flex-col flex-1 min-w-0 mt-auto">
				<h3 className="text-sm font-semibold truncate" title={document.name}>
					{document.name}
				</h3>
				<p className="text-xs text-muted-foreground">
					{(document.size / 1024).toFixed(2)} KB
				</p>
			</div>

			{/* Selected Overlay - subtle to still see content type */}
			{isSelected && (
				<div className="absolute inset-0 rounded-md bg-brand/10" />
			)}
		</div>
	);
};
