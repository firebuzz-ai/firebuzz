import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import readingTime from "reading-time";
import rehypeSlug from "rehype-slug";
import { z } from "zod";

// for more information on configuration, visit:
// https://www.content-collections.dev/docs/configuration

const posts = defineCollection({
	name: "posts",
	directory: "content/posts",
	include: "*.mdx",
	schema: z.object({
		title: z.string(),
		summary: z.string(),
		date: z.coerce.date(),
		author: z.string(),
		category: z.string(),
		thumbnail: z.string().optional(),
		isFeatured: z.boolean().optional().default(false),
	}),
	transform: async (document, context) => {
		const mdx = await compileMDX(context, document, {
			rehypePlugins: [rehypeSlug],
		});
		const author = await context
			.documents(authors)
			.find((a) => a.ref === document.author);
		const category = await context
			.documents(postCategories)
			.find((t) => t.slug === document.category);
		const readTime = readingTime(document.content);

		// Extract headings for TOC
		const headingRegex = /^(#{2,3})\s+(.+)$/gm;
		const headings: Array<{ level: number; title: string; slug: string }> = [];
		let match: RegExpExecArray | null = headingRegex.exec(document.content);
		while (match !== null) {
			const level = match[1].length;
			const title = match[2].trim();
			const slug = title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");
			headings.push({ level, title, slug });
			match = headingRegex.exec(document.content);
		}

		return {
			...document,
			author,
			category,
			mdx,
			readingTime: readTime.text,
			readingTimeMinutes: readTime.minutes,
			headings,
		};
	},
});

const postCategories = defineCollection({
	name: "postCategories",
	directory: "content/post-categories",
	include: "*.mdx",
	schema: z.object({
		slug: z.string(),
		title: z.string(),
		description: z.string(),
		color: z.string(),
		featuredPost: z.string(),
	}),
});

const authors = defineCollection({
	name: "authors",
	directory: "content/authors",
	include: "*.mdx",
	schema: z.object({
		ref: z.string(),
		fullName: z.string(),
		avatar: z.string(),
		bio: z.string(),
	}),
});

const changelogs = defineCollection({
	name: "changelogs",
	directory: "content/changelogs",
	include: "*.mdx",
	schema: z.object({
		title: z.string(),
		summary: z.string(),
		date: z.coerce.date(),
		version: z.string(),
		thumbnail: z.string().optional(),
	}),
	transform: async (document, context) => {
		const mdx = await compileMDX(context, document, {
			rehypePlugins: [rehypeSlug],
		});

		return {
			...document,
			mdx,
		};
	},
});

export default defineConfig({
	collections: [posts, postCategories, authors, changelogs],
});
