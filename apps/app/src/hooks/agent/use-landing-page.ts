import { LandingPageContext } from "@/components/chat-v2/providers/landing-page-provider";
import { useContext } from "react";

export const useLandingPageContext = () => {
	const context = useContext(LandingPageContext);
	if (!context) {
		throw new Error(
			"useLandingPageContext must be used within LandingPageProvider",
		);
	}
	return context;
};
