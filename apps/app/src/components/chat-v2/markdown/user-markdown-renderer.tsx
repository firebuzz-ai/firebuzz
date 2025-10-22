import { Badge } from "@firebuzz/ui/components/ui/badge";
import { CornerDownRight } from "@firebuzz/ui/icons/lucide";
import { IconComponents } from "@firebuzz/ui/icons/tabler";
import { memo } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { ToolPart } from "../message/message-part/tool-part";

// Minimal components for user messages - only links and divs with full logic
const userMarkdownComponents: Components = {
	a: ({ children, href, ...props }) => (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="underline text-primary hover:no-underline"
			{...props}
		>
			{children}
		</a>
	),
	div: ({ children, ...props }) => {
		// Hide image CDN URL div (used for agent tools, not for display)
		//@ts-expect-error
		if (props["data-image-cdn-urls"]) {
			return null;
		}

		// Render element reference badge with children (user message text)
		//@ts-expect-error
		if (props["data-element-reference"] === "true") {
			//@ts-expect-error
			const tagName = props["data-tag-name"] || "";
			//@ts-expect-error
			const sourceFile = props["data-source-file"] || "";

			return (
				<>
					<div className="flex gap-1 items-center px-2 py-1 mb-2 text-sm text-blue-500 rounded-2xl border border-blue-500 w-fit bg-blue-500/20">
						<IconComponents className="size-3.5" />
						<div className="flex gap-1 items-center">
							<div className="capitalize">{tagName.toLowerCase()}</div>
							<span className="text-xs text-blue-500/60">
								{sourceFile.split("/").pop()}
							</span>
						</div>
					</div>
					<div className="flex flex-row gap-1 items-start">
						<CornerDownRight className="size-3.5" /> <span>{children}</span>
					</div>
				</>
			);
		}

		// Render auto-fix error messages as tool-call style
		//@ts-expect-error
		if (props["data-error-fix"] === "true") {
			//@ts-expect-error
			const errorCount = props["data-error-count"] || "0";
			const errorLabel =
				errorCount === "1" ? "Error detected" : "Errors detected";

			return (
				<ToolPart status="error" toolName={errorLabel}>
					<Badge
						variant="outline"
						className="bg-muted"
					>{`${errorCount}`}</Badge>
				</ToolPart>
			);
		}
		// Default element
		return <>{children}</>;
	},
	// All other elements render as plain text
	p: ({ children }) => <>{children}</>,
	code: ({ children }) => <>{children}</>,
	pre: ({ children }) => <>{children}</>,
	h1: ({ children }) => <>{children}</>,
	h2: ({ children }) => <>{children}</>,
	h3: ({ children }) => <>{children}</>,
	ul: ({ children }) => <>{children}</>,
	ol: ({ children }) => <>{children}</>,
	li: ({ children }) => <>{children}</>,
	blockquote: ({ children }) => <>{children}</>,
	strong: ({ children }) => <>{children}</>,
	em: ({ children }) => <>{children}</>,
};

export const UserMarkdownRenderer = memo(function UserMarkdownRenderer({
	content,
}: {
	content: string;
}) {
	return (
		<ReactMarkdown
			components={userMarkdownComponents}
			rehypePlugins={[rehypeRaw]}
		>
			{content}
		</ReactMarkdown>
	);
});
