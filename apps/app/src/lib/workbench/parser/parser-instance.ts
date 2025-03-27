import { workbenchStore } from "../atoms";

import { messageQueueAtom } from "../atoms";

import type { MessageQueueItem } from "../atoms";
import { MessageParser } from "./message-parser";

export const messageParser = new MessageParser({
	callbacks: {
		onArtifactOpen: (data) => {
			console.log("onArtifactOpen", data);
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
			console.log("onArtifactClose", data);
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
			console.log("onActionOpen", data);
			const messageQueueItem: MessageQueueItem = {
				id: data.actionId,
				type: "action",
				callbackType: "open",
				isInitial: data.action.isInitial,
				isProcessed: false,
				data,
			};
			// Add to queue
			workbenchStore.set(messageQueueAtom, (prev) => {
				return [...prev, messageQueueItem];
			});
		},
		onActionClose: (data) => {
			console.log("onActionClose", data);
			const messageQueueItem: MessageQueueItem = {
				id: data.actionId,
				type: "action",
				callbackType: "close",
				isInitial: data.action.isInitial,
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
