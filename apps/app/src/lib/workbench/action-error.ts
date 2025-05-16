import type { Action } from "./atoms";
import type { ActionCallbackData } from "./parser/message-parser";

export class ActionError extends Error {
	messageId: string;
	actionId: string;
	actionType: Action["type"];
	filePath?: string;
	from?: string;
	to?: string;
	actionData: ActionCallbackData;

	constructor(
		message: string,
		actionData: ActionCallbackData,
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = "ActionError";
		this.messageId = actionData.messageId;
		this.actionId = actionData.actionId;
		this.actionType = actionData.action.type;
		this.actionData = actionData;

		// Add type-specific properties
		if (actionData.action.type === "file") {
			this.filePath = actionData.action.filePath;
		} else if (actionData.action.type === "quick-edit") {
			this.filePath = actionData.action.filePath;
			this.from = actionData.action.from;
			this.to = actionData.action.to;
		}

		// Ensure proper prototype chain for instanceof checks
		Object.setPrototypeOf(this, ActionError.prototype);
	}
}
