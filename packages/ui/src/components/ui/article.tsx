"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "../../lib/utils";

interface ArticleProps {
	content: string;
	className?: string;
}

export const Article = ({ content, className }: ArticleProps) => {
	if (!content) return null;

	return (
		<article
			className={cn(
				"prose dark:prose-invert max-w-none",
				"animate-fade-in",
				className,
			)}
		>
			<ReactMarkdown>{content}</ReactMarkdown>
		</article>
	);
};
