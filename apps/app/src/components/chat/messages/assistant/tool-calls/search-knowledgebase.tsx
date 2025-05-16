import type { Id } from "@firebuzz/convex";
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

type ResultItem = {
	id: string;
	score: number;
	content: string;
	chunkIndex: number;
	documentId: Id<"documents">;
	documentName: string;
	documentType: "md" | "html" | "txt" | "pdf" | "csv" | "docx";
	documentKey: string;
};

export const SearchKnowledgeBase = ({ toolCall }: ToolCallProps) => {
	const [isExpanded, setIsExpanded] = useState(false);

	const results = useMemo(() => {
		const isResult = toolCall.state === "result";
		const isSuccess = isResult && toolCall.result.success;

		if (isResult && isSuccess) {
			return toolCall.result.results as ResultItem[];
		}

		return [];
	}, [toolCall]);

	const status = toolCall.state;
	const result =
		toolCall.state === "result"
			? (toolCall.result as
					| {
							success: true;
							results: ResultItem[];
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
					{ "border-b": isExpanded },
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
						Search Memory
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
									<h4 className="mb-1 text-xs font-medium text-muted-foreground">
										Result:{" "}
										<Badge variant="outline" className="ml-1">
											{result?.success ? "Success" : "Failed"}
										</Badge>
									</h4>
									<div className="space-y-4">
										{results.map((result, index) => (
											<div className="space-y-2" key={result.id}>
												{/* Document Name */}
												<div className="flex items-center gap-1">
													{/* Index  */}
													<div className="px-1 text-xs rounded-full text-muted-foreground bg-muted/50 tabular-nums">
														{index + 1}
													</div>
													{/* Document Name */}
													<div className="text-xs text-muted-foreground">
														{result.documentName}
													</div>
												</div>
												{/* Content */}
												<div className="p-2 overflow-x-auto text-xs rounded-sm bg-muted/50">
													{result.content}
												</div>
											</div>
										))}
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
