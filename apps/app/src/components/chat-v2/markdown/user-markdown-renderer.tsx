import { Badge } from "@firebuzz/ui/components/ui/badge";
import { memo } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { ToolPart } from "../message/message-part/tool-part";

// Minimal components for user messages - only links and divs with full logic
const userMarkdownComponents: Components = {
	a: ({ children, href, ...props }) => (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="text-primary underline hover:no-underline"
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
		// Default div
		return <div {...props}>{children}</div>;
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
		<ReactMarkdown components={userMarkdownComponents}>{content}</ReactMarkdown>
	);
});
