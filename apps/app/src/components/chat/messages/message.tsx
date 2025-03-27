import type { Message as MessageType } from "ai";
import type { Dispatch, SetStateAction } from "react";
import { AssistantMessage } from "./assistant/assistant-message";
import { UserMessage } from "./user/user-message";

interface MessageProps {
	message: MessageType;
	isLoading: boolean;
	chatId: string;
	setMessages: Dispatch<SetStateAction<MessageType[]>>;
	reload: () => void;
}

export const Message = ({
	message,
	isLoading,
	chatId,
	setMessages,
	reload,
}: MessageProps) => {
	return message.role === "user" ? (
		<UserMessage
			message={message}
			isLoading={isLoading}
			chatId={chatId}
			setMessages={setMessages}
			reload={reload}
		/>
	) : (
		<AssistantMessage
			message={message}
			isLoading={isLoading}
			chatId={chatId}
			setMessages={setMessages}
			reload={reload}
		/>
	);
};
