"use client";

import { useOrganizationList } from "@clerk/nextjs";
import {
	type Doc,
	type Id,
	api,
	useCachedRichQuery,
	useMutation,
} from "@firebuzz/convex";

import { useUser } from "@/hooks/auth/use-user";
import { useRouter } from "next/navigation";
import { createContext } from "react";

const workspaceContext = createContext<{
	currentWorkspace: (Doc<"workspaces"> & { owner: Doc<"users"> | null }) | null;
	workspaces: Doc<"workspaces">[];
	changeWorkspace: (workspaceId: Id<"workspaces">) => Promise<void>;
	isLoading: boolean;
}>({
	currentWorkspace: null,
	workspaces: [],
	changeWorkspace: async () => {},
	isLoading: true,
});

const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
	const { isLoading: isUserLoading, isAuthenticated, user } = useUser();
	const router = useRouter();

	const {
		userMemberships,
		isLoaded: teamWorkspacesLoaded,
		setActive,
	} = useOrganizationList({ userMemberships: true });

	console.log({ data: userMemberships.data, teamWorkspacesLoaded });

	const updateUserCurrentWorkspace = useMutation(
		api.collections.users.mutations.updateCurrentWorkspace,
	);

	const { data: workspaces, isPending: isWorkspacesPending } =
		useCachedRichQuery(
			api.collections.workspaces.queries.getAll,
			teamWorkspacesLoaded && userMemberships.data
				? {
						externalIds:
							userMemberships.data?.map(
								(membership) => membership.organization.id,
							) ?? [],
					}
				: "skip",
		);

	const { data: currentWorkspace, isPending: isCurrentWorkspacePending } =
		useCachedRichQuery(api.collections.workspaces.queries.getCurrent);

	const changeWorkspace = async (workspaceId: Id<"workspaces">) => {
		if (setActive) {
			const externalId = workspaces?.find(
				(workspace) => workspace._id === workspaceId,
			)?.externalId;

			await setActive({
				// Team workspaces have an externalId that starts with "org_" personal workspaces start with "user_"
				organization: externalId?.startsWith("org_") ? externalId : null,
			});

			await updateUserCurrentWorkspace({
				currentWorkspaceId: workspaceId,
			});

			// If user has no project, redirect to project selection
			if (!user?.currentProjectId) {
				router.push("/select/project");
			} else {
				router.push("/");
			}
		}
	};

	const exposed = {
		workspaces: workspaces ?? [],
		currentWorkspace: currentWorkspace ?? null,
		changeWorkspace,
		isLoading:
			isUserLoading ||
			!isAuthenticated ||
			!teamWorkspacesLoaded ||
			isWorkspacesPending ||
			isCurrentWorkspacePending,
	};

	return (
		<workspaceContext.Provider value={exposed}>
			{children}
		</workspaceContext.Provider>
	);
};

export { WorkspaceProvider, workspaceContext };
