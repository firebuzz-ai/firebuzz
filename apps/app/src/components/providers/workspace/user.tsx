"use client";

import { useUser as useClerkUser } from "@clerk/nextjs";
import {
	type Doc,
	type Id,
	api,
	useCachedRichQuery,
	useConvexAuth,
} from "@firebuzz/convex";

import { createContext } from "react";
interface User extends Doc<"users"> {
	currentWorkspaceId: Id<"workspaces">;
	currentWorkspaceExternalId: string;
}

const userContext = createContext<{
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
}>({
	user: null,
	isAuthenticated: false,
	isLoading: true,
});

const UserProvider = ({ children }: { children: React.ReactNode }) => {
	const { isLoading, isAuthenticated } = useConvexAuth();
	const { user: clerkUser, isLoaded } = useClerkUser();
	const { data: user, isPending } = useCachedRichQuery(
		api.collections.users.getCurrent,
		isLoading || !isAuthenticated || !isLoaded || !clerkUser
			? "skip"
			: undefined,
	);

	const exposed = {
		user: user ?? null,
		isAuthenticated,
		isLoading: isLoading || !isLoaded || isPending,
	};

	return (
		<userContext.Provider value={exposed}>{children}</userContext.Provider>
	);
};



export { UserProvider, userContext };
