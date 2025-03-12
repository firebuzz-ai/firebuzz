import { Artifact } from "@/components/chat/messages/assistant/artifact";
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
    const components = useMemo(() => {
      return {
        div: ({ className, children, node, ...props }) => {
          console.log("rendering div", node);
          const isArtifact =
            className?.includes("__firebuzzArtifact__") ||
            (node as any)?.properties?.dataMessageId;

          if (isArtifact) {
            const messageId = (node as any)?.properties
              ?.dataMessageId as string;

            if (!messageId) {
              console.error("Invalid message id", messageId);
              return null;
            }

            console.log("Rendering artifact with id:", messageId);
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
