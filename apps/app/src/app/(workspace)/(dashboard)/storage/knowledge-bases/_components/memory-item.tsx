import { useEditMemoryItem } from "@/hooks/ui/use-edit-memory-item";
import {
	ConvexError,
	type Id,
	api,
	useCachedRichQuery,
	useMutation,
} from "@firebuzz/convex";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import {
	Copy,
	CornerDownRight,
	EllipsisVertical,
	Pencil,
	Trash,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { formatRelativeTimeShort } from "@firebuzz/utils";
import { motion } from "motion/react";
import { type Dispatch, type SetStateAction, useMemo } from "react";
import type { MemoryItemType } from "./memory-list";
interface MemoryItemProps {
	currentKnowledgeBaseId: Id<"knowledgeBases">;
	selected: boolean;
	setSelected: Dispatch<SetStateAction<Id<"memoizedDocuments">[]>>;
	data: MemoryItemType;
}

export const MemoryItem = ({
	currentKnowledgeBaseId,
	data,
	selected,
	setSelected,
}: MemoryItemProps) => {
	const [, setEditModalState] = useEditMemoryItem();

	const { data: knowledgeBases } = useCachedRichQuery(
		api.collections.storage.knowledgeBases.queries.getAll,
		{
			showHidden: true,
		},
	);

	const deleteMutation = useMutation(
		api.collections.storage.documents.memoized.mutations.deletePermanent,
	);

	const moveToKnowledgeBaseMutation = useMutation(
		api.collections.storage.documents.memoized.mutations.moveToKnowledgeBase,
	);

	const duplicateToKnowledgeBaseMutation = useMutation(
		api.collections.storage.documents.memoized.mutations
			.duplicateToKnowledgeBase,
	);

	const isNativeMemoryItem = useMemo(() => {
		return data.isMemoryItem;
	}, [data.isMemoryItem]);

	const openEditMemoryItemModal = () => {
		if (isNativeMemoryItem) {
			setEditModalState({
				documentKey: data.key,
				documentId: data._id,
				editMemoryItem: true,
			});
		}
	};

	const deleteHandler = async () => {
		try {
			await deleteMutation({
				id: data.memoizedDocumentId,
			});
			toast.success("Document deleted");
		} catch (error) {
			if (error instanceof ConvexError) {
				toast.error(error.data);
			} else {
				toast.error("Something went wrong");
			}
		}
	};

	const moveToKnowledgeBaseHandler = async (id: Id<"knowledgeBases">) => {
		try {
			await moveToKnowledgeBaseMutation({
				knowledgeBaseId: id,
				memoizedDocumentId: data.memoizedDocumentId,
			});
			toast.success("Document moved to knowledge base");
		} catch (error) {
			if (error instanceof ConvexError) {
				toast.error(error.data);
			} else {
				toast.error("Something went wrong");
			}
		}
	};

	const duplicateToKnowledgeBaseHandler = async (id: Id<"knowledgeBases">) => {
		try {
			await duplicateToKnowledgeBaseMutation({
				knowledgeBaseId: id,
				memoizedDocumentId: data.memoizedDocumentId,
			});
			toast.success("Document duplicated to knowledge base");
		} catch (error) {
			if (error instanceof ConvexError) {
				toast.error(error.data);
			} else {
				toast.error("Something went wrong");
			}
		}
	};

	// Return Skeleton if summary is empty or loading
	if (!data.summary || data.summary === "") {
		return (
			<motion.div
				layoutId={`memory-${data._id}`}
				className="relative flex flex-col gap-3 py-3 overflow-hidden transition-colors duration-100 ease-in-out border rounded-md cursor-default bg-background border-border hover:bg-muted/50"
			>
				<div className="px-3">
					{/* Title Skeleton */}
					<Skeleton className="w-3/4 mb-2 h-7" />
					{/* Info Skeleton */}
					<div className="flex items-center gap-2">
						<Skeleton className="rounded-full size-2" />
						<Skeleton className="w-40 h-3" />
					</div>
				</div>

				{/* Summary Skeleton */}
				<div className="p-3 border-t border-b bg-muted">
					<Skeleton className="w-full h-4 mb-2" />
					<Skeleton className="w-4/5 h-4 mb-2" />
					<Skeleton className="w-3/5 h-4" />
				</div>

				{/* Footer Skeleton */}
				<div className="flex items-center justify-between px-3">
					<div className="flex items-center gap-2">
						<Skeleton className="w-5 h-5" />
						<Skeleton className="w-24 h-5" />
					</div>
					<Skeleton className="w-6 h-6" />
				</div>
			</motion.div>
		);
	}

	return (
		<motion.div
			onClick={() =>
				setSelected((prev) =>
					prev.includes(data.memoizedDocumentId)
						? prev.filter((id) => id !== data.memoizedDocumentId)
						: [...prev, data.memoizedDocumentId],
				)
			}
			layoutId={`memory-${data._id}`}
			className={cn(
				"flex items-center relative bg-background py-3 rounded-md border border-border hover:bg-muted/50 overflow-hidden cursor-default transition-colors duration-100 ease-in-out gap-3",
				selected && "border-brand bg-brand/5",
			)}
		>
			<div className="flex items-center flex-1 max-w-full overflow-hidden">
				<div className="flex flex-col flex-1 min-w-0 gap-3 overflow-hidden">
					<div className="px-3">
						{/* Title */}
						<h3 className="text-lg font-bold truncate">
							{data.title ?? data.name}
						</h3>
						{/* Info */}
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							{/* Indexed At */}
							<span className="rounded-full size-2 bg-emerald-500" />
							<span>
								Indexed{" "}
								{formatRelativeTimeShort(data.indexedAt ?? data._creationTime)}{" "}
								ago
							</span>
							<span>by</span>
							<span className="font-medium underline underline-offset-2">
								{data.createdBy?.fullName ??
									data.createdBy?.firstName ??
									data.createdBy?.email}
							</span>
						</div>
					</div>
					{/* Summary */}
					<div className="p-3 border-t border-b bg-muted">
						<p className="text-sm text-muted-foreground line-clamp-3">
							{data.summary}
						</p>
					</div>
					{/* Footer */}
					<div className="flex items-center justify-between px-3">
						<div className="flex items-center flex-1 gap-2">
							<CornerDownRight className="size-3" />
							<Badge className="max-w-full truncate" variant="outline">
								{data.name}
							</Badge>
						</div>
						<div className="flex items-center justify-end flex-1 gap-2">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										onClick={(e) => {
											e.stopPropagation();
										}}
										variant="ghost"
										size="iconXs"
									>
										<EllipsisVertical className="size-3" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent side="bottom" align="end" sideOffset={5}>
									<DropdownMenuItem
										disabled={!isNativeMemoryItem}
										onSelect={(e) => {
											e.stopPropagation();
											openEditMemoryItemModal();
										}}
									>
										<Pencil className="size-3" />
										Edit
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuSub>
										<DropdownMenuSubTrigger>
											<CornerDownRight className="size-3" />
											Move to
										</DropdownMenuSubTrigger>
										<DropdownMenuSubContent sideOffset={10}>
											{knowledgeBases?.map((knowledgeBase) => (
												<DropdownMenuItem
													disabled={
														knowledgeBase._id === currentKnowledgeBaseId
													}
													key={knowledgeBase._id}
													onSelect={(e) => {
														e.stopPropagation();
														moveToKnowledgeBaseHandler(knowledgeBase._id);
													}}
												>
													{knowledgeBase.name}
												</DropdownMenuItem>
											))}
										</DropdownMenuSubContent>
									</DropdownMenuSub>

									<DropdownMenuSub>
										<DropdownMenuSubTrigger>
											<Copy className="size-3" />
											Duplicate to
										</DropdownMenuSubTrigger>
										<DropdownMenuSubContent sideOffset={10}>
											{knowledgeBases?.map((knowledgeBase) => (
												<DropdownMenuItem
													disabled={
														knowledgeBase._id === currentKnowledgeBaseId
													}
													key={knowledgeBase._id}
													onSelect={(e) => {
														e.stopPropagation();
														duplicateToKnowledgeBaseHandler(knowledgeBase._id);
													}}
												>
													{knowledgeBase.name}
												</DropdownMenuItem>
											))}
										</DropdownMenuSubContent>
									</DropdownMenuSub>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onSelect={(e) => {
											e.stopPropagation();
											deleteHandler();
										}}
									>
										<Trash className="size-3" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	);
};
