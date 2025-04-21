import type { Message, ToolInvocation } from "ai";
import { AskImageConfirmation } from "./ask-image-confirmation";
import { SearchStockImages } from "./search-stock-images";

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
    default:
      return null;
  }
};
