import type { Message, ToolInvocation } from "ai";
import { AskImageConfirmation } from "./ask-image-confirmation";
import { GetMarketingData } from "./get-marketing-data";
import { ReadDocument } from "./read-document";
import { ReadLongDocument } from "./read-long-document";
import { SearchKnowledgeBase } from "./search-knowledgebase";
import { SearchStockImages } from "./search-stock-images";
import { SearchWeb } from "./search-web";

interface ToolCallProps {
	toolCall: ToolInvocation;
	message: Message;
	addToolResult: ({
		toolCallId,
		result,
	}: {
		toolCallId: string;
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		result: any;
	}) => void;
}

export const ToolCall = ({
	toolCall,
	addToolResult,
	message,
}: ToolCallProps) => {
	switch (toolCall.toolName) {
		case "searchStockImage":
			return <SearchStockImages toolCall={toolCall} />;
		case "askImageConfirmation":
			return (
				<AskImageConfirmation
					toolCall={toolCall}
					addToolResult={addToolResult}
					message={message}
				/>
			);
		case "readDocument":
			return <ReadDocument toolCall={toolCall} />;
		case "searchKnowledgeBase":
			return <SearchKnowledgeBase toolCall={toolCall} />;
		case "readLongDocument":
			return <ReadLongDocument toolCall={toolCall} />;
		case "getMarketingData":
			return <GetMarketingData toolCall={toolCall} />;
		case "searchWeb":
			return <SearchWeb toolCall={toolCall} />;
		default:
			return null;
	}
};
