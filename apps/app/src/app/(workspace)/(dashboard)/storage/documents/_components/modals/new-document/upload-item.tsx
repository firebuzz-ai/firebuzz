"use client";

import type { Doc } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { AlertCircle, Check, X } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { formatFileSize } from "@firebuzz/utils";

interface UploadItemProps {
  file: File;
  onRemove: () => void;
  uploading: boolean;
  key?: string;
  error?: string;
  // progress?: number; // Optional: if you want to show fine-grained progress bar later
}

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

export function UploadItem({
  file,
  onRemove,
  uploading,
  key,
  error,
}: UploadItemProps) {
  const isError = error && error !== "";
  const isSuccess = !error && key && !uploading;
  const isUploading = uploading && !key && !error;
  return (
    <div
      className={cn(
        "relative flex items-center justify-between p-3 overflow-hidden transition-colors border rounded-md border-border bg-muted/30 mxa-w-full",
        error && "border-destructive bg-destructive/10"
      )}
    >
      <div className="flex items-center flex-1 max-w-full gap-3 overflow-hidden">
        <div
          className={cn(
            "flex relative items-center justify-center size-12 text-xs font-semibold bg-background-subtle border rounded-md shrink-0",
            getTypeColor(file.name.split(".").pop() as Doc<"documents">["type"])
              .text
          )}
        >
          <span
            className={cn(
              "text-xs font-semibold",
              (isSuccess || isError || isUploading) && "hidden"
            )}
          >
            {file.name.split(".").pop()?.toUpperCase()}
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
            {file.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size, "MB", 2)} MB
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
            disabled={uploading}
          >
            <X className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Remove</TooltipContent>
      </Tooltip>
    </div>
  );
}
