import { TextShimmer } from "@firebuzz/ui/components/reusable/text-shimmer";
import { Badge } from "@firebuzz/ui/components/ui/badge";
import { Button } from "@firebuzz/ui/components/ui/button";
import { ChevronDown, ChevronRight } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import type { ToolInvocation } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

interface SearchWebProps {
	toolCall: ToolInvocation;
}

type SearchResultItem = {
	title: string;
	url: string;
	publishedDate?: string;
	author?: string;
	score: number;
	id: string;
	text: string;
};

export const SearchWeb = ({ toolCall }: SearchWebProps) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const { state: status } = toolCall;

	const { results, query } = useMemo(() => {
		const isResult = toolCall.state === "result";
		const isSuccess = isResult && toolCall.result.success;

		if (isResult && isSuccess) {
			return {
				results: toolCall.result.results as SearchResultItem[],
				query: toolCall.args.query as string,
			};
		}

		return {
			results: [],
			query: (toolCall.args?.query as string) || "",
		};
	}, [toolCall]);

	const result =
		toolCall.state === "result"
			? (toolCall.result as
					| {
							success: true;
							results: SearchResultItem[];
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
					<TextShimmer
						as="span"
						duration={1.5}
						className="ml-2 text-sm italic"
						active={status !== "result"}
					>
						{`🌐 Searching for: "${query}"`}
					</TextShimmer>
				</div>
				{result?.success && (
					<Badge variant="outline" className="text-xs">
						{results.length} results
					</Badge>
				)}
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
								<pre className="overflow-x-auto p-2 text-xs rounded-sm bg-muted/50">
									{JSON.stringify(toolCall.args, null, 2)}
								</pre>
							</div>

							{result && (
								<div>
									<h4 className="mb-1 text-xs font-medium text-muted-foreground">
										Result:{" "}
										<Badge variant="outline" className="ml-1">
											{result.success ? "Success" : "Failed"}
										</Badge>
									</h4>
									{result.success ? (
										<div className="space-y-4">
											{results.map((item) => (
												<div key={item.id} className="space-y-2">
													<div className="flex gap-2 items-center">
														<a
															href={item.url}
															target="_blank"
															rel="noopener noreferrer"
															className="text-xs font-medium text-blue-600 hover:underline"
														>
															{item.title}
														</a>
													</div>
													<div className="flex gap-2 items-center text-xs text-muted-foreground">
														{item.author && <span>by {item.author}</span>}
														{item.publishedDate && (
															<span>
																on{" "}
																{new Date(
																	item.publishedDate,
																).toLocaleDateString()}
															</span>
														)}
													</div>
													<p className="p-2 text-xs rounded-sm bg-muted/50">
														{item.text}
													</p>
												</div>
											))}
										</div>
									) : (
										<div className="p-2 text-xs text-red-600 bg-red-50 rounded-sm">
											{result.message}
										</div>
									)}
								</div>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
