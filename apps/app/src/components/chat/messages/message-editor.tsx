"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { Textarea } from "@firebuzz/ui/components/ui/textarea";
import type { Message as MessageType } from "ai";
import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from "react";

export type MessageEditorProps = {
	message: MessageType;
	setMode: Dispatch<SetStateAction<"view" | "edit">>;
	setMessages: Dispatch<SetStateAction<MessageType[]>>;
};

export function MessageEditor({
	message,
	setMode,
	setMessages,
}: MessageEditorProps) {
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	const [draftContent, setDraftContent] = useState<string>(message.content);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		if (textareaRef.current) {
			adjustHeight();
		}
	}, []);

	const adjustHeight = () => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
		}
	};

	const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setDraftContent(event.target.value);
		adjustHeight();
	};

	return (
		<div className="flex flex-col gap-2 w-full">
			<Textarea
				ref={textareaRef}
				className="bg-transparent outline-none overflow-hidden resize-none !text-base rounded-xl w-full"
				value={draftContent}
				onChange={handleInput}
			/>

			<div className="flex flex-row gap-2 justify-end">
				<Button
					variant="outline"
					className="h-fit py-2 px-3"
					onClick={() => {
						setMode("view");
					}}
				>
					Cancel
				</Button>
				<Button
					variant="default"
					className="h-fit py-2 px-3"
					disabled={isSubmitting}
					onClick={async () => {
						setIsSubmitting(true);

						setMessages((messages) => {
							const index = messages.findIndex((m) => m.id === message.id);

							if (index !== -1) {
								const updatedMessage = {
									...message,
									content: draftContent,
								};

								return [...messages.slice(0, index), updatedMessage];
							}

							return messages;
						});

						setMode("view");
					}}
				>
					{isSubmitting ? "Sending..." : "Send"}
				</Button>
			</div>
		</div>
	);
}
