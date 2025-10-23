"use client";

import type { ThemeFormType } from "@/app/(workspace)/(dashboard)/brand/themes/_components/theme/form";
import {
	findNodeByLocation,
	generateCodeFromAST,
	parseSourceFile,
	updateNodeAttribute,
	updateNodeClassName,
	updateNodeTextContent,
} from "@/lib/design-mode/ast-utils";
import { systemColorsManager } from "@/lib/design-mode/system-colors";
import { getCategoryForColor, getDescriptionForColor } from "@/lib/theme/utils";
import type { ParseResult } from "@babel/parser";
import type { File as BabelFile } from "@babel/types";
import * as t from "@babel/types";
import { api, useAction, useMutation, useQuery } from "@firebuzz/convex";
import { hslToHex } from "@firebuzz/utils";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { useAgentSession } from "./use-agent-session";
import { useSandbox } from "./use-sandbox";

export const useDesignMode = () => {
	const { session } = useAgentSession();
	const { iframeRef, isPreviewIframeLoaded, sandboxDbId, refreshAllPreviews } =
		useSandbox();

	// ============= REFS (must be declared first) =============

	// AST cache for element editing
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

	// Debounce timers for element updates (one per element)
	const updateTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

	// Track if we've already restored design mode state to prevent infinite loop
	const hasRestoredDesignModeRef = useRef(false);

	// Track last sent update to prevent duplicate iframe messages on re-renders
	const lastSentUpdateRef = useRef<Map<string, string>>(new Map());

	// Query design mode state from Convex (reactive)
	const designModeState = useQuery(
		api.collections.agentSessions.queries.getDesignModeState,
		session?._id ? { sessionId: session._id } : "skip",
	);

	// ============= MUTATIONS =============

	// Enable design mode mutation (switches tab, sets isActive, schedules theme load)
	const enableDesignModeMutation = useMutation(
		api.collections.agentSessions.mutations.enableDesignMode,
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
					isActive: true,
					themeState: {
						currentTheme: null,
						initialTheme: null,
						error: null,
						status: "loading" as const,
					},
				},
			);
		}
	});

	// Disable design mode mutation (clears all state, reloads iframe)
	const disableDesignModeMutation = useMutation(
		api.collections.agentSessions.mutations.disableDesignMode,
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
					isActive: false,
					selectedElement: undefined,
					pendingChanges: [],
					themeState: {
						status: "idle" as const,
						currentTheme: null,
						initialTheme: null,
						error: null,
					},
				},
			);
		}
	});

	// Update current theme mutation (partial updates)
	const updateCurrentThemeMutation = useMutation(
		api.collections.agentSessions.mutations.updateCurrentTheme,
	).withOptimisticUpdate((localStore, args) => {
		const currentState = localStore.getQuery(
			api.collections.agentSessions.queries.getDesignModeState,
			{ sessionId: args.sessionId },
		);
		if (currentState?.themeState?.currentTheme) {
			const newTheme = {
				fonts: {
					...currentState.themeState.currentTheme.fonts,
					...(args.themeUpdates.fonts || {}),
				},
				lightTheme: {
					...currentState.themeState.currentTheme.lightTheme,
					...(args.themeUpdates.lightTheme || {}),
				},
				darkTheme: {
					...currentState.themeState.currentTheme.darkTheme,
					...(args.themeUpdates.darkTheme || {}),
				},
			};

			localStore.setQuery(
				api.collections.agentSessions.queries.getDesignModeState,
				{ sessionId: args.sessionId },
				{
					...currentState,
					themeState: {
						...currentState.themeState,
						currentTheme: newTheme,
					},
				},
			);
		}
	});

	// ============= ACTIONS =============

	// Unified action to save all design mode changes
	const saveDesignModeChangesAction = useAction(
		api.collections.sandboxes.actions.saveDesignModeChangesToSandbox,
	);

	// ============= COMPUTED STATE =============

	// Check if theme has changes
	const hasThemeChanges = useMemo(() => {
		if (!designModeState?.themeState) return false;
		const { currentTheme, initialTheme } = designModeState.themeState;
		return JSON.stringify(currentTheme) !== JSON.stringify(initialTheme);
	}, [designModeState?.themeState]);

	// Get element change count from state (reactive)
	const elementChangeCount = useMemo(() => {
		return designModeState?.pendingChanges?.length || 0;
	}, [designModeState?.pendingChanges]);

	// Track if there are unsaved element changes
	const hasUnsavedElementChanges = elementChangeCount > 0;

	// Total change count (1 for theme if changed + element changes count)
	const totalChangeCount = useMemo(() => {
		let count = 0;
		if (hasThemeChanges) count += 1;
		count += elementChangeCount;
		return count;
	}, [hasThemeChanges, elementChangeCount]);

	const currentDesignModeTab = useMemo(() => {
		return designModeState?.selectedElement ? "element" : "theme";
	}, [designModeState?.selectedElement]);

	// ============= PUBLIC METHODS =============

	/**
	 * Enable design mode
	 * - Sets isActive to true (optimistic)
	 * - Switches to "design" tab
	 * - Triggers action to load theme from sandbox
	 */
	const enableDesignMode = useCallback(async () => {
		if (!session?._id) {
			console.error("[useDesignMode] No session available");
			return;
		}

		console.log("[useDesignMode] Enabling design mode...");
		await enableDesignModeMutation({ sessionId: session._id });

		// Send message to iframe
		if (iframeRef.current?.contentWindow && isPreviewIframeLoaded) {
			iframeRef.current.contentWindow.postMessage(
				{
					type: "ENABLE_DESIGN_MODE",
					enabled: true,
				},
				"*",
			);
		}
	}, [
		session?._id,
		enableDesignModeMutation,
		iframeRef,
		isPreviewIframeLoaded,
	]);

	/**
	 * Disable design mode
	 * - Removes all pendingChanges
	 * - Clears theme and selectedElement data
	 * - Sets isActive to false
	 * - Reloads iframe
	 */
	// Set active tab mutation
	const setActiveTabMutation = useMutation(
		api.collections.agentSessions.mutations.setActiveTab,
	);

	const disableDesignMode = useCallback(async () => {
		if (!session?._id) {
			console.error("[useDesignMode] No session available");
			return;
		}

		console.log("[useDesignMode] Disabling design mode...");

		// Check if there are pending changes
		const hasPendingChanges = totalChangeCount > 0;

		// Clear AST cache
		astCache.current.clear();

		// Clear all pending update timers
		for (const timer of updateTimersRef.current.values()) {
			clearTimeout(timer);
		}
		updateTimersRef.current.clear();

		await disableDesignModeMutation({ sessionId: session._id });

		// Switch back to chat tab
		await setActiveTabMutation({ sessionId: session._id, activeTab: "chat" });

		// Send message to iframe
		if (iframeRef.current?.contentWindow && isPreviewIframeLoaded) {
			iframeRef.current.contentWindow.postMessage(
				{
					type: "DISABLE_DESIGN_MODE",
					enabled: false,
				},
				"*",
			);

			// Only reload iframe if there were pending changes that need to be discarded
			if (hasPendingChanges) {
				console.log(
					"[useDesignMode] Reloading iframe to discard pending changes",
				);
				refreshAllPreviews();
			}
		}
	}, [
		session?._id,
		totalChangeCount,
		disableDesignModeMutation,
		setActiveTabMutation,
		iframeRef,
		isPreviewIframeLoaded,
		refreshAllPreviews,
	]);

	/**
	 * Update theme (partial updates)
	 * Supports updating fonts, lightTheme, or darkTheme individually
	 */
	const updateTheme = useCallback(
		async (themeUpdates: {
			fonts?: Partial<ThemeFormType["fonts"]>;
			lightTheme?: Partial<ThemeFormType["lightTheme"]>;
			darkTheme?: Partial<ThemeFormType["darkTheme"]>;
		}) => {
			if (!session?._id) {
				console.error("[useDesignMode] No session available");
				return;
			}

			await updateCurrentThemeMutation({
				sessionId: session._id,
				themeUpdates,
			});

			// Send theme update to iframe immediately after mutation
			if (
				iframeRef.current?.contentWindow &&
				isPreviewIframeLoaded &&
				designModeState?.themeState?.currentTheme
			) {
				const { sendThemeToIframe } = require("@/lib/design-mode/theme-utils");
				const updatedTheme = {
					fonts: {
						...designModeState.themeState.currentTheme.fonts,
						...(themeUpdates.fonts || {}),
					},
					lightTheme: {
						...designModeState.themeState.currentTheme.lightTheme,
						...(themeUpdates.lightTheme || {}),
					},
					darkTheme: {
						...designModeState.themeState.currentTheme.darkTheme,
						...(themeUpdates.darkTheme || {}),
					},
				};

				console.log(
					"[useDesignMode] Sending theme update to iframe after mutation",
					updatedTheme,
				);
				sendThemeToIframe(iframeRef, updatedTheme);
			}
		},
		[
			session?._id,
			updateCurrentThemeMutation,
			iframeRef,
			isPreviewIframeLoaded,
			designModeState?.themeState?.currentTheme,
		],
	);

	/**
	 * Discard all changes and exit design mode
	 */
	const resetTheme = useCallback(async () => {
		if (!session?._id) {
			console.error("[useDesignMode] No session available");
			return;
		}

		console.log(
			"[useDesignMode] Discarding all changes and exiting design mode...",
		);

		// Clear AST cache and timers
		astCache.current.clear();
		for (const timer of updateTimersRef.current.values()) {
			clearTimeout(timer);
		}
		updateTimersRef.current.clear();

		// Clear design mode state in database
		await disableDesignModeMutation({ sessionId: session._id });

		// Switch back to chat tab
		await setActiveTabMutation({ sessionId: session._id, activeTab: "chat" });

		// Send message to iframe to disable design mode
		// The iframe will be reloaded by refreshAllPreviews to reset visual state
		if (iframeRef.current?.contentWindow && isPreviewIframeLoaded) {
			iframeRef.current.contentWindow.postMessage(
				{
					type: "DISABLE_DESIGN_MODE",
					enabled: false,
				},
				"*",
			);
		}

		// Reload iframe to reset all visual changes (theme + elements)
		// This is simpler and more reliable than tracking/reverting each change
		refreshAllPreviews();
	}, [
		session?._id,
		disableDesignModeMutation,
		setActiveTabMutation,
		iframeRef,
		isPreviewIframeLoaded,
		refreshAllPreviews,
	]);

	/**
	 * Apply all changes
	 * - Collects theme changes and element file changes
	 * - Saves everything via unified action
	 * - Commits theme changes (currentTheme → initialTheme)
	 * - Disables design mode
	 */
	const readFileAction = useAction(
		api.collections.sandboxes.actions.readFileForDesignMode,
	);

	// Read file from sandbox
	const readFileFromSandbox = useCallback(
		async (filePath: string): Promise<string> => {
			if (!sandboxDbId) {
				throw new Error("No sandbox available");
			}

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
			const cached = astCache.current.get(filePath);
			if (cached) {
				return cached;
			}

			const content = await readFileFromSandbox(filePath);
			const ast = parseSourceFile(content);

			const cacheEntry = { ast, content, timestamp: Date.now() };
			astCache.current.set(filePath, cacheEntry);

			return cacheEntry;
		},
		[readFileFromSandbox],
	);

	// Update element mutation (declared here before applyChanges to avoid initialization order issues)
	const updateElementOptimisticMutation = useMutation(
		api.collections.agentSessions.mutations.updateElementOptimistic,
	).withOptimisticUpdate((localStore, args) => {
		const currentState = localStore.getQuery(
			api.collections.agentSessions.queries.getDesignModeState,
			{ sessionId: args.sessionId },
		);
		if (currentState !== undefined && currentState !== null) {
			// Check if change already exists
			const existingChangeIndex = currentState.pendingChanges.findIndex(
				(c) => c.id === args.changeId,
			);

			let newPendingChanges: typeof currentState.pendingChanges;
			if (existingChangeIndex >= 0) {
				// Update existing change
				newPendingChanges = currentState.pendingChanges.map((c, i) =>
					i === existingChangeIndex
						? {
								...c,
								updates: args.updates,
							}
						: c,
				);
			} else {
				// Add new change
				newPendingChanges = [
					...currentState.pendingChanges,
					{
						id: args.changeId,
						elementId: args.elementId,
						updates: args.updates,
					},
				];
			}

			// Update selected element with new values
			const updatedSelectedElement = currentState.selectedElement
				? {
						...currentState.selectedElement,
						className:
							args.updates.className ?? currentState.selectedElement.className,
						textContent:
							args.updates.textContent ??
							currentState.selectedElement.textContent,
						src: args.updates.src ?? currentState.selectedElement.src,
						alt: args.updates.alt ?? currentState.selectedElement.alt,
						href: args.updates.href ?? currentState.selectedElement.href,
						target: args.updates.target ?? currentState.selectedElement.target,
						rel: args.updates.rel ?? currentState.selectedElement.rel,
					}
				: undefined;

			localStore.setQuery(
				api.collections.agentSessions.queries.getDesignModeState,
				{ sessionId: args.sessionId },
				{
					...currentState,
					selectedElement: updatedSelectedElement,
					pendingChanges: newPendingChanges,
				},
			);
		}
	});

	const applyChanges = useCallback(async () => {
		if (!session?._id || !sandboxDbId) {
			console.error("[useDesignMode] No session or sandbox available");
			return;
		}

		if (!iframeRef.current?.contentWindow || !isPreviewIframeLoaded) {
			console.error("[useDesignMode] Iframe not ready");
			return;
		}

		try {
			console.log("[useDesignMode] Applying changes...");

			// Flush any pending debounced updates before applying
			for (const [elementId, timer] of updateTimersRef.current.entries()) {
				clearTimeout(timer);
				// Force immediate execution of pending update
				const updates = designModeState?.pendingChanges?.find(
					(c) => c.elementId === elementId,
				)?.updates;
				if (updates) {
					await updateElementOptimisticMutation({
						sessionId: session._id,
						changeId: elementId,
						elementId,
						updates,
					});
				}
			}
			updateTimersRef.current.clear();

			// Collect element files if there are edited elements
			let elementFiles:
				| Array<{ filePath: string; content: string }>
				| undefined;

			const pendingElementChanges = designModeState?.pendingChanges || [];
			console.log(
				"[useDesignMode] Pending element changes:",
				pendingElementChanges,
			);

			if (pendingElementChanges.length > 0) {
				console.log("[useDesignMode] Collecting element changes...");

				// Get element states from iframe
				const elementsState = await new Promise<
					Array<{
						sourceFile: string;
						sourceLine: number;
						sourceColumn: number;
						className: string;
						textContent: string | null;
						src?: string;
						alt?: string;
						href?: string;
						target?: string;
						rel?: string;
					}>
				>((resolve, reject) => {
					const messageHandler = (event: MessageEvent) => {
						if (event.data.type === "FB_ALL_ELEMENTS_STATE") {
							window.removeEventListener("message", messageHandler);
							resolve(event.data.data);
						}
					};

					window.addEventListener("message", messageHandler);
					iframeRef.current!.contentWindow!.postMessage(
						{ type: "FB_GET_ALL_ELEMENTS_STATE" },
						"*",
					);

					setTimeout(() => {
						window.removeEventListener("message", messageHandler);
						reject(new Error("Timeout waiting for element states"));
					}, 10000);
				});

				console.log(
					"[useDesignMode] Received element states from iframe:",
					elementsState.length,
				);

				// Create a Set of edited element IDs from pendingChanges
				const editedElementIds = new Set(
					pendingElementChanges.map((change) => change.elementId),
				);
				console.log(
					"[useDesignMode] Edited element IDs from pendingChanges:",
					Array.from(editedElementIds),
				);

				// Filter to only edited elements
				const editedElements = elementsState.filter((element) => {
					const elementId = `${element.sourceFile}:${element.sourceLine}:${element.sourceColumn}`;
					return editedElementIds.has(elementId);
				});

				console.log(
					"[useDesignMode] Filtered edited elements:",
					editedElements.length,
				);

				if (editedElements.length > 0) {
					// Group by file
					const elementsByFile = new Map<string, typeof elementsState>();
					for (const element of editedElements) {
						if (!elementsByFile.has(element.sourceFile)) {
							elementsByFile.set(element.sourceFile, []);
						}
						elementsByFile.get(element.sourceFile)!.push(element);
					}

					console.log(
						"[useDesignMode] Elements grouped by file:",
						Array.from(elementsByFile.keys()),
					);

					// Generate file contents
					elementFiles = [];
					for (const [filePath, elements] of elementsByFile.entries()) {
						console.log(
							`[useDesignMode] Processing file: ${filePath} with ${elements.length} elements`,
						);
						try {
							const { ast } = await getOrLoadAST(filePath);
							const astClone = { ...ast };

							let hasChanges = false;

							for (const element of elements) {
								const nodePath = findNodeByLocation(
									astClone,
									element.sourceLine,
									element.sourceColumn,
								);
								if (!nodePath) continue;

								// Check className changes
								const originalClassName =
									nodePath.node.openingElement.attributes.find(
										(
											attr: t.JSXAttribute | t.JSXSpreadAttribute,
										): attr is t.JSXAttribute =>
											t.isJSXAttribute(attr) &&
											t.isJSXIdentifier(attr.name) &&
											attr.name.name === "className",
									)?.value;

								const originalClassNameStr =
									originalClassName && t.isStringLiteral(originalClassName)
										? originalClassName.value
										: "";

								if (element.className !== originalClassNameStr) {
									updateNodeClassName(nodePath, element.className);
									hasChanges = true;
								}

								// Check text content changes
								const originalTextNode = nodePath.node.children.find(
									(
										child:
											| t.JSXText
											| t.JSXExpressionContainer
											| t.JSXSpreadChild
											| t.JSXElement
											| t.JSXFragment,
									) => t.isJSXText(child),
								) as t.JSXText | undefined;
								const originalText = originalTextNode?.value.trim() || null;

								if (
									element.textContent !== null &&
									element.textContent !== originalText
								) {
									updateNodeTextContent(nodePath, element.textContent);
									hasChanges = true;
								}

								// Check src/alt if present - only update if they're string literals
								// Skip expression-based src (like src={variable}) as those need different handling
								const originalSrcAttr =
									nodePath.node.openingElement.attributes.find(
										(
											attr: t.JSXAttribute | t.JSXSpreadAttribute,
										): attr is t.JSXAttribute =>
											t.isJSXAttribute(attr) &&
											t.isJSXIdentifier(attr.name) &&
											attr.name.name === "src",
									);

								// Only update src if it's a string literal, not an expression
								if (
									originalSrcAttr?.value &&
									t.isStringLiteral(originalSrcAttr.value)
								) {
									const originalSrcStr = originalSrcAttr.value.value;
									const currentSrc = element.src || "";

									if (currentSrc !== originalSrcStr) {
										updateNodeAttribute(nodePath, "src", currentSrc);
										hasChanges = true;
									}
								}

								const originalAltAttr =
									nodePath.node.openingElement.attributes.find(
										(
											attr: t.JSXAttribute | t.JSXSpreadAttribute,
										): attr is t.JSXAttribute =>
											t.isJSXAttribute(attr) &&
											t.isJSXIdentifier(attr.name) &&
											attr.name.name === "alt",
									);

								// Only update alt if it's a string literal, not an expression
								if (
									originalAltAttr?.value &&
									t.isStringLiteral(originalAltAttr.value)
								) {
									const originalAltStr = originalAltAttr.value.value;
									const currentAlt = element.alt || "";

									if (currentAlt !== originalAltStr) {
										updateNodeAttribute(nodePath, "alt", currentAlt);
										hasChanges = true;
									}
								}

								// Check link attributes (href, target, rel) - only update if they're string literals
								const originalHrefAttr =
									nodePath.node.openingElement.attributes.find(
										(
											attr: t.JSXAttribute | t.JSXSpreadAttribute,
										): attr is t.JSXAttribute =>
											t.isJSXAttribute(attr) &&
											t.isJSXIdentifier(attr.name) &&
											attr.name.name === "href",
									);

								// Only update href if it's a string literal, not an expression
								if (
									originalHrefAttr?.value &&
									t.isStringLiteral(originalHrefAttr.value)
								) {
									const originalHrefStr = originalHrefAttr.value.value;
									const currentHref = element.href || "";

									if (currentHref !== originalHrefStr) {
										updateNodeAttribute(nodePath, "href", currentHref);
										hasChanges = true;
									}
								}

								const originalTargetAttr =
									nodePath.node.openingElement.attributes.find(
										(
											attr: t.JSXAttribute | t.JSXSpreadAttribute,
										): attr is t.JSXAttribute =>
											t.isJSXAttribute(attr) &&
											t.isJSXIdentifier(attr.name) &&
											attr.name.name === "target",
									);

								// Only update target if it's a string literal, not an expression
								if (
									originalTargetAttr?.value &&
									t.isStringLiteral(originalTargetAttr.value)
								) {
									const originalTargetStr = originalTargetAttr.value.value;
									const currentTarget = element.target || "";

									if (currentTarget !== originalTargetStr) {
										updateNodeAttribute(nodePath, "target", currentTarget);
										hasChanges = true;
									}
								}

								const originalRelAttr =
									nodePath.node.openingElement.attributes.find(
										(
											attr: t.JSXAttribute | t.JSXSpreadAttribute,
										): attr is t.JSXAttribute =>
											t.isJSXAttribute(attr) &&
											t.isJSXIdentifier(attr.name) &&
											attr.name.name === "rel",
									);

								// Only update rel if it's a string literal, not an expression
								if (
									originalRelAttr?.value &&
									t.isStringLiteral(originalRelAttr.value)
								) {
									const originalRelStr = originalRelAttr.value.value;
									const currentRel = element.rel || "";

									if (currentRel !== originalRelStr) {
										updateNodeAttribute(nodePath, "rel", currentRel);
										hasChanges = true;
									}
								}
							}

							console.log(
								`[useDesignMode] File ${filePath} has changes: ${hasChanges}`,
							);

							if (hasChanges) {
								const newContent = generateCodeFromAST(astClone);

								let normalizedPath = filePath.startsWith("/")
									? filePath.slice(1)
									: filePath;
								if (normalizedPath.startsWith("vercel/sandbox/")) {
									normalizedPath = normalizedPath.slice(
										"vercel/sandbox/".length,
									);
								}

								console.log(
									`[useDesignMode] Adding file to save: ${normalizedPath} (original: ${filePath})`,
								);

								elementFiles.push({
									filePath: normalizedPath,
									content: newContent,
								});
							}
						} catch (error) {
							console.error(
								`[useDesignMode] Error processing ${filePath}:`,
								error,
							);
						}
					}
				}
			}

			// Save all changes via unified action
			const theme =
				hasThemeChanges && designModeState?.themeState?.currentTheme
					? designModeState.themeState.currentTheme
					: undefined;

			if (theme || (elementFiles && elementFiles.length > 0)) {
				console.log("[useDesignMode] Saving changes to sandbox...", {
					hasTheme: !!theme,
					elementFilesCount: elementFiles?.length || 0,
					elementFiles: elementFiles?.map((f) => f.filePath),
				});

				await saveDesignModeChangesAction({
					sandboxId: sandboxDbId,
					theme,
					elementFiles,
				});
			}

			// Clear design mode state
			await disableDesignModeMutation({ sessionId: session._id });

			// Switch back to chat tab
			await setActiveTabMutation({ sessionId: session._id, activeTab: "chat" });

			// Send message to iframe to disable design mode overlay
			if (iframeRef.current?.contentWindow && isPreviewIframeLoaded) {
				iframeRef.current.contentWindow.postMessage(
					{
						type: "DISABLE_DESIGN_MODE",
						enabled: false,
					},
					"*",
				);
			}

			console.log(
				"[useDesignMode] Changes applied successfully - waiting for HMR to update the preview (no manual reload)",
			);
		} catch (error) {
			console.error("[useDesignMode] Error applying changes:", error);
			throw error;
		}
	}, [
		session?._id,
		sandboxDbId,
		iframeRef,
		isPreviewIframeLoaded,
		hasThemeChanges,
		designModeState?.themeState?.currentTheme,
		designModeState?.pendingChanges,
		saveDesignModeChangesAction,
		getOrLoadAST,
		updateElementOptimisticMutation,
		disableDesignModeMutation,
		setActiveTabMutation,
	]);

	// ============= EFFECTS =============

	/**
	 * Re-enable design mode in iframe when page loads with design mode already active
	 * This handles the case where the page is reloaded while design mode is active
	 */
	useEffect(() => {
		if (
			!iframeRef.current?.contentWindow ||
			!isPreviewIframeLoaded ||
			!designModeState?.isActive
		) {
			return;
		}

		// Only restore once per iframe load to prevent infinite loop
		if (hasRestoredDesignModeRef.current) {
			return;
		}

		hasRestoredDesignModeRef.current = true;

		console.log(
			"[useDesignMode] Design mode is active on page load, re-enabling in iframe",
		);

		// Send message to iframe to enable design mode
		iframeRef.current.contentWindow.postMessage(
			{
				type: "ENABLE_DESIGN_MODE",
				enabled: true,
			},
			"*",
		);

		// If there's a current theme (with changes), send it to iframe
		if (
			designModeState.themeState?.status === "ready" &&
			designModeState.themeState.currentTheme
		) {
			const { currentTheme, initialTheme } = designModeState.themeState;
			// Only send if theme has changes
			if (JSON.stringify(currentTheme) !== JSON.stringify(initialTheme)) {
				console.log(
					"[useDesignMode] Sending theme to iframe on page reload",
					currentTheme,
				);
				const { sendThemeToIframe } = require("@/lib/design-mode/theme-utils");
				sendThemeToIframe(iframeRef, currentTheme);
			}
		}

		// If there's a selected element, re-select it in the iframe
		if (designModeState.selectedElement) {
			const { sourceFile, sourceLine, sourceColumn } =
				designModeState.selectedElement;

			console.log(
				"[useDesignMode] Re-selecting element in iframe:",
				`${sourceFile}:${sourceLine}:${sourceColumn}`,
			);

			iframeRef.current.contentWindow.postMessage(
				{
					type: "FB_SELECT_ELEMENT",
					sourceFile,
					sourceLine,
					sourceColumn,
				},
				"*",
			);
		}
	}, [
		iframeRef,
		isPreviewIframeLoaded,
		designModeState?.isActive,
		designModeState?.selectedElement,
		designModeState?.themeState,
	]);

	// Reset the restoration flag when iframe reloads
	useEffect(() => {
		if (isPreviewIframeLoaded) {
			hasRestoredDesignModeRef.current = false;
		}
	}, [isPreviewIframeLoaded]);

	// ============= ELEMENT EDITING METHODS (from provider) =============

	const selectElementMutation = useMutation(
		api.collections.agentSessions.mutations.selectElement,
	).withOptimisticUpdate((localStore, args) => {
		const currentState = localStore.getQuery(
			api.collections.agentSessions.queries.getDesignModeState,
			{ sessionId: args.sessionId },
		);
		if (currentState !== undefined && currentState !== null) {
			localStore.setQuery(
				api.collections.agentSessions.queries.getDesignModeState,
				{ sessionId: args.sessionId },
				{
					...currentState,
					selectedElement: args.element,
				},
			);
		}
	});

	const selectElement = useCallback(
		async (
			data: {
				elementId: string;
				tagName: string;
				className: string;
				textContent: string | null;
				src?: string;
				alt?: string;
				href?: string;
				target?: string;
				rel?: string;
				sourceFile: string;
				sourceLine: number;
				sourceColumn: number;
			} | null,
		) => {
			if (!session?._id) return;

			// Clear last sent update cache when selecting a new element or deselecting
			lastSentUpdateRef.current.clear();

			// Send deselect message to iframe if data is null
			if (!data && iframeRef.current?.contentWindow && isPreviewIframeLoaded) {
				iframeRef.current.contentWindow.postMessage(
					{
						type: "FB_DESELECT_ELEMENT",
					},
					"*",
				);
			}

			// Check editability by examining AST
			let isTextEditable = true;
			let isImageEditable = true;
			let isLinkEditable = true;

			if (data) {
				try {
					const { ast } = await getOrLoadAST(data.sourceFile);
					const nodePath = findNodeByLocation(
						ast,
						data.sourceLine,
						data.sourceColumn,
					);

					if (nodePath) {
						// Check if textContent is editable (has JSXText child, not expression)
						const hasJSXTextChild = nodePath.node.children.some(
							(
								child:
									| t.JSXText
									| t.JSXExpressionContainer
									| t.JSXSpreadChild
									| t.JSXElement
									| t.JSXFragment,
							) => t.isJSXText(child),
						);
						const hasExpressionChild = nodePath.node.children.some(
							(
								child:
									| t.JSXText
									| t.JSXExpressionContainer
									| t.JSXSpreadChild
									| t.JSXElement
									| t.JSXFragment,
							) => t.isJSXExpressionContainer(child),
						);
						isTextEditable = hasJSXTextChild && !hasExpressionChild;

						// Check if image attributes (src, alt) are editable (string literals, not expressions)
						const srcAttr = nodePath.node.openingElement.attributes.find(
							(
								attr: t.JSXAttribute | t.JSXSpreadAttribute,
							): attr is t.JSXAttribute =>
								t.isJSXAttribute(attr) &&
								t.isJSXIdentifier(attr.name) &&
								attr.name.name === "src",
						);
						const altAttr = nodePath.node.openingElement.attributes.find(
							(
								attr: t.JSXAttribute | t.JSXSpreadAttribute,
							): attr is t.JSXAttribute =>
								t.isJSXAttribute(attr) &&
								t.isJSXIdentifier(attr.name) &&
								attr.name.name === "alt",
						);
						isImageEditable = !!(
							(!srcAttr ||
								(srcAttr.value && t.isStringLiteral(srcAttr.value))) &&
							(!altAttr || (altAttr.value && t.isStringLiteral(altAttr.value))));

						// Check if link attributes (href, target, rel) are editable (string literals, not expressions)
						const hrefAttr = nodePath.node.openingElement.attributes.find(
							(
								attr: t.JSXAttribute | t.JSXSpreadAttribute,
							): attr is t.JSXAttribute =>
								t.isJSXAttribute(attr) &&
								t.isJSXIdentifier(attr.name) &&
								attr.name.name === "href",
						);
						const targetAttr = nodePath.node.openingElement.attributes.find(
							(
								attr: t.JSXAttribute | t.JSXSpreadAttribute,
							): attr is t.JSXAttribute =>
								t.isJSXAttribute(attr) &&
								t.isJSXIdentifier(attr.name) &&
								attr.name.name === "target",
						);
						const relAttr = nodePath.node.openingElement.attributes.find(
							(
								attr: t.JSXAttribute | t.JSXSpreadAttribute,
							): attr is t.JSXAttribute =>
								t.isJSXAttribute(attr) &&
								t.isJSXIdentifier(attr.name) &&
								attr.name.name === "rel",
						);
						isLinkEditable = !!(
							(!hrefAttr ||
								(hrefAttr.value && t.isStringLiteral(hrefAttr.value))) &&
							(!targetAttr ||
								(targetAttr.value && t.isStringLiteral(targetAttr.value))) &&
							(!relAttr || (relAttr.value && t.isStringLiteral(relAttr.value))));
					}
				} catch (error) {
					console.error("[useDesignMode] Error checking editability:", error);
					// Default to editable if check fails
				}
			}

			await selectElementMutation({
				sessionId: session._id,
				element: data
					? {
							elementId: data.elementId,
							tagName: data.tagName,
							className: data.className,
							textContent: data.textContent ?? undefined,
							src: data.src,
							alt: data.alt,
							href: data.href,
							target: data.target,
							rel: data.rel,
							sourceFile: data.sourceFile,
							sourceLine: data.sourceLine,
							sourceColumn: data.sourceColumn,
							isTextEditable,
							isImageEditable,
							isLinkEditable,
						}
					: undefined,
			});
		},
		[
			session?._id,
			selectElementMutation,
			iframeRef,
			isPreviewIframeLoaded,
			getOrLoadAST,
		],
	);

	/**
	 * Listen for element selection messages from iframe
	 */
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
				const { sourceFile, sourceLine, sourceColumn, ...rest } =
					event.data.data;

				const elementId = `${sourceFile}:${sourceLine}:${sourceColumn}`;

				console.log("[useDesignMode] Element selected from iframe", {
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

	// Update system colors when theme changes
	useEffect(() => {
		if (designModeState?.themeState?.currentTheme) {
			const currentTheme = designModeState.themeState.currentTheme;
			const systemColors = [];

			// Process light theme colors
			for (const [key, hslValue] of Object.entries(currentTheme.lightTheme)) {
				if (key === "radius") continue; // Skip radius
				const hexValue = hslToHex(hslValue);
				systemColors.push({
					name: key,
					displayName: key.replace(/([A-Z])/g, " $1").toLowerCase(),
					hexValue,
					hslValue,
					category: getCategoryForColor(key),
					description: getDescriptionForColor(key),
				});
			}

			systemColorsManager.setColors(systemColors);
		} else {
			systemColorsManager.clear();
		}
	}, [designModeState?.themeState?.currentTheme]);

	const updateElement = useCallback(
		async (
			elementId: string,
			updates: {
				className?: string;
				textContent?: string;
				src?: string;
				alt?: string;
				href?: string;
				target?: string;
				rel?: string;
			},
		) => {
			if (!session?._id) return;

			try {
				// Parse elementId to get file path, line, column
				const parseElementId = (id: string) => {
					const parts = id.split(":");
					return [
						parts[0],
						Number.parseInt(parts[1], 10),
						Number.parseInt(parts[2], 10),
					];
				};

				const [filePath, line, column] = parseElementId(elementId);

				// Use elementId as changeId (one record per element in pendingChanges)
				const changeId = elementId;

				// Check if this is a duplicate update (same updates as last sent)
				const updateKey = JSON.stringify(updates);
				const lastUpdate = lastSentUpdateRef.current.get(elementId);

				if (lastUpdate === updateKey) {
					// Skip sending duplicate update to iframe
					return;
				}

				console.log(
					`[useDesignMode] Updating element at ${filePath}:${line}:${column}`,
					updates,
				);

				// Store the update to prevent duplicates
				lastSentUpdateRef.current.set(elementId, updateKey);

				// Send visual update to iframe immediately (instant feedback)
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

				// Clear existing timer for this element
				const existingTimer = updateTimersRef.current.get(elementId);
				if (existingTimer) {
					clearTimeout(existingTimer);
				}

				// Debounce the database mutation (300ms)
				const timer = setTimeout(async () => {
					try {
						// Update pendingChanges in database (triggers re-render via totalChangeCount)
						await updateElementOptimisticMutation({
							sessionId: session._id,
							changeId,
							elementId,
							updates,
						});

						// Remove timer from map
						updateTimersRef.current.delete(elementId);
					} catch (error) {
						console.error(
							"[useDesignMode] Error saving element update:",
							error,
						);
					}
				}, 300);

				// Store timer
				updateTimersRef.current.set(elementId, timer);
			} catch (error) {
				console.error("[useDesignMode] Error updating element:", error);
			}
		},
		[
			session?._id,
			iframeRef,
			isPreviewIframeLoaded,
			updateElementOptimisticMutation,
		],
	);

	// ============= RETURN API =============

	// Function to get current system colors
	const getSystemColors = useCallback(() => {
		return systemColorsManager.getColors();
	}, []);

	return {
		// State
		isDesignModeActive: designModeState?.isActive ?? false,
		themeState: designModeState?.themeState,
		selectedElement: designModeState?.selectedElement,
		pendingChanges: designModeState?.pendingChanges ?? [],
		isLoading: designModeState === undefined,

		// Computed
		hasThemeChanges,
		totalChangeCount,
		hasUnsavedChanges: hasUnsavedElementChanges,
		currentDesignModeTab,

		// Theme Methods
		enableDesignMode,
		disableDesignMode,
		updateTheme,
		resetTheme,
		applyChanges,

		// Element Methods
		selectElement,
		updateElement,

		// System Colors
		getSystemColors,
	};
};
