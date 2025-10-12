"use client";

import { Menu } from "@firebuzz/ui/icons/lucide";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Heading {
	level: number;
	title: string;
	slug: string;
}

interface TableOfContentsProps {
	headings: Heading[];
}

export const TableOfContents = ({ headings }: TableOfContentsProps) => {
	const [activeId, setActiveId] = useState<string>("");
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [thumbPosition, setThumbPosition] = useState({ top: 0, height: 0 });
	const containerRef = useRef<HTMLDivElement>(null);

	// Track active headings with better scroll detection
	useEffect(() => {
		let ticking = false;

		const updateActiveHeading = () => {
			const scrollPosition = window.scrollY + 100; // Offset for better detection
			const windowHeight = window.innerHeight;
			const documentHeight = document.documentElement.scrollHeight;
			const scrollPercent = (window.scrollY + windowHeight) / documentHeight;

			// If scrolled to bottom (within 1%), activate last heading
			if (scrollPercent >= 0.99 && headings.length > 0) {
				const lastHeading = headings[headings.length - 1];
				if (lastHeading.slug !== activeId) {
					setActiveId(lastHeading.slug);
				}
				ticking = false;
				return;
			}

			let currentActiveId = "";
			for (const heading of headings) {
				const element = document.getElementById(heading.slug);
				if (element) {
					const elementTop = element.offsetTop;
					if (elementTop <= scrollPosition) {
						currentActiveId = heading.slug;
					} else {
						break;
					}
				}
			}

			// Set first heading as active if none found
			if (!currentActiveId && headings.length > 0) {
				currentActiveId = headings[0].slug;
			}

			if (currentActiveId !== activeId) {
				setActiveId(currentActiveId);
			}
			ticking = false;
		};

		const handleScroll = () => {
			if (!ticking) {
				requestAnimationFrame(updateActiveHeading);
				ticking = true;
			}
		};

		// Set initial active heading
		updateActiveHeading();

		// Listen for scroll events with throttling
		window.addEventListener("scroll", handleScroll, { passive: true });

		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, [headings, activeId]);

	// Update thumb position when active item changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: only want to run on activeId change, not containerRef
	useEffect(() => {
		if (!containerRef.current || !activeId) {
			setThumbPosition({ top: 0, height: 0 });
			return;
		}

		const container = containerRef.current;
		const activeElement = container.querySelector<HTMLElement>(
			`a[href="#${activeId}"]`,
		);

		if (activeElement) {
			// Get position relative to container
			const top = activeElement.offsetTop;
			const height = activeElement.offsetHeight;

			setThumbPosition({ top, height });
		}
	}, [activeId, isCollapsed]);

	if (headings.length === 0) return null;

	return (
		<div className="relative">
			{/* Header with toggle */}
			<div className="flex gap-2 items-center mb-4">
				<button
					type="button"
					onClick={() => setIsCollapsed(!isCollapsed)}
					className="flex gap-2 items-center text-sm font-semibold transition-colors text-foreground hover:text-brand"
				>
					<Menu className="size-4" />
					On this page
				</button>
			</div>

			{/* TOC Container */}
			{!isCollapsed && (
				<nav className="relative">
					{/* Border line */}
					<div className="absolute top-0 bottom-0 left-0 w-px bg-border" />

					{/* Active indicator thumb with glow effect */}
					<div
						className="absolute left-0 w-px transition-all duration-300 ease-out"
						style={{
							top: `${thumbPosition.top}px`,
							height: `${thumbPosition.height}px`,
							opacity: activeId && thumbPosition.height > 0 ? 1 : 0,
						}}
					>
						{/* Main indicator line */}
						<div className="w-full h-full bg-gradient-to-b from-transparent to-transparent via-brand" />
						{/* Glowing light effect - strong in center, fades to edges */}
						<div className="absolute inset-y-0 -inset-x-1 bg-gradient-to-b from-transparent to-transparent opacity-30 blur-sm via-brand" />
						<div className="absolute inset-y-0 -inset-x-2 bg-gradient-to-b from-transparent to-transparent opacity-20 blur-md via-brand" />
						<div className="absolute inset-y-0 -inset-x-3 bg-gradient-to-b from-transparent to-transparent opacity-10 blur-lg via-brand" />
					</div>

					{/* Content */}
					<div
						ref={containerRef}
						className="pl-4 max-h-[calc(100vh-8rem)] overflow-y-auto"
					>
						<ul className="space-y-0">
							{headings.map((heading) => (
								<li key={heading.slug}>
									<Link
										href={`#${heading.slug}`}
										className={`block py-1.5 text-sm transition-colors hover:text-brand ${
											activeId === heading.slug
												? "text-brand font-medium"
												: "text-muted-foreground"
										} ${heading.level === 3 ? "pl-4" : ""}`}
									>
										{heading.title}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</nav>
			)}
		</div>
	);
};
