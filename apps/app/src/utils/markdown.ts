import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, {
	defaultSchema,
	type Options as RehypeSanitizeOptions,
} from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkEmoji from "remark-emoji";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkToc from "remark-toc";
import type { PluggableList, Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";
import type {
	UnistNode,
	UnistParent,
} from "../../node_modules/unist-util-visit/lib";

export const allowedHTMLElements = [
	"a",
	"b",
	"blockquote",
	"br",
	"code",
	"dd",
	"del",
	"details",
	"div",
	"dl",
	"dt",
	"em",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"hr",
	"i",
	"ins",
	"kbd",
	"li",
	"ol",
	"p",
	"pre",
	"q",
	"rp",
	"rt",
	"ruby",
	"s",
	"samp",
	"source",
	"span",
	"strike",
	"strong",
	"sub",
	"summary",
	"sup",
	"table",
	"tbody",
	"td",
	"tfoot",
	"th",
	"thead",
	"tr",
	"ul",
	"var",
	"fill",
];

const rehypeSanitizeOptions: RehypeSanitizeOptions = {
	...defaultSchema,
	tagNames: allowedHTMLElements,
	attributes: {
		...defaultSchema.attributes,
		div: [
			...(defaultSchema.attributes?.div ?? []),
			"data*",
			["className", "__boltArtifact__"],
		],
		ol: [...(defaultSchema.attributes?.ol ?? []), "start", "type", "reversed"],
		ul: [...(defaultSchema.attributes?.ul ?? [])],
		li: [...(defaultSchema.attributes?.li ?? []), "value"],
		code: [...(defaultSchema.attributes?.code ?? []), "className"],
		fill: ["*"],
	},
	strip: [],
};

export function remarkPlugins(limitedMarkdown: boolean) {
	const plugins: PluggableList = [remarkGfm];

	if (!limitedMarkdown) {
		// Add enhanced markdown support when not in limited mode
		plugins.push(remarkMath, remarkEmoji, [
			remarkToc,
			{ tight: true, ordered: true },
		]);
	} else {
		plugins.unshift(enhancedLimitedMarkdownPlugin);
	}

	return plugins;
}

export function rehypePlugins(html: boolean) {
	const plugins: PluggableList = [];

	if (html) {
		plugins.push(
			rehypeRaw,
			[rehypeSanitize, rehypeSanitizeOptions],
			rehypeSlug,
			rehypeAutolinkHeadings,
			rehypeKatex,
		);
	}

	return plugins;
}

const enhancedLimitedMarkdownPlugin: Plugin = () => {
	return (tree, file) => {
		const contents = file.toString();

		visit(tree, (node: UnistNode, index, parent: UnistParent) => {
			if (
				index == null ||
				[
					"paragraph",
					"text",
					"inlineCode",
					"code",
					"strong",
					"emphasis",
					"list",
					"listItem",
					"thematicBreak",
				].includes(node.type) ||
				!node.position
			) {
				return true;
			}

			let value = contents.slice(
				node.position.start.offset,
				node.position.end.offset,
			);

			if (node.type === "heading") {
				value = `\n${value}`;
			}

			parent.children[index] = {
				type: "text",
				value,
				// biome-ignore lint/suspicious/noExplicitAny: unist tree node manipulation requires flexible typing
			} as any;

			return [SKIP, index] as const;
		});
	};
};
