"use client";

import type { ParseResult } from "@babel/parser";
import type { File as BabelFile } from "@babel/types";
import * as t from "@babel/types";
import { api, useAction, useMutation, useQuery } from "@firebuzz/convex";
import { hslToHex } from "@firebuzz/utils";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from "react";
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
import {
	getCategoryForColor,
	getDescriptionForColor,
} from "@/lib/theme/utils";
import { useAgentSession } from "@/hooks/agent/use-agent-session";
import { useSandbox } from "@/hooks/agent/use-sandbox";

// ============= TYPES =============

interface SelectedElement {
	elementId: string;
	tagName: string;
	className: string;
	textContent?: string;
	src?: string;
	alt?: string;
	href?: string;
	target?: string;
	rel?: string;
	sourceFile: string;
	sourceLine: number;
	sourceColumn: number;
	isTextEditable?: boolean;
	isImageEditable?: boolean;
	isLinkEditable?: boolean;
}

interface PendingElementChange {
	id: string;
	elementId: string;
	updates: {
		className?: string;
		textContent?: string;
		src?: string;
		alt?: string;
		href?: string;
		target?: string;
		rel?: string;
	};
}

interface ThemeState {
	status: "idle" | "loading" | "ready" | "error";
	currentTheme: ThemeFormType | null;
	initialTheme: ThemeFormType | null;
	error: string | null;
}

interface DesignModeState {
	isActive: boolean;
	themeState: ThemeState;
	selectedElement?: SelectedElement;
	pendingChanges: PendingElementChange[];
}

// ============= THEME CONTEXT =============

interface ThemeContextValue {
	themeState: ThemeState | undefined;
	hasThemeChanges: boolean;
	updateTheme: (themeUpdates: {
		fonts?: Partial<ThemeFormType["fonts"]>;
		lightTheme?: Partial<ThemeFormType["lightTheme"]>;
		darkTheme?: Partial<ThemeFormType["darkTheme"]>;
	}) => Promise<void>;
	getSystemColors: () => Array<{
		name: string;
		displayName: string;
		hexValue: string;
		hslValue: string;
		category: string;
		description: string;
	}>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ============= ELEMENT CONTEXT =============

interface ElementContextValue {
	selectedElement: SelectedElement | undefined;
	pendingChanges: PendingElementChange[];
	hasUnsavedChanges: boolean;
	selectElement: (
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
	) => Promise<void>;
	updateElement: (
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
	) => Promise<void>;
}

const ElementContext = createContext<ElementContextValue | null>(null);

// ============= SHARED STATE CONTEXT =============

interface DesignModeStateContextValue {
	isDesignModeActive: boolean;
	isLoading: boolean;
	totalChangeCount: number;
	currentDesignModeTab: "theme" | "element";
	enableDesignMode: () => Promise<void>;
	disableDesignMode: () => Promise<void>;
	resetTheme: () => Promise<void>;
	applyChanges: () => Promise<void>;
}

const DesignModeStateContext =
	createContext<DesignModeStateContextValue | null>(null);

// ============= PROVIDER COMPONENT =============

export const DesignModeProvider = ({ children }: { children: ReactNode }) => {
	const { session } = useAgentSession();
	const { iframeRef, isPreviewIframeLoaded, sandboxDbId, refreshAllPreviews } =
		useSandbox();

	// ============= REFS =============

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

	const updateTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
	const hasRestoredDesignModeRef = useRef(false);
	const lastSentUpdateRef = useRef<Map<string, string>>(new Map());
	const isDeselectingRef = useRef(false);

	// ============= QUERIES =============

	const designModeState = useQuery(
		api.collections.agentSessions.queries.getDesignModeState,
		session?._id ? { sessionId: session._id } : "skip",
	);

	// ============= MUTATIONS =============

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

	const setActiveTabMutation = useMutation(
		api.collections.agentSessions.mutations.setActiveTab,
	);

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

	const updateElementOptimisticMutation = useMutation(
		api.collections.agentSessions.mutations.updateElementOptimistic,
	).withOptimisticUpdate((localStore, args) => {
		const currentState = localStore.getQuery(
			api.collections.agentSessions.queries.getDesignModeState,
			{ sessionId: args.sessionId },
		);
		if (currentState !== undefined && currentState !== null) {
			const existingChangeIndex = currentState.pendingChanges.findIndex(
				(c) => c.id === args.changeId,
			);

			let newPendingChanges: typeof currentState.pendingChanges;
			if (existingChangeIndex >= 0) {
				newPendingChanges = currentState.pendingChanges.map((c, i) =>
					i === existingChangeIndex
						? {
								...c,
								updates: args.updates,
							}
						: c,
				);
			} else {
				newPendingChanges = [
					...currentState.pendingChanges,
					{
						id: args.changeId,
						elementId: args.elementId,
						updates: args.updates,
					},
				];
			}

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

	// ============= ACTIONS =============

	const saveDesignModeChangesAction = useAction(
		api.collections.sandboxes.actions.saveDesignModeChangesToSandbox,
	);

	const readFileAction = useAction(
		api.collections.sandboxes.actions.readFileForDesignMode,
	);

	// ============= COMPUTED VALUES =============

	const hasThemeChanges = useMemo(() => {
		if (!designModeState?.themeState) return false;
		const { currentTheme, initialTheme } = designModeState.themeState;
		return JSON.stringify(currentTheme) !== JSON.stringify(initialTheme);
	}, [designModeState?.themeState]);

	const elementChangeCount = useMemo(() => {
		return designModeState?.pendingChanges?.length || 0;
	}, [designModeState?.pendingChanges]);

	const hasUnsavedElementChanges = elementChangeCount > 0;

	const totalChangeCount = useMemo(() => {
		let count = 0;
		if (hasThemeChanges) count += 1;
		count += elementChangeCount;
		return count;
	}, [hasThemeChanges, elementChangeCount]);

	const currentDesignModeTab = useMemo(() => {
		return designModeState?.selectedElement ? "element" : "theme";
	}, [designModeState?.selectedElement]);

	// ============= HELPER FUNCTIONS =============

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

	// ============= PUBLIC METHODS =============

	const enableDesignMode = useCallback(async () => {
		if (!session?._id) {
			console.error("[DesignModeProvider] No session available");
			return;
		}

		console.log("[DesignModeProvider] Enabling design mode...");
		await enableDesignModeMutation({ sessionId: session._id });

		if (iframeRef.current?.contentWindow && isPreviewIframeLoaded) {
			iframeRef.current.contentWindow.postMessage(
				{
					type: "ENABLE_DESIGN_MODE",
					enabled: true,
				},
				"*",
			);
		}
	}, [session?._id, enableDesignModeMutation, iframeRef, isPreviewIframeLoaded]);

	const disableDesignMode = useCallback(async () => {
		if (!session?._id) {
			console.error("[DesignModeProvider] No session available");
			return;
		}

		console.log("[DesignModeProvider] Disabling design mode...");

		const hasPendingChanges = totalChangeCount > 0;

		astCache.current.clear();
		for (const timer of updateTimersRef.current.values()) {
			clearTimeout(timer);
		}
		updateTimersRef.current.clear();

		await disableDesignModeMutation({ sessionId: session._id });
		await setActiveTabMutation({ sessionId: session._id, activeTab: "chat" });

		if (iframeRef.current?.contentWindow && isPreviewIframeLoaded) {
			iframeRef.current.contentWindow.postMessage(
				{
					type: "DISABLE_DESIGN_MODE",
					enabled: false,
				},
				"*",
			);

			if (hasPendingChanges) {
				console.log(
					"[DesignModeProvider] Reloading iframe to discard pending changes",
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

	const updateTheme = useCallback(
		async (themeUpdates: {
			fonts?: Partial<ThemeFormType["fonts"]>;
			lightTheme?: Partial<ThemeFormType["lightTheme"]>;
			darkTheme?: Partial<ThemeFormType["darkTheme"]>;
		}) => {
			if (!session?._id) {
				console.error("[DesignModeProvider] No session available");
				return;
			}

			await updateCurrentThemeMutation({
				sessionId: session._id,
				themeUpdates,
			});

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
					"[DesignModeProvider] Sending theme update to iframe",
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

	const resetTheme = useCallback(async () => {
		if (!session?._id) {
			console.error("[DesignModeProvider] No session available");
			return;
		}

		console.log(
			"[DesignModeProvider] Discarding all changes and exiting design mode...",
		);

		astCache.current.clear();
		for (const timer of updateTimersRef.current.values()) {
			clearTimeout(timer);
		}
		updateTimersRef.current.clear();

		await disableDesignModeMutation({ sessionId: session._id });
		await setActiveTabMutation({ sessionId: session._id, activeTab: "chat" });

		if (iframeRef.current?.contentWindow && isPreviewIframeLoaded) {
			iframeRef.current.contentWindow.postMessage(
				{
					type: "DISABLE_DESIGN_MODE",
					enabled: false,
				},
				"*",
			);
		}

		refreshAllPreviews();
	}, [
		session?._id,
		disableDesignModeMutation,
		setActiveTabMutation,
		iframeRef,
		isPreviewIframeLoaded,
		refreshAllPreviews,
	]);

	const applyChanges = useCallback(async () => {
		if (!session?._id || !sandboxDbId) {
			console.error("[DesignModeProvider] No session or sandbox available");
			return;
		}

		if (!iframeRef.current?.contentWindow || !isPreviewIframeLoaded) {
			console.error("[DesignModeProvider] Iframe not ready");
			return;
		}

		try {
			console.log("[DesignModeProvider] Applying changes...");

			// Flush pending debounced updates
			for (const [elementId, timer] of updateTimersRef.current.entries()) {
				clearTimeout(timer);
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

			let elementFiles:
				| Array<{ filePath: string; content: string }>
				| undefined;

			const pendingElementChanges = designModeState?.pendingChanges || [];
			console.log(
				"[DesignModeProvider] Pending element changes:",
				pendingElementChanges,
			);

			if (pendingElementChanges.length > 0) {
				console.log("[DesignModeProvider] Collecting element changes...");

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
					"[DesignModeProvider] Received element states from iframe:",
					elementsState.length,
				);

				const editedElementIds = new Set(
					pendingElementChanges.map((change) => change.elementId),
				);
				console.log(
					"[DesignModeProvider] Edited element IDs:",
					Array.from(editedElementIds),
				);

				const editedElements = elementsState.filter((element) => {
					const elementId = `${element.sourceFile}:${element.sourceLine}:${element.sourceColumn}`;
					return editedElementIds.has(elementId);
				});

				console.log(
					"[DesignModeProvider] Filtered edited elements:",
					editedElements.length,
				);

				if (editedElements.length > 0) {
					const elementsByFile = new Map<string, typeof elementsState>();
					for (const element of editedElements) {
						if (!elementsByFile.has(element.sourceFile)) {
							elementsByFile.set(element.sourceFile, []);
						}
						elementsByFile.get(element.sourceFile)!.push(element);
					}

					console.log(
						"[DesignModeProvider] Elements grouped by file:",
						Array.from(elementsByFile.keys()),
					);

					elementFiles = [];
					for (const [filePath, elements] of elementsByFile.entries()) {
						console.log(
							`[DesignModeProvider] Processing file: ${filePath} with ${elements.length} elements`,
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

								// Check src/alt/href/target/rel attributes
								const attributesToCheck = [
									"src",
									"alt",
									"href",
									"target",
									"rel",
								] as const;
								for (const attrName of attributesToCheck) {
									const originalAttr =
										nodePath.node.openingElement.attributes.find(
											(
												attr: t.JSXAttribute | t.JSXSpreadAttribute,
											): attr is t.JSXAttribute =>
												t.isJSXAttribute(attr) &&
												t.isJSXIdentifier(attr.name) &&
												attr.name.name === attrName,
										);

									if (
										originalAttr?.value &&
										t.isStringLiteral(originalAttr.value)
									) {
										const originalValue = originalAttr.value.value;
										const currentValue =
											element[attrName as keyof typeof element] || "";

										if (currentValue !== originalValue) {
											updateNodeAttribute(nodePath, attrName, currentValue);
											hasChanges = true;
										}
									}
								}
							}

							console.log(
								`[DesignModeProvider] File ${filePath} has changes: ${hasChanges}`,
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
									`[DesignModeProvider] Adding file to save: ${normalizedPath} (original: ${filePath})`,
								);

								elementFiles.push({
									filePath: normalizedPath,
									content: newContent,
								});
							}
						} catch (error) {
							console.error(
								`[DesignModeProvider] Error processing ${filePath}:`,
								error,
							);
						}
					}
				}
			}

			const theme =
				hasThemeChanges && designModeState?.themeState?.currentTheme
					? designModeState.themeState.currentTheme
					: undefined;

			if (theme || (elementFiles && elementFiles.length > 0)) {
				console.log("[DesignModeProvider] Saving changes to sandbox...", {
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

			await disableDesignModeMutation({ sessionId: session._id });
			await setActiveTabMutation({ sessionId: session._id, activeTab: "chat" });

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
				"[DesignModeProvider] Changes applied successfully - waiting for HMR",
			);
		} catch (error) {
			console.error("[DesignModeProvider] Error applying changes:", error);
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

			lastSentUpdateRef.current.clear();

			// Send deselect message to iframe BEFORE mutation to prevent race condition
			if (!data && iframeRef.current?.contentWindow && isPreviewIframeLoaded) {
				console.log("[DesignModeProvider] Deselecting element in iframe");

				// Set flag to ignore iframe messages for a short period
				isDeselectingRef.current = true;

				iframeRef.current.contentWindow.postMessage(
					{
						type: "FB_DESELECT_ELEMENT",
					},
					"*",
				);

				// Clear flag after a short delay to allow deselection to propagate
				setTimeout(() => {
					isDeselectingRef.current = false;
					console.log("[DesignModeProvider] Deselection flag cleared");
				}, 300);
			}

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
						isImageEditable =
							(!srcAttr ||
								(srcAttr.value && t.isStringLiteral(srcAttr.value))) &&
							(!altAttr || (altAttr.value && t.isStringLiteral(altAttr.value)));

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
						isLinkEditable =
							(!hrefAttr ||
								(hrefAttr.value && t.isStringLiteral(hrefAttr.value))) &&
							(!targetAttr ||
								(targetAttr.value && t.isStringLiteral(targetAttr.value))) &&
							(!relAttr || (relAttr.value && t.isStringLiteral(relAttr.value)));
					}
				} catch (error) {
					console.error("[DesignModeProvider] Error checking editability:", error);
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
				const parseElementId = (id: string) => {
					const parts = id.split(":");
					return [
						parts[0],
						Number.parseInt(parts[1], 10),
						Number.parseInt(parts[2], 10),
					];
				};

				const [filePath, line, column] = parseElementId(elementId);
				const changeId = elementId;

				const updateKey = JSON.stringify(updates);
				const lastUpdate = lastSentUpdateRef.current.get(elementId);

				if (lastUpdate === updateKey) {
					return;
				}

				console.log(
					`[DesignModeProvider] Updating element at ${filePath}:${line}:${column}`,
					updates,
				);

				lastSentUpdateRef.current.set(elementId, updateKey);

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

				const existingTimer = updateTimersRef.current.get(elementId);
				if (existingTimer) {
					clearTimeout(existingTimer);
				}

				const timer = setTimeout(async () => {
					try {
						await updateElementOptimisticMutation({
							sessionId: session._id,
							changeId,
							elementId,
							updates,
						});

						updateTimersRef.current.delete(elementId);
					} catch (error) {
						console.error(
							"[DesignModeProvider] Error saving element update:",
							error,
						);
					}
				}, 300);

				updateTimersRef.current.set(elementId, timer);
			} catch (error) {
				console.error("[DesignModeProvider] Error updating element:", error);
			}
		},
		[
			session?._id,
			iframeRef,
			isPreviewIframeLoaded,
			updateElementOptimisticMutation,
		],
	);

	const getSystemColors = useCallback(() => {
		return systemColorsManager.getColors();
	}, []);

	// ============= EFFECTS =============

	useEffect(() => {
		if (
			!iframeRef.current?.contentWindow ||
			!isPreviewIframeLoaded ||
			!designModeState?.isActive
		) {
			return;
		}

		if (hasRestoredDesignModeRef.current) {
			return;
		}

		hasRestoredDesignModeRef.current = true;

		console.log(
			"[DesignModeProvider] Design mode active on load, re-enabling in iframe",
		);

		iframeRef.current.contentWindow.postMessage(
			{
				type: "ENABLE_DESIGN_MODE",
				enabled: true,
			},
			"*",
		);

		if (
			designModeState.themeState?.status === "ready" &&
			designModeState.themeState.currentTheme
		) {
			const { currentTheme, initialTheme } = designModeState.themeState;
			if (JSON.stringify(currentTheme) !== JSON.stringify(initialTheme)) {
				console.log(
					"[DesignModeProvider] Sending theme to iframe on page reload",
					currentTheme,
				);
				const { sendThemeToIframe } = require("@/lib/design-mode/theme-utils");
				sendThemeToIframe(iframeRef, currentTheme);
			}
		}

		if (designModeState.selectedElement) {
			const { sourceFile, sourceLine, sourceColumn } =
				designModeState.selectedElement;

			console.log(
				"[DesignModeProvider] Re-selecting element in iframe:",
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

	useEffect(() => {
		if (isPreviewIframeLoaded) {
			hasRestoredDesignModeRef.current = false;
		}
	}, [isPreviewIframeLoaded]);

	useEffect(() => {
		if (designModeState?.themeState?.currentTheme) {
			const currentTheme = designModeState.themeState.currentTheme;
			const systemColors = [];

			for (const [key, hslValue] of Object.entries(currentTheme.lightTheme)) {
				if (key === "radius") continue;
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
				// Ignore iframe selection messages if we're in the process of deselecting
				if (isDeselectingRef.current) {
					console.log(
						"[DesignModeProvider] Ignoring iframe selection during deselection",
					);
					return;
				}

				const { sourceFile, sourceLine, sourceColumn, ...rest } =
					event.data.data;

				const elementId = `${sourceFile}:${sourceLine}:${sourceColumn}`;

				console.log("[DesignModeProvider] Element selected from iframe", {
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

	// ============= CONTEXT VALUES =============

	const themeContextValue = useMemo<ThemeContextValue>(
		() => ({
			themeState: designModeState?.themeState,
			hasThemeChanges,
			updateTheme,
			getSystemColors,
		}),
		[designModeState?.themeState, hasThemeChanges, updateTheme, getSystemColors],
	);

	const elementContextValue = useMemo<ElementContextValue>(
		() => ({
			selectedElement: designModeState?.selectedElement,
			pendingChanges: designModeState?.pendingChanges ?? [],
			hasUnsavedChanges: hasUnsavedElementChanges,
			selectElement,
			updateElement,
		}),
		[
			designModeState?.selectedElement,
			designModeState?.pendingChanges,
			hasUnsavedElementChanges,
			selectElement,
			updateElement,
		],
	);

	const stateContextValue = useMemo<DesignModeStateContextValue>(
		() => ({
			isDesignModeActive: designModeState?.isActive ?? false,
			isLoading: designModeState === undefined,
			totalChangeCount,
			currentDesignModeTab,
			enableDesignMode,
			disableDesignMode,
			resetTheme,
			applyChanges,
		}),
		[
			designModeState?.isActive,
			designModeState,
			totalChangeCount,
			currentDesignModeTab,
			enableDesignMode,
			disableDesignMode,
			resetTheme,
			applyChanges,
		],
	);

	return (
		<DesignModeStateContext.Provider value={stateContextValue}>
			<ThemeContext.Provider value={themeContextValue}>
				<ElementContext.Provider value={elementContextValue}>
					{children}
				</ElementContext.Provider>
			</ThemeContext.Provider>
		</DesignModeStateContext.Provider>
	);
};

// ============= CUSTOM HOOKS =============

export const useDesignModeTheme = () => {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error(
			"useDesignModeTheme must be used within DesignModeProvider",
		);
	}
	return context;
};

export const useDesignModeElement = () => {
	const context = useContext(ElementContext);
	if (!context) {
		throw new Error(
			"useDesignModeElement must be used within DesignModeProvider",
		);
	}
	return context;
};

export const useDesignModeState = () => {
	const context = useContext(DesignModeStateContext);
	if (!context) {
		throw new Error(
			"useDesignModeState must be used within DesignModeProvider",
		);
	}
	return context;
};
