import { TextShimmer } from "@firebuzz/ui/components/reusable/text-shimmer";
import { Button } from "@firebuzz/ui/components/ui/button";
import { ChevronDown, ChevronRight } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import type { ToolInvocation } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Markdown } from "../../markdown";

interface ToolCallProps {
  toolCall: ToolInvocation;
}

export const SearchStockImages = ({ toolCall }: ToolCallProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = toolCall.state;

  return (
    <div className="mb-2 overflow-hidden border rounded-md">
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 bg-muted/30",
          { "border-b": isExpanded }
        )}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-6 h-6 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </Button>
          <TextShimmer
            as="span"
            duration={1.5}
            className="ml-2 text-sm italic"
            active={status !== "result"}
          >
            Search stock images
          </TextShimmer>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 text-sm">
              <div className="mb-2">
                <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                  Arguments:
                </h4>
                <pre className="p-2 overflow-x-auto text-xs rounded-sm bg-muted/50">
                  {JSON.stringify(toolCall.args, null, 2)}
                </pre>
              </div>

              {toolCall.state === "result" && (
                <div>
                  <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                    Result:
                  </h4>
                  <div className="p-2 overflow-x-auto text-xs rounded-sm bg-muted/50">
                    {typeof toolCall.result === "string" ? (
                      <Markdown>
                        {JSON.stringify(toolCall.result, null, 2)}
                      </Markdown>
                    ) : (
                      <pre>{JSON.stringify(toolCall.result, null, 2)}</pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
