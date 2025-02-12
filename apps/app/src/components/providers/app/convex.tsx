"use client";

import { useAuth } from "@clerk/nextjs";
import {
	ConvexProviderWithClerk,
	ConvexQueryCacheProvider,
	ConvexReactClient,
} from "@firebuzz/convex";
import { envConvex } from "@firebuzz/env";
import type { ReactNode } from "react";

const { NEXT_PUBLIC_CONVEX_URL } = envConvex();

const convex = new ConvexReactClient(NEXT_PUBLIC_CONVEX_URL);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
	const orgId = useAuth().orgId; // To refresh the client when the orgId changes
	return (
		<ConvexProviderWithClerk key={orgId} useAuth={useAuth} client={convex}>
			<ConvexQueryCacheProvider>{children}</ConvexQueryCacheProvider>
		</ConvexProviderWithClerk>
	);
}
