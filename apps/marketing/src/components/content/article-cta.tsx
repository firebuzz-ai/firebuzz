"use client";

import { Icon } from "@firebuzz/ui/components/brand/icon";
import { buttonVariants } from "@firebuzz/ui/components/ui/button";
import { ArrowRight } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import Link from "next/link";

interface ArticleCTAProps {
	title?: string;
	description?: string;
	primaryLabel?: string;
	primaryHref?: string;
	secondaryLabel?: string;
	secondaryHref?: string;
}

export const ArticleCTA = ({
	title = "Ready to transform your marketing?",
	description = "Join thousands of marketers using Firebuzz to create stunning campaigns and landing pages with AI-powered automation.",
	primaryLabel = "Start Free Trial",
	primaryHref = "https://app.getfirebuzz.com",
	secondaryLabel = "View Pricing",
	secondaryHref = "/pricing",
}: ArticleCTAProps) => {
	return (
		<section className="overflow-hidden relative rounded-2xl border bg-muted">
			{/* Grid background pattern */}
			<div className="absolute inset-0 opacity-20">
				<div
					className="w-full h-full"
					style={{
						backgroundImage: `
              linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
            `,
						backgroundSize: "24px 24px",
					}}
				/>
			</div>

			{/* Animated glowing lights on grid lines */}
			<div className="overflow-hidden absolute inset-0">
				{/* Horizontal glowing line */}
				<div
					className="absolute h-px bg-gradient-to-r from-transparent to-transparent animate-pulse via-brand/40"
					style={{
						width: "200px",
						top: "30%",
						left: "-200px",
						animation: "slideHorizontal 8s ease-in-out infinite",
					}}
				/>
				{/* Vertical glowing line */}
				<div
					className="absolute w-px bg-gradient-to-b from-transparent to-transparent animate-pulse via-brand/40"
					style={{
						height: "150px",
						left: "70%",
						top: "-150px",
						animation: "slideVertical 6s ease-in-out infinite 2s",
					}}
				/>
			</div>

			{/* Keyframes for animations */}
			<style jsx>{`
        @keyframes slideHorizontal {
          0%,
          100% {
            transform: translateX(0);
            opacity: 0;
          }
          50% {
            transform: translateX(calc(100vw + 200px));
            opacity: 1;
          }
        }
        @keyframes slideVertical {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0;
          }
          50% {
            transform: translateY(calc(100vh + 150px));
            opacity: 1;
          }
        }
      `}</style>

			{/* Gradient overlay */}
			<div className="absolute inset-0 bg-gradient-to-br via-transparent from-background/50 to-brand/5" />

			{/* Content */}
			<div className="relative px-8 py-12 text-center lg:px-12 lg:py-16">
				{/* Icon */}
				<div className="flex justify-center items-center mx-auto mb-6 rounded-xl border size-12 bg-muted text-brand">
					<Icon className="size-6" />
				</div>

				{/* Title */}
				<h2 className="mb-4 text-2xl font-bold text-foreground lg:text-3xl">
					{title}
				</h2>

				{/* Description */}
				<p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
					{description}
				</p>

				{/* CTA Buttons */}
				<div className="flex flex-col gap-4 justify-center items-center sm:flex-row">
					<Link
						href={primaryHref}
						className={cn(
							buttonVariants({
								variant: "brand",
								size: "lg",
							}),
							"group",
						)}
					>
						{primaryLabel}
						<ArrowRight className="ml-2 transition-transform size-4 group-hover:translate-x-1" />
					</Link>

					<Link
						href={secondaryHref}
						className={buttonVariants({
							variant: "ghost",
							size: "lg",
						})}
					>
						{secondaryLabel}
					</Link>
				</div>

				{/* Bottom text */}
				<p className="mt-6 text-sm text-muted-foreground">
					No credit card required • Free 14-day trial • Cancel anytime
				</p>
			</div>

			{/* Decorative elements */}
			<div className="absolute -top-6 -right-6 rounded-full blur-2xl size-24 bg-brand/10" />
			<div className="absolute -bottom-8 -left-8 rounded-full blur-3xl size-32 bg-brand/5" />
		</section>
	);
};
