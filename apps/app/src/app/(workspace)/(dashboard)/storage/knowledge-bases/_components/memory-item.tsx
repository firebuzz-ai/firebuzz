import type { Doc } from "@firebuzz/convex";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@firebuzz/ui/components/ui/card";

interface MemoryItemProps {
	data: Omit<Doc<"documents">, "createdBy"> & {
		createdBy: Doc<"users"> | null;
	};
}

export const MemoryItem = ({ data }: MemoryItemProps) => {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">
					{data.name || "Untitled Memory"}
				</CardTitle>
				{data.createdBy && (
					<CardDescription>
						Created by: {data.createdBy.firstName || "Unknown User"}
					</CardDescription>
				)}
			</CardHeader>
		</Card>
	);
};
