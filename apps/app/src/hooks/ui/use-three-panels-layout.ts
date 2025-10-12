import { useContext } from "react";
import { threePanelsContext } from "@/components/layouts/three-panels/provider";

export const useThreePanelsLayout = () => {
	const context = useContext(threePanelsContext);

	if (!context) {
		throw new Error(
			"useThreePanelsLayout must be used within a ThreePanelsProvider",
		);
	}

	return context;
};
