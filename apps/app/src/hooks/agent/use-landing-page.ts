import { useContext } from "react";
import { LandingPageContext } from "@/components/chat/providers/landing-page-provider";

export const useLandingPageContext = () => {
	const context = useContext(LandingPageContext);
	if (!context) {
		throw new Error(
			"useLandingPageContext must be used within LandingPageProvider",
		);
	}
	return context;
};
