import type { Doc } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Input } from "@firebuzz/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@firebuzz/ui/components/ui/select";
import { Separator } from "@firebuzz/ui/components/ui/separator";
import { SidebarTrigger } from "@firebuzz/ui/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Filter, Plus, Search, SortAsc } from "@firebuzz/ui/icons/lucide";
import { motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";
import { useDebounce } from "use-debounce";
import { useNewDocumentModal } from "./modals/new-document/use-new-document-modal";

interface ControlsProps {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  type: Doc<"documents">["type"] | "all"; // Changed from media source to document type
  setType: Dispatch<SetStateAction<Doc<"documents">["type"] | "all">>;
  sortOrder: "asc" | "desc";
  setSortOrder: Dispatch<SetStateAction<"asc" | "desc">>;
}

export const Controls = ({
  searchQuery,
  setSearchQuery,
  type,
  setType,
  sortOrder,
  setSortOrder,
}: ControlsProps) => {
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
  const { setState } = useNewDocumentModal();

  const documentTypes = [
    {
      label: "All",
      value: "all",
    },
    {
      label: "Markdown",
      value: "md",
    },
    {
      label: "CSV",
      value: "csv",
    },
    {
      label: "Text",
      value: "txt",
    },
    {
      label: "PDF",
      value: "pdf",
    },
    {
      label: "Word",
      value: "docx",
    },
    {
      label: "HTML",
      value: "html",
    },
  ] as const;

  const handleOpenNewDocumentModal = () => {
    setState((prev) => ({
      ...prev,
      isOpen: true,
      isKnowledgeBaseEnabled: false,
      files: [],
    }));
  };

  return (
    <div className="flex flex-col gap-2 px-4 py-3 border-b max-h-min border-border">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        {/* Left Part */}
        <div>
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
            <Input
              type="search"
              className="w-full h-8 pl-8"
              placeholder="Search by name" // Placeholder can remain generic or be updated
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Right Part */}
        <div className="flex items-center justify-end flex-1 gap-4">
          {/* Filters row */}
          <div className="flex items-center justify-end flex-1 gap-2">
            <Select
              value={type}
              onValueChange={(value) =>
                setType(value as Doc<"documents">["type"] | "all")
              }
            >
              <SelectTrigger className="w-full h-8 max-w-48">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5" />
                  <SelectValue placeholder="All types" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((docType) => (
                  <SelectItem key={docType.value} value={docType.value}>
                    {docType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="w-8 h-8"
                  disabled={debouncedSearchQuery !== ""} // Assuming same logic for search disabling sort
                  onClick={() =>
                    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
                  }
                >
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: sortOrder === "desc" ? 0 : 180 }}
                    transition={{ duration: 0.1 }}
                  >
                    <SortAsc className="w-3.5 h-3.5" />
                  </motion.div>
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={10}>Sort</TooltipContent>
            </Tooltip>
          </div>
          <Separator orientation="vertical" className="h-5" />
          <Button
            variant="outline"
            className="h-8"
            onClick={handleOpenNewDocumentModal}
          >
            <Plus className="!size-3.5" />
            <div>New Document</div>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <SidebarTrigger
                variant="outline"
                side="right"
                name="documents-sidebar" // Changed to documents-sidebar
                className="!h-8 !w-8"
              />
            </TooltipTrigger>
            <TooltipContent sideOffset={10} className="flex items-center gap-2">
              <p>Toggle Sidebar</p>

              <kbd className="text-xs text-muted-foreground">⌘+L</kbd>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
