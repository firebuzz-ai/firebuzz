import { Icon } from "@firebuzz/ui/components/brand/icon";
import type { Message as MessageType } from "ai";
import { AnimatePresence, motion } from "motion/react";
import type { Dispatch, SetStateAction } from "react";
import { Attachments } from "../attachments";
import { Markdown } from "../markdown";
import { MessageActions } from "../message-actions";

interface AssistantMessageProps {
	message: MessageType;
	isLoading: boolean;
	chatId: string;
	setMessages: Dispatch<SetStateAction<MessageType[]>>;
	reload: () => void;
}

export const AssistantMessage = ({
	message,
	isLoading,
	chatId,
	setMessages,
}: AssistantMessageProps) => {
	return (
		<AnimatePresence>
			<motion.div
				className="w-full max-w-4xl px-4 group/message"
				initial={{ y: 5, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				data-role={message.role}
			>
				<div className="flex gap-4 w-full">
					<div className="size-8 flex items-center rounded-lg justify-center ring-1 shrink-0 ring-border bg-background">
						<div className="translate-y-px">
							<Icon className="size-4" />
						</div>
					</div>

					<div className="flex flex-col gap-4 w-full">
						<Attachments message={message} />

						{message.content && (
							<div className="flex flex-row gap-2 items-start w-full">
								<div className="flex flex-col gap-4 w-full">
									<Markdown setMessages={setMessages} html>
										{message.content as string}
									</Markdown>
								</div>
							</div>
						)}

						<MessageActions
							key={`action-${message.id}`}
							chatId={chatId}
							message={message}
							vote={{}}
							isLoading={isLoading}
						/>
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
};
