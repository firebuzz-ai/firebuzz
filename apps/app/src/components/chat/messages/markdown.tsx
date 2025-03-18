import { Artifact } from "@/components/chat/messages/assistant/artifact";
import { ErrorExplanation } from "@/components/chat/messages/error-explanation";
import {
  allowedHTMLElements,
  rehypePlugins,
  remarkPlugins,
} from "@/utils/markdown";
import { memo, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";

interface MarkdownProps {
  children: string;
  html?: boolean;
  limitedMarkdown?: boolean;
}

export const Markdown = memo(
  ({ children, html = false, limitedMarkdown = false }: MarkdownProps) => {
    // Try to parse the content as JSON if it might be an error explanation
    const parsedContent = useMemo(() => {
      if (typeof children !== "string") return null;

      try {
        const content = JSON.parse(children);
        if (
          content?.type === "error-explanation" &&
          Array.isArray(content.errors)
        ) {
          return content;
        }
        return null;
      } catch {
        return null;
      }
    }, [children]);

    // If it's an error explanation, render the ErrorExplanation component
    if (parsedContent?.type === "error-explanation") {
      return <ErrorExplanation errors={parsedContent.errors} />;
    }

    const components = useMemo(() => {
      return {
        div: ({ className, children, node, ...props }) => {
          const isArtifact =
            className?.includes("__firebuzzArtifact__") ||
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            (node as any)?.properties?.dataMessageId;

          if (isArtifact) {
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const messageId = (node as any)?.properties
              ?.dataMessageId as string;

            if (!messageId) {
              console.error("Invalid message id", messageId);
              return null;
            }

            return <Artifact id={messageId} />;
          }

          return (
            <div className={className} {...props}>
              {children}
            </div>
          );
        },
      } satisfies Components;
    }, []);

    return (
      <ReactMarkdown
        allowedElements={allowedHTMLElements}
        components={components}
        remarkPlugins={remarkPlugins(limitedMarkdown)}
        rehypePlugins={rehypePlugins(html)}
      >
        {children}
      </ReactMarkdown>
    );
  }
);
