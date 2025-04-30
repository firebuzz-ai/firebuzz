import { useAIImageModal } from "@/hooks/ui/use-ai-image-modal";
import { useNewMediaModal } from "@/hooks/ui/use-new-media-modal";
import type { Doc } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@firebuzz/ui/components/ui/dropdown-menu";
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
import {
  ChevronDown,
  Filter,
  Layers2,
  Search,
  SortAsc,
  Upload,
  Wand,
} from "@firebuzz/ui/icons/lucide";
import { motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";
import { useDebounce } from "use-debounce";

interface ControlsProps {
  open: () => void;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  sourceType: Doc<"media">["source"] | "all";
  setSourceType: Dispatch<SetStateAction<Doc<"media">["source"] | "all">>;
  sortOrder: "asc" | "desc";
  setSortOrder: Dispatch<SetStateAction<"asc" | "desc">>;
}

export const Controls = ({
  searchQuery,
  setSearchQuery,
  sourceType,
  setSourceType,
  sortOrder,
  setSortOrder,
}: ControlsProps) => {
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);
  const { setState } = useNewMediaModal();
  const { setIsOpen: setAIImageModalIsOpen } = useAIImageModal();

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
              placeholder="Search by name"
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
              value={sourceType}
              onValueChange={(value) =>
                setSourceType(value as Doc<"media">["source"])
              }
            >
              <SelectTrigger className="w-full h-8 max-w-48">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5" />
                  <SelectValue placeholder="All types" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="uploaded">Uploaded</SelectItem>
                <SelectItem value="ai-generated">AI Generated</SelectItem>
                <SelectItem value="unsplash">Unsplash</SelectItem>
              </SelectContent>
            </Select>

            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="w-8 h-8"
                  disabled={debouncedSearchQuery !== ""}
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
          <DropdownMenu>
            <DropdownMenuTrigger className="group" asChild>
              <Button variant="outline" className="h-8 !p-0">
                <div className="pl-3">New Media</div>
                <div className="flex items-center justify-center h-full pl-2 pr-2 border-l">
                  <ChevronDown className="transition-transform duration-100 ease-in-out !size-3.5 group-aria-expanded:rotate-180" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" sideOffset={10}>
              <DropdownMenuItem
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    type: "upload",
                    isOpen: true,
                  }))
                }
              >
                <Upload className="w-4 h-4" />
                Upload
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    type: "unsplash",
                    isOpen: true,
                  }))
                }
              >
                <Layers2 className="w-4 h-4" />
                Unsplash
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAIImageModalIsOpen(true)}>
                <Wand className="w-4 h-4" />
                Generate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Separator orientation="vertical" className="h-5" />
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <SidebarTrigger
                variant="outline"
                side="right"
                name="images-sidebar"
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
