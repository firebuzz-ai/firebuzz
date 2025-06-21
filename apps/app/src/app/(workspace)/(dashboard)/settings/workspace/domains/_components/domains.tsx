"use client";

import { ConfigureDomainModal } from "@/components/modals/domains/configure-domain/configure-domain-modal";
import { NewDomainModal } from "@/components/modals/domains/new-domain/new-domain-modal";
import { EmptyState } from "@/components/reusables/empty-state";
import { useNewDomainModal } from "@/hooks/ui/use-new-domain-modal";
import { type Id, api, useCachedRichQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Globe } from "@firebuzz/ui/icons/lucide";
import { useState } from "react";
import { DomainItem } from "./domain-item";

export const Domains = () => {
	const [selected, setSelected] = useState<Id<"domains">[]>([]);
	const [, setModal] = useNewDomainModal();

	const { data: domains, isPending: isLoading } = useCachedRichQuery(
		api.collections.domains.queries.getPaginated,
		{
			paginationOpts: { numItems: 100, cursor: null },
			sortOrder: "desc",
		},
	);

	if (isLoading) {
		return (
			<div className="flex flex-1 justify-center items-center w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	return (
		<div className="flex overflow-hidden relative flex-col flex-1 max-h-full">
			<div
				onDoubleClick={(e) => {
					e.stopPropagation();
					setSelected([]);
				}}
				className="overflow-y-auto flex-1 select-none"
			>
				{/* Content */}

				{/* Empty State */}
				{domains && domains.page.length === 0 && (
					<EmptyState
						icon={<Globe className="size-6" />}
						title="No domains yet"
						description="Add custom domains to your workspace to enhance your brand presence and SEO."
						buttonTitle="Add Domain"
						buttonShortcut="⌘N"
						onClick={() => {
							setModal((prev) => {
								return {
									...prev,
									create: true,
								};
							});
						}}
					/>
				)}

				{/* Domains */}
				{domains && domains.page.length > 0 && (
					<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{domains.page.map((domain) => (
							<DomainItem
								key={domain._id}
								domain={domain}
								selected={selected.includes(domain._id)}
								setSelected={setSelected}
							/>
						))}
					</div>
				)}
			</div>

			<NewDomainModal />
			<ConfigureDomainModal />
		</div>
	);
};
