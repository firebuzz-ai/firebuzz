import { WebContainer } from "@webcontainer/api";
import { WORK_DIR_NAME } from "./constants";

let webcontainerInstance: WebContainer | null = null;
let initializationPromise: Promise<WebContainer> | null = null;

export async function getWebcontainerInstance(): Promise<WebContainer> {
	// Check if we're on the server side
	if (typeof window === "undefined") {
		throw new Error("WebContainer can only be initialized on the client side");
	}

	// If we already have an instance, return it
	if (webcontainerInstance) {
		return webcontainerInstance;
	}

	// If we're already initializing, wait for that to complete
	if (initializationPromise) {
		return initializationPromise;
	}

	// Initialize the WebContainer
	initializationPromise = WebContainer.boot({
		workdirName: WORK_DIR_NAME,
		forwardPreviewErrors: true,
	});

	try {
		webcontainerInstance = await initializationPromise;
		return webcontainerInstance;
	} catch (error) {
		// Reset the promise so we can try again
		initializationPromise = null;
		throw error;
	}
}
