import { Badge } from "@firebuzz/ui/components/ui/badge";
import { ChevronRight, History } from "@firebuzz/ui/icons/lucide";

interface VersionReferenceProps {
	version: {
		versionId: string;
		versionNumber: number;
	};
}

export const VersionReference = ({ version }: VersionReferenceProps) => {
	return (
		<div className="flex items-center gap-1">
			<Badge className="flex items-center gap-1 max-w-fit">
				<History className="size-3" /> Restored
			</Badge>
			<ChevronRight className="size-3" />
			<Badge variant="outline">Version {version.versionNumber}</Badge>
		</div>
	);
};
