/**
 * Design Mode Overlay Script
 * Injected into the preview iframe to enable element selection
 *
 * Uses React Fiber's _debugSource to track element source locations at runtime.
 * No build-time tagging required - everything is resolved from React's internal data.
 *
 * Includes client-side Tailwind CSS generation for runtime class support.
 */

import { getTailwindGenerator } from "./tailwind-generator";

interface SourceLocation {
	fileName: string;
	lineNumber: number;
	columnNumber: number;
}

interface DesignModeMessage {
	type: "ENABLE_DESIGN_MODE" | "DISABLE_DESIGN_MODE" | "FB_UPDATE_ELEMENT" | "FB_GET_ALL_ELEMENTS_STATE" | "FB_UPDATE_THEME" | "FB_DESELECT_ELEMENT" | "FB_SELECT_ELEMENT";
	enabled?: boolean;
	sourceFile?: string;
	sourceLine?: number;
	sourceColumn?: number;
	updates?: {
		className?: string;
		textContent?: string;
		src?: string;
		alt?: string;
		href?: string;
		target?: string;
		rel?: string;
	};
	theme?: {
		lightVariables?: Record<string, string>;
		darkVariables?: Record<string, string>;
	};
}

interface ElementSelectedMessage {
	type: "FB_ELEMENT_SELECTED";
	data: {
		// Source location from React Fiber
		sourceFile: string;
		sourceLine: number;
		sourceColumn: number;

		// DOM properties
		tagName: string;
		className: string;
		textContent: string | null;
		src?: string;
		alt?: string;
		href?: string;
		target?: string;
		rel?: string;
		computedStyles: Record<string, string>;
	};
}

class DesignModeOverlay {
	private isEnabled = false;
	private selectedElement: HTMLElement | null = null;
	private hoveredElement: HTMLElement | null = null;

	// Separate overlays for different states
	private hoverOverlay: HTMLDivElement;
	private selectionOverlay: HTMLDivElement;
	private selectionTagLabel: HTMLDivElement;
	private childrenOverlays: HTMLDivElement[] = [];
	private resizeObserver: ResizeObserver | null = null;

	constructor() {
		// Create persistent overlay elements
		this.hoverOverlay = this.createOverlay("2px solid #3b82f6", 999991);
		this.selectionOverlay = this.createOverlay("1px solid #3b82f6", 999990);
		this.selectionTagLabel = this.createTagLabel();

		this.listen();
		this.setupResizeObserver();
	}

	private createOverlay(border: string, zIndex: number): HTMLDivElement {
		const overlay = document.createElement("div");
		overlay.className = "fb-design-mode-overlay";
		Object.assign(overlay.style, {
			position: "absolute",
			border,
			pointerEvents: "none",
			zIndex: String(zIndex),
			display: "none",
			boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.2)",
			transition: "all 0.1s ease-out",
		});
		document.body.appendChild(overlay);
		return overlay;
	}

	private createChildOverlay(): HTMLDivElement {
		const overlay = document.createElement("div");
		overlay.className = "fb-design-mode-overlay fb-child-overlay";
		Object.assign(overlay.style, {
			position: "absolute",
			border: "1px dashed rgba(59, 130, 246, 0.4)",
			pointerEvents: "none",
			zIndex: "999989",
			display: "none",
			boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.1)",
			transition: "all 0.1s ease-out",
		});
		document.body.appendChild(overlay);
		return overlay;
	}

	private createTagLabel(): HTMLDivElement {
		const label = document.createElement("div");
		label.className = "fb-design-mode-tag";
		Object.assign(label.style, {
			position: "absolute",
			background: "#3b82f6",
			color: "white",
			padding: "2px 6px",
			fontSize: "11px",
			fontFamily: "monospace",
			fontWeight: "500",
			borderRadius: "0 0 4px 0",
			pointerEvents: "none",
			zIndex: "999999",
			display: "none",
		});
		document.body.appendChild(label);
		return label;
	}

	private listen() {
		window.addEventListener("message", (e: MessageEvent<DesignModeMessage>) => {
			if (e.data.type === "ENABLE_DESIGN_MODE") {
				this.enable();
			} else if (e.data.type === "DISABLE_DESIGN_MODE") {
				this.disable();
			} else if (e.data.type === "FB_UPDATE_ELEMENT") {
				this.handleUpdateElement(e.data);
			} else if (e.data.type === "FB_GET_ALL_ELEMENTS_STATE") {
				this.handleGetAllElementsState();
			} else if (e.data.type === "FB_UPDATE_THEME") {
				this.handleUpdateTheme(e.data.theme);
			} else if (e.data.type === "FB_DESELECT_ELEMENT") {
				this.deselectElement();
			} else if (e.data.type === "FB_SELECT_ELEMENT") {
				this.handleSelectElement(e.data);
			}
		});
	}

	private setupResizeObserver() {
		// Listen for window resize and scroll events
		window.addEventListener("resize", this.updateOverlayPositions);
		window.addEventListener("scroll", this.updateOverlayPositions, true);

		// Use ResizeObserver to detect when elements change size
		this.resizeObserver = new ResizeObserver(() => {
			this.updateOverlayPositions();
		});

		// Observe the document body for any size changes
		this.resizeObserver.observe(document.body);
	}

	private updateOverlayPositions = () => {
		// Update selected element overlay
		if (this.selectedElement && this.selectionOverlay.style.display !== "none") {
			this.updateOverlayPosition(this.selectionOverlay, this.selectedElement);
			this.updateTagLabel(this.selectedElement);
		}

		// Update hovered element overlay
		if (this.hoveredElement && this.hoverOverlay.style.display !== "none") {
			this.updateOverlayPosition(this.hoverOverlay, this.hoveredElement);
		}

		// Update children overlays
		for (const overlay of this.childrenOverlays) {
			if (overlay.style.display !== "none" && this.hoveredElement) {
				// Find the corresponding child element
				const children = Array.from(this.hoveredElement.children).filter(child => {
					const source = this.getReactFiberSource(child as HTMLElement);
					return source !== null;
				}) as HTMLElement[];

				const index = this.childrenOverlays.indexOf(overlay);
				if (index < children.length) {
					this.updateOverlayPosition(overlay, children[index]);
				}
			}
		}
	};

	enable() {
		if (this.isEnabled) return;
		this.isEnabled = true;

		document.addEventListener("mousemove", this.handleMouseMove);
		document.addEventListener("click", this.handleClick, true);
		document.addEventListener("mouseleave", this.handleMouseLeave);

		// Add cursor style
		document.body.style.cursor = "crosshair";
	}

	disable() {
		if (!this.isEnabled) return;
		this.isEnabled = false;

		document.removeEventListener("mousemove", this.handleMouseMove);
		document.removeEventListener("click", this.handleClick, true);
		document.removeEventListener("mouseleave", this.handleMouseLeave);

		// Hide all overlays
		this.hoverOverlay.style.display = "none";
		this.selectionOverlay.style.display = "none";
		this.selectionTagLabel.style.display = "none";
		this.hideChildrenOverlays();

		// Remove runtime markers
		if (this.selectedElement) {
			this.selectedElement.removeAttribute("data-fb-selected");
		}
		if (this.hoveredElement) {
			this.hoveredElement.removeAttribute("data-fb-hovered");
		}

		document.body.style.cursor = "";
		this.selectedElement = null;
		this.hoveredElement = null;
	}

	/**
	 * Deselect the currently selected element
	 * Keeps design mode active but clears the selection
	 */
	deselectElement() {
		if (!this.selectedElement) return;

		// Remove selection marker
		this.selectedElement.removeAttribute("data-fb-selected");
		this.selectedElement = null;

		// Hide selection overlay and tag
		this.selectionOverlay.style.display = "none";
		this.selectionTagLabel.style.display = "none";
	}

	/**
	 * Programmatically select an element by its source location
	 * Used when restoring selection after page reload
	 */
	private handleSelectElement(data: DesignModeMessage) {
		if (!data.sourceFile || !data.sourceLine || data.sourceColumn === undefined) {
			return;
		}

		// Find element by source location
		const allElements = document.querySelectorAll('*');
		for (const el of allElements) {
			// Skip our own overlays
			if ((el as HTMLElement).classList?.contains("fb-design-mode-overlay") ||
			    (el as HTMLElement).classList?.contains("fb-design-mode-tag")) {
				continue;
			}

			const source = this.getReactFiberSource(el as HTMLElement);
			if (
				source &&
				source.fileName === data.sourceFile &&
				source.lineNumber === data.sourceLine &&
				source.columnNumber === data.sourceColumn
			) {
				const element = el as HTMLElement;

				// Update selected element marker
				if (this.selectedElement) {
					this.selectedElement.removeAttribute("data-fb-selected");
				}

				this.selectedElement = element;
				this.selectedElement.setAttribute("data-fb-selected", "true");

				// Update selection overlay and tag
				this.updateOverlayPosition(this.selectionOverlay, element);
				this.selectionOverlay.style.display = "block";

				this.updateTagLabel(element);
				this.selectionTagLabel.style.display = "block";

				// Send selection data to parent
				this.sendElementData(element, source);

				return;
			}
		}
	}

	/**
	 * Extract source location from React Fiber's _debugSource
	 * This is added automatically by React in development mode
	 *
	 * Strategy: Find the JSX usage site, not the component definition.
	 * - For DOM elements (div, p, button): Use first _debugSource
	 * - For custom components (Button, Input): Skip to parent's _debugSource (the usage site)
	 */
	private getReactFiberSource(element: HTMLElement): SourceLocation | null {
		// Find React fiber key (varies by React version)
		const fiberKey = Object.keys(element).find(key =>
			key.startsWith('__reactFiber$') ||
			key.startsWith('__reactInternalInstance$')
		);

		if (!fiberKey) {
			return null;
		}

		let fiber = (element as any)[fiberKey];
		let firstSource: SourceLocation | null = null;

		// Walk up fiber tree to find _debugSource
		while (fiber) {
			if (fiber._debugSource) {
				const source: SourceLocation = {
					fileName: fiber._debugSource.fileName,
					lineNumber: fiber._debugSource.lineNumber,
					columnNumber: fiber._debugSource.columnNumber ?? 0,
				};

				// Store first source we find
				if (!firstSource) {
					firstSource = source;
				}

				// Check if this is a component file (in src/components/ui/)
				// If it is, skip it and use the parent's source (the usage site)
				const isComponentFile = source.fileName.includes('/components/ui/') ||
				                       source.fileName.includes('/components/common/');

				if (isComponentFile) {
					// This is the component definition - keep looking up for usage site
					fiber = fiber.return;
					continue;
				}

				// This is a usage site - return it
				return source;
			}
			fiber = fiber.return; // Walk up to parent fiber
		}

		// Fallback to first source if we didn't find a non-component source
		return firstSource;
	}

	private isContainer(element: HTMLElement): boolean {
		const containerTags = ['div', 'section', 'header', 'footer', 'main', 'aside', 'nav', 'article', 'ul', 'ol', 'li'];
		return containerTags.includes(element.tagName.toLowerCase());
	}

	private hasDirectTextContent(element: HTMLElement): boolean {
		return Array.from(element.childNodes).some(
			node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
		);
	}

	private handleMouseLeave = () => {
		if (!this.isEnabled) return;

		// Hide hover overlay when mouse leaves the document
		if (this.hoveredElement) {
			this.hoveredElement.removeAttribute("data-fb-hovered");
		}
		this.hoveredElement = null;
		this.hoverOverlay.style.display = "none";
		this.hideChildrenOverlays();
	};

	private handleMouseMove = (e: MouseEvent) => {
		if (!this.isEnabled) return;

		// Get all elements at this point
		const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);

		// Filter to only elements with React Fiber source, excluding overlays
		const selectableElements = elementsAtPoint.filter((el) => {
			if (el.classList.contains("fb-design-mode-overlay") ||
			    el.classList.contains("fb-design-mode-tag")) {
				return false;
			}

			// Must have React Fiber source location
			const source = this.getReactFiberSource(el as HTMLElement);
			return source !== null;
		}) as HTMLElement[];

		if (selectableElements.length === 0) {
			if (this.hoveredElement) {
				this.hoveredElement.removeAttribute("data-fb-hovered");
			}
			this.hoveredElement = null;
			this.hoverOverlay.style.display = "none";
			this.hideChildrenOverlays();
			return;
		}

		// Get topmost element (first in array)
		const topElement = selectableElements[0];

		// Don't show hover overlay if this is the selected element
		if (topElement === this.selectedElement) {
			this.hoverOverlay.style.display = "none";
			this.hideChildrenOverlays();
			return;
		}

		// Update hovered element
		if (this.hoveredElement && this.hoveredElement !== topElement) {
			this.hoveredElement.removeAttribute("data-fb-hovered");
		}

		this.hoveredElement = topElement;
		this.hoveredElement.setAttribute("data-fb-hovered", "true");

		// Show hover overlay
		this.updateOverlayPosition(this.hoverOverlay, topElement);
		this.hoverOverlay.style.display = "block";

		// Show children overlays if this is a container without direct text
		if (this.isContainer(topElement) && !this.hasDirectTextContent(topElement)) {
			this.showChildrenOverlays(topElement);
		} else {
			this.hideChildrenOverlays();
		}
	};

	private showChildrenOverlays(parent: HTMLElement) {
		// Get direct children with React Fiber source
		const children = Array.from(parent.children).filter(child => {
			const source = this.getReactFiberSource(child as HTMLElement);
			return source !== null;
		}) as HTMLElement[];

		// Ensure we have enough child overlays
		while (this.childrenOverlays.length < children.length) {
			this.childrenOverlays.push(this.createChildOverlay());
		}

		// Show overlay for each child
		children.forEach((child, index) => {
			const overlay = this.childrenOverlays[index];
			this.updateOverlayPosition(overlay, child);
			overlay.style.display = "block";
		});

		// Hide unused child overlays
		for (let i = children.length; i < this.childrenOverlays.length; i++) {
			this.childrenOverlays[i].style.display = "none";
		}
	}

	private hideChildrenOverlays() {
		for (const overlay of this.childrenOverlays) {
			overlay.style.display = "none";
		}
	}

	private currentSelectionIndex = 0;
	private lastClickTime = 0;
	private lastClickPosition = { x: 0, y: 0 };

	private handleClick = (e: MouseEvent) => {
		if (!this.isEnabled) return;

		e.preventDefault();
		e.stopPropagation();

		if (!this.hoveredElement) return;

		const now = Date.now();
		const timeSinceLastClick = now - this.lastClickTime;
		const distanceMoved = Math.hypot(
			e.clientX - this.lastClickPosition.x,
			e.clientY - this.lastClickPosition.y,
		);

		// Get all elements at click point for cycling
		const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
		const selectableElements = elementsAtPoint.filter((el) => {
			if (el.classList.contains("fb-design-mode-overlay") ||
			    el.classList.contains("fb-design-mode-tag")) {
				return false;
			}

			// Must have React Fiber source location
			const source = this.getReactFiberSource(el as HTMLElement);
			return source !== null;
		}) as HTMLElement[];

		// Cycle through nested elements on repeated clicks
		if (timeSinceLastClick < 1000 && distanceMoved < 10 && selectableElements.length > 1) {
			this.currentSelectionIndex = (this.currentSelectionIndex + 1) % selectableElements.length;
		} else {
			this.currentSelectionIndex = 0;
		}

		const target = selectableElements[this.currentSelectionIndex];

		// Get source location
		const source = this.getReactFiberSource(target);
		if (!source) {
			return;
		}

		// Update selected element marker
		if (this.selectedElement) {
			this.selectedElement.removeAttribute("data-fb-selected");
		}

		this.selectedElement = target;
		this.selectedElement.setAttribute("data-fb-selected", "true");

		// Update selection overlay and tag
		this.updateOverlayPosition(this.selectionOverlay, target);
		this.selectionOverlay.style.display = "block";

		this.updateTagLabel(target);
		this.selectionTagLabel.style.display = "block";

		// Send selection data to parent
		this.sendElementData(target, source);

		// Update last click info
		this.lastClickTime = now;
		this.lastClickPosition = { x: e.clientX, y: e.clientY };
	};

	private updateOverlayPosition(overlay: HTMLDivElement, element: HTMLElement) {
		const rect = element.getBoundingClientRect();
		Object.assign(overlay.style, {
			top: `${rect.top + window.scrollY}px`,
			left: `${rect.left + window.scrollX}px`,
			width: `${rect.width}px`,
			height: `${rect.height}px`,
		});
	}

	private updateTagLabel(element: HTMLElement) {
		const rect = element.getBoundingClientRect();
		const tagName = element.tagName.toLowerCase();

		this.selectionTagLabel.textContent = tagName;
		Object.assign(this.selectionTagLabel.style, {
			top: `${rect.top + window.scrollY}px`,
			left: `${rect.left + window.scrollX}px`,
		});
	}

	private getRelevantStyles(element: HTMLElement): Record<string, string> {
		const computed = window.getComputedStyle(element);
		const relevantProps = [
			"display",
			"position",
			"width",
			"height",
			"padding",
			"margin",
			"backgroundColor",
			"color",
			"fontSize",
			"fontFamily",
		];

		const styles: Record<string, string> = {};
		for (const prop of relevantProps) {
			styles[prop] = computed.getPropertyValue(prop);
		}
		return styles;
	}

	/**
	 * Extract direct text content from DOM (not from nested children)
	 */
	private getDirectTextContent(element: HTMLElement): string | null {
		const directTextNodes = Array.from(element.childNodes)
			.filter(node => node.nodeType === Node.TEXT_NODE)
			.map(node => node.textContent?.trim())
			.filter(Boolean);

		return directTextNodes.length > 0 ? directTextNodes.join(' ') : null;
	}

	private sendElementData(element: HTMLElement, source: SourceLocation) {
		const directText = this.getDirectTextContent(element);

		const data: ElementSelectedMessage = {
			type: "FB_ELEMENT_SELECTED",
			data: {
				// Source location from React Fiber
				sourceFile: source.fileName,
				sourceLine: source.lineNumber,
				sourceColumn: source.columnNumber,

				// DOM properties
				tagName: element.tagName,
				className: element.className,
				textContent: directText,
				src: element.getAttribute('src') || undefined,
				alt: element.getAttribute('alt') || undefined,
				href: element.getAttribute('href') || undefined,
				target: element.getAttribute('target') || undefined,
				rel: element.getAttribute('rel') || undefined,
				computedStyles: this.getRelevantStyles(element),
			},
		};

		// Send to parent window
		window.parent.postMessage(data, "*");
	}

	/**
	 * Handle request to get all elements' current state
	 * Used for computing diffs on save (Lovable's approach)
	 */
	private handleGetAllElementsState() {
		const allElements = document.querySelectorAll('*');
		const elementsState: Array<{
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
		}> = [];

		for (const el of allElements) {
			// Skip our own overlays
			if ((el as HTMLElement).classList?.contains("fb-design-mode-overlay") ||
			    (el as HTMLElement).classList?.contains("fb-design-mode-tag")) {
				continue;
			}

			const source = this.getReactFiberSource(el as HTMLElement);
			if (!source) continue;

			const element = el as HTMLElement;

			// Check if this is an Image component wrapper with an <img> child
			let actualElement = element;
			if (element.tagName !== "IMG") {
				const imgChild = element.querySelector("img");
				if (imgChild) {
					actualElement = imgChild as HTMLElement;
				}
			}

			const textContent = this.getDirectTextContent(element);

			// Get className as string - handle SVG elements which have className as SVGAnimatedString
			let className = '';
			if (element.className) {
				// For SVG elements, className is SVGAnimatedString with .baseVal property
				if (typeof element.className === 'string') {
					className = element.className;
				} else if ('baseVal' in element.className) {
					className = (element.className as any).baseVal;
				}
			}

			elementsState.push({
				sourceFile: source.fileName,
				sourceLine: source.lineNumber,
				sourceColumn: source.columnNumber,
				className,
				textContent,
				src: actualElement.getAttribute('src') || undefined,
				alt: actualElement.getAttribute('alt') || undefined,
				href: element.getAttribute('href') || undefined,
				target: element.getAttribute('target') || undefined,
				rel: element.getAttribute('rel') || undefined,
			});
		}

		// Send back to parent
		window.parent.postMessage({
			type: 'FB_ALL_ELEMENTS_STATE',
			data: elementsState
		}, '*');
	}

	/**
	 * Handle optimistic element updates from parent window
	 * Uses React Fiber source to find the correct element
	 */
	private handleUpdateElement(message: DesignModeMessage) {
		const { sourceFile, sourceLine, sourceColumn, updates } = message;

		if (!sourceFile || !sourceLine || !updates) {
			return;
		}

		// Find element by matching React Fiber source
		const allElements = document.querySelectorAll('*');

		for (const el of allElements) {
			const source = this.getReactFiberSource(el as HTMLElement);
			if (source?.fileName === sourceFile &&
			    source?.lineNumber === sourceLine &&
			    source?.columnNumber === sourceColumn) {

				let element = el as HTMLElement;

				// Special case: if we're updating image properties (src/alt) but found a container,
				// look for an <img> child element
				if ((updates.src !== undefined || updates.alt !== undefined) && element.tagName !== "IMG") {
					const imgChild = element.querySelector("img");
					if (imgChild) {
						element = imgChild as HTMLElement;
					}
				}

				// Apply optimistic updates
				if (updates.className !== undefined) {
					// Generate CSS for new Tailwind classes before applying
					const generator = getTailwindGenerator();
					generator.generateClasses(updates.className);

					// Apply the className
					element.className = updates.className;
				}

				if (updates.textContent !== undefined) {
					// Only update first text node to preserve child elements
					const textNode = Array.from(element.childNodes).find(
						node => node.nodeType === Node.TEXT_NODE
					);
					if (textNode) {
						textNode.textContent = updates.textContent;
					} else {
						element.textContent = updates.textContent;
					}
				}

				if (updates.src !== undefined && "src" in element) {
					// Use setAttribute to force browser reload, bypassing React's state management
					element.setAttribute("src", updates.src);
					// Also update srcset to prevent fallback
					if (element.hasAttribute("srcset")) {
						element.removeAttribute("srcset");
					}
				}

				if (updates.alt !== undefined && "alt" in element) {
					(element as HTMLImageElement).alt = updates.alt;
				}

				if (updates.href !== undefined && "href" in element) {
					element.setAttribute("href", updates.href);
				}

				if (updates.target !== undefined && "target" in element) {
					element.setAttribute("target", updates.target);
				}

				if (updates.rel !== undefined && "rel" in element) {
					element.setAttribute("rel", updates.rel);
				}

				// Update overlays if this is the hovered or selected element
				if (element === this.hoveredElement) {
					this.updateOverlayPosition(this.hoverOverlay, element);
				}
				if (element === this.selectedElement) {
					this.updateOverlayPosition(this.selectionOverlay, element);
					this.updateTagLabel(element);
				}

				return;
			}
		}
	}

	/**
	 * Handle theme update from parent window
	 * Apply CSS variables using a style tag (NOT inline styles) to maintain proper CSS cascade
	 * Note: We don't change the dark class - that's controlled by the native theme switcher
	 */
	private handleUpdateTheme(theme?: {
		lightVariables?: Record<string, string>;
		darkVariables?: Record<string, string>;
	}) {
		if (!theme) return;

		// Find or create the style element for design mode theme overrides
		let styleEl = document.getElementById('fb-design-mode-theme') as HTMLStyleElement;
		if (!styleEl) {
			styleEl = document.createElement('style');
			styleEl.id = 'fb-design-mode-theme';
			document.head.appendChild(styleEl);
		}

		// Build CSS with both light and dark theme variables
		let css = '';

		// Light theme variables in :root (includes colors, fonts, radius)
		if (theme.lightVariables && Object.keys(theme.lightVariables).length > 0) {
			css += ':root {\n';
			for (const [key, value] of Object.entries(theme.lightVariables)) {
				css += `  ${key}: ${value};\n`;
			}
			css += '}\n\n';
		}

		// Dark theme variables in .dark (only colors, not fonts/radius)
		if (theme.darkVariables && Object.keys(theme.darkVariables).length > 0) {
			css += '.dark {\n';
			for (const [key, value] of Object.entries(theme.darkVariables)) {
				css += `  ${key}: ${value};\n`;
			}
			css += '}\n';
		}

		// Apply the CSS
		styleEl.textContent = css;
	}
}

// Initialize when script loads
new DesignModeOverlay();
