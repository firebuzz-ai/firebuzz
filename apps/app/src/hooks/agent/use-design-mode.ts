import { designModeContext } from "@/components/chat-v2/providers/design-mode-provider";
import { useContext } from "react";

export const useDesignMode = () => {
	const context = useContext(designModeContext);

	if (!context) {
		throw new Error("useDesignMode must be used within a DesignModeProvider");
	}

	return context;
};
