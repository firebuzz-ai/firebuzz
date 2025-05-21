import { TableFooter } from "@/components/tables/paginated-footer";
import { useProject } from "@/hooks/auth/use-project";
import {
  type Doc,
  type Id,
  api,
  useCachedQuery,
  useStablePaginatedQuery,
} from "@firebuzz/convex";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Upload } from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { useNewDocumentModal } from "../../documents/_components/modals/new-document/use-new-document-modal";
import { MemoryItem } from "./memory-item";
import { SelectedMenu } from "./selected-menu";
import { SemanticSearchBar } from "./semantic-search-bar";

export type MemoryItemType = Omit<Doc<"documents">, "createdBy"> & {
  createdBy: Doc<"users"> | null;
  memoizedDocumentId: Id<"memoizedDocuments">;
};

interface MemoryListProps {
  knowledgeBaseId: Id<"knowledgeBases"> | undefined;
}

export const MemoryList = ({ knowledgeBaseId }: MemoryListProps) => {
  const { currentProject } = useProject();
  const [sortOrder, _setSortOrder] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Id<"memoizedDocuments">[]>([]);
  const [searchResults, setSearchResults] = useState<MemoryItemType[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const { setState: setNewDocumentModalState } = useNewDocumentModal();
  const {
    results: memoriesData,
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

  const memories = useMemo(() => {
    return isSearchActive ? searchResults : memoriesData;
  }, [searchResults, memoriesData, isSearchActive]);

  const totalCount = useCachedQuery(
    api.collections.storage.documents.queries.getTotalCountByKnowledgeBase,
    knowledgeBaseId
      ? {
          knowledgeBaseId,
        }
      : "skip"
  );

  const totalSize = useCachedQuery(
    api.collections.storage.documents.queries.getTotalSize,
    currentProject
      ? {
          projectId: currentProject._id,
        }
      : "skip"
  );

  const loaderRef = useRef<HTMLDivElement>(null);

  const MAX_FILES_PER_UPLOAD = 5;
  const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
  const MAX_STORAGE_BYTES = 1024 * 1024 * 1024;

  const onDrop = async (acceptedFiles: File[]) => {
    const currentFilesTotalSize = acceptedFiles.reduce(
      (acc, file) => acc + file.size,
      0
    );

    if ((totalSize ?? 0) + currentFilesTotalSize > MAX_STORAGE_BYTES) {
      toast.error("Not enough storage space.", {
        description: "You do not have enough storage to upload these files.",
      });
      return;
    }

    if (acceptedFiles.length > MAX_FILES_PER_UPLOAD) {
      toast.error(
        `You can only upload up to ${MAX_FILES_PER_UPLOAD} files at a time.`
      );
      return;
    }

    if (knowledgeBaseId) {
      setNewDocumentModalState({
        files: acceptedFiles,
        isOpen: true,
        isKnowledgeBaseEnabled: true,
        selectedKnowledgeBase: knowledgeBaseId,
      });
    }
  };

  const onDropRejected = (fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      for (const rejection of fileRejections) {
        for (const error of rejection.errors) {
          if (error.code === "file-too-large") {
            toast.error(
              `File "${rejection.file.name}" is too large. Max size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`
            );
          } else if (error.code === "file-invalid-type") {
            toast.error(`File "${rejection.file.name}" type is not allowed.`);
          } else if (error.code === "too-many-files") {
            toast.error(
              `Cannot add all files. Maximum ${MAX_FILES_PER_UPLOAD} files allowed.`
            );
          } else {
            toast.error(
              `Error with file "${rejection.file.name}": ${error.message}`
            );
          }
        }
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "application/msword": [".doc"],
      "text/csv": [".csv"],
      "text/plain": [".txt"],
      "text/html": [".html"],
      "text/markdown": [".md"],
      "text/markdownx": [".mdx"],
    },
    maxSize: MAX_FILE_SIZE_BYTES,
    maxFiles: MAX_FILES_PER_UPLOAD,
    noClick: true,
    multiple: true,
  });

  useEffect(() => {
    if (status !== "CanLoadMore" || !memories || memories.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore(10);
        }
      },
      { threshold: 0.1 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [status, loadMore, memories]);

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
    <div className="flex flex-col w-full h-full max-h-full overflow-hidden @container">
      <div
        className="relative flex flex-col flex-1 overflow-hidden"
        {...getRootProps()}
      >
        <input {...getInputProps()} />

        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white bg-background/95 backdrop-blur-xs"
            >
              <div className="flex items-center justify-center p-4 mb-4 border rounded-full bg-muted">
                <Upload className="size-8 animate-pulse" />
              </div>
              <div className="text-center text-white">
                <p className="text-lg font-bold">
                  Drop documents here to upload
                </p>
                <p className="max-w-xs mt-1 text-xs">
                  Supported formats: PDF, DOCX, DOC, CSV, TXT, HTML, MD, MDX. Up
                  to {MAX_FILES_PER_UPLOAD} files.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          onDoubleClick={(e) => {
            e.stopPropagation();
            setSelected([]);
          }}
          className="flex-1 p-4 overflow-y-auto select-none"
        >
          {status === "LoadingFirstPage" && !memories ? (
            <div className="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, index) => (
                <Skeleton
                  // biome-ignore lint/suspicious/noArrayIndexKey: Loading skeleton
                  key={index}
                  className="w-full rounded-md h-60"
                />
              ))}
            </div>
          ) : memories && memories.length === 0 && !isSearchActive ? (
            <div
              className={cn(
                "flex items-center justify-center h-full transition-opacity duration-300 ease-in-out",
                isDragActive ? "opacity-0" : "opacity-100"
              )}
            >
              <p className="text-sm text-center text-muted-foreground">
                No memories found. Upload a document to get started.
              </p>
            </div>
          ) : isSearchActive && searchResults.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-center text-muted-foreground">
                No results found. Try a different search query.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3 gap-4">
              {memories.map((item) => (
                <MemoryItem
                  currentKnowledgeBaseId={knowledgeBaseId}
                  key={item._id}
                  data={item}
                  selected={selected.includes(item.memoizedDocumentId)}
                  setSelected={setSelected}
                />
              ))}
            </div>
          )}
          {status === "CanLoadMore" && (
            <div ref={loaderRef} className="flex justify-center w-full p-4">
              <Spinner size="xs" />
            </div>
          )}
          {status === "LoadingMore" && (
            <div className="flex items-center justify-center w-full h-24">
              <Spinner size="xs" />
            </div>
          )}
        </div>
      </div>

      <TableFooter
        totalCount={totalCount ?? 0}
        currentCount={memories?.length ?? 0}
        status={
          status === "LoadingFirstPage" && !memories
            ? "LoadingFirstPage"
            : status
        }
      />

      <SelectedMenu
        selections={selected}
        setSelections={setSelected}
        totalCount={totalCount ?? 0}
        currentKnowledgeBaseId={knowledgeBaseId}
      />

      <SemanticSearchBar
        isSearchActive={isSearchActive}
        setIsSearchActive={setIsSearchActive}
        knowledgeBaseId={knowledgeBaseId}
        isVisible={selected.length === 0}
        setSearchResults={setSearchResults}
      />
    </div>
  );
};
