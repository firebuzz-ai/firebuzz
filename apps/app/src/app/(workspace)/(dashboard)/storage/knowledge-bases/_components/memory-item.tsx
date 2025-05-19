import {
  ConvexError,
  type Doc,
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
import {
  CornerDownRight,
  EllipsisVertical,
  Trash,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { formatRelativeTimeShort } from "@firebuzz/utils";
import { motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";

interface MemoryItemProps {
  currentKnowledgeBaseId: Id<"knowledgeBases">;
  selected: boolean;
  setSelected: Dispatch<SetStateAction<string[]>>;
  data: Omit<Doc<"documents">, "createdBy"> & {
    createdBy: Doc<"users"> | null;
    memoizedDocumentId: Id<"memoizedDocuments">;
  };
}

export const MemoryItem = ({
  currentKnowledgeBaseId,
  data,
  selected,
  setSelected,
}: MemoryItemProps) => {
  const { data: knowledgeBases } = useCachedRichQuery(
    api.collections.storage.knowledgeBases.queries.getAll
  );

  const deleteMutation = useMutation(
    api.collections.storage.documents.memoized.mutations.deletePermanent
  );

  const moveToKnowledgeBaseMutation = useMutation(
    api.collections.storage.documents.memoized.mutations.moveToKnowledgeBase
  );

  const duplicateToKnowledgeBaseMutation = useMutation(
    api.collections.storage.documents.memoized.mutations
      .duplicateToKnowledgeBase
  );

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

  return (
    <motion.div
      onClick={() =>
        setSelected((prev) =>
          prev.includes(data._id)
            ? prev.filter((id) => id !== data._id)
            : [...prev, data._id]
        )
      }
      layoutId={`memory-${data._id}`}
      className={cn(
        "flex items-center relative bg-background py-3 rounded-md border border-border hover:bg-muted/50 overflow-hidden cursor-default transition-colors duration-100 ease-in-out gap-3",
        selected && "border-brand bg-brand/5"
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
                    onSelect={(e) => {
                      e.stopPropagation();
                      deleteHandler();
                    }}
                  >
                    <Trash className="size-3" />
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <CornerDownRight className="size-3" />
                      Move to
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
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
                      <CornerDownRight className="size-3" />
                      Duplicate to
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
