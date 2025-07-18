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

type MarketingDataItem = {
	id: Id<"audiences"> | Id<"testimonials"> | Id<"socials"> | Id<"features">;
	name?: string;
	description?: string;
	platform?: string;
	handle?: string;
	url?: string;
	content?: string;
	rating?: number;
	title?: string;
	avatar?: string;
	gender?: "male" | "female";
	age?: string;
	goals?: string;
	motivations?: string;
	frustrations?: string;
	terminologies?: string[];
	benefits?: string;
	proof?: string;
	updatedAt?: string;
};

type MarketingDataType = "audiences" | "testimonials" | "socials" | "features";

export const GetMarketingData = ({ toolCall }: ToolCallProps) => {
	const [isExpanded, setIsExpanded] = useState(false);

	const { dataType, data, pagination } = useMemo(() => {
		const isResult = toolCall.state === "result";
		const isSuccess = isResult && toolCall.result.success;

		if (isResult && isSuccess) {
			return {
				dataType: toolCall.result.dataType as MarketingDataType,
				data: toolCall.result.data as MarketingDataItem[],
				pagination: toolCall.result.pagination as {
					hasMore: boolean;
					cursor: string | null;
					totalFetched: number;
				},
			};
		}

		return {
			dataType: (toolCall.args?.dataType as MarketingDataType) || "audiences",
			data: [],
			pagination: null,
		};
	}, [toolCall]);

	const status = toolCall.state;
	const result =
		toolCall.state === "result"
			? (toolCall.result as
					| {
							success: true;
							dataType: MarketingDataType;
							data: MarketingDataItem[];
							pagination: {
								hasMore: boolean;
								cursor: string | null;
								totalFetched: number;
							};
					  }
					| {
							success: false;
							message: string;
					  })
			: undefined;

	const getDataTypeIcon = (type: MarketingDataType) => {
		switch (type) {
			case "audiences":
				return "👥";
			case "testimonials":
				return "💬";
			case "socials":
				return "🌐";
			case "features":
				return "⚡";
			default:
				return "📊";
		}
	};

	const getDataTypeLabel = (type: MarketingDataType) => {
		switch (type) {
			case "audiences":
				return "Audiences";
			case "testimonials":
				return "Testimonials";
			case "socials":
				return "Social Media";
			case "features":
				return "Features";
			default:
				return "Marketing Data";
		}
	};

	const renderDataItem = (item: MarketingDataItem, index: number) => {
		switch (dataType) {
			case "audiences":
				return (
					<div className="space-y-2" key={item.id}>
						<div className="flex items-center gap-1">
							<div className="px-1 text-xs rounded-full text-muted-foreground bg-muted/50 tabular-nums">
								{index + 1}
							</div>
							<div className="text-xs font-medium">{item.name}</div>
							{item.avatar && (
								<div className="text-xs text-muted-foreground">
									{item.avatar}
								</div>
							)}
						</div>
						<div className="p-2 space-y-1 text-xs rounded-sm bg-muted/50">
							<div>
								<strong>Description:</strong> {item.description}
							</div>
							<div>
								<strong>Gender:</strong> {item.gender}
							</div>
							<div>
								<strong>Age:</strong> {item.age}
							</div>
							<div>
								<strong>Goals:</strong> {item.goals}
							</div>
							<div>
								<strong>Motivations:</strong> {item.motivations}
							</div>
							<div>
								<strong>Frustrations:</strong> {item.frustrations}
							</div>
							{item.terminologies && item.terminologies.length > 0 && (
								<div>
									<strong>Terminologies:</strong>{" "}
									{item.terminologies.join(", ")}
								</div>
							)}
						</div>
					</div>
				);
			case "testimonials":
				return (
					<div className="space-y-2" key={item.id}>
						<div className="flex items-center gap-1">
							<div className="px-1 text-xs rounded-full text-muted-foreground bg-muted/50 tabular-nums">
								{index + 1}
							</div>
							<div className="text-xs font-medium">{item.name}</div>
							{item.rating && (
								<div className="text-xs text-muted-foreground">
									{"⭐".repeat(item.rating)}
								</div>
							)}
						</div>
						<div className="p-2 space-y-1 text-xs rounded-sm bg-muted/50">
							{item.title && (
								<div>
									<strong>Title:</strong> {item.title}
								</div>
							)}
							<div>
								<strong>Content:</strong> {item.content}
							</div>
							{item.rating && (
								<div>
									<strong>Rating:</strong> {item.rating}/5
								</div>
							)}
						</div>
					</div>
				);
			case "socials":
				return (
					<div className="space-y-2" key={item.id}>
						<div className="flex items-center gap-1">
							<div className="px-1 text-xs rounded-full text-muted-foreground bg-muted/50 tabular-nums">
								{index + 1}
							</div>
							<div className="text-xs font-medium">{item.platform}</div>
							<div className="text-xs text-muted-foreground">
								@{item.handle}
							</div>
						</div>
						<div className="p-2 space-y-1 text-xs rounded-sm bg-muted/50">
							<div>
								<strong>Handle:</strong> {item.handle}
							</div>
							<div>
								<strong>URL:</strong>{" "}
								<a
									href={item.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-600 hover:underline"
								>
									{item.url}
								</a>
							</div>
						</div>
					</div>
				);
			case "features":
				return (
					<div className="space-y-2" key={item.id}>
						<div className="flex items-center gap-1">
							<div className="px-1 text-xs rounded-full text-muted-foreground bg-muted/50 tabular-nums">
								{index + 1}
							</div>
							<div className="text-xs font-medium">{item.name}</div>
						</div>
						<div className="p-2 space-y-1 text-xs rounded-sm bg-muted/50">
							<div>
								<strong>Description:</strong> {item.description}
							</div>
							<div>
								<strong>Benefits:</strong> {item.benefits}
							</div>
							<div>
								<strong>Proof:</strong> {item.proof}
							</div>
						</div>
					</div>
				);
			default:
				return null;
		}
	};

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
						{`${getDataTypeIcon(dataType)} Get ${getDataTypeLabel(dataType)}`}
					</TextShimmer>
				</div>
				{result?.success && (
					<div className="flex items-center gap-1">
						<Badge variant="outline" className="text-xs">
							{data.length} items
						</Badge>
						{pagination?.hasMore && (
							<Badge variant="secondary" className="text-xs">
								More available
							</Badge>
						)}
					</div>
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
									{result.success ? (
										<div className="space-y-4">
											{data.map((item, index) => renderDataItem(item, index))}
											{pagination && (
												<div className="pt-2 text-xs text-muted-foreground">
													<div>Fetched: {pagination.totalFetched} items</div>
													{pagination.hasMore && (
														<div>
															More items available (cursor: {pagination.cursor})
														</div>
													)}
												</div>
											)}
										</div>
									) : (
										<div className="p-2 text-xs text-red-600 rounded-sm bg-red-50">
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
