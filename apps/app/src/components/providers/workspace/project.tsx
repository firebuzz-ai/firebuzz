"use client";

import {
	api,
	type Doc,
	type Id,
	useCachedRichQuery,
	useMutation,
} from "@firebuzz/convex";
import { useRouter } from "next/navigation";
import { createContext, useMemo } from "react";
import { useUser } from "@/hooks/auth/use-user";
import { useWorkspace } from "@/hooks/auth/use-workspace";

interface ProjectContextType {
	isLoading: boolean;
	currentProject: Doc<"projects"> | null;
	projects: Array<Doc<"projects">>;
	changeProject: (projectId: Id<"projects">) => Promise<void>;
}

const projectContext = createContext<ProjectContextType>({
	isLoading: true,
	currentProject: null,
	projects: [],
	changeProject: async () => {},
});

const ProjectProvider = ({ children }: { children: React.ReactNode }) => {
	const { user } = useUser();
	const { currentWorkspace } = useWorkspace();
	const router = useRouter();

	// Get all projects for current workspace
	const { data: projects, isPending: isProjectsPending } = useCachedRichQuery(
		api.collections.projects.queries.getAllByWorkspace,
		!user || !currentWorkspace ? "skip" : undefined,
	);

	const currentProject = useMemo(() => {
		return (
			projects?.find((project) => project._id === user?.currentProjectId) ??
			null
		);
	}, [projects, user?.currentProjectId]);

	const updateUserCurrentProject = useMutation(
		api.collections.users.mutations.updateCurrentProject,
	);

	const changeProject = async (projectId: Id<"projects"> | undefined) => {
		if (!user?._id) return;

		await updateUserCurrentProject({
			currentProjectId: projectId,
		});

		router.push("/");
	};

	const exposed: ProjectContextType = {
		isLoading: isProjectsPending && Boolean(user) && Boolean(currentWorkspace),
		currentProject,
		projects: projects ?? [],
		changeProject,
	};

	return (
		<projectContext.Provider value={exposed}>
			{children}
		</projectContext.Provider>
	);
};

export { ProjectProvider, projectContext };
