"use client";

import { api, type Id, useRichQuery } from "@firebuzz/convex";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@firebuzz/ui/components/ui/breadcrumb";
import { SidebarTrigger } from "@firebuzz/ui/components/ui/sidebar";
import { Skeleton } from "@firebuzz/ui/components/ui/skeleton";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useMemo } from "react";
export const CampaignTopbar = () => {
	const pathname = usePathname();
	const { id } = useParams<{ id: string | undefined }>();
	const { data: campaign, isPending: isLoadingCampaign } = useRichQuery(
		api.collections.campaigns.queries.getById,
		id ? { id: id as Id<"campaigns"> } : "skip",
	);

	const breadcrumbItems = useMemo(() => {
		if (campaign && id) {
			return ["campaigns", campaign.title];
		}
		return pathname.split("/").slice(1) ?? [];
	}, [pathname, campaign, id]);

	const isLoading = isLoadingCampaign && id;

	return (
		<div className="px-2 py-3 border-b">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<SidebarTrigger />
					</BreadcrumbItem>
					{isLoading ? (
						<BreadcrumbPage>
							<Skeleton className="w-20 h-4" />
						</BreadcrumbPage>
					) : (
						breadcrumbItems.flatMap((item, index, array) => {
							const isLast = index === array.length - 1;
							return [
								<BreadcrumbSeparator key={`sep-${item}`} />,
								<BreadcrumbItem key={`item-${item}`}>
									{isLast ? (
										<BreadcrumbPage>
											{item
												.replace(/-/g, " ")
												.replace(/\b\w/g, (char) => char.toUpperCase())}
										</BreadcrumbPage>
									) : (
										<BreadcrumbLink asChild>
											<Link
												href={`/${breadcrumbItems.slice(0, index + 1).join("/")}`}
											>
												{item
													.replace(/-/g, " ")
													.replace(/\b\w/g, (char) => char.toUpperCase())}
											</Link>
										</BreadcrumbLink>
									)}
								</BreadcrumbItem>,
							];
						})
					)}
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	);
};
