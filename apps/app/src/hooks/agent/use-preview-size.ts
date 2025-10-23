import { useContext } from "react";
import { previewSizeContext } from "@/components/chat/providers/preview-size-provider";

export const usePreviewSize = () => {
	const context = useContext(previewSizeContext);

	if (!context) {
		throw new Error("usePreviewSize must be used within a PreviewSizeProvider");
	}

	return context;
};
