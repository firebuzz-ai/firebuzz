import { MDXContent } from "@content-collections/mdx/react";
import { ChevronLeft, Sparkle } from "@firebuzz/ui/icons/lucide";
import { allPosts } from "content-collections";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCTA } from "../../../components/content/article-cta";
import { TableOfContents } from "../../../components/content/table-of-contents";

const getCategoryColorClass = (color: string) => {
	const colorMap: Record<string, string> = {
		emerald: "text-emerald-500",
		yellow: "text-yellow-500",
		blue: "text-blue-500",
	};
	return colorMap[color] || "text-gray-500";
};

interface PageProps {
	params: Promise<{ slug: string[] }>;
}

export default async function BlogPost({ params }: PageProps) {
	const { slug } = await params;
	const slugPath = slug.join("/");
	const post = allPosts.find((post) => post._meta.path === slugPath);

	if (!post) {
		notFound();
	}

	return (
		<div className="min-h-screen">
			<div className="px-8 py-10 mx-auto max-w-6xl">
				<Link
					href="/blog"
					className="inline-flex gap-1 items-center mb-8 transition-colors text-muted-foreground hover:text-primary"
				>
					<ChevronLeft className="size-4" />
					All Posts
				</Link>

				{/* Header Section - Full Width */}
				<header className="pb-6 mb-6 border-b">
					{/* Category and read time */}
					<div className="flex gap-2 items-center mb-4 font-mono text-xs text-muted-foreground">
						{post.category && (
							<span
								className={getCategoryColorClass(
									post.category?.color || "gray",
								)}
							>
								{post.category.title}
							</span>
						)}
						/<span>{post.readingTime.toUpperCase()}</span>
					</div>

					{/* Title */}
					<h1 className="mb-6 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
						{post.title}
					</h1>

					{/* Date */}
					<time
						dateTime={post.date.toISOString()}
						className="text-sm tracking-wide text-muted-foreground"
					>
						{post.date.toLocaleDateString("en-US", {
							year: "numeric",
							month: "long",
							day: "numeric",
						})}
					</time>
				</header>

				{/* Content Grid - Two Columns Starting with Image */}
				<div className="grid relative grid-cols-1 gap-10 lg:grid-cols-4">
					<article className="col-span-full lg:col-span-3">
						{/* Hero Image */}
						{post.thumbnail && (
							<div className="overflow-hidden relative mb-12 w-full h-64 rounded-lg sm:h-96">
								<Image
									src={post.thumbnail}
									alt={post.title}
									fill
									className="object-cover"
								/>
							</div>
						)}

						{/* Summary Section */}
						<div className="p-4 mb-12 rounded-lg border bg-muted">
							<div className="flex gap-2 items-center mb-4 text-xs text-brand">
								<Sparkle className="size-3.5" />
								<span>SUMMARY</span>
							</div>
							<p className="text-lg leading-relaxed text-muted-foreground">
								{post.summary}
							</p>
						</div>
						{/* Content */}
						<div className="max-w-none prose prose-lg prose-invert prose-img:rounded-xl prose-img:border prose-img:border-border prose-img:shadow-lg prose-img:my-8 prose-img:mb-2 [&_p:has(+_p_em)]:mb-2 prose-em:text-xs prose-em:text-muted-foreground prose-em:mt-1 prose-em:block">
							<MDXContent code={post.mdx} />
						</div>

						{/* Article CTA */}
						<div className="mt-16">
							<ArticleCTA />
						</div>
					</article>
					{/* Table of Contents Sidebar */}
					<div className="hidden lg:block lg:col-span-1">
						<div className="sticky top-24 h-fit">
							<TableOfContents headings={post.headings} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export async function generateStaticParams() {
	return allPosts.map((post) => ({
		slug: post._meta.path.split("/"),
	}));
}

export async function generateMetadata({ params }: PageProps) {
	const { slug } = await params;
	const slugPath = slug.join("/");
	const post = allPosts.find((post) => post._meta.path === slugPath);

	if (!post) {
		return {};
	}

	return {
		title: post.title,
		description: post.summary,
	};
}
