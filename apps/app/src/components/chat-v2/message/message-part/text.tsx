import { useSmoothText } from "@firebuzz/convex";
import type { TextUIPart } from "ai";
import { MarkdownRenderer } from "../../markdown/markdown-renderer";

export function Text({ part }: { part: TextUIPart }) {
	const [visibleText] = useSmoothText(part.text, {
		startStreaming: part.state === "streaming",
	});

	return <MarkdownRenderer content={visibleText} />;
}
