import { useContext } from "react";
import { twoPanelsAgentContext } from "@/components/layouts/two-panels-agent/provider";

export const useTwoPanelsAgentLayout = () => {
	const context = useContext(twoPanelsAgentContext);

	if (!context) {
		throw new Error(
			"useTwoPanelsAgentLayout must be used within a TwoPanelsAgentProvider",
		);
	}

	return context;
};
