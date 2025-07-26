import { Button } from "@firebuzz/ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@firebuzz/ui/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { Filter, SortAsc } from "@firebuzz/ui/icons/lucide";
import { motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";

interface ControlsProps {
  submissionType: "all" | "live" | "test";
  setSubmissionType: Dispatch<SetStateAction<"all" | "live" | "test">>;
  sortOrder: "asc" | "desc";
  setSortOrder: Dispatch<SetStateAction<"asc" | "desc">>;
}

export const Controls = ({
  submissionType,
  setSubmissionType,
  sortOrder,
  setSortOrder,
}: ControlsProps) => {
  return (
    <div className="flex flex-col gap-2 max-h-min px-4 py-3 border-b border-border">
      {/* Controls */}
      <div className="flex items-center gap-2 justify-between">
        {/* Left Part - Form Data Title */}
        <div>
          <h2 className="text-lg font-semibold">Form Submissions</h2>
        </div>

        {/* Right Part */}
        <div className="flex items-center justify-end gap-4 flex-1">
          {/* Filters row */}
          <div className="flex items-center flex-1 justify-end gap-2">
            <Select
              value={submissionType}
              onValueChange={(value) =>
                setSubmissionType(value as "all" | "live" | "test")
              }
            >
              <SelectTrigger className="h-8 w-full max-w-48">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5" />
                  <SelectValue placeholder="All submissions" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Submissions</SelectItem>
                <SelectItem value="live">Live Submissions</SelectItem>
                <SelectItem value="test">Test Submissions</SelectItem>
              </SelectContent>
            </Select>

            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="h-8 w-8"
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
              <TooltipContent sideOffset={10}>Sort by date</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};
