import { useTwoPanelsLayout } from "@/hooks/ui/use-two-panels-layout";
import { type Id, api, useCachedRichQuery } from "@firebuzz/convex";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@firebuzz/ui/components/ui/breadcrumb";
import { Button } from "@firebuzz/ui/components/ui/button";
import { SidebarTrigger } from "@firebuzz/ui/components/ui/sidebar";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import { ChevronsLeft } from "@firebuzz/ui/icons/lucide";
import Link from "next/link";
import { memo, useMemo } from "react";

interface ChatHeaderProps {
	landingPageId: Id<"landingPages">;
	type: "landing-page" | "email" | "ad";
	showLoadMore?: boolean;
}

export const ChatHeader = memo(({ landingPageId, type }: ChatHeaderProps) => {
	const { openRightPanel, isRightPanelClosing, isRightPanelOpen } =
		useTwoPanelsLayout();

	const { data: landingPage, isPending: isLoading } = useCachedRichQuery(
		api.collections.landingPages.queries.getById,
		{
			id: landingPageId,
		},
	);

	const breadcrumbItems = useMemo(() => {
		const base = [
			{
				label: "Assets",
				slug: "assets",
			},
		];
		switch (type) {
			case "landing-page":
				return base.concat([
					{
						label: "Landing Pages",
						slug: "landing-pages",
					},
					{
						label: landingPage?.title ?? "",
						slug: landingPage?.title ?? "",
					},
				]);
			case "email":
				return base.concat([
					{
						label: "Email Templates",
						slug: "email-templates",
					},
					{
						label: landingPage?.title ?? "",
						slug: landingPage?.title ?? "",
					},
				]);
			case "ad":
				return base.concat([
					{
						label: "Ad Templates",
						slug: "ad-templates",
					},
					{
						label: landingPage?.title ?? "",
						slug: landingPage?.title ?? "",
					},
				]);
		}
	}, [type, landingPage?.title]);

	return (
		<div className="flex items-center justify-between px-2 py-3 border-b">
			{/* Left Part */}
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<SidebarTrigger />
					</BreadcrumbItem>
					{breadcrumbItems.flatMap((item, index, array) => {
						const isLast = index === array.length - 1;
						return [
							<BreadcrumbSeparator key={`sep-${item.slug}`} />,
							<BreadcrumbItem key={`item-${item.slug}`}>
								{isLast ? (
									isLoading ? (
										<Skeleton className="w-20 h-4" />
									) : (
										<BreadcrumbPage className="capitalize">
											{landingPage?.title ?? ""}
										</BreadcrumbPage>
									)
								) : (
									<BreadcrumbLink asChild>
										<Link
											href={`/${breadcrumbItems
												.slice(0, index + 1)
												.map((i) => i.slug)
												.join("/")}`}
										>
											{item.label}
										</Link>
									</BreadcrumbLink>
								)}
							</BreadcrumbItem>,
						];
					})}
				</BreadcrumbList>
			</Breadcrumb>
			{/* Preview Button */}
			<div>
				{!isRightPanelClosing && !isRightPanelOpen && (
					<Button onClick={openRightPanel} variant="ghost" className="w-8 h-8">
						<ChevronsLeft className="size-3" />
					</Button>
				)}
			</div>
		</div>
	);
});
