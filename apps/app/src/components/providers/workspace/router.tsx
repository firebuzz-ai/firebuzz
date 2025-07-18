"use client";

import { useProject } from "@/hooks/auth/use-project";
import { useSubscription } from "@/hooks/auth/use-subscription";
import { useUser } from "@/hooks/auth/use-user";
import { useWorkspace } from "@/hooks/auth/use-workspace";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { usePathname, useRouter } from "next/navigation";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

interface RouterContextType {
	isCheckDone: boolean;
	setIsCheckDone: React.Dispatch<React.SetStateAction<boolean>>;
}

const RouterContext = createContext<RouterContextType>({
	isCheckDone: false,
	setIsCheckDone: () => {},
});

export const useRouterContext = () => {
	const context = useContext(RouterContext);
	if (!context) {
		throw new Error("useRouterContext must be used within a RouterProvider");
	}
	return context;
};

export const RouterProvider = ({ children }: { children: React.ReactNode }) => {
	const { isLoading: isUserLoading, isAuthenticated } = useUser();
	const {
		currentWorkspace,
		workspaces,
		isLoading: isWorkspaceLoading,
	} = useWorkspace();
	const { isLoading: isSubscriptionLoading } = useSubscription();

	// Use project context to get project data
	const {
		projects,
		currentProject,
		isLoading: isProjectsLoading,
	} = useProject();

	const router = useRouter();
	const pathname = usePathname();
	const [isCheckDone, setIsCheckDone] = useState(false);

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

		if (pathname === "/join") {
			setIsCheckDone(true);
			return;
		}

		// No Workspace, redirect to '/NEW' (NEW USER SIGNUP)
		if (workspaces.length === 0 && pathname !== "/new") {
			router.push("/new");
			return;
		}

		// Has workspace, redirect to '/select/workspace' (WORKSPACE SELECTION)
		if (pathname === "/new" && (workspaces.length > 0 || currentWorkspace)) {
			router.push("/select/workspace");
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
			pathname !== "/new/workspace" &&
			pathname !== "/select/workspace"
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
			pathname !== "/select/project" &&
			pathname !== "/select/workspace"
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
			pathname !== "/new/project" &&
			pathname !== "/select/project"
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
			<div className="flex flex-1 justify-center items-center">
				<Spinner size="sm" />
			</div>
		);
	}

	const exposed: RouterContextType = {
		isCheckDone,
		setIsCheckDone,
	};

	return (
		<RouterContext.Provider value={exposed}>{children}</RouterContext.Provider>
	);
};
