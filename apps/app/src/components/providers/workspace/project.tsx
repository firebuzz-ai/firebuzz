"use client";

import {
  type Doc,
  type Id,
  api,
  useCachedRichQuery,
  useMutation,
} from "@firebuzz/convex";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo } from "react";
import { useUser } from "./user";
import { useWorkspace } from "./workspace";

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
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();

  // Get all projects for current workspace
  const { data: projects, isPending: isProjectsPending } = useCachedRichQuery(
    api.collections.projects.getAllByWorkspace,
    !user || !currentWorkspace ? "skip" : undefined
  );

  const currentProject = useMemo(() => {
    return projects?.find((project) => project._id === user?.currentProject);
  }, [projects, user?.currentProject]);

  const updateUserCurrentProject = useMutation(
    api.collections.users.updateCurrentProject
  );

  const changeProject = async (projectId: Id<"projects"> | undefined) => {
    if (!user?._id) return;

    await updateUserCurrentProject({
      id: user._id,
      currentProject: projectId,
    });

    router.push("/");
  };

  // Redirect to onboarding if current workspace is Not Onboarded (onboardingCompleted is false in the workspace)
  useEffect(() => {
    if (
      currentWorkspace &&
      !currentWorkspace?.onboardingCompleted &&
      pathname !== "/new" &&
      isAuthenticated
    ) {
      router.push("/new");
    }
  }, [pathname, currentWorkspace, isAuthenticated, router]);

  // If there is no current project, redirect to project selection
  useEffect(() => {
    if (!isProjectsPending && !currentProject) {
      router.push("/select/project");
    }
  }, [currentProject, isProjectsPending, router]);

  // Show loading state while checking authentication and loading initial data
  if (
    isUserLoading ||
    isProjectsPending ||
    !currentProject ||
    isWorkspaceLoading
  ) {
    return (
      <div className="flex-1 flex items-center justify-center">
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

const useProject = () => {
  return useContext(projectContext);
};

export { ProjectProvider, useProject };
