"use client";

import { useProject } from "@/hooks/auth/use-project";
import {
  type Doc,
  api,
  useCachedQuery,
  usePaginatedQuery,
} from "@firebuzz/convex";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Upload } from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { useDebounce } from "use-debounce";
import { Controls } from "../controls";
import { DocumentDetailsModal } from "../modals/modal";
import { NewDocumentModal } from "../modals/new-document/modal";
import { useNewDocumentModal } from "../modals/new-document/use-new-document-modal";
import { DocumentItem } from "./document-item";
import { Footer } from "./footer";
import { SelectedMenu } from "./selected-menu";

export function DocumentList() {
  const { currentProject } = useProject();
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
  const [type, setType] = useState<Doc<"documents">["type"] | "all">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { setState: setNewDocumentModalState } = useNewDocumentModal();

  const totalSize = useCachedQuery(
    api.collections.storage.documents.queries.getTotalSize,
    currentProject
      ? {
          projectId: currentProject?._id,
        }
      : "skip"
  );

  const totalCount = useCachedQuery(
    api.collections.storage.documents.queries.getTotalCount,
    currentProject
      ? {
          projectId: currentProject?._id,
        }
      : "skip"
  );

  const {
    results: documentItems,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.collections.storage.documents.queries.getPaginated,
    currentProject
      ? {
          sortOrder,
          searchQuery: debouncedSearchQuery,
          type: type !== "all" ? type : undefined,
        }
      : "skip",
    { initialNumItems: 10 }
  );

  const loaderRef = useRef<HTMLDivElement>(null);

  const MAX_FILES_PER_UPLOAD = 5;
  const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
  const MAX_STORAGE_BYTES = 1024 * 1024 * 1024;

  const onDrop = async (acceptedFiles: File[]) => {
    if (!currentProject) return;

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

    setNewDocumentModalState({
      files: acceptedFiles,
      isOpen: true,
      isKnowledgeBaseEnabled: false,
      selectedKnowledgeBase: null,
    });
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
    if (
      status !== "CanLoadMore" ||
      !documentItems ||
      documentItems.length === 0
    )
      return;

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
  }, [status, loadMore, documentItems]);

  return (
    <div className="flex flex-col w-full h-full max-h-full overflow-hidden @container">
      <Controls
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        type={type}
        setType={setType}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
      />

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
          {status === "LoadingFirstPage" && !documentItems ? (
            <div className="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, index) => (
                <Skeleton
                  // biome-ignore lint/suspicious/noArrayIndexKey: Loading skeleton
                  key={index}
                  className="w-full rounded-md h-60"
                />
              ))}
            </div>
          ) : documentItems && documentItems.length === 0 ? (
            <div
              className={cn(
                "flex items-center justify-center h-full transition-opacity duration-300 ease-in-out",
                isDragActive ? "opacity-0" : "opacity-100"
              )}
            >
              <p className="text-sm text-center text-muted-foreground">
                No documents found. Upload a document to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5 gap-4">
              {documentItems.map((doc) => (
                <DocumentItem
                  key={doc._id}
                  document={doc}
                  selected={selected}
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

      <Footer
        totalCount={totalCount ?? 0}
        currentCount={documentItems?.length ?? 0}
        status={
          status === "LoadingFirstPage" && !documentItems
            ? "LoadingFirstPage"
            : status
        }
      />

      <SelectedMenu
        selections={selected}
        setSelections={setSelected}
        totalCount={totalCount ?? 0}
      />

      <DocumentDetailsModal />
      <NewDocumentModal />
    </div>
  );
}
