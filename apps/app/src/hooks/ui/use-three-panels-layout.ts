import { threePanelsContext } from "@/components/layouts/three-panels/provider";
import { useContext } from "react";

export const useThreePanelsLayout = () => {
	const context = useContext(threePanelsContext);

	if (!context) {
		throw new Error(
			"useThreePanelsLayout must be used within a ThreePanelsProvider",
		);
	}

	return context;
};
