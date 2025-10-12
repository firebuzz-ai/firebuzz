import { useContext } from "react";
import { AgentSessionContext } from "@/components/providers/agent/session";

export const useAgentSession = () => {
	const context = useContext(AgentSessionContext);

	if (!context) {
		throw new Error(
			"useAgentSession must be used within an AgentSessionProvider",
		);
	}

	return context;
};
