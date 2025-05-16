import { parseAsString, parseAsStringEnum } from "nuqs";

import { useQueryStates } from "nuqs";

export const useAttachmentPreviewModal = () => {
	return useQueryStates(
		{
			key: parseAsString,
			type: parseAsStringEnum([
				"image",
				"video",
				"audio",
				"pdf",
				"csv",
				"md",
				"html",
				"txt",
				"docx",
				"unknown",
			] as const),
			placement: parseAsStringEnum(["chat-attachment", "chat-input"] as const),
		},
		{
			urlKeys: {
				key: "key",
				type: "type",
				placement: "placement",
			},
		},
	);
};
