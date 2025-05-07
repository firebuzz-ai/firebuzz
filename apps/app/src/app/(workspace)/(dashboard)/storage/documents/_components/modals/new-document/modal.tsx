"use client";

import { useProject } from "@/hooks/auth/use-project";
import {
  type Id,
  api,
  useCachedQuery,
  useMutation,
  useUploadFile,
} from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@firebuzz/ui/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { Switch } from "@firebuzz/ui/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { CircleHelp, Plus, Upload } from "@firebuzz/ui/icons/lucide";
import { cn, toast } from "@firebuzz/ui/lib/utils";
import { parseDocumentFile } from "@firebuzz/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { UploadItem } from "./upload-item";
import { useNewDocumentModal } from "./use-new-document-modal";

interface FileWithProgress {
  file: File;
  uploading: boolean;
  key?: string;
  error?: string;
}

const MAX_FILES_PER_UPLOAD = 5;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export function NewDocumentModal() {
  const {
    isOpen,
    setIsOpen,
    files: initialFiles,
    setFiles: setInitialFiles,
    isMemoryEnabled,
    setIsMemoryEnabled,
    selectedMemory,
    setSelectedMemory,
  } = useNewDocumentModal();
  const [uploadState, setUploadState] = useState<"upload" | "files">("upload");
  const [filesWithProgress, setFilesWithProgress] = useState<
    FileWithProgress[]
  >([]);
  const { currentProject } = useProject();

  const uploadFile = useUploadFile(api.helpers.r2);
  const createDocument = useMutation(
    api.collections.storage.documents.mutations.create
  );

  const totalSize = useCachedQuery(
    api.collections.storage.documents.queries.getTotalSize,
    currentProject
      ? {
          projectId: currentProject?._id,
        }
      : "skip"
  );

  const memories = useCachedQuery(api.collections.memory.queries.get);
  const MAX_STORAGE_BYTES = 1024 * 1024 * 1024; // 1GB, adjust as needed

  useEffect(() => {
    if (initialFiles.length > 0 && filesWithProgress.length === 0) {
      const newFilesToProcess = initialFiles.map((file) => ({
        file,
        uploading: false,
      }));
      setFilesWithProgress(newFilesToProcess);
      setUploadState("files");
    } else if (initialFiles.length === 0 && filesWithProgress.length > 0) {
      // This case handles external clearing of initialFiles, e.g. when modal is closed and re-opened quickly
      // or if another part of the app modifies useNewDocumentModal's files state.
      setFilesWithProgress([]);
      setUploadState("upload");
    } else if (
      initialFiles.length === 0 &&
      filesWithProgress.length === 0 &&
      uploadState === "files"
    ) {
      // If all files are removed from the 'files' view, switch back to 'upload' view
      setUploadState("upload");
    }
  }, [initialFiles, filesWithProgress, uploadState]);

  const onDrop = (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    let filesToAdd = acceptedFiles;
    if (fileRejections.length > 0) {
      handleDropRejected(fileRejections);
      // Process accepted files even if some were rejected
      if (filesToAdd.length === 0) return;
    }

    if (filesToAdd.length + filesWithProgress.length > MAX_FILES_PER_UPLOAD) {
      toast.error(
        `You can only upload up to ${MAX_FILES_PER_UPLOAD} files at a time.`
      );
      // Take only enough files to not exceed the max limit
      filesToAdd = filesToAdd.slice(
        0,
        MAX_FILES_PER_UPLOAD - filesWithProgress.length
      );
      if (filesToAdd.length === 0) return; // No files left to add
    }

    const newFiles = filesToAdd.map((file) => ({
      file,
      uploading: false,
    }));

    setInitialFiles((prev) => [...prev, ...filesToAdd]);
    setFilesWithProgress((prev) => [...prev, ...newFiles]);
    setUploadState("files");
  };

  const handleDropRejected = (fileRejections: FileRejection[]) => {
    for (const rejection of fileRejections) {
      for (const error of rejection.errors) {
        if (error.code === "file-too-large") {
          toast.error(
            `File "${rejection.file.name}" is too large. Max size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`
          );
        } else if (error.code === "file-invalid-type") {
          toast.error(`File "${rejection.file.name}" type is not allowed.`);
        } else if (error.code === "too-many-files") {
          // This specific case should be handled by the main onDrop logic, but as a fallback:
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
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected: handleDropRejected,
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
      // Add more supported document types here
    },
    maxSize: MAX_FILE_SIZE_BYTES,
    maxFiles: MAX_FILES_PER_UPLOAD,
    noClick: true,
    multiple: true,
  });

  const handleUpload = async () => {
    if (!currentProject) {
      toast.error("No active project selected.");
      return;
    }

    const totalUploadSize = filesWithProgress.reduce(
      (acc, item) => acc + item.file.size,
      0
    );
    if ((totalSize ?? 0) + totalUploadSize > MAX_STORAGE_BYTES) {
      toast.error("Not enough storage space.");
      return;
    }

    setFilesWithProgress(
      (prev) =>
        prev.map((item) => ({
          ...item,
          uploading: true,
          error: undefined,
          key: undefined,
        })) // Reset key/error, set uploading
    );

    let allSucceeded = true;
    const results = await Promise.all(
      filesWithProgress.map(async (item) => {
        if (item.file.size > MAX_FILE_SIZE_BYTES) {
          const errorMsg = `File ${item.file.name} exceeds ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB size limit.`;
          toast.error(errorMsg);
          allSucceeded = false;
          return { ...item, uploading: false, error: errorMsg, key: undefined };
        }
        try {
          const parsedDocumentType = parseDocumentFile(item.file);

          if (parsedDocumentType.type === "unknown") {
            const errorMsg = `Unsupported file type: ${item.file.name}`;
            toast.error(errorMsg);
            allSucceeded = false;
            return {
              ...item,
              uploading: false,
              error: errorMsg,
              key: undefined,
            };
          }

          const r2Key = await uploadFile(item.file);

          await createDocument({
            key: r2Key,
            name: item.file.name,
            contentType: parsedDocumentType.contentType,
            size: parsedDocumentType.size,
            type: parsedDocumentType.type,
            memories:
              isMemoryEnabled && selectedMemory
                ? [selectedMemory as Id<"memories">]
                : [],
          });
          return { ...item, uploading: false, key: r2Key, error: undefined };
        } catch (error) {
          allSucceeded = false;
          const errorMsg =
            error instanceof Error
              ? `Failed to upload ${item.file.name}: ${error.message}`
              : `Unknown error uploading ${item.file.name}`;
          toast.error(errorMsg);
          return { ...item, uploading: false, error: errorMsg, key: undefined };
        }
      })
    );

    setFilesWithProgress(results);

    if (allSucceeded) {
      toast.success("All documents uploaded successfully!");
      setInitialFiles([]);
      setFilesWithProgress([]);
      setIsOpen(false);
      // Ensure uploadState is reset if modal is kept open for some reason.
      if (filesWithProgress.length === 0) {
        setUploadState("upload");
      }
    } else {
      toast.warning("Some documents failed to upload. Please review.");
      // Filter out successfully uploaded files, keep only those with errors or not attempted (though all should be attempted)
      const filesToKeep = results.filter((item) => item.error);
      setFilesWithProgress(filesToKeep);
      setInitialFiles((prevInitialFiles) =>
        prevInitialFiles.filter((pf) =>
          filesToKeep.some((ftk) => ftk.file === pf)
        )
      );
      if (filesToKeep.length === 0) {
        // If all errors were somehow cleared or there were no actual errors to keep
        setUploadState("upload");
      }
    }
  };

  const removeFile = (fileToRemove: File) => {
    setInitialFiles((prevFiles) => prevFiles.filter((f) => f !== fileToRemove));
    setFilesWithProgress((prevItems) =>
      prevItems.filter((item) => item.file !== fileToRemove)
    );
    if (filesWithProgress.length === 1) {
      // If it was the last file
      setUploadState("upload");
    }
  };

  const handleCancel = () => {
    setInitialFiles([]);
    setFilesWithProgress([]);
    setIsOpen(false);
    // uploadState will be reset by useEffect due to initialFiles and filesWithProgress becoming empty
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleCancel(); // Ensure cleanup on close via 'x' or overlay click
        }
        setIsOpen(open);
      }}
    >
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-[650px] h-[70vh] overflow-hidden flex flex-col p-0 gap-4"
      >
        <DialogHeader className="px-4 py-4 border-b">
          <DialogTitle>Upload New Documents</DialogTitle>
          {uploadState === "upload" && (
            <DialogDescription>
              Drag and drop your files or click browse. Up to{" "}
              {MAX_FILES_PER_UPLOAD} files,{" "}
              {MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB each.
            </DialogDescription>
          )}
        </DialogHeader>

        <AnimatePresence initial={false}>
          <div
            className="flex flex-col flex-1 max-h-full overflow-hidden"
            {...getRootProps()}
          >
            <input {...getInputProps()} />
            {uploadState === "files" && filesWithProgress.length > 0 && (
              <motion.div
                key="files-list"
                layout
                className="relative flex flex-col flex-1 max-w-full max-h-full gap-2 px-4 overflow-y-scroll"
              >
                <div className="font-medium">
                  Files{" "}
                  <span className="text-sm text-muted-foreground">
                    ({filesWithProgress.length})
                  </span>
                </div>
                <motion.div
                  key="files-list-items"
                  layout
                  className="max-w-full space-y-2"
                >
                  {filesWithProgress.map((item) => (
                    <motion.div
                      key={item.file.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{
                        opacity: 0,
                        x: -20,
                        transition: { duration: 0.2 },
                      }}
                    >
                      <UploadItem
                        file={item.file}
                        uploading={item.uploading}
                        key={item.key}
                        error={item.error}
                        onRemove={() => removeFile(item.file)}
                      />
                    </motion.div>
                  ))}

                  {/* Add More Files Button */}
                  {filesWithProgress.length < MAX_FILES_PER_UPLOAD && (
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{
                        opacity: 0,
                        x: -20,
                        transition: { duration: 0.2 },
                      }}
                      key="add-more"
                      onClick={() => {
                        console.log("add more");
                        open();
                      }}
                      disabled={
                        filesWithProgress.length >= MAX_FILES_PER_UPLOAD
                      }
                      className="flex items-center justify-center w-full h-16 gap-2 text-sm border-2 border-dashed rounded-md border-border/50 text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="size-4" /> Add More
                    </motion.button>
                  )}
                </motion.div>
              </motion.div>
            )}

            {uploadState === "upload" && (
              <motion.div
                className="relative flex flex-col w-full h-full px-4 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-full p-6 border-2 border-dashed rounded-md transition-colors duration-300 ease-in-out",
                    isDragActive ? "bg-muted border-muted-foreground/20" : ""
                  )}
                >
                  <div className="flex items-center justify-center p-4 mb-4 border rounded-full bg-muted">
                    <Upload className="size-8 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium">
                      Drag and drop document here
                    </p>
                    <p className="max-w-xs mt-1 text-xs text-muted-foreground">
                      Supported formats: PDF, DOCX, CSV, HTML, MDX or TXT WAV
                      and up to 5 files at a time.
                    </p>
                  </div>
                  <Button size="sm" className="mt-4" onClick={open}>
                    Browse Files
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Memory Settings */}

            {uploadState === "files" && (
              <motion.div
                className="flex flex-col gap-2 px-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  x: -20,
                  transition: { duration: 0.2 },
                }}
              >
                <div className="flex items-center justify-between px-4 py-2 border rounded-md shadow-sm bg-background-subtle">
                  <div className="flex items-center gap-4">
                    <Switch
                      checked={isMemoryEnabled}
                      onCheckedChange={setIsMemoryEnabled}
                    />
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "text-sm font-medium transition-colors duration-300 ease-in-out",
                          !isMemoryEnabled && "text-muted-foreground"
                        )}
                      >
                        Add to Knowledge Base
                      </p>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger
                          className="transition-colors duration-300 ease-in-out disabled:text-muted-foreground"
                          disabled={!isMemoryEnabled}
                        >
                          <CircleHelp className="size-3.5" />
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          sideOffset={10}
                          className="max-w-xs"
                        >
                          Knowledge Base is a collection of documents that are
                          used to help our AI bots answer questions related to
                          your brand.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <Select
                    onValueChange={setSelectedMemory}
                    value={selectedMemory ?? undefined}
                  >
                    <SelectTrigger
                      disabled={!isMemoryEnabled}
                      className="h-8 transition-opacity duration-300 ease-in-out max-w-fit"
                    >
                      <SelectValue placeholder="Select a memory" />
                    </SelectTrigger>
                    <SelectContent>
                      {memories?.map((memory) => (
                        <SelectItem key={memory._id} value={memory._id}>
                          {memory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </div>
        </AnimatePresence>

        <DialogFooter className="px-4 py-2 mt-auto border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={filesWithProgress.some((f) => f.uploading)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleUpload}
            disabled={
              filesWithProgress.length === 0 ||
              filesWithProgress.some((f) => f.uploading) ||
              filesWithProgress.every((f) => f.key || f.error) // Disable if all processed
            }
          >
            Upload{" "}
            {filesWithProgress.filter((f) => !f.key && !f.error).length > 0
              ? `(${filesWithProgress.filter((f) => !f.key && !f.error).length})`
              : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
