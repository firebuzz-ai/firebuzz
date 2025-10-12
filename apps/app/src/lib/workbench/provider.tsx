import { useSetAtom } from "jotai";
import type React from "react";
import { useEffect } from "react";
import {
	errorsAtom,
	isIframeLoadedAtom,
	portAtom,
	resetState,
	type SelectedElement,
	selectedElementAtom,
} from "./atoms";
import { PREVIEW_SCRIPT } from "./constants";
import { getWebcontainerInstance } from "./webcontainer";

// Set Preview Script
async function setPreviewScript() {
	const webcontainerInstance = await getWebcontainerInstance();
	await webcontainerInstance.setPreviewScript(PREVIEW_SCRIPT);
}

export const WebcontainerProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const setPort = useSetAtom(portAtom);
	const setIsIframeLoaded = useSetAtom(isIframeLoadedAtom);
	const setSelectedElement = useSetAtom(selectedElementAtom);
	const setErrors = useSetAtom(errorsAtom);

	// Initialize WebContainer and set up listeners
	useEffect(() => {
		let isMounted = true;
		let unsubscribeCallbacks: (() => void)[] = [];

		const initializeWebcontainer = async () => {
			try {
				const webcontainerInstance = await getWebcontainerInstance();

				// Check if component is still mounted
				if (!isMounted) return;

				// Set up event listeners
				const unsubPort = webcontainerInstance.on("port", (port, type, url) => {
					if (type === "open") {
						setPort({
							port,
							url,
						});
					}
				});

				const unsubClientError = webcontainerInstance.on(
					"preview-message",
					(message) => {
						setErrors((prev) => {
							return [
								...prev,
								{
									type: "client",
									// @ts-expect-error - message property may not exist on preview message type but is accessed at runtime
									message: message?.message ?? "",
									rawError: JSON.stringify(message),
								},
							];
						});
					},
				);

				const unsubContainerError = webcontainerInstance.on(
					"error",
					(error) => {
						console.log("container error", error);
						setErrors((prev) => {
							return [
								...prev,
								{
									type: "container",
									message: error.message,
									rawError: JSON.stringify(error),
								},
							];
						});
					},
				);

				// Store cleanup functions
				unsubscribeCallbacks = [
					unsubPort,
					unsubClientError,
					unsubContainerError,
				];

				// Set preview script
				await setPreviewScript();
			} catch (error) {
				console.error("Failed to initialize WebContainer:", error);
				// Add error to state so UI can handle it
				setErrors((prev) => [
					...prev,
					{
						type: "container",
						message: "Failed to initialize WebContainer",
						rawError: JSON.stringify(error),
					},
				]);
			}
		};

		// Start initialization
		initializeWebcontainer();

		// Cleanup function
		return () => {
			isMounted = false;
			resetState();

			// Clean up event listeners
			// Use for...of for better readability and to follow linting rules
			for (const cleanup of unsubscribeCallbacks) {
				try {
					cleanup();
				} catch (error) {
					// Warn so we can track cleanup issues, but don't block other cleanups
					console.warn("Error during cleanup:", error);
				}
			}
		};
	}, [setPort, setErrors]);

	// Listen for messages from the iframe
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data?.type === "iframe-loaded") {
				setIsIframeLoaded(true);
			} else if (event.data?.type === "element-selected") {
				setSelectedElement(event.data.data as SelectedElement);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [setIsIframeLoaded, setSelectedElement]);

	// Add keyboard shortcut to clear selected element
	useEffect(() => {
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setSelectedElement(null);
			}
		};

		window.addEventListener("keydown", handleKeydown);
		return () => window.removeEventListener("keydown", handleKeydown);
	}, [setSelectedElement]);

	return <>{children}</>;
};
