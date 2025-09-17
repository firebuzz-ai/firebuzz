import { Radio } from "@firebuzz/ui/icons/lucide";

export interface MismatchStateProps {
	title?: string;
	description?: string;
}

export const MismatchState = ({
	title = "No Production Data Available",
	description = "This campaign is in preview mode. Production analytics will be available after publishing your campaign.",
}: MismatchStateProps) => {
	return (
		<div className="flex flex-col flex-1 gap-2 justify-center items-center px-6 pt-6">
			<div className="p-2 rounded-md border bg-muted">
				<Radio className="animate-pulse text-brand size-6" />
			</div>
			<div className="text-center">
				<h3 className="text-lg font-semibold text-muted-foreground">{title}</h3>
				<p className="max-w-xs text-sm text-muted-foreground">{description}</p>
			</div>
		</div>
	);
};
