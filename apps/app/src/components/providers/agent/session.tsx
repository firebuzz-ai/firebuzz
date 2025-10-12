"use client";

import {
	api,
	type Doc,
	type Id,
	useCachedRichQuery,
	useMutation,
} from "@firebuzz/convex";
import {
	createContext,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { SessionExpiryDialog } from "../../chat-v2/session-expiry-dialog";

type AgentSessionProviderProps =
	| {
			children: ReactNode;
			landingPageId: Id<"landingPages">;
			campaignId: Id<"campaigns">;
			type: "landingPage";
	  }
	| {
			children: ReactNode;
			campaignId: Id<"campaigns">;
			type: "form";
			formId: Id<"forms">;
	  };

interface AgentSessionContextValue {
	session: Doc<"agentSessions"> | undefined;
	isLoading: boolean;
}

const AgentSessionContext = createContext<AgentSessionContextValue>({
	session: undefined,
	isLoading: true,
});

export const AgentSessionProvider = (props: AgentSessionProviderProps) => {
	const { children, campaignId, type } = props;
	const landingPageId =
		type === "landingPage" ? props.landingPageId : undefined;
	const formId = type === "form" ? props.formId : undefined;

	const [sessionId, setSessionId] = useState<Id<"agentSessions"> | null>(null);

	// Ref to prevent duplicate session creation calls (React Strict Mode protection)
	const creatingSessionRef = useRef(false);

	const { data: session, isPending: isSessionLoading } = useCachedRichQuery(
		api.collections.agentSessions.queries.getById,
		sessionId ? { id: sessionId } : "skip",
	);

	const joinOrCreateSessionMutation = useMutation(
		api.collections.agentSessions.mutations.joinOrCreateSession,
	);

	const joinOrCreateSession = useCallback(async () => {
		// Prevent duplicate calls (defense against React Strict Mode double-mounting)
		if (creatingSessionRef.current) {
			console.log(
				"Session creation already in progress, skipping duplicate call",
			);
			return;
		}

		creatingSessionRef.current = true;

		try {
			const assetSettings =
				type === "landingPage" && landingPageId
					? { type: "landingPage" as const, id: landingPageId }
					: type === "form" && formId
						? { type: "form" as const, id: formId }
						: null;

			if (!assetSettings) {
				throw new Error("Invalid asset settings");
			}

			const newSessionId = await joinOrCreateSessionMutation({
				assetSettings,
				campaignId,
			});

			setSessionId(newSessionId);
			return newSessionId;
		} finally {
			creatingSessionRef.current = false;
		}
	}, [joinOrCreateSessionMutation, type, landingPageId, formId, campaignId]);

	useEffect(() => {
		if (!sessionId) {
			joinOrCreateSession().catch((error) => {
				console.error("Failed to join or create session:", error);
			});
		}
	}, [joinOrCreateSession, sessionId]);

	const value = useMemo<AgentSessionContextValue>(
		() => ({
			session: session ?? undefined,
			isLoading: !sessionId || isSessionLoading,
		}),
		[session, sessionId, isSessionLoading],
	);

	return (
		<AgentSessionContext.Provider value={value}>
			<SessionExpiryDialog />
			{children}
		</AgentSessionContext.Provider>
	);
};

export { AgentSessionContext };
