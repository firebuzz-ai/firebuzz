"use client";

import { ConfigureProjectDomainModal } from "@/components/modals/domains/configure-project-domain/configure-project-domain-modal";
import { useProject } from "@/hooks/auth/use-project";
import { api, useCachedQuery } from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { ProjectDomainItem } from "./project-domain-item";

export const ProjectDomains = () => {
	const { currentProject } = useProject();

	const projectDomains = useCachedQuery(
		api.collections.domains.project.queries.getByProject,
		currentProject?._id ? { projectId: currentProject._id } : "skip",
	);

	const isLoading = !currentProject || projectDomains === undefined;

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
				{/* Empty State */}
				{projectDomains && projectDomains.length === 0 && (
					<div className="flex flex-1 justify-center items-center w-full h-full">
						No project domains yet
					</div>
				)}

				{/* Project Domains */}
				{projectDomains && projectDomains.length > 0 && (
					<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{projectDomains.map((domain) => (
							<ProjectDomainItem key={domain._id} domain={domain} />
						))}
					</div>
				)}
			</div>

			<ConfigureProjectDomainModal />
		</div>
	);
};
