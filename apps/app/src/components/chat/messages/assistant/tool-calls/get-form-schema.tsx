import { TextShimmer } from "@firebuzz/ui/components/reusable/text-shimmer";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { ChevronDown, ChevronRight, FileJson } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import type { ToolInvocation } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { CodeBlock } from "../../code-block";

interface ToolCallProps {
	toolCall: ToolInvocation;
}

export const GetFormSchema = ({ toolCall }: ToolCallProps) => {
	const [isExpanded, setIsExpanded] = useState(false);

	const content = useMemo(() => {
		if (toolCall.state !== "result") return "...";
		if (!toolCall.result.success) return toolCall.result.message;
		return JSON.stringify(toolCall.result.schema, null, 2);
	}, [toolCall]);

	const status = toolCall.state;
	const result =
		toolCall.state === "result"
			? (toolCall.result as
					| {
							success: true;
							schema: object;
					  }
					| {
							success: false;
							message: string;
					  })
			: undefined;

	return (
		<div className="overflow-hidden mb-2 rounded-md border">
			<div
				className={cn(
					"flex justify-between items-center px-3 py-2 bg-muted/30",
					{ "border-b": isExpanded },
				)}
			>
				<div className="flex gap-1 items-center">
					<Button
						variant="ghost"
						size="sm"
						className="p-0 w-6 h-6"
						onClick={() => setIsExpanded(!isExpanded)}
					>
						{isExpanded ? (
							<ChevronDown className="size-3.5" />
						) : (
							<ChevronRight className="size-3.5" />
						)}
					</Button>
					<FileJson className="size-3.5" />
					<TextShimmer
						as="span"
						duration={1.5}
						className="ml-2 text-sm italic"
						active={status !== "result"}
					>
						get-form-schema
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
						<div className="p-3 text-sm">
							<div className="mb-2">
								<h4 className="mb-1 text-xs font-medium text-muted-foreground">
									Arguments:
								</h4>
								<pre className="overflow-x-auto p-2 text-xs rounded-sm bg-muted/50">
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
									</div>
									<div className="overflow-x-auto p-2 text-xs rounded-sm bg-muted/50">
										<CodeBlock
											node={{
												attrs: {
													language: "json",
												},
											}}
											inline={false}
											className="!my-0"
										>
											{content}
										</CodeBlock>
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
