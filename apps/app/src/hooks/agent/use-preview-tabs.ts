import { previewTabsContext } from "@/components/chat/providers/preview-tabs-provider";
import { useContext } from "react";

export const usePreviewTabs = () => {
	const context = useContext(previewTabsContext);

	if (!context) {
		throw new Error("usePreviewTabs must be used within a PreviewTabsProvider");
	}

	return context;
};
