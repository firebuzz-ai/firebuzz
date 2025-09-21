import { ChevronLeft } from "@firebuzz/ui/icons/lucide";
import { allPostCategories, allPosts } from "content-collections";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const getCategoryColorClass = (color: string) => {
	const colorMap: Record<string, string> = {
		emerald: "text-emerald-500",
		yellow: "text-yellow-500",
		blue: "text-blue-500",
	};
	return colorMap[color] || "text-gray-500";
};

interface CategoryPageProps {
	params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
	return allPostCategories.map((category) => ({
		slug: category.slug,
	}));
}

export async function generateMetadata({
	params,
}: CategoryPageProps): Promise<Metadata> {
	const { slug } = await params;
	const category = allPostCategories.find((cat) => cat.slug === slug);

	if (!category) {
		return {};
	}

	return {
		title: `${category.title} - Blog - Firebuzz`,
		description: `${category.description} - Insights and articles about ${category.title.toLowerCase()}.`,
	};
}

export default async function CategoryPage({ params }: CategoryPageProps) {
	const { slug } = await params;
	const category = allPostCategories.find((cat) => cat.slug === slug);

	if (!category) {
		notFound();
	}

	// Get featured post for this category
	const featuredPost =
		allPosts.find((post) => post._meta.path === category.featuredPost) ||
		allPosts.find((post) => post.category?.slug === slug) ||
		allPosts[0];

	// Get posts in this category, sorted by date
	const categoryPosts = allPosts
		.filter((post) => post.category?.slug === slug)
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return (
		<div className="min-h-screen">
			<div className="px-8 py-12 mx-auto max-w-6xl">
				{/* Back to Blog */}
				<Link
					href="/blog"
					className="inline-flex gap-1 items-center mb-8 transition-colors text-muted-foreground hover:text-primary"
				>
					<ChevronLeft className="size-4" />
					Back to Blog
				</Link>

				{/* Category Header */}
				<div className="mb-12">
					<h1 className="mb-4 text-2xl font-bold text-foreground">
						{category.title}
					</h1>
					<p className="text-lg text-muted-foreground max-w-2xl">
						{category.description}
					</p>
				</div>

				{/* Featured Post (Global) */}
				{featuredPost && (
					<div className="mb-16">
						<h2 className="mb-8 text-xl font-bold text-foreground">FEATURED</h2>
						<Link
							href={`/blog/${featuredPost._meta.path}`}
							className="grid gap-8 lg:grid-cols-2 group"
						>
							{/* Featured Post Image */}
							{featuredPost.thumbnail && (
								<div className="relative h-64 overflow-hidden rounded-xl lg:h-80">
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

								<h3 className="mb-4 text-2xl font-bold leading-tight text-foreground lg:text-3xl">
									{featuredPost.title}
								</h3>

								<p className="text-lg leading-relaxed text-muted-foreground">
									{featuredPost.summary}
								</p>
							</div>
						</Link>
					</div>
				)}

				{/* Category Posts */}
				<div>
					<h2 className="mb-8 text-xl font-bold text-foreground">
						LATEST IN {category.title.toUpperCase()}
					</h2>

					{categoryPosts.length === 0 ? (
						<div className="text-center py-12">
							<p className="text-muted-foreground text-lg">
								No posts found in this category yet.
							</p>
							<Link
								href="/blog"
								className="inline-flex items-center gap-2 mt-4 text-brand hover:text-brand/80 transition-colors"
							>
								Browse all posts
							</Link>
						</div>
					) : (
						<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
							{categoryPosts.map((post) => (
								<article key={post._meta.path} className="group">
									<Link href={`/blog/${post._meta.path}`}>
										{/* Post Image */}
										{post.thumbnail && (
											<div className="relative mb-4 h-48 overflow-hidden rounded-xl">
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
					)}
				</div>
			</div>
		</div>
	);
}
