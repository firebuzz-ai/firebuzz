"use client";

import { ConfigureDomainModal } from "@/components/modals/domains/configure-domain/configure-domain-modal";
import { NewDomainModal } from "@/components/modals/domains/new-domain/new-domain-modal";
import { EmptyState } from "@/components/reusables/empty-state";
import { useProject } from "@/hooks/auth/use-project";
import { useNewDomainModal } from "@/hooks/ui/use-new-domain-modal";
import { api, useCachedQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { Globe } from "@firebuzz/ui/icons/lucide";
import { DomainItem } from "./domain-item";

export const Domains = () => {
	const [, setModal] = useNewDomainModal();
	const { currentProject } = useProject();

	const domains = useCachedQuery(
		api.collections.domains.queries.getByProject,
		currentProject?._id ? { projectId: currentProject._id } : "skip",
	);

	const isLoading = !currentProject || domains === undefined;

	if (isLoading) {
		return (
			<div className="flex flex-1 justify-center items-center w-full h-full">
				<Spinner size="sm" />
			</div>
		);
	}

	return (
		<div className="flex overflow-hidden relative flex-col flex-1 max-h-full">
			<div className="overflow-y-auto flex-1 select-none">
				{/* Content */}

				{/* Empty State */}
				{domains && domains.length === 0 && (
					<EmptyState
						icon={<Globe className="size-6" />}
						title="No domains yet"
						description="Add custom domains to your project to enhance your brand presence and SEO."
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
				{domains && domains.length > 0 && (
					<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{domains.map((domain) => (
							<DomainItem key={domain._id} domain={domain} />
						))}
					</div>
				)}
			</div>

			<NewDomainModal />
			<ConfigureDomainModal />
		</div>
	);
};
