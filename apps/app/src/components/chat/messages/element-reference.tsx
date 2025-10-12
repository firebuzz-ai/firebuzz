import { Badge } from "@firebuzz/ui/components/ui/badge";
import {
	ChevronRight,
	CornerDownRight,
	MousePointerClick,
} from "@firebuzz/ui/icons/lucide";
import type { SelectedElement } from "@/lib/workbench/atoms";

interface ElementReferenceProps {
	message: string;
	element: SelectedElement;
}

export const ElementReference = ({
	message,
	element,
}: ElementReferenceProps) => {
	if (!element) {
		return <p>{message}</p>;
	}

	return (
		<div className="space-y-2">
			{/* Reference */}
			<Badge variant="emerald">
				<div className="flex items-center gap-1 overflow-hidden">
					<MousePointerClick className="size-3" />
					<div className="truncate">{element.filePath}</div>
					<ChevronRight className="size-3" />
					<div className="truncate">{element.componentName.split("(")[0]}</div>
				</div>
			</Badge>
			{/* Message */}
			<div className="flex items-center gap-1">
				<CornerDownRight className="w-4 h-4" />
				<p className="whitespace-pre-wrap">{message}</p>
			</div>
		</div>
	);
};
