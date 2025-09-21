import { allPostCategories, allPosts } from "content-collections";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const getCategoryColorClass = (color: string) => {
	const colorMap: Record<string, string> = {
		emerald: "text-emerald-500",
		yellow: "text-yellow-500",
		blue: "text-blue-500",
	};
	return colorMap[color] || "text-gray-500";
};

export const metadata: Metadata = {
	title: "Blog - Firebuzz",
	description:
		"Thoughts on product, marketing, and engineering. Insights, updates, and stories from the Firebuzz team.",
};

export default function BlogPage() {
	// Get featured post
	const featuredPost = allPosts.find((post) => post.isFeatured) || allPosts[0];

	// Get all posts sorted by date, excluding featured post
	const posts = allPosts
		.filter((post) => post._meta.path !== featuredPost._meta.path)
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	// Get all categories
	const categories = allPostCategories;

	return (
		<div className="min-h-screen">
			<div className="px-8 py-12 mx-auto max-w-6xl">
				{/* Header */}
				<div className="mb-12">
					<h1 className="mb-4 text-2xl font-bold text-foreground">
						Thoughts on product, marketing, and engineering.
					</h1>
				</div>

				{/* Featured Post */}
				{featuredPost && (
					<div className="mb-16">
						<Link
							href={`/blog/${featuredPost._meta.path}`}
							className="grid gap-8 lg:grid-cols-2 group"
						>
							{/* Featured Post Image */}
							{featuredPost.thumbnail && (
								<div className="overflow-hidden relative h-64 rounded-xl lg:h-80">
									<Image
										src={featuredPost.thumbnail}
										alt={featuredPost.title}
										fill
										className="object-cover transition-transform group-hover:scale-105"
									/>
								</div>
							)}

							{/* Featured Post Content */}
							<div className="flex flex-col justify-center">
								<div className="mb-4 text-sm text-muted-foreground">
									{new Date(featuredPost.date).toLocaleDateString("en-US", {
										year: "numeric",
										month: "long",
										day: "numeric",
									})}
									{featuredPost.category && (
										<>
											<span className="mx-2">•</span>
											<span
												className={getCategoryColorClass(
													featuredPost.category.color,
												)}
											>
												{featuredPost.category.title}
											</span>
										</>
									)}
								</div>

								<h2 className="mb-4 text-2xl font-bold leading-tight text-foreground lg:text-3xl">
									{featuredPost.title}
								</h2>

								<p className="text-lg leading-relaxed text-muted-foreground">
									{featuredPost.summary}
								</p>
							</div>
						</Link>
					</div>
				)}

				{/* Categories Section */}
				<div className="mb-16">
					<h2 className="mb-8 text-xl font-bold text-foreground">CATEGORIES</h2>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{categories.map((category) => (
							<Link
								key={category.slug}
								href={`/blog/category/${category.slug}`}
								className="overflow-hidden relative p-6 rounded-xl border transition-all group bg-muted hover:shadow-lg"
							>
								{/* Grid background pattern */}
								<div className="absolute inset-0 opacity-10">
									<div
										className="w-full h-full"
										style={{
											backgroundImage: `
                        linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                        linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
                      `,
											backgroundSize: "8px 8px",
										}}
									/>
								</div>

								{/* Text overlay for readability */}
								<div className="absolute inset-0 bg-gradient-to-r to-transparent from-background/90 via-background/60" />

								<div className="relative z-10">
									<h3 className="text-lg font-semibold text-foreground">
										{category.title}
									</h3>
								</div>
							</Link>
						))}
					</div>
				</div>

				{/* Latest Posts */}
				<div>
					<h2 className="mb-8 text-xl font-bold text-foreground">
						LATEST POSTS
					</h2>
					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{posts.slice(0, 6).map((post) => (
							<article key={post._meta.path} className="group">
								<Link href={`/blog/${post._meta.path}`}>
									{/* Post Image */}
									{post.thumbnail && (
										<div className="overflow-hidden relative mb-4 h-48 rounded-xl">
											<Image
												src={post.thumbnail}
												alt={post.title}
												fill
												className="object-cover transition-transform group-hover:scale-105"
											/>
										</div>
									)}

									{/* Post Content */}
									<div>
										<div className="mb-2 text-sm text-muted-foreground">
											{new Date(post.date).toLocaleDateString("en-US", {
												year: "numeric",
												month: "long",
												day: "numeric",
											})}
										</div>

										<h3 className="mb-3 text-lg font-semibold leading-tight text-foreground">
											{post.title}
										</h3>
									</div>
								</Link>
							</article>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
