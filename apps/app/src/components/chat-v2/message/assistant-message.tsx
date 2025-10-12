"use client";

import type { LandingPageUIMessage } from "@firebuzz/convex";
import { Icon } from "@firebuzz/ui/components/brand/icon";
import { Loader } from "@firebuzz/ui/icons/lucide";
import { MessagePart } from "./message-part/message-part";

interface AssistantMessageProps {
	message: LandingPageUIMessage;
}

export const AssistantMessage = ({ message }: AssistantMessageProps) => {
	const hasParts = message.parts.length > 0;
	const isPending =
		message.status === "pending" ||
		(message.status === "streaming" && !hasParts);

	const hasError = message.status === "failed";

	if (isPending || (!hasParts && !hasError)) {
		return (
			<div className="flex items-center w-full h-full">
				<Loader className="animate-spin size-4 text-muted-foreground" />
			</div>
		);
	}

	if (hasError) {
		return (
			<div className="px-3 py-2 text-sm rounded-md border text-destructive border-destructive/50 bg-destructive/10">
				An error occurred while processing the message.
			</div>
		);
	}

	return (
		<div className="w-full max-w-4xl group/message">
			<div className="flex flex-col gap-4 w-full">
				<div className="flex gap-2 items-center">
					<div className="flex justify-center items-center rounded-lg ring-1 size-8 shrink-0 ring-border bg-background">
						<div className="translate-y-px">
							<Icon className="size-4" />
						</div>
					</div>
					<div className="text-sm font-bold text-primary">firebuzz</div>
				</div>
				<div className="flex overflow-hidden flex-col gap-4 w-full max-w-full text-sm">
					<div className="space-y-5">
						{message.parts.map((part, index) => {
							return (
								<MessagePart
									// biome-ignore lint/suspicious/noArrayIndexKey: message parts combined with type for uniqueness
									key={part.type + index}
									part={part}
									partIndex={index}
								/>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};
