import { Badge } from "@firebuzz/ui/components/ui/badge";
import { memo } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { ToolPart } from "../message/message-part/tool-part";

// Define components outside the component to prevent recreation on every render
const markdownComponents: Components = {
	a: ({ children, href, ...props }) => (
		<a href={href} target="_blank" rel="noopener noreferrer" {...props}>
			{children}
		</a>
	),
	code: ({ children, className, ...props }) => {
		const match = /language-(\w+)/.exec(className || "");
		return match ? (
			<code
				className={`${className} bg-muted px-1 py-0.5 rounded border  font-mono`}
				{...props}
			>
				{children}
			</code>
		) : (
			<span className="inline-block py-1">
				<code
					className="bg-muted px-1 py-0.5 rounded border text-primary  font-mono"
					{...props}
				>
					{children}
				</code>
			</span>
		);
	},
	pre: ({ children, ...props }) => (
		<pre className="overflow-x-auto p-3 rounded-sm bg-muted" {...props}>
			{children}
		</pre>
	),
	h1: ({ children, ...props }) => (
		<h1 className="mt-4 mb-2 text-lg font-semibold first:mt-0" {...props}>
			{children}
		</h1>
	),
	h2: ({ children, ...props }) => (
		<h2 className="mt-3 mb-2 text-base font-semibold first:mt-0" {...props}>
			{children}
		</h2>
	),
	h3: ({ children, ...props }) => (
		<h3 className="mt-2 mb-1 text-sm font-semibold first:mt-0" {...props}>
			{children}
		</h3>
	),
	ul: ({ children, ...props }) => (
		<ul className="pl-4 mb-2 space-y-1 list-disc" {...props}>
			{children}
		</ul>
	),
	ol: ({ children, ...props }) => (
		<ol className="pl-4 mb-2 space-y-1 list-decimal" {...props}>
			{children}
		</ol>
	),
	p: ({ children, ...props }) => (
		<p className="mb-2 last:mb-0" {...props}>
			{children}
		</p>
	),
	blockquote: ({ children, ...props }) => (
		<blockquote className="pl-4 my-2 italic border-l-4 border-muted" {...props}>
			{children}
		</blockquote>
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
	// Handle unrecognized tags that might appear in markdown content
	//@ts-expect-error
	path: ({ children, ...props }) => <span {...props}>{children}</span>,

	param: ({ children, ...props }) => <span {...props}>{children}</span>,
};

export const MarkdownRenderer = memo(function MarkdownRenderer({
	content,
}: {
	content: string;
}) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			rehypePlugins={[rehypeRaw]}
			components={markdownComponents}
		>
			{content}
		</ReactMarkdown>
	);
});
