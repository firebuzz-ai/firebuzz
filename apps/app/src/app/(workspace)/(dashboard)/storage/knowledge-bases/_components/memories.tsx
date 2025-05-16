import { TableFooter } from "@/components/tables/paginated-footer";
import {
  type Id,
  api,
  useCachedQuery,
  useStablePaginatedQuery,
} from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useEffect, useRef, useState } from "react";
import { MemoryItem } from "./memory-item";

interface MemoriesProps {
  knowledgeBaseId: Id<"knowledgeBases"> | undefined;
}

export const Memories = ({ knowledgeBaseId }: MemoriesProps) => {
  const [sortOrder, _setSortOrder] = useState<"asc" | "desc">("desc");

  const {
    results: memories,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.collections.storage.documents.queries.getPaginatedByKnowledgeBase,
    knowledgeBaseId
      ? {
          sortOrder,
          knowledgeBaseId,
        }
      : "skip",
    { initialNumItems: 5 }
  );

  const totalCount = useCachedQuery(
    api.collections.storage.documents.queries.getTotalCountByKnowledgeBase,
    knowledgeBaseId
      ? {
          knowledgeBaseId,
        }
      : "skip"
  );

  const loaderRef = useRef<HTMLDivElement>(null);

  // Add intersection observer for infinite loading
  useEffect(() => {
    if (status !== "CanLoadMore" || !loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore(20);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loaderRef.current);

    return () => observer.disconnect();
  }, [status, loadMore]);

  if (!knowledgeBaseId) {
    return (
      <div className="flex items-center justify-center flex-1">
        <p className="text-sm text-muted-foreground">
          Select a knowledge base to see its memories.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 max-w-full max-h-full overflow-hidden">
      <div className="flex flex-1 p-4">
        {status === "LoadingFirstPage" ? (
          <div className="flex items-center justify-center flex-1">
            <Spinner size="sm" />
          </div>
        ) : memories.length === 0 ? (
          <div className="flex items-center justify-center flex-1">
            <p className="text-sm text-center text-muted-foreground">
              No memory item found. Create a new document.
            </p>
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {memories.map((memory) => (
              <MemoryItem key={memory._id} data={memory ?? []} />
            ))}
          </div>
        )}

        {status === "CanLoadMore" && (
          <div ref={loaderRef} className="flex items-center justify-center p-4">
            <Spinner size="sm" />
          </div>
        )}
      </div>
      <TableFooter
        currentCount={memories.length}
        totalCount={totalCount ?? 0}
        status={status}
      />
    </div>
  );
};
