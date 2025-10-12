import { envCloudflarePublic } from "@firebuzz/env";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@firebuzz/ui/components/ui/avatar";
import type { Message as MessageType } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { useUser } from "@/hooks/auth/use-user";
import { Attachments } from "../attachments";
import { Markdown } from "../markdown";
import { MessageEditor } from "../message-editor";

interface UserMessageProps {
	message: MessageType;
	isLoading: boolean;
	chatId: string;
	setMessages: Dispatch<SetStateAction<MessageType[]>>;
	reload: () => void;
}

export const UserMessage = ({
	message,
	isLoading,
	chatId,
	setMessages,
}: UserMessageProps) => {
	const { user } = useUser();
	const [mode, setMode] = useState<"view" | "edit">("view");
	const { NEXT_PUBLIC_R2_PUBLIC_URL } = envCloudflarePublic();

	if (isLoading || !chatId) return null;

	return (
		<AnimatePresence>
			<motion.div
				className="px-4 w-full max-w-4xl group/message"
				initial={{ y: 5, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				data-role={message.role}
			>
				<div className="flex gap-4 w-full">
					<Avatar className="flex overflow-hidden justify-center items-center rounded-full ring-1 size-8 shrink-0 ring-border bg-background">
						<AvatarFallback className="rounded-none">
							{user?.firstName?.charAt(0)}
						</AvatarFallback>
						<AvatarImage
							src={`${NEXT_PUBLIC_R2_PUBLIC_URL}/${user?.imageKey}`}
							className="w-full h-full"
						/>
					</Avatar>

					<div className="flex flex-col gap-4 w-full">
						<Attachments message={message} />

						{mode === "view" &&
							message.parts?.map((part: any, index: number) => {
								if (part.type === "text") {
									return (
										<div
											key={`${message.id}-text-${index}`}
											className="flex flex-row gap-2 items-start w-full"
										>
											<div className="flex flex-col gap-4 w-full">
												<Markdown setMessages={setMessages}>
													{part.text}
												</Markdown>
											</div>
										</div>
									);
								}
								return null;
							})}

						{message.content && mode === "edit" && (
							<div className="flex flex-row gap-2 items-start w-full">
								<div className="size-8" />

								<MessageEditor
									key={message.id}
									message={message}
									setMode={setMode}
									setMessages={setMessages}
								/>
							</div>
						)}
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
};
