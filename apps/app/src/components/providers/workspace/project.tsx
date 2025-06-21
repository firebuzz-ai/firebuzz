"use client";

import { useSubscription } from "@/hooks/auth/use-subscription";
import { useUser } from "@/hooks/auth/use-user";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import {
  type Doc,
  type Id,
  api,
  useCachedRichQuery,
  useMutation,
} from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

interface ProjectContextType {
  currentProject: Doc<"projects"> | null;
  projects: Array<Doc<"projects">>;
  changeProject: (projectId: Id<"projects">) => Promise<void>;
}

const projectContext = createContext<ProjectContextType>({
  currentProject: null,
  projects: [],
  changeProject: async () => {},
});

const ProjectProvider = ({ children }: { children: React.ReactNode }) => {
  const { isLoading: isUserLoading, isAuthenticated, user } = useUser();
  const {
    currentWorkspace,
    workspaces,
    isLoading: isWorkspaceLoading,
  } = useWorkspace();
  const { isLoading: isSubscriptionLoading } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckDone, setIsCheckDone] = useState(false);

  // Get all projects for current workspace
  const { data: projects, isPending: isProjectsPending } = useCachedRichQuery(
    api.collections.projects.queries.getAllByWorkspace,
    !user || !currentWorkspace ? "skip" : undefined
  );

  const isProjectsLoading = Boolean(
    user && currentWorkspace && isProjectsPending
  );

  const currentProject = useMemo(() => {
    return (
      projects?.find((project) => project._id === user?.currentProjectId) ??
      null
    );
  }, [projects, user?.currentProjectId]);

  const updateUserCurrentProject = useMutation(
    api.collections.users.mutations.updateCurrentProject
  );

  const changeProject = async (projectId: Id<"projects"> | undefined) => {
    if (!user?._id) return;

    await updateUserCurrentProject({
      currentProjectId: projectId,
    });

    router.push("/");
  };

  // Routing Checks (ONBOARDING, WORKSPACE SELECTION, PROJECT SELECTION, NEW USER FLOW)
  const handleRoutingChecks = useCallback(async () => {
    // Check if user is authenticated
    if (!isAuthenticated && !isUserLoading) {
      router.push("/sign-in");
      return;
    }

    // Wait for all loading states to complete
    if (
      isUserLoading ||
      isWorkspaceLoading ||
      isProjectsLoading ||
      isSubscriptionLoading
    ) {
      return;
    }

    // No Workspace, redirect to '/NEW' (NEW USER SIGNUP)
    if (workspaces.length === 0 && pathname !== "/new") {
      router.push("/new");
      return;
    }

    // No Current Workspace, redirect to '/select/workspace' (WORKSPACE SELECTION)
    if (
      workspaces.length > 0 &&
      !currentWorkspace &&
      pathname !== "/select/workspace"
    ) {
      router.push("/select/workspace");
      return;
    }

    // Current Workspace is not onboarded, redirect to '/new/workspace' (ONBOARDING)
    if (
      currentWorkspace &&
      !currentWorkspace.isOnboarded &&
      pathname !== "/new/workspace"
    ) {
      router.push("/new/workspace");
      return;
    }

    // No Project, redirect to '/new/project' (ONBOARDING PROJECT)
    // TODO: This should never happen, prepare for this case.
    if (
      projects?.length === 0 &&
      currentWorkspace &&
      pathname !== "/new/project"
    ) {
      router.push("/new/project");
      return;
    }

    // No Current Project, redirect to '/select/project' (PROJECT SELECTION)
    if (
      !currentProject &&
      currentWorkspace &&
      projects?.length &&
      projects.length > 0 &&
      pathname !== "/select/project"
    ) {
      router.push("/select/project");
      return;
    }

    // Current Project is not onboarded, redirect to '/new/project' (ONBOARDING PROJECT)
    if (
      currentWorkspace &&
      currentProject &&
      !currentProject.isOnboarded &&
      currentWorkspace.isOnboarded &&
      pathname !== "/new/project"
    ) {
      router.push("/new/project");
      return;
    }

    // All checks passed, mark as done
    setIsCheckDone(true);
  }, [
    isAuthenticated,
    isUserLoading,
    isWorkspaceLoading,
    isProjectsLoading,
    isSubscriptionLoading,
    workspaces,
    currentWorkspace,
    projects,
    currentProject,
    pathname,
    router,
  ]);

  useEffect(() => {
    handleRoutingChecks();
  }, [handleRoutingChecks]);

  // Show loading state while checking authentication and loading initial data or performing routing checks
  if (!isCheckDone) {
    return (
      <div className="flex items-center justify-center flex-1">
        <Spinner size="sm" />
      </div>
    );
  }

  const exposed: ProjectContextType = {
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
