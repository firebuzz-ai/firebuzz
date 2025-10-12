import { useContext } from "react";
import { previewTabsContext } from "@/components/chat-v2/providers/preview-tabs-provider";

export const usePreviewTabs = () => {
	const context = useContext(previewTabsContext);

	if (!context) {
		throw new Error("usePreviewTabs must be used within a PreviewTabsProvider");
	}

	return context;
};
