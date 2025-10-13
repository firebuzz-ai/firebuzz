"use client";

import type { Doc, LandingPageUIMessage } from "@firebuzz/convex";
import { Icon } from "@firebuzz/ui/components/brand/icon";
import { Loader } from "@firebuzz/ui/icons/lucide";
import { formatRelativeTimeShort } from "@firebuzz/utils";
import { useEffect, useMemo, useState } from "react";
import { MODEL_CONFIG } from "../models";
import { MessagePart } from "./message-part/message-part";
import { ToolGroup } from "./message-part/tool-group";
import { ReasoningContext } from "./utils/reasoning-context";
import { groupToolCalls } from "./utils/group-tool-calls";

interface AssistantMessageProps {
	message: LandingPageUIMessage;
}

export const AssistantMessage = ({ message }: AssistantMessageProps) => {
	const [expandedReasoningIndex, setExpandedReasoningIndex] = useState<
		number | null
	>(null);

	// Find all reasoning parts
	const reasoningParts = useMemo(
		() =>
			message.parts
				.map((part, index) => ({ part, index }))
				.filter(({ part }) => part.type === "reasoning"),
		[message.parts],
	);

	// Auto-expand latest streaming reasoning
	useEffect(() => {
		if (reasoningParts.length > 0) {
			const latestReasoning = reasoningParts[reasoningParts.length - 1];
			// Only auto-expand if it's streaming
			if (
				"state" in latestReasoning.part &&
				latestReasoning.part.state === "streaming"
			) {
				setExpandedReasoningIndex(latestReasoning.index);
			}
		}
	}, [reasoningParts]);
	const hasParts = message.parts.length > 0;
	const isPending =
		message.status === "pending" ||
		(message.status === "streaming" && !hasParts);

	const hasError = message.status === "failed";

	if (isPending) {
		return (
			<div className="flex items-center w-full h-full">
				<Loader className="animate-spin size-4 text-muted-foreground" />
			</div>
		);
	}

	const model = message.metadata?.model as Doc<"agentSessions">["model"];
	const modelIcon = MODEL_CONFIG[model]?.icon();
	const modelName = MODEL_CONFIG[model]?.name;
	const usage = message.metadata?.usage;
	const createdAt = formatRelativeTimeShort(message._creationTime);

	return (
		<ReasoningContext.Provider
			value={{ expandedReasoningIndex, setExpandedReasoningIndex }}
		>
			<div className="w-full max-w-4xl group/message">
				<div className="flex flex-col gap-4 w-full">
					{/* Header */}
					<div className="flex flex-row gap-2 justify-between items-center">
						{/* Avatar */}
						<div className="flex gap-2 items-center">
							<div className="flex justify-center items-center rounded-lg ring-1 size-8 shrink-0 ring-border bg-background">
								<div className="translate-y-px">
									<Icon className="size-4" />
								</div>
							</div>
							<div className="text-sm font-bold text-primary">firebuzz</div>
						</div>
						{/* Metadata */}
						<div className="flex flex-row gap-2 items-center opacity-0 transition-opacity duration-150 ease-in-out group-hover/message:opacity-100">
							{model && (
								<>
									<div className="flex gap-1 items-center text-xs font-medium text-muted-foreground">
										<div className="p-1 rounded-sm border bg-muted">
											<div className="size-3">{modelIcon}</div>
										</div>
										<div className="text-muted-foreground">{modelName}</div>
									</div>
									<div className="rounded-[2px] size-2 bg-brand/10 border-brand border" />
								</>
							)}
							<span className="text-xs text-muted-foreground">
								{usage ?? 0} credits
							</span>
							<div className="rounded-[2px] size-2 bg-brand/10 border-brand border" />
							<span className="text-xs text-muted-foreground">{createdAt}</span>
						</div>
					</div>

					{/* Parts */}
					<div className="flex overflow-hidden flex-col gap-4 w-full max-w-full text-sm">
						<div className="space-y-5">
							{groupToolCalls(message.parts).map((groupedPart) => {
								if (groupedPart.type === "group") {
									return (
										<ToolGroup
											key={`group-${groupedPart.startIndex}`}
											parts={groupedPart.parts}
											startIndex={groupedPart.startIndex}
										/>
									);
								}

								return (
									<MessagePart
										key={groupedPart.part.type + groupedPart.index}
										part={groupedPart.part}
										partIndex={groupedPart.index}
									/>
								);
							})}
							{hasError && (
								<div className="text-xs text-destructive">
									An error occurred while processing the message.
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</ReasoningContext.Provider>
	);
};
