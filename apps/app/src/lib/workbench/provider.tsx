import { useSetAtom } from "jotai";
import type React from "react";
import { useEffect } from "react";
import {
	type SelectedElement,
	errorsAtom,
	isIframeLoadedAtom,
	portAtom,
	resetState,
	selectedElementAtom,
} from "./atoms";
import { PREVIEW_SCRIPT } from "./constants";
import { webcontainerInstance } from "./webcontainer";

// Set Preview Script
async function setPreviewScript() {
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
	// Port Listener
	useEffect(() => {
		const unsubPort = webcontainerInstance.on("port", (port, type, url) => {
			if (type === "open") {
				setPort({
					port,
					url,
				});
			}
		});

		// Client Error Listener
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

		// Container Error Listener
		const unsubContainerError = webcontainerInstance.on("error", (error) => {
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
		});

		setPreviewScript();

		// Cleanup
		return () => {
			resetState();
			unsubPort();
			unsubClientError();
			unsubContainerError();
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
