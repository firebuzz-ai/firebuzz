"use client";

import { useProject } from "@/hooks/auth/use-project";
import {
  type Doc,
  type Id,
  api,
  useCachedQuery,
  useMutation,
  useUploadFile,
} from "@firebuzz/convex";
import { envCloudflarePublic } from "@firebuzz/env";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Switch } from "@firebuzz/ui/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
  AlertCircle,
  Check,
  CircleHelp, // Using FileText as a generic document icon
  Plus,
  Upload,
  X,
} from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { formatFileSize, parseDocumentFile } from "@firebuzz/utils";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { type Accept, type FileRejection, useDropzone } from "react-dropzone";

// Expected structure for onSelect, consistent with useDocumentsSelectorModal
interface SelectedDocumentItem {
  id: string;
  url: string;
  key: string;
  fileName: string;
  type: Doc<"documents">["type"];
  contentType: string;
  size: number;
}

interface UploadTabProps {
  onSelect: (documents: SelectedDocumentItem[]) => void;
  allowedTypes: Doc<"documents">["type"][];
  allowMultiple: boolean;
  maxFiles: number;
  setIsOpen: (isOpen: boolean) => void;
}

interface FileWithProgress {
  file: File;
  uploading: boolean;
  key?: string;
  error?: string;
  parsedType: Doc<"documents">["type"];
  parsedContentType: string;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB (from NewDocumentModal)
const MAX_STORAGE_BYTES = 1024 * 1024 * 1024; // 1GB (from NewDocumentModal)

// Adjusted to include mdx and ensure mutability for accept object
const DOCUMENT_MIME_TYPES_CONFIG: Partial<
  Record<Doc<"documents">["type"] | "mdx", { mimes: string[]; exts: string[] }>
> = {
  md: { mimes: ["text/markdown"], exts: [".md"] },
  html: { mimes: ["text/html"], exts: [".html"] },
  txt: { mimes: ["text/plain"], exts: [".txt"] },
  pdf: { mimes: ["application/pdf"], exts: [".pdf"] },
  csv: { mimes: ["text/csv"], exts: [".csv"] },
  docx: {
    mimes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    exts: [".docx"],
  },
};

export const UploadTab = ({
  onSelect,
  allowedTypes,
  allowMultiple,
  maxFiles,
  setIsOpen,
}: UploadTabProps) => {
  const [filesWithProgress, setFilesWithProgress] = useState<
    FileWithProgress[]
  >([]);
  const [isOverallUploading, setIsOverallUploading] = useState(false);
  const [isKnowledgeBaseEnabled, setIsKnowledgeBaseEnabled] = useState(false);
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] =
    useState<Id<"knowledgeBases"> | null>(null);
  const { currentProject } = useProject();
  const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

  const uploadFileHelper = useUploadFile(api.helpers.r2);
  const createDocumentAction = useMutation(
    api.collections.storage.documents.mutations.create
  );

  const totalDocumentSizeStored = useCachedQuery(
    api.collections.storage.documents.queries.getTotalSize,
    currentProject ? { projectId: currentProject._id } : "skip"
  );

  const knowledgeBases = useCachedQuery(
    api.collections.storage.knowledgeBases.queries.getAll,
    { showHidden: true }
  );

  const generateAcceptTypes = (): Accept => {
    const accept: Accept = {};
    for (const type of allowedTypes) {
      const config =
        DOCUMENT_MIME_TYPES_CONFIG[
          type as keyof typeof DOCUMENT_MIME_TYPES_CONFIG
        ];
      if (config) {
        for (const mimeType of config.mimes) {
          if (!accept[mimeType]) {
            accept[mimeType] = []; // Initialize as mutable array
          }
          // Ensure accept[mimeType] is treated as string[] for push
          const currentExts = accept[mimeType] as string[];
          for (const ext of config.exts) {
            if (!currentExts.includes(ext)) {
              currentExts.push(ext);
            }
          }
        }
      }
    }
    return accept;
  };

  const currentMaxFiles = allowMultiple ? maxFiles : 1;

  const onDropHandler = (
    acceptedFiles: File[],
    fileRejections: FileRejection[]
  ) => {
    if (fileRejections.length > 0) {
      for (const rejection of fileRejections) {
        for (const error of rejection.errors) {
          toast.error(
            `File "${rejection.file.name}": ${error.code === "file-too-large" ? `Exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit.` : error.code === "file-invalid-type" ? "Type not allowed." : error.message}`
          );
        }
      }
    }

    let filesToAdd = acceptedFiles;
    if (acceptedFiles.length + filesWithProgress.length > currentMaxFiles) {
      toast.error(
        `Cannot add all files. Max ${currentMaxFiles} file(s) allowed.`
      );
      filesToAdd = acceptedFiles.slice(
        0,
        currentMaxFiles - filesWithProgress.length
      );
      if (filesToAdd.length === 0) return;
    }

    const newFilesWithProgress = filesToAdd
      .map((file) => {
        const parsed = parseDocumentFile(file);
        const applicationAllowedTypes: Doc<"documents">["type"][] = Object.keys(
          DOCUMENT_MIME_TYPES_CONFIG
        ).filter(
          (key) =>
            DOCUMENT_MIME_TYPES_CONFIG[
              key as keyof typeof DOCUMENT_MIME_TYPES_CONFIG
            ]
        ) as Doc<"documents">["type"][];

        if (!allowedTypes.includes(parsed.type as Doc<"documents">["type"])) {
          toast.error(
            `File type "${parsed.type.toUpperCase()}" for "${file.name}" is not allowed for this upload session.`
          );
          return null;
        }
        if (
          !applicationAllowedTypes.includes(
            parsed.type as Doc<"documents">["type"]
          )
        ) {
          toast.error(
            `File "${file.name}" appears to be of type "${parsed.type.toUpperCase()}", which is not a supported document format.`
          );
          return null;
        }

        return {
          file,
          uploading: false,
          parsedType: parsed.type as Doc<"documents">["type"],
          parsedContentType: parsed.contentType,
        };
      })
      .filter((item): item is FileWithProgress => item !== null);

    setFilesWithProgress((prev) =>
      [...prev, ...newFilesWithProgress].slice(0, currentMaxFiles)
    );
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: onDropHandler,
    accept: generateAcceptTypes(),
    maxSize: MAX_FILE_SIZE_BYTES,
    maxFiles: maxFiles,
    multiple: allowMultiple,
    noClick: true,
  });

  const handleUploadAndSelect = async () => {
    if (!currentProject || filesWithProgress.length === 0) return;

    const usedStorage = totalDocumentSizeStored ?? 0;
    const currentUploadBatchSize = filesWithProgress.reduce(
      (acc, item) => acc + item.file.size,
      0
    );

    if (usedStorage + currentUploadBatchSize > MAX_STORAGE_BYTES) {
      toast.error("Not enough storage space.", {
        description: "Uploading these files would exceed your storage limit.",
      });
      return;
    }

    setIsOverallUploading(true);
    setFilesWithProgress((prev) =>
      prev.map((item) => ({
        ...item,
        uploading: true,
        error: undefined,
        key: undefined,
      }))
    );

    const uploadedDocuments: SelectedDocumentItem[] = [];

    for (let i = 0; i < filesWithProgress.length; i++) {
      const item = filesWithProgress[i];
      if (item.key || item.error) continue; // Already processed or has a persistent error

      // Double check type client-side before upload, parseDocumentFile is source of truth
      const parsedInfo = parseDocumentFile(item.file);
      if (!allowedTypes.includes(parsedInfo.type as Doc<"documents">["type"])) {
        const errorMsg = `File type "${parsedInfo.type.toUpperCase()}" for "${item.file.name}" is not allowed.`;
        setFilesWithProgress((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, uploading: false, error: errorMsg } : f
          )
        );
        toast.error(errorMsg);
        continue;
      }

      try {
        const r2Key = await uploadFileHelper(item.file);

        const documentId = await createDocumentAction({
          key: r2Key,
          name: item.file.name,
          contentType: parsedInfo.contentType,
          size: item.file.size,
          type: parsedInfo.type as Doc<"documents">["type"],
          knowledgeBases:
            isKnowledgeBaseEnabled && selectedKnowledgeBase
              ? [selectedKnowledgeBase]
              : undefined,
        });

        setFilesWithProgress((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, uploading: false, key: r2Key } : f
          )
        );
        uploadedDocuments.push({
          id: documentId,
          url: `${NEXT_PUBLIC_R2_PUBLIC_URL}/${r2Key}`,
          key: r2Key,
          fileName: item.file.name,
          type: parsedInfo.type as Doc<"documents">["type"],
          contentType: parsedInfo.contentType,
          size: item.file.size,
        });
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : `Failed to upload ${item.file.name}`;
        toast.error(`Upload error for ${item.file.name}: ${errorMsg}`);
        setFilesWithProgress((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, uploading: false, error: errorMsg } : f
          )
        );
      }
    }

    setIsOverallUploading(false);

    if (uploadedDocuments.length > 0) {
      onSelect(uploadedDocuments);
      if (
        uploadedDocuments.length ===
        filesWithProgress.filter((f) => !f.error && !f.key).length
      ) {
        // All pending files uploaded successfully
        toast.success(
          `${uploadedDocuments.length} document${uploadedDocuments.length > 1 ? "s" : ""} uploaded successfully!`
        );
        setIsOpen(false);
      } else {
        toast.info(
          `${uploadedDocuments.length} document${uploadedDocuments.length > 1 ? "s" : ""} uploaded. Some files may have failed.`
        );
        // Keep files with errors for review
        setFilesWithProgress((prev) => prev.filter((f) => f.error || !f.key));
      }
    } else if (filesWithProgress.some((f) => f.error)) {
      toast.warning("No documents were uploaded. Please review errors.");
    }
  };

  const removeFile = (fileName: string, fileLastModified: number) => {
    setFilesWithProgress((prev) =>
      prev.filter(
        (item) =>
          !(
            item.file.name === fileName &&
            item.file.lastModified === fileLastModified
          )
      )
    );
  };

  const hasFiles = filesWithProgress.length > 0;
  const filesReadyToUploadCount = filesWithProgress.filter(
    (f) => !f.key && !f.error && !f.uploading
  ).length;

  return (
    <div
      className={cn(
        "relative flex flex-col w-full h-full overflow-hidden",
        !hasFiles && "p-4"
      )}
      {...getRootProps()}
    >
      <input {...getInputProps()} />

      {!hasFiles ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center w-full h-full p-6 border-2 border-dashed rounded-md transition-colors duration-300 ease-in-out",
            isDragActive
              ? "bg-muted border-muted-foreground/20"
              : "border-border/50",
            allowedTypes.length === 0 && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center justify-center p-4 mb-4 border rounded-full bg-muted">
            <Upload className="size-8 animate-pulse text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">Drag & drop documents here</p>
            <p className="max-w-xs mt-1 text-xs text-muted-foreground">
              Allowed types: {allowedTypes.join(", ").toUpperCase() || "None"}.
              Max {currentMaxFiles} file{currentMaxFiles > 1 ? "s" : ""}, up to{" "}
              {MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB each.
            </p>
          </div>
          <Button
            size="sm"
            className="mt-4"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            disabled={allowedTypes.length === 0 || isOverallUploading}
          >
            Browse Files
          </Button>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="px-4 pt-3 font-medium">
            Files{" "}
            <span className="text-sm text-muted-foreground">
              ({filesWithProgress.length}/{currentMaxFiles})
            </span>
          </div>
          <AnimatePresence initial={false}>
            <motion.div
              layout
              className="flex-1 px-4 pt-3 pb-4 space-y-3 overflow-y-auto"
            >
              {filesWithProgress.map((item) => (
                <UploadListItem
                  key={`${item.file.name}-${item.file.lastModified}`}
                  item={item}
                  onRemove={() =>
                    removeFile(item.file.name, item.file.lastModified)
                  }
                />
              ))}
              {allowMultiple && filesWithProgress.length < currentMaxFiles && (
                <motion.button
                  layout
                  onClick={(e) => {
                    e.stopPropagation();
                    open();
                  }}
                  disabled={
                    isOverallUploading ||
                    filesWithProgress.length >= currentMaxFiles
                  }
                  className="flex items-center justify-center w-full h-12 gap-2 text-sm border-2 border-dashed rounded-md border-border/50 text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="size-4" /> Add More Files
                </motion.button>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Knowledge Base Selection Section - Added */}
          {hasFiles && (
            <motion.div
              className="flex flex-col gap-2 px-4 py-2 mt-auto"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.2 }}
            >
              <div className="flex items-center justify-between px-4 py-2 border rounded-md shadow-sm bg-background-subtle">
                <div className="flex items-center gap-4">
                  <Switch
                    id="knowledge-base-switch"
                    checked={isKnowledgeBaseEnabled}
                    onCheckedChange={setIsKnowledgeBaseEnabled}
                    disabled={isOverallUploading}
                  />
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="knowledge-base-switch"
                      className={cn(
                        "text-sm font-medium transition-colors duration-300 ease-in-out cursor-pointer",
                        !isKnowledgeBaseEnabled && "text-muted-foreground"
                      )}
                    >
                      Add to Knowledge Bases
                    </label>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="iconSm"
                          className={cn(
                            "text-muted-foreground transition-colors duration-300 ease-in-out",
                            !isKnowledgeBaseEnabled &&
                              "opacity-50 cursor-not-allowed"
                          )}
                          disabled={
                            !isKnowledgeBaseEnabled || isOverallUploading
                          }
                        >
                          <CircleHelp className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        sideOffset={5}
                        className="max-w-xs"
                      >
                        Knowledge Bases help AI bots answer questions based on
                        these documents.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <Select
                  onValueChange={(value: string) =>
                    setSelectedKnowledgeBase(value as Id<"knowledgeBases">)
                  }
                  value={selectedKnowledgeBase ?? undefined}
                  disabled={!isKnowledgeBaseEnabled || isOverallUploading}
                >
                  <SelectTrigger
                    className={cn(
                      "h-8 transition-opacity duration-300 ease-in-out max-w-fit",
                      !isKnowledgeBaseEnabled && "opacity-50"
                    )}
                  >
                    <SelectValue placeholder="Select a knowledge base" />
                  </SelectTrigger>
                  <SelectContent>
                    {knowledgeBases?.map((knowledgeBase) => (
                      <SelectItem
                        key={knowledgeBase._id}
                        value={knowledgeBase._id}
                      >
                        {knowledgeBase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
          {/* End Knowledge Base Selection Section */}

          <div className="flex justify-end gap-2 px-4 py-2 mt-auto border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFilesWithProgress([])}
              disabled={isOverallUploading}
            >
              Clear All
            </Button>
            <Button
              size="sm"
              onClick={handleUploadAndSelect}
              disabled={isOverallUploading || filesReadyToUploadCount === 0}
            >
              {isOverallUploading
                ? "Uploading..."
                : `Upload & Select (${filesReadyToUploadCount})`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const getTypeColor = (type: Doc<"documents">["type"]) => {
  switch (type) {
    case "md":
      return { text: "text-blue-600" };
    case "html":
      return { text: "text-orange-600" };
    case "txt":
      return { text: "text-gray-600" };
    case "pdf":
      return { text: "text-red-600" };
    case "csv":
      return { text: "text-green-600" };
    case "docx":
      return { text: "text-indigo-600" };
    default:
      return { text: "text-brand" };
  }
};

// Internal component to render each file item
const UploadListItem = ({
  item,
  onRemove,
}: {
  item: FileWithProgress;
  onRemove: () => void;
}) => {
  const fileName = item.file.name;
  const error = item.error;
  const isError = error && error !== "";
  const isSuccess = !error && item.key && !item.uploading;
  const isUploading = item.uploading && !item.key && !error;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10, transition: { duration: 0.15 } }}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 border rounded-md",
        item.error && "border-destructive bg-destructive/5",
        item.key && !item.error && "border-green-500 bg-green-500/5",
        item.uploading && "bg-muted/50"
      )}
    >
      <div className="flex items-center flex-1 max-w-full gap-3 overflow-hidden">
        <div
          className={cn(
            "flex relative items-center justify-center size-12 text-xs font-semibold bg-background-subtle border rounded-md shrink-0",
            getTypeColor(fileName.split(".").pop() as Doc<"documents">["type"])
              .text
          )}
        >
          <span
            className={cn(
              "text-xs font-semibold",
              (isSuccess || isError || isUploading) && "hidden"
            )}
          >
            {fileName.split(".").pop()?.toUpperCase()}
          </span>
          {isUploading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-muted/90">
              <Spinner size="sm" />
            </div>
          )}
          {isSuccess && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-success/10">
              <Check className="text-success size-8" />
            </div>
          )}
          {isError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-destructive/10">
              <AlertCircle className="text-destructive size-8" />
            </div>
          )}
        </div>
        <div className="flex-1 max-w-full min-w-0 overflow-hidden truncate">
          <p className="text-sm font-medium truncate text-foreground">
            {fileName}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(item.file.size, "MB", 2)} MB
          </p>
          {error && (
            <p className="text-xs truncate text-destructive">{error}</p>
          )}
        </div>
      </div>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            size="iconSm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={onRemove}
            disabled={item.uploading}
          >
            <X className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Remove</TooltipContent>
      </Tooltip>
    </motion.div>
  );
};
