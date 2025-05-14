import { TextShimmer } from "@firebuzz/ui/components/reusable/text-shimmer";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { ChevronDown, ChevronRight } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import type { ToolInvocation } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

interface ToolCallProps {
  toolCall: ToolInvocation;
}

export const ReadDocument = ({ toolCall }: ToolCallProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongDocument = toolCall.state === "result" && toolCall.result.isLong;

  const content = useMemo(() => {
    const isResult = toolCall.state === "result";
    const isSuccess = isResult && toolCall.result.success;
    const isLongContent = isResult && toolCall.result.isLong;
    const summary = isResult && toolCall.result.summary;
    const contents = isResult && toolCall.result.contents;

    if (isResult && !isSuccess) return toolCall.result.message;

    if (isResult && isSuccess && isLongContent) {
      return `${summary}`;
    }

    if (isResult && isSuccess && !isLongContent) {
      const content = contents.join("\n");
      if (content.length > 500) {
        return `${content.slice(0, 500)}...`;
      }
      return content;
    }

    return "...";
  }, [toolCall]);
  const status = toolCall.state;
  const result =
    toolCall.state === "result"
      ? (toolCall.result as
          | {
              success: true;
              content: string;
            }
          | {
              success: false;
              message: string;
            })
      : undefined;
  return (
    <div className="mb-2 overflow-hidden border rounded-md">
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 bg-muted/30",
          { "border-b": isExpanded }
        )}
      >
        <div className="flex items-center gap-1">
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
            Read Document
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

              {result && (
                <div>
                  <div>
                    <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                      Result:{" "}
                      <Badge variant="outline" className="ml-1">
                        {result?.success ? "Success" : "Failed"}
                      </Badge>
                    </h4>
                    <h4 className="mb-1 text-xs font-medium text-muted-foreground">
                      Document Length:{" "}
                      <Badge variant="outline" className="ml-1">
                        {isLongDocument ? "Long" : "Short"}
                      </Badge>
                    </h4>
                  </div>
                  <div className="p-2 overflow-x-auto text-xs rounded-sm bg-muted/50">
                    {content}
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
