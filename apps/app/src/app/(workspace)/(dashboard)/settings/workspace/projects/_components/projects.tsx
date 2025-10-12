"use client";

import { InfoBox } from "@firebuzz/ui/components/reusable/info-box";
import { ProjectModal } from "@/components/modals/projects/project-modal";
import { useProject } from "@/hooks/auth/use-project";
import { useSubscription } from "@/hooks/auth/use-subscription";
import { useProjectModal } from "@/hooks/ui/use-project-modal";
import { ProjectItem } from "./project-item";

export const Projects = () => {
	const { projects, currentProject } = useProject();
	const { projectLimit } = useSubscription();
	const [, setProjectModal] = useProjectModal();

	return (
		<>
			<div className="p-6 space-y-6 border-b">
				{/* Header */}
				<div>
					<h1 className="text-lg font-semibold">Projects</h1>
					<p className="text-sm text-muted-foreground">
						See all projects and create new ones.
					</p>
				</div>

				{/* All Projects Section */}
				<div className="space-y-2 max-w-2xl">
					<div className="flex justify-between items-center">
						<h2 className="font-medium">
							Projects{" "}
							<span className="text-sm text-muted-foreground">
								({projects?.length || 0}/{projectLimit})
							</span>
						</h2>
					</div>

					<div className="space-y-2">
						{projects && projects.length > 0 ? (
							projects.map((project) => (
								<ProjectItem
									key={project._id}
									project={project}
									isCurrent={currentProject?._id === project._id}
								/>
							))
						) : (
							<div className="py-4 text-sm text-muted-foreground">
								No team members yet.{" "}
								<button
									type="button"
									onClick={() => setProjectModal({ create: true })}
									className="text-foreground hover:underline"
								>
									Invite New Member
								</button>
							</div>
						)}
					</div>
					{/* Info Section */}
					<InfoBox variant="info">
						<p>
							You can create{" "}
							<span className="font-medium text-blue-500">
								up to {projectLimit} projects.
							</span>{" "}
							If you need more, you can purchase additional projects.
						</p>
					</InfoBox>
				</div>
			</div>

			<ProjectModal />
		</>
	);
};
