"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { type Doc, api, useCachedRichQuery } from "@firebuzz/convex";

import { useUser } from "@/hooks/user";
import { useRouter } from "next/navigation";
import { createContext, useMemo } from "react";

const workspaceContext = createContext<{
  currentWorkspace: Doc<"workspaces"> | null;
  workspaces: Doc<"workspaces">[];
  changeWorkspace: (workspaceId: string) => Promise<void>;
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

  const { data: workspaces, isPending: isWorkspacesPending } =
    useCachedRichQuery(
      api.collections.workspace.getAll,
      teamWorkspacesLoaded && userMemberships.data
        ? {
            externalIds:
              userMemberships.data?.map(
                (membership) => membership.organization.id
              ) ?? [],
          }
        : "skip"
    );

  const personalWorkspace = useMemo(() => {
    return workspaces?.find((workspace) => workspace.ownerId === user?._id);
  }, [workspaces, user?._id]);

  const currentWorkspace = useMemo(() => {
    if (!user?.currentWorkspaceId) return null;
    return workspaces?.find(
      (workspace) => workspace._id === user?.currentWorkspaceId
    );
  }, [workspaces, user?.currentWorkspaceId]);

  const changeWorkspace = async (workspaceId: string) => {
    if (setActive) {
      await setActive({
        organization:
          workspaceId === personalWorkspace?.externalId ? null : workspaceId,
      });

      router.push("/content");
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
