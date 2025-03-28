import { workbenchStore } from "../atoms";

import { messageQueueAtom } from "../atoms";

import type { MessageQueueItem } from "../atoms";
import { MessageParser } from "./message-parser";

export const messageParser = new MessageParser({
	callbacks: {
		onArtifactOpen: (data) => {
			const messageQueueItem: MessageQueueItem = {
				id: data.id,
				type: "artifact",
				callbackType: "open",
				isInitial: data.isInitial,
				isProcessed: false,
				data,
			};

			// Add to queue
			workbenchStore.set(messageQueueAtom, (prev) => {
				return [...prev, messageQueueItem];
			});
		},
		onArtifactClose: (data) => {
			const messageQueueItem: MessageQueueItem = {
				id: data.id,
				type: "artifact",
				callbackType: "close",
				isInitial: data.isInitial,
				isProcessed: false,
				data,
			};

			// Add to queue
			workbenchStore.set(messageQueueAtom, (prev) => {
				return [...prev, messageQueueItem];
			});
		},
		onActionOpen: (data) => {
			const messageQueueItem: MessageQueueItem = {
				id: data.actionId,
				type: "action",
				callbackType: "open",
				isInitial: data.isInitial,
				isProcessed: false,
				data,
			};
			// Add to queue
			workbenchStore.set(messageQueueAtom, (prev) => {
				return [...prev, messageQueueItem];
			});
		},
		onActionClose: (data) => {
			const messageQueueItem: MessageQueueItem = {
				id: data.actionId,
				type: "action",
				callbackType: "close",
				isInitial: data.isInitial,
				isProcessed: false,
				data,
			};
			// Add to queue
			workbenchStore.set(messageQueueAtom, (prev) => {
				return [...prev, messageQueueItem];
			});
		},
	},
});
