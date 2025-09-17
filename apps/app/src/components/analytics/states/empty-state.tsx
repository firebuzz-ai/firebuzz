import { Activity } from "@firebuzz/ui/icons/lucide";

export interface EmptyStateProps {
	title?: string;
	description?: string;
}

export const EmptyState = ({
	title = "No data found",
	description = "This might be due to no conversions being recorded for this period",
}: EmptyStateProps) => {
	return (
		<div className="flex flex-col flex-1 gap-2 justify-center items-center px-6 pt-6">
			<div className="p-2 rounded-md border bg-muted">
				<Activity className="text-emerald-200 animate-pulse size-6" />
			</div>
			<div className="text-center">
				<h3 className="text-lg font-semibold">{title}</h3>
				<p className="max-w-xs text-sm text-muted-foreground">{description}</p>
			</div>
		</div>
	);
};
