import type { Message } from "ai";
import type { Dispatch, SetStateAction } from "react";
import { memo, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { ActionErrorExplanation } from "@/components/chat/messages/action-error-explanation";
import { Artifact } from "@/components/chat/messages/assistant/artifact";
import { ElementReference } from "@/components/chat/messages/element-reference";
import { ErrorExplanation } from "@/components/chat/messages/error-explanation";
import { VersionReference } from "@/components/chat/messages/version-reference";
import {
	allowedHTMLElements,
	rehypePlugins,
	remarkPlugins,
} from "@/utils/markdown";

interface MarkdownProps {
	children: string;
	html?: boolean;
	limitedMarkdown?: boolean;
	setMessages?: Dispatch<SetStateAction<Message[]>>;
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
					(content?.type === "action-error-explanation" &&
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

		// If it's an action error explanation, render the ActionErrorExplanation component
		if (parsedContent?.type === "action-error-explanation") {
			return <ActionErrorExplanation errors={parsedContent.errors} />;
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

		const components = useMemo(() => {
			return {
				div: ({ className, children, node, ...props }) => {
					const isArtifact =
						className?.includes("__firebuzzArtifact__") ||
						// biome-ignore lint/suspicious/noExplicitAny: react-markdown node properties access
						(node as any)?.properties?.dataArtifactId;

					if (isArtifact && setMessages) {
						// biome-ignore lint/suspicious/noExplicitAny: react-markdown node properties access
						const artifactId = (node as any)?.properties
							?.dataArtifactId as string;

						if (!artifactId) {
							console.error("Invalid artifact id", artifactId);
							return null;
						}

						return <Artifact id={artifactId} setMessages={setMessages} />;
					}

					return (
						<div className={className} {...props}>
							{children}
						</div>
					);
				},
				li: ({ className, children, node, ...props }) => {
					return (
						<li className="pl-6 space-y-2" {...props}>
							{children}
						</li>
					);
				},
				ol: ({ className, children, node, ...props }) => {
					return (
						<ol className="pl-6 space-y-2 list-decimal" {...props}>
							{children}
						</ol>
					);
				},
				ul: ({ className, children, node, ...props }) => {
					return (
						<ul className="pl-6 space-y-2 list-disc" {...props}>
							{children}
						</ul>
					);
				},
				code: ({ className, children, node, ...props }) => {
					return (
						<code className="px-1 rounded text-brand bg-brand/10" {...props}>
							{children}
						</code>
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
	},
);
