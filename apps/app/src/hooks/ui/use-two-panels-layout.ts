import { useContext } from "react";
import { twoPanelsContext } from "@/components/layouts/two-panels/provider";
export const useTwoPanelsLayout = () => {
	const context = useContext(twoPanelsContext);

	if (!context) {
		throw new Error(
			"useTwoPanelsLayout must be used within a TwoPanelsProvider",
		);
	}

	return context;
};
