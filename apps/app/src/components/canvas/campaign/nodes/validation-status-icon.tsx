import { type Id, api, useCachedQuery } from "@firebuzz/convex";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { AlertCircle, CheckCircle2 } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { useParams } from "next/navigation";
import { useMemo } from "react";

interface ValidationStatusIconProps {
  nodeId: string;
  className?: string;
}

export const ValidationStatusIcon = ({
  nodeId,
  className,
}: ValidationStatusIconProps) => {
  const params = useParams();
  const campaignId = params.id as Id<"campaigns">;

  // Get validation data from server
  const validation = useCachedQuery(
    api.collections.campaigns.validation.getCampaignValidation,
    { campaignId }
  );

  const nodeValidation = useMemo(() => {
    if (!validation?.validationResults) return null;
    const nodeResult = validation.validationResults.find(
      (result) => result.nodeId === nodeId
    );
    return nodeResult?.validations || null;
  }, [validation?.validationResults, nodeId]);

  // Check if node has any errors
  const hasErrors = useMemo(() => {
    if (!nodeValidation) return false;
    return nodeValidation.some((item) => !item.isValid);
  }, [nodeValidation]);

  const errorMessages = useMemo(() => {
    if (!nodeValidation || !hasErrors) return [];
    return nodeValidation
      .filter((item) => !item.isValid)
      .map((item) => item.message);
  }, [nodeValidation, hasErrors]);

  // Don't render if no validation data
  if (!nodeValidation) return null;

  const Icon = hasErrors ? AlertCircle : CheckCircle2;
  const iconColor = hasErrors ? "text-red-500" : "text-green-500";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center p-1 rounded-md border bg-muted",
            className
          )}
        >
          <Icon
            className={cn("cursor-help size-3.5", iconColor)}
            aria-label={hasErrors ? "Validation errors" : "Validation passed"}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {hasErrors ? (
          <div className="space-y-1">
            <div className="font-medium text-red-500">Validation Issues:</div>
            <ul className="text-sm">
              {errorMessages.map((message: string, index: number) => (
                <li
                  key={`${message}-${
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    index
                  }`}
                  className="list-item list-inside"
                >
                  {message}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-sm text-green-600">All validations passed</div>
        )}
      </TooltipContent>
    </Tooltip>
  );
};
