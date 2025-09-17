import { AlertCircle } from "@firebuzz/ui/icons/lucide";

export interface UnpublishedStateProps {
  title?: string;
  description?: string;
}

export const UnpublishedState = ({
  title = "No analytics data available",
  description = "Analytics data will be available once your campaign is published and starts receiving traffic.",
}: UnpublishedStateProps) => {
  return (
    <div className="flex flex-col flex-1 gap-2 justify-center items-center px-6 pt-6">
      <div className="p-2 rounded-md border bg-muted">
        <AlertCircle className="text-amber-500 animate-pulse size-6" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-muted-foreground">{title}</h3>
        <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};
