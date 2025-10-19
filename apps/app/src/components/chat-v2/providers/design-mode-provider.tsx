"use client";

import { useAgentSession } from "@/hooks/agent/use-agent-session";
import { useSandbox } from "@/hooks/agent/use-sandbox";
import {
	findNodeByLocation,
	generateCodeFromAST,
	parseElementId,
	parseSourceFile,
	updateNodeAttribute,
	updateNodeClassName,
	updateNodeTextContent,
} from "@/lib/design-mode/ast-utils";
import { api, useAction, useMutation, useQuery } from "@firebuzz/convex";
import type { ParseResult } from "@babel/parser";
import * as t from "@babel/types";
import type { File as BabelFile } from "@babel/types";
import { createContext, useCallback, useEffect, useRef, useState } from "react";

export interface ElementData {
	// Source location from React Fiber
	sourceFile: string;
	sourceLine: number;
	sourceColumn: number;
	elementId: string; // Computed: `${sourceFile}:${sourceLine}:${sourceColumn}`

	// DOM properties
	tagName: string;
	className: string;
	textContent: string | null;
	src?: string;
	alt?: string;
	computedStyles?: Record<string, string>;
}

interface DesignModeContext {
	isDesignModeActive: boolean;
	selectedElement: ElementData | null;
	hasUnsavedChanges: boolean;
	toggleDesignMode: () => Promise<void>;
	selectElement: (data: ElementData | null) => Promise<void>;
	updateElement: (
		elementId: string,
		updates: {
			className?: string;
			textContent?: string;
			src?: string;
			alt?: string;
		},
	) => Promise<void>;
	saveChangesToFiles: () => Promise<void>;
	isLoading: boolean;
}

export const designModeContext = createContext<DesignModeContext>({
	isDesignModeActive: false,
	selectedElement: null,
	hasUnsavedChanges: false,
	toggleDesignMode: async () => {},
	selectElement: async () => {},
	updateElement: async () => {},
	saveChangesToFiles: async () => {},
	isLoading: false,
});

export const DesignModeProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const { session } = useAgentSession();
	const { iframeRef, isPreviewIframeLoaded, sandboxDbId } = useSandbox();

	// AST cache for lazy loading - Map<filePath, { ast, content, timestamp }>
	const astCache = useRef<
		Map<
			string,
			{
				ast: ParseResult<BabelFile>;
				content: string;
				timestamp: number;
			}
		>
	>(new Map());

	// Track if any edits have been made during this design mode session
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	// Track which specific elements have been edited (elementId Set)
	// This prevents false positives when diffing - we only compare edited elements
	const editedElementsRef = useRef<Set<string>>(new Set());

	// Get design mode state from Convex (reactive)
	const designModeState = useQuery(
		api.collections.agentSessions.queries.getDesignModeState,
		session?._id ? { sessionId: session._id } : "skip",
	);

	// Mutations with optimistic updates
	const toggleDesignModeMutation = useMutation(
		api.collections.agentSessions.mutations.toggleDesignMode,
	).withOptimisticUpdate((localStore, args) => {
		const currentState = localStore.getQuery(
			api.collections.agentSessions.queries.getDesignModeState,
			{ sessionId: args.sessionId },
		);
		if (currentState !== undefined) {
			localStore.setQuery(
				api.collections.agentSessions.queries.getDesignModeState,
				{ sessionId: args.sessionId },
				{
					...(currentState || { pendingChanges: [] }),
					isActive: args.enabled,
				},
			);
		}
	});

	const selectElementMutation = useMutation(
		api.collections.agentSessions.mutations.selectElement,
	).withOptimisticUpdate((localStore, args) => {
		const currentState = localStore.getQuery(
			api.collections.agentSessions.queries.getDesignModeState,
			{ sessionId: args.sessionId },
		);
		if (currentState !== undefined) {
			localStore.setQuery(
				api.collections.agentSessions.queries.getDesignModeState,
				{ sessionId: args.sessionId },
				{
					...(currentState || { isActive: false, pendingChanges: [] }),
					selectedElement: args.element,
				},
			);
		}
	});

	const readFileAction = useAction(
		api.collections.agentSessions.actions.readFileForDesignMode,
	);

	const saveChangesToFilesMutation = useMutation(
		api.collections.agentSessions.mutations.saveChangesToFiles,
	);

	const updateElementMutation = useMutation(
		api.collections.agentSessions.mutations.updateElementOptimistic,
	);

	// Read file from sandbox using action
	const readFileFromSandbox = useCallback(
		async (filePath: string): Promise<string> => {
			if (!sandboxDbId) {
				throw new Error("No session or sandbox available");
			}

			// React Fiber's _debugSource.fileName returns absolute paths like:
			// "/vercel/sandbox/src/components/hero.tsx"
			// We need to strip the "/vercel/sandbox/" prefix to get "src/components/hero.tsx"
			let normalizedPath = filePath;
			if (normalizedPath.startsWith("/vercel/sandbox/")) {
				normalizedPath = normalizedPath.slice("/vercel/sandbox/".length);
			} else if (normalizedPath.startsWith("vercel/sandbox/")) {
				normalizedPath = normalizedPath.slice("vercel/sandbox/".length);
			} else if (normalizedPath.startsWith("/")) {
				normalizedPath = normalizedPath.slice(1);
			}

			const result = await readFileAction({
				sandboxId: sandboxDbId,
				filePath: normalizedPath,
			});

			if (!result.success || !result.content) {
				throw new Error(result.error?.message || "Failed to read file");
			}

			return result.content;
		},
		[sandboxDbId, readFileAction],
	);

	// Get or load AST for a file
	const getOrLoadAST = useCallback(
		async (filePath: string) => {
			// Check cache first
			const cached = astCache.current.get(filePath);
			if (cached) {
				console.log(`[Design Mode] Using cached AST for ${filePath}`);
				return cached;
			}

			console.log(`[Design Mode] Loading and parsing ${filePath}`);

			// Load file from sandbox
			const content = await readFileFromSandbox(filePath);

			// Parse to AST
			const ast = parseSourceFile(content);

			// Cache it
			const cacheEntry = { ast, content, timestamp: Date.now() };
			astCache.current.set(filePath, cacheEntry);

			return cacheEntry;
		},
		[readFileFromSandbox],
	);

	const toggleDesignMode = useCallback(async () => {
		if (!session?._id) return;

		const newState = !designModeState?.isActive;

		// Reset unsaved changes and edited elements when disabling design mode
		if (!newState) {
			setHasUnsavedChanges(false);
			editedElementsRef.current.clear();
		}

		await toggleDesignModeMutation({
			sessionId: session._id,
			enabled: newState,
		});

		// Send message to iframe
		if (iframeRef.current?.contentWindow && isPreviewIframeLoaded) {
			iframeRef.current.contentWindow.postMessage(
				{
					type: newState ? "ENABLE_DESIGN_MODE" : "DISABLE_DESIGN_MODE",
					enabled: newState,
				},
				"*",
			);
		}
	}, [
		session?._id,
		designModeState?.isActive,
		toggleDesignModeMutation,
		iframeRef,
		isPreviewIframeLoaded,
	]);

	const selectElement = useCallback(
		async (data: ElementData | null) => {
			if (!session?._id || !data) return;

			await selectElementMutation({
				sessionId: session._id,
				element: {
					elementId: data.elementId,
					tagName: data.tagName,
					className: data.className,
					textContent: data.textContent ?? undefined,
					src: data.src,
					alt: data.alt,
					sourceFile: data.sourceFile,
					sourceLine: data.sourceLine,
					sourceColumn: data.sourceColumn,
				},
			});
		},
		[session?._id, selectElementMutation],
	);

	const updateElement = useCallback(
		(
			elementId: string,
			updates: {
				className?: string;
				textContent?: string;
				src?: string;
				alt?: string;
			},
		) => {
			try {
				// Parse elementId to get file path, line, column
				const [filePath, line, column] = parseElementId(elementId);
				console.log(
					`[Design Mode] Updating element at ${filePath}:${line}:${column}`,
					updates,
				);

				// Mark that we have unsaved changes
				setHasUnsavedChanges(true);

				// Track this specific element as edited
				editedElementsRef.current.add(elementId);

				// LOVABLE'S APPROACH: Only send visual update to iframe
				// No tracking, no pending state, no Convex updates
				// We'll compute diffs on save by querying the iframe
				if (iframeRef.current?.contentWindow && isPreviewIframeLoaded) {
					iframeRef.current.contentWindow.postMessage(
						{
							type: "FB_UPDATE_ELEMENT",
							sourceFile: filePath,
							sourceLine: line,
							sourceColumn: column,
							updates,
						},
						"*",
					);
				}
			} catch (error) {
				console.error("[Design Mode] Error updating element:", error);
			}
		},
		[iframeRef, isPreviewIframeLoaded],
	);

	// Listen for element selection messages from iframe
	useEffect(() => {
		const handleMessage = (
			event: MessageEvent<{
				type: string;
				data: {
					sourceFile: string;
					sourceLine: number;
					sourceColumn: number;
					tagName: string;
					className: string;
					textContent: string | null;
					src?: string;
					alt?: string;
					computedStyles?: Record<string, string>;
				};
			}>,
		) => {
			if (event.data.type === "FB_ELEMENT_SELECTED" && event.data.data) {
				const { sourceFile, sourceLine, sourceColumn, ...rest } = event.data.data;

				// Construct elementId from React Fiber source location
				const elementId = `${sourceFile}:${sourceLine}:${sourceColumn}`;

				console.log("[Design Mode] Element selected from React Fiber", {
					elementId,
					sourceFile,
					sourceLine,
					sourceColumn,
					tagName: rest.tagName,
				});

				selectElement({
					sourceFile,
					sourceLine,
					sourceColumn,
					elementId,
					...rest,
				});
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [selectElement]);

	// Send design mode state to iframe when it changes
	useEffect(() => {
		if (
			!iframeRef.current?.contentWindow ||
			!isPreviewIframeLoaded ||
			designModeState === undefined
		)
			return;

		iframeRef.current.contentWindow.postMessage(
			{
				type: designModeState?.isActive
					? "ENABLE_DESIGN_MODE"
					: "DISABLE_DESIGN_MODE",
				enabled: designModeState?.isActive ?? false,
			},
			"*",
		);
	}, [designModeState?.isActive, iframeRef, isPreviewIframeLoaded]);

	const saveChangesToFiles = useCallback(
		async () => {
			if (!session?._id || !sandboxDbId) return;
			if (!iframeRef.current?.contentWindow || !isPreviewIframeLoaded) return;

			console.log("[Design Mode] Saving changes to files (Lovable's approach)...");

			// STEP 1: Query iframe for ALL current element states
			return new Promise<void>((resolve, reject) => {
				const messageHandler = async (event: MessageEvent) => {
					if (event.data.type !== "FB_ALL_ELEMENTS_STATE") return;

					// Remove listener after receiving response
					window.removeEventListener("message", messageHandler);

					try {
						const elementsState = event.data.data as Array<{
							sourceFile: string;
							sourceLine: number;
							sourceColumn: number;
							className: string;
							textContent: string | null;
							src?: string;
							alt?: string;
						}>;

						console.log(`[Design Mode] Received ${elementsState.length} element states from iframe`);

						// STEP 2: Filter to only edited elements
						const editedElementIds = editedElementsRef.current;
						const editedElements = elementsState.filter(element => {
							const elementId = `${element.sourceFile}:${element.sourceLine}:${element.sourceColumn}`;
							return editedElementIds.has(elementId);
						});

						console.log(`[Design Mode] Filtered to ${editedElements.length} edited elements (out of ${elementsState.length} total)`);

						// STEP 3: Group by file
						const elementsByFile = new Map<string, typeof elementsState>();
						for (const element of editedElements) {
							if (!elementsByFile.has(element.sourceFile)) {
								elementsByFile.set(element.sourceFile, []);
							}
							elementsByFile.get(element.sourceFile)!.push(element);
						}

						// STEP 4: Compute diffs and generate code
						const filesToSave: Array<{ filePath: string; content: string }> = [];

						for (const [filePath, elements] of elementsByFile.entries()) {
							try {
								// Load original AST
								const { ast, content: originalContent } = await getOrLoadAST(filePath);
								const astClone = { ...ast };

								let hasChanges = false;

								// Apply changes from current DOM state
								for (const element of elements) {
									const nodePath = findNodeByLocation(astClone, element.sourceLine, element.sourceColumn);
									if (!nodePath) continue;

									// Read original values from AST
									const originalClassName = nodePath.node.openingElement.attributes
										.find((attr): attr is t.JSXAttribute =>
											t.isJSXAttribute(attr) &&
											t.isJSXIdentifier(attr.name) &&
											attr.name.name === "className"
										)
										?.value;

									const originalClassNameStr = originalClassName && t.isStringLiteral(originalClassName)
										? originalClassName.value
										: "";

									// Get original text content
									const originalTextNode = nodePath.node.children.find(child => t.isJSXText(child)) as t.JSXText | undefined;
									const originalText = originalTextNode?.value.trim() || null;

									// Check if className changed
									if (element.className !== originalClassNameStr) {
										updateNodeClassName(nodePath, element.className);
										hasChanges = true;
										console.log(`[Design Mode] className changed at ${element.sourceLine}:${element.sourceColumn}`);
									}

									// Check if text content changed
									if (element.textContent !== null && element.textContent !== originalText) {
										updateNodeTextContent(nodePath, element.textContent);
										hasChanges = true;
										console.log(`[Design Mode] textContent changed at ${element.sourceLine}:${element.sourceColumn}`);
									}

									// Check if src changed (only for elements that originally had src attribute)
									const originalSrcAttr = nodePath.node.openingElement.attributes
										.find((attr): attr is t.JSXAttribute =>
											t.isJSXAttribute(attr) &&
											t.isJSXIdentifier(attr.name) &&
											attr.name.name === "src"
										);

									if (originalSrcAttr) {
										const originalSrc = originalSrcAttr.value;
										const originalSrcStr = originalSrc && t.isStringLiteral(originalSrc) ? originalSrc.value : "";
										const currentSrc = element.src || "";

										if (currentSrc !== originalSrcStr) {
											updateNodeAttribute(nodePath, "src", currentSrc);
											hasChanges = true;
											console.log(`[Design Mode] src changed at ${element.sourceLine}:${element.sourceColumn}`);
										}
									}

									// Check if alt changed (only for elements that originally had alt attribute)
									const originalAltAttr = nodePath.node.openingElement.attributes
										.find((attr): attr is t.JSXAttribute =>
											t.isJSXAttribute(attr) &&
											t.isJSXIdentifier(attr.name) &&
											attr.name.name === "alt"
										);

									if (originalAltAttr) {
										const originalAlt = originalAltAttr.value;
										const originalAltStr = originalAlt && t.isStringLiteral(originalAlt) ? originalAlt.value : "";
										const currentAlt = element.alt || "";

										if (currentAlt !== originalAltStr) {
											updateNodeAttribute(nodePath, "alt", currentAlt);
											hasChanges = true;
											console.log(`[Design Mode] alt changed at ${element.sourceLine}:${element.sourceColumn}`);
										}
									}
								}

								// Only generate code if there were actual changes
								if (hasChanges) {
									const newContent = generateCodeFromAST(astClone);

									// Remove /vercel/sandbox/ prefix to get WebContainer-relative path
									let normalizedPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
									if (normalizedPath.startsWith("vercel/sandbox/")) {
										normalizedPath = normalizedPath.slice("vercel/sandbox/".length);
									}

									filesToSave.push({
										filePath: normalizedPath,
										content: newContent,
									});
									console.log(`[Design Mode] File changed: ${filePath} -> normalized to: ${normalizedPath}`);
								}
							} catch (error) {
								console.error(`[Design Mode] Error processing ${filePath}:`, error);
							}
						}

						if (filesToSave.length === 0) {
							console.log("[Design Mode] No files changed, nothing to save");
							resolve();
							return;
						}

						// STEP 5: Save to server
						console.log("[Design Mode] Calling saveChangesToFilesMutation with:", {
							sessionId: session._id,
							sandboxId: sandboxDbId,
							filesCount: filesToSave.length,
							files: filesToSave.map(f => ({ path: f.filePath, contentLength: f.content.length }))
						});

						await saveChangesToFilesMutation({
							sessionId: session._id!,
							sandboxId: sandboxDbId!,
							files: filesToSave,
							changeIds: [], // No longer tracking individual changes
						});

						console.log(`[Design Mode] Saved ${filesToSave.length} files successfully`);

						// Log the actual content being saved for debugging
						for (const file of filesToSave) {
							console.log(`[Design Mode] File content for ${file.filePath}:`, file.content.substring(0, 500) + "...");
						}

						// Reset the unsaved changes flag and clear edited elements
						setHasUnsavedChanges(false);
						editedElementsRef.current.clear();

						// Reload iframe to show saved changes
						if (iframeRef.current?.contentWindow) {
							console.log("[Design Mode] Reloading iframe to show saved changes...");
							iframeRef.current.contentWindow.location.reload();
						}

						resolve();
					} catch (error) {
						console.error("[Design Mode] Error saving files:", error);
						reject(error);
					}
				};

				// Listen for response
				window.addEventListener("message", messageHandler);

				// Request all element states from iframe
				console.log("[Design Mode] Sending FB_GET_ALL_ELEMENTS_STATE to iframe...");
				iframeRef.current!.contentWindow!.postMessage(
					{ type: "FB_GET_ALL_ELEMENTS_STATE" },
					"*",
				);

				// Timeout after 10 seconds
				setTimeout(() => {
					window.removeEventListener("message", messageHandler);
					reject(new Error("Timeout waiting for element states from iframe"));
				}, 10000);
			});
		},
		[session?._id, sandboxDbId, iframeRef, isPreviewIframeLoaded, saveChangesToFilesMutation, getOrLoadAST],
	);

	const exposed: DesignModeContext = {
		isDesignModeActive: designModeState?.isActive ?? false,
		selectedElement: designModeState?.selectedElement
			? {
					elementId: designModeState.selectedElement.elementId,
					tagName: designModeState.selectedElement.tagName,
					className: designModeState.selectedElement.className,
					textContent: designModeState.selectedElement.textContent ?? null,
					src: designModeState.selectedElement.src,
					alt: designModeState.selectedElement.alt,
					sourceFile: designModeState.selectedElement.sourceFile,
					sourceLine: designModeState.selectedElement.sourceLine,
					sourceColumn: designModeState.selectedElement.sourceColumn,
				}
			: null,
		hasUnsavedChanges,
		toggleDesignMode,
		selectElement,
		updateElement,
		saveChangesToFiles,
		isLoading: designModeState === undefined,
	};

	return (
		<designModeContext.Provider value={exposed}>
			{children}
		</designModeContext.Provider>
	);
};
