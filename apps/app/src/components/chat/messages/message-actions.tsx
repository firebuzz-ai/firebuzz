import { Button } from "@firebuzz/ui/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { ThumbsDownIcon, ThumbsUpIcon } from "@firebuzz/ui/icons/lucide";
import type { Message } from "ai";
import equal from "fast-deep-equal";
import { memo } from "react";

export function PureMessageActions({
	chatId,
	message,
	vote,
	isLoading,
}: {
	chatId: string;
	message: Message;
	vote: Record<string, boolean> | undefined;
	isLoading: boolean;
}) {
	if (isLoading || !chatId || message.role === "user") return null;

	return (
		<TooltipProvider delayDuration={0}>
			<div className="flex flex-row gap-2">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
							disabled={vote?.isUpvoted}
							variant="outline"
							onClick={async () => {
								console.log("upvote");
							}}
						>
							<ThumbsDownIcon />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Upvote Response</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							className="py-1 px-2 h-fit text-muted-foreground !pointer-events-auto"
							variant="outline"
							disabled={vote && !vote.isUpvoted}
							onClick={() => {
								console.log("downvote");
							}}
						>
							<ThumbsUpIcon />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Downvote Response</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	);
}

export const MessageActions = memo(
	PureMessageActions,
	(prevProps, nextProps) => {
		if (!equal(prevProps.vote, nextProps.vote)) return false;
		if (prevProps.isLoading !== nextProps.isLoading) return false;

		return true;
	},
);
