"use client";

import { api, useStablePaginatedQuery } from "@firebuzz/convex";
import { Card } from "@firebuzz/ui/components/ui/card";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { useEffect, useRef } from "react";
import { TemplateCard } from "./_components/template-card";

export default function TemplatesPage() {
	const {
		results: templates,
		status,
		loadMore,
	} = useStablePaginatedQuery(
		api.collections.landingPages.templates.queries.getPaginated,
		{},
		{
			initialNumItems: 20,
		},
	);

	const loaderRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (status !== "CanLoadMore") return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					void loadMore(20);
				}
			},
			{ threshold: 0.1 },
		);

		if (loaderRef.current) {
			observer.observe(loaderRef.current);
		}

		return () => observer.disconnect();
	}, [status, loadMore]);

	if (status === "LoadingFirstPage") {
		return (
			<div className="flex flex-1 justify-center items-center">
				<Spinner size="sm" />
			</div>
		);
	}

	return (
		<div className="flex overflow-hidden flex-col flex-1 max-h-full">
			{/* Grid of templates */}
			<div className="overflow-y-auto flex-1 p-4">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{/* Templates */}
					{templates.map((template) => (
						<TemplateCard key={template._id} template={template} />
					))}
				</div>

				{/* Intersection Observer Target */}
				{status === "CanLoadMore" && (
					<div ref={loaderRef} className="flex justify-center p-4">
						<Spinner size="sm" />
					</div>
				)}

				{/* Empty State */}
				{templates.length === 0 && (
					<div className="flex justify-center items-center mt-12">
						<Card className="p-8 text-center max-w-md">
							<h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
							<p className="text-sm text-muted-foreground">
								Templates will appear here once they are created.
							</p>
						</Card>
					</div>
				)}
			</div>
		</div>
	);
}
