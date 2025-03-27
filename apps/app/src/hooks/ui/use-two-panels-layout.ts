import { twoPanelsContext } from "@/components/layouts/two-panels/provider";
import { useContext } from "react";
export const useTwoPanelsLayout = () => {
	const context = useContext(twoPanelsContext);

	if (!context) {
		throw new Error(
			"useTwoPanelsLayout must be used within a TwoPanelsProvider",
		);
	}

	return context;
};
