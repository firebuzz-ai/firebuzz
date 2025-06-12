"use client";

import { useAuth, useUser as useClerkUser } from "@clerk/nextjs";
import type { GetToken } from "@clerk/types";
import {
  type Doc,
  api,
  useCachedRichQuery,
  useConvexAuth,
} from "@firebuzz/convex";

import { createContext } from "react";
interface User extends Doc<"users"> {
  currentWorkspaceExternalId: string | undefined;
  currentRole: "Admin" | "Member";
}

const userContext = createContext<{
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  getToken: GetToken;
}>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  getToken: () => Promise.resolve(""),
});

const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { user: clerkUser, isLoaded } = useClerkUser();

  const { getToken } = useAuth();
  const { data: user, isPending } = useCachedRichQuery(
    api.collections.users.queries.getCurrent,
    isLoading || !isAuthenticated || !isLoaded || !clerkUser
      ? "skip"
      : undefined
  );

  const exposed = {
    user: user ?? null,
    isAuthenticated,
    isLoading: isLoading || !isLoaded || isPending,
    getToken,
  };

  return (
    <userContext.Provider value={exposed}>{children}</userContext.Provider>
  );
};

export { UserProvider, userContext };
