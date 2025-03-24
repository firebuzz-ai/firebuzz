import { Artifact } from "@/components/chat/messages/assistant/artifact";
import { ElementReference } from "@/components/chat/messages/element-reference";
import { ErrorExplanation } from "@/components/chat/messages/error-explanation";
import { VersionReference } from "@/components/chat/messages/version-reference";
import {
  allowedHTMLElements,
  rehypePlugins,
  remarkPlugins,
} from "@/utils/markdown";
import type { Message } from "ai";
import type { Dispatch, SetStateAction } from "react";
import { memo, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";

interface MarkdownProps {
  children: string;
  html?: boolean;
  limitedMarkdown?: boolean;
  setMessages: Dispatch<SetStateAction<Message[]>>;
}

export const Markdown = memo(
  ({
    children,
    html = false,
    limitedMarkdown = false,
    setMessages,
  }: MarkdownProps) => {
    // Try to parse the content as JSON if it might be an error explanation or element reference
    const parsedContent = useMemo(() => {
      if (typeof children !== "string") return null;

      try {
        const content = JSON.parse(children);
        if (
          (content?.type === "error-explanation" &&
            Array.isArray(content.errors)) ||
          (content?.type === "element-reference" &&
            content.element &&
            content.message) ||
          (content?.type === "version-reference" && content.version)
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

    // If it's an element reference, render the ElementReference component
    if (parsedContent?.type === "element-reference") {
      return (
        <ElementReference
          message={parsedContent.message}
          element={parsedContent.element}
        />
      );
    }

    // If it's a version reference, render the VersionReference component
    if (parsedContent?.type === "version-reference") {
      return <VersionReference version={parsedContent.version} />;
    }

    console.log({ parsedContent });

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

            return <Artifact id={messageId} setMessages={setMessages} />;
          }

          return (
            <div className={className} {...props}>
              {children}
            </div>
          );
        },
      } satisfies Components;
    }, [setMessages]);

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
