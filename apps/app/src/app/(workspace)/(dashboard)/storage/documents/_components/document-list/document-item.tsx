"use client";

import type { Doc } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Maximize } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { formatRelativeTimeShort } from "@firebuzz/utils";
import { motion } from "motion/react";
import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import type { Dispatch, SetStateAction } from "react";

interface DocumentItemProps {
  document: Doc<"documents">;
  selected: string[];
  setSelected: Dispatch<SetStateAction<string[]>>;
}

// documentTypes constant for useQueryStates
const documentTypes = [
  "md",
  "html",
  "txt",
  "pdf",
  "csv",
  "docx",
  "json",
] as const;

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

const DocumentTypeDisplay = ({ type }: { type: Doc<"documents">["type"] }) => {
  const { text } = getTypeColor(type);

  return (
    <div
      className={cn(
        "flex items-center justify-center size-10 font-semibold border rounded-md shrink-0 overflow-hidden"
      )}
    >
      <div
        className={cn(
          text,
          "w-full flex items-center justify-center text-[0.6rem]"
        )}
      >
        {type?.toUpperCase() || "DOC"}
      </div>
    </div>
  );
};

export const DocumentItem = ({
  document,
  selected,
  setSelected,
}: DocumentItemProps) => {
  const [_documentState, setDocumentState] = useQueryStates(
    {
      documentId: parseAsString,
      documentKey: parseAsString,
      documentType: parseAsStringEnum([...documentTypes]),
    },
    {
      urlKeys: {
        documentId: "docId",
        documentKey: "docKey",
        documentType: "docType",
      },
    }
  );
  const isSelected = selected.includes(document._id);

  const handleSelection = () => {
    setSelected((prev) =>
      prev.includes(document._id)
        ? prev.filter((id) => id !== document._id)
        : [...prev, document._id]
    );
  };

  const handleDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDocumentState({
      documentId: document._id,
      documentKey: document.key, // Assuming document.key exists
      documentType: document.type,
    });
  };

  return (
    <motion.div
      onClick={handleSelection}
      layoutId={`document-${document._id}`}
      key={document._id}
      className={cn(
        "flex items-center p-3 relative bg-background rounded-md border border-border hover:bg-muted/50 overflow-hidden cursor-default transition-colors duration-100 ease-in-out gap-3",
        isSelected && "border-brand bg-brand/5"
      )}
    >
      {/* Left: Document Type Display */}
      <div className={cn(document.isArchived && "opacity-50 grayscale")}>
        <DocumentTypeDisplay type={document.type} />
      </div>

      {/* Middle: Document info */}
      <div className="flex flex-col flex-1 min-w-0">
        <h3 className="text-sm font-bold truncate">{document.name}</h3>
        <p className="text-xs text-muted-foreground">
          {formatRelativeTimeShort(document._creationTime)} ago
        </p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={handleDetailClick}
            >
              <Maximize className="!size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            View details
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
};
