/**
 * Design Mode Overlay Script
 * Injected into the preview iframe to enable element selection
 */

interface DesignModeMessage {
	type: "ENABLE_DESIGN_MODE" | "DISABLE_DESIGN_MODE";
	enabled?: boolean;
}

interface ElementSelectedMessage {
	type: "FB_ELEMENT_SELECTED";
	data: {
		tagName: string;
		className: string;
		textContent: string | null;
		sourcePath?: string;
		computedStyles: Record<string, string>;
	};
}

class DesignModeOverlay {
	private overlay: HTMLDivElement | null = null;
	private isEnabled = false;
	private selectedElement: HTMLElement | null = null;

	constructor() {
		this.createOverlay();
		this.listen();
	}

	private createOverlay() {
		this.overlay = document.createElement("div");
		this.overlay.id = "fb-design-mode-overlay";
		Object.assign(this.overlay.style, {
			position: "absolute",
			border: "2px solid #3b82f6",
			pointerEvents: "none",
			zIndex: "999999",
			display: "none",
			boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.3)",
			transition: "all 0.1s ease-out",
		});
		document.body.appendChild(this.overlay);
	}

	private listen() {
		window.addEventListener("message", (e: MessageEvent<DesignModeMessage>) => {
			if (e.data.type === "ENABLE_DESIGN_MODE") {
				this.enable();
			} else if (e.data.type === "DISABLE_DESIGN_MODE") {
				this.disable();
			}
		});
	}

	enable() {
		if (this.isEnabled) return;
		this.isEnabled = true;

		document.addEventListener("mousemove", this.handleMouseMove);
		document.addEventListener("click", this.handleClick, true);

		// Add cursor style
		document.body.style.cursor = "crosshair";
	}

	disable() {
		if (!this.isEnabled) return;
		this.isEnabled = false;

		document.removeEventListener("mousemove", this.handleMouseMove);
		document.removeEventListener("click", this.handleClick, true);

		if (this.overlay) {
			this.overlay.style.display = "none";
		}

		document.body.style.cursor = "";
		this.selectedElement = null;
	}

	private handleMouseMove = (e: MouseEvent) => {
		if (!this.isEnabled || !this.overlay) return;

		const target = e.target as HTMLElement;

		// Skip overlay itself and design mode elements
		if (
			target.id === "fb-design-mode-overlay" ||
			target.closest("#fb-design-mode-overlay")
		) {
			return;
		}

		this.updateOverlay(target);
	};

	private handleClick = (e: MouseEvent) => {
		if (!this.isEnabled) return;

		e.preventDefault();
		e.stopPropagation();

		const target = e.target as HTMLElement;

		// Skip overlay itself
		if (
			target.id === "fb-design-mode-overlay" ||
			target.closest("#fb-design-mode-overlay")
		) {
			return;
		}

		this.selectedElement = target;
		this.sendElementData(target);
	};

	private updateOverlay(element: HTMLElement) {
		if (!this.overlay) return;

		const rect = element.getBoundingClientRect();

		Object.assign(this.overlay.style, {
			display: "block",
			top: `${rect.top + window.scrollY}px`,
			left: `${rect.left + window.scrollX}px`,
			width: `${rect.width}px`,
			height: `${rect.height}px`,
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

	private sendElementData(element: HTMLElement) {
		const data: ElementSelectedMessage = {
			type: "FB_ELEMENT_SELECTED",
			data: {
				tagName: element.tagName,
				className: element.className,
				textContent: element.textContent?.trim() || null,
				sourcePath:
					element.getAttribute("data-fb-path") ||
					element.getAttribute("data-fb-id") ||
					undefined,
				computedStyles: this.getRelevantStyles(element),
			},
		};

		// Send to parent window
		window.parent.postMessage(data, "*");
	}
}

// Initialize the overlay when the script loads
if (typeof window !== "undefined") {
	new DesignModeOverlay();
}
