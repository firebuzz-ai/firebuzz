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
import { createContext, useMemo } from "react";

const workspaceContext = createContext<{
  currentWorkspace: Doc<"workspaces"> | null;
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

  const updateUserCurrentWorkspace = useMutation(
    api.collections.users.mutations.updateCurrentWorkspace
  );

  const { data: workspaces, isPending: isWorkspacesPending } =
    useCachedRichQuery(
      api.collections.workspaces.queries.getAll,
      teamWorkspacesLoaded && userMemberships.data
        ? {
            externalIds:
              userMemberships.data?.map(
                (membership) => membership.organization.id
              ) ?? [],
          }
        : "skip"
    );

  const personalWorkspaces = useMemo(() => {
    return (workspaces ?? [])
      .filter(
        (workspace) => workspace.ownerId === user?._id && !workspace.externalId
      )
      .map((workspace) => workspace._id);
  }, [workspaces, user?._id]);

  const currentWorkspace = useMemo(() => {
    if (!user?.currentWorkspaceId) return null;
    return workspaces?.find(
      (workspace) => workspace._id === user?.currentWorkspaceId
    );
  }, [workspaces, user?.currentWorkspaceId]);

  const changeWorkspace = async (workspaceId: Id<"workspaces">) => {
    if (setActive) {
      await setActive({
        organization: personalWorkspaces?.includes(workspaceId)
          ? null
          : workspaceId,
      });

      await updateUserCurrentWorkspace({
        currentWorkspaceId: workspaceId,
      });

      router.push("/");
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
      isWorkspacesPending,
  };

  return (
    <workspaceContext.Provider value={exposed}>
      {children}
    </workspaceContext.Provider>
  );
};

export { WorkspaceProvider, workspaceContext };
