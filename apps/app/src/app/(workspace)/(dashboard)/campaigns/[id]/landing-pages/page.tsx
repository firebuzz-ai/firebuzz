"use client";

import type { Id } from "@firebuzz/convex";
import { api, useStablePaginatedQuery } from "@firebuzz/convex";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Card } from "@firebuzz/ui/components/ui/card";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Plus } from "@firebuzz/ui/icons/lucide";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useNewLandingPageModal } from "@/hooks/ui/use-new-landing-page-modal";
import { LandingPageCard } from "./_components/landing-page-card";

export default function CampaignLandingPagesPage() {
	const { id } = useParams<{ id: string }>();
	const [sortOrder] = useState<"asc" | "desc">("desc");
	const campaignId = id as Id<"campaigns">;
	const [, { openModal }] = useNewLandingPageModal();

	const {
		results: landingPages,
		status,
		loadMore,
	} = useStablePaginatedQuery(
		api.collections.landingPages.queries.getByCampaignIdPaginated,
		{
			campaignId,
			sortOrder,
		},
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
			{/* Grid of landing pages */}
			<div className="overflow-y-auto flex-1 p-4">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{/* Create Landing Page Button */}
					<Card
						className="overflow-hidden max-h-48 shadow-sm transition-all cursor-pointer group"
						onClick={() => openModal(campaignId)}
					>
						<div className="flex flex-col justify-center items-center p-6 h-full">
							<Button
								variant="outline"
								size="icon"
								className="mb-2 rounded-lg transition-colors size-10 group-hover:bg-primary group-hover:text-primary-foreground bg-muted"
							>
								<Plus className="size-8" />
							</Button>
							<h3 className="text-sm font-medium text-muted-foreground">
								Create New
							</h3>
						</div>
					</Card>

					{/* Landing Pages */}
					{landingPages.map((landingPage) => (
						<LandingPageCard key={landingPage._id} landingPage={landingPage} />
					))}
				</div>

				{/* Intersection Observer Target */}
				{status === "CanLoadMore" && (
					<div ref={loaderRef} className="flex justify-center p-4">
						<Spinner size="sm" />
					</div>
				)}

				{/* Empty State */}
				{landingPages.length === 0 && (
					<div className="flex justify-center items-center mt-12">
						<p className="text-sm text-center text-muted-foreground">
							No landing pages yet. Click above to create your first one.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
