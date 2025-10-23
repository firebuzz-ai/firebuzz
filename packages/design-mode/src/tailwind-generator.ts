/**
 * Client-side Tailwind CSS Generator
 *
 * Generates CSS for Tailwind classes at runtime using the resolved Tailwind config.
 * This allows design mode to support any Tailwind class without build-time compilation.
 *
 * Based on Lovable's approach: "a client-side Tailwind generator that intelligently
 * reads custom configurations"
 */

type TailwindConfig = any; // Generated config structure is dynamic

export class TailwindCSSGenerator {
	private config: TailwindConfig;
	private generatedStyles = new Set<string>();
	private styleElement: HTMLStyleElement | null = null;

	constructor(config?: TailwindConfig) {
		// Load config dynamically - will be imported by the overlay
		if (config) {
			this.config = config;
		} else {
			// @ts-expect-error - Config is generated at build time by Vite plugin
			this.config = (window as any).__FIREBUZZ_TAILWIND_CONFIG__ || {};
		}
		this.initStyleElement();
		console.log("[Tailwind Generator] Initialized with config:", {
			colors: Object.keys(
				(this.config.theme?.colors as Record<string, any>) || {},
			).length,
			spacing: Object.keys(
				(this.config.theme?.spacing as Record<string, any>) || {},
			).length,
		});
	}

	/**
	 * Initialize a <style> element to inject generated CSS
	 */
	private initStyleElement() {
		// Check if style element already exists (shouldn't happen with singleton, but safety check)
		const existing = document.getElementById("fb-runtime-tailwind");
		if (existing) {
			console.warn(
				"[Tailwind Generator] Style element already exists, reusing it",
			);
			this.styleElement = existing as HTMLStyleElement;
			return;
		}

		this.styleElement = document.createElement("style");
		this.styleElement.id = "fb-runtime-tailwind";
		this.styleElement.setAttribute("data-source", "firebuzz-design-mode");
		document.head.appendChild(this.styleElement);
		console.log("[Tailwind Generator] Created <style> element in <head>");
	}

	/**
	 * Check if a CSS class already has styles in the built Tailwind CSS
	 * Uses a simple heuristic: create a test element and check if it has the expected styles
	 */
	private classExistsInStylesheet(className: string): boolean {
		try {
			// Create a hidden test element
			const testDiv = document.createElement("div");
			testDiv.className = className;
			testDiv.style.cssText =
				"position:absolute;top:-9999px;left:-9999px;visibility:hidden;";
			document.body.appendChild(testDiv);

			// Get computed styles
			const computed = window.getComputedStyle(testDiv);

			// Check if the class has any non-default styles applied
			let hasStyles = false;

			// Background color classes
			if (
				className.startsWith("bg-") &&
				computed.backgroundColor !== "rgba(0, 0, 0, 0)"
			) {
				hasStyles = true;
			}
			// Text color classes
			else if (
				className.startsWith("text-") &&
				!className.match(
					/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
				)
			) {
				const defaultColor = window.getComputedStyle(document.body).color;
				if (
					computed.color !== defaultColor &&
					computed.color !== "rgb(0, 0, 0)"
				) {
					hasStyles = true;
				}
			}
			// Font size classes
			else if (
				className.match(
					/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
				)
			) {
				// Check if font-size is different from body default
				const defaultFontSize = window.getComputedStyle(document.body).fontSize;
				if (computed.fontSize !== defaultFontSize) {
					hasStyles = true;
				}
			}
			// Padding/margin classes
			else if (className.match(/^[pm][trblxy]?-/)) {
				const prop = className[0] === "p" ? "padding" : "margin";
				const side = className[1] === "-" ? "Top" : className[1].toUpperCase();
				const propName = `${prop}${side === "-" ? "Top" : side}` as any;
				if (computed[propName] && computed[propName] !== "0px") {
					hasStyles = true;
				}
			}
			// Gap classes (gap, gap-x, gap-y)
			else if (className.startsWith("gap-")) {
				// Check if gap/column-gap/row-gap is set
				if (
					(computed.gap !== "normal" && computed.gap !== "0px") ||
					(computed.columnGap !== "normal" && computed.columnGap !== "0px") ||
					(computed.rowGap !== "normal" && computed.rowGap !== "0px")
				) {
					hasStyles = true;
				}
			}
			// Space classes (space-x, space-y)
			else if (className.startsWith("space-")) {
				// For space classes, check if any margin is applied
				// These apply margin to children, so harder to detect - default to not existing
				hasStyles = false;
			}
			// Width/height classes
			else if (className.match(/^[wh]-/)) {
				const prop = className[0] === "w" ? "width" : "height";
				if (computed[prop] !== "auto" && computed[prop] !== "0px") {
					hasStyles = true;
				}
			}
			// Display utilities
			else if (
				[
					"flex",
					"inline-flex",
					"grid",
					"inline-grid",
					"block",
					"inline-block",
					"hidden",
				].includes(className)
			) {
				const expectedDisplay =
					className === "hidden"
						? "none"
						: className.replace("inline-", "inline-").replace("-", "");
				if (
					computed.display === expectedDisplay ||
					(className === "flex" && computed.display === "flex") ||
					(className === "grid" && computed.display === "grid") ||
					(className === "block" && computed.display === "block")
				) {
					hasStyles = true;
				}
			}
			// Flex/grid layout utilities
			else if (
				[
					"items-center",
					"items-start",
					"items-end",
					"justify-center",
					"justify-between",
					"justify-around",
					"flex-col",
					"flex-row",
				].includes(className)
			) {
				// Check for corresponding CSS properties
				if (
					className.startsWith("items-") &&
					computed.alignItems !== "normal"
				) {
					hasStyles = true;
				} else if (
					className.startsWith("justify-") &&
					computed.justifyContent !== "normal"
				) {
					hasStyles = true;
				} else if (
					className.startsWith("flex-") &&
					computed.flexDirection !== "row"
				) {
					hasStyles = true;
				}
			}

			document.body.removeChild(testDiv);
			return hasStyles;
		} catch (_e) {
			// If we can't check, assume it doesn't exist and generate it
			return false;
		}
	}

	/**
	 * Generate CSS for a list of Tailwind classes
	 * Only generates CSS for classes that don't already exist in stylesheets
	 */
	public generateClasses(classNames: string): void {
		const classes = classNames.split(/\s+/).filter(Boolean);

		for (const className of classes) {
			// Skip if we've already generated this class
			if (this.generatedStyles.has(className)) {
				continue;
			}

			// Skip if the class already exists in a stylesheet
			if (this.classExistsInStylesheet(className)) {
				console.log(
					`[Tailwind Generator] Skipping ${className} - already in stylesheet`,
				);
				continue;
			}

			// Generate CSS only for new/missing classes
			const css = this.generateCSSForClass(className);
			if (css) {
				this.appendCSS(css);
				this.generatedStyles.add(className);
				console.log(
					`[Tailwind Generator] Generated CSS for new class: ${className}`,
				);
			}
		}
	}

	/**
	 * Generate CSS for a single Tailwind class
	 */
	private generateCSSForClass(className: string): string | null {
		// Handle responsive prefixes (sm:, md:, lg:, xl:, 2xl:)
		const responsiveMatch = className.match(/^(sm|md|lg|xl|2xl):(.+)$/);
		if (responsiveMatch) {
			const [, breakpoint, baseClass] = responsiveMatch;
			const baseCss = this.generateBaseCSS(baseClass);
			if (!baseCss) return null;

			const screens =
				(this.config.theme?.screens as Record<string, string>) || {};
			const minWidth = screens[breakpoint];
			if (!minWidth) return null;

			return `@media (min-width: ${minWidth}) { ${baseCss} }`;
		}

		// Handle state prefixes (hover:, focus:, active:, etc.)
		const stateMatch = className.match(
			/^(hover|focus|active|disabled|focus-visible|focus-within|visited):(.+)$/,
		);
		if (stateMatch) {
			const [, state, baseClass] = stateMatch;
			const baseCss = this.generateBaseCSS(baseClass);
			if (!baseCss) return null;

			return baseCss.replace(
				/\.([^\s{]+)/,
				`.${className.replace(/:/g, "\\:")}:${state}`,
			);
		}

		// Handle dark mode prefix
		const darkMatch = className.match(/^dark:(.+)$/);
		if (darkMatch) {
			const [, baseClass] = darkMatch;
			const baseCss = this.generateBaseCSS(baseClass);
			if (!baseCss) return null;

			return `.dark ${baseCss}`;
		}

		return this.generateBaseCSS(className);
	}

	/**
	 * Generate base CSS for a class (no prefixes)
	 */
	private generateBaseCSS(className: string): string | null {
		// Background colors: bg-{color}-{shade}
		if (className.startsWith("bg-")) {
			return this.generateColorCSS(className, "background-color");
		}

		// Text colors: text-{color}-{shade}
		if (className.startsWith("text-")) {
			// Check if it's a color or font size
			if (
				className.match(
					/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
				)
			) {
				return this.generateFontSizeCSS(className);
			}
			return this.generateColorCSS(className, "color");
		}

		// Border colors: border-{color}-{shade}
		if (className.startsWith("border-")) {
			// Check if it's a color, width, or style
			if (className.match(/^border-(\d+|t|r|b|l|x|y)$/)) {
				return this.generateBorderWidthCSS(className);
			}
			// Check for border styles
			if (
				[
					"border-solid",
					"border-dashed",
					"border-dotted",
					"border-double",
					"border-none",
				].includes(className)
			) {
				const style = className.replace("border-", "");
				return `.${className} { border-style: ${style} }`;
			}
			return this.generateColorCSS(className, "border-color");
		}

		// Padding: p-{size}, pt-{size}, pr-{size}, etc.
		if (className.match(/^p[trblxy]?-/)) {
			return this.generateSpacingCSS(className, "padding");
		}

		// Margin: m-{size}, mt-{size}, mr-{size}, etc.
		if (className.match(/^m[trblxy]?-/)) {
			return this.generateSpacingCSS(className, "margin");
		}

		// Width: w-{size}
		if (className.startsWith("w-")) {
			return this.generateSizeCSS(className, "width");
		}

		// Height: h-{size}
		if (className.startsWith("h-")) {
			return this.generateSizeCSS(className, "height");
		}

		// Font weight: font-{weight}
		if (className.startsWith("font-")) {
			return this.generateFontWeightCSS(className);
		}

		// Rounded: rounded-{size}
		if (className.startsWith("rounded")) {
			return this.generateBorderRadiusCSS(className);
		}

		// Flex, Grid, Display utilities
		if (
			[
				"flex",
				"inline-flex",
				"grid",
				"inline-grid",
				"block",
				"inline-block",
				"hidden",
			].includes(className)
		) {
			return `.${className} { display: ${className.replace("inline-", "inline ").replace("-", " ")} }`;
		}

		// Gap: gap-{size}, gap-x-{size}, gap-y-{size}
		if (className.startsWith("gap-")) {
			return this.generateGapCSS(className);
		}

		// Space between: space-x-{size}, space-y-{size}
		if (className.startsWith("space-")) {
			return this.generateSpaceBetweenCSS(className);
		}

		// Flex direction utilities
		if (className === "flex-row") return ".flex-row { flex-direction: row }";
		if (className === "flex-row-reverse")
			return ".flex-row-reverse { flex-direction: row-reverse }";
		if (className === "flex-col") return ".flex-col { flex-direction: column }";
		if (className === "flex-col-reverse")
			return ".flex-col-reverse { flex-direction: column-reverse }";

		// Justify content utilities
		if (className === "justify-start")
			return ".justify-start { justify-content: flex-start }";
		if (className === "justify-center")
			return ".justify-center { justify-content: center }";
		if (className === "justify-end")
			return ".justify-end { justify-content: flex-end }";
		if (className === "justify-between")
			return ".justify-between { justify-content: space-between }";
		if (className === "justify-around")
			return ".justify-around { justify-content: space-around }";
		if (className === "justify-evenly")
			return ".justify-evenly { justify-content: space-evenly }";

		// Align items utilities
		if (className === "items-start")
			return ".items-start { align-items: flex-start }";
		if (className === "items-center")
			return ".items-center { align-items: center }";
		if (className === "items-end")
			return ".items-end { align-items: flex-end }";
		if (className === "items-baseline")
			return ".items-baseline { align-items: baseline }";
		if (className === "items-stretch")
			return ".items-stretch { align-items: stretch }";

		// Text alignment utilities
		if (className === "text-left") return ".text-left { text-align: left }";
		if (className === "text-center")
			return ".text-center { text-align: center }";
		if (className === "text-right") return ".text-right { text-align: right }";
		if (className === "text-justify")
			return ".text-justify { text-align: justify }";

		// Text decoration utilities
		if (className === "underline")
			return ".underline { text-decoration-line: underline }";
		if (className === "overline")
			return ".overline { text-decoration-line: overline }";
		if (className === "line-through")
			return ".line-through { text-decoration-line: line-through }";
		if (className === "no-underline")
			return ".no-underline { text-decoration-line: none }";

		// Font style utilities
		if (className === "italic") return ".italic { font-style: italic }";
		if (className === "not-italic") return ".not-italic { font-style: normal }";

		// Line height utilities
		if (className.startsWith("leading-")) {
			return this.generateLineHeightCSS(className);
		}

		// Letter spacing utilities
		if (className.startsWith("tracking-")) {
			return this.generateLetterSpacingCSS(className);
		}

		// Grid columns: grid-cols-{number}
		if (className.startsWith("grid-cols-")) {
			return this.generateGridColumnsCSS(className);
		}

		// Grid rows: grid-rows-{number}
		if (className.startsWith("grid-rows-")) {
			return this.generateGridRowsCSS(className);
		}

		// Opacity: opacity-{value}
		if (className.startsWith("opacity-")) {
			return this.generateOpacityCSS(className);
		}

		// Shadow: shadow-{size}
		if (className.startsWith("shadow")) {
			return this.generateShadowCSS(className);
		}

		// If we can't generate CSS, return null
		console.warn(
			`[Tailwind Generator] Cannot generate CSS for class: ${className}`,
		);
		return null;
	}

	private generateColorCSS(className: string, property: string): string | null {
		const colors = (this.config.theme?.colors as Record<string, any>) || {};

		// Extract color and shade from class name
		// e.g., "bg-blue-500" -> property="background", color="blue", shade="500"
		const prefix =
			property === "background-color"
				? "bg-"
				: property === "color"
					? "text-"
					: "border-";

		const colorPart = className.slice(prefix.length);
		const parts = colorPart.split("-");

		if (parts.length === 1) {
			// Simple color like "bg-black"
			const colorValue = colors[parts[0]];
			if (typeof colorValue === "string") {
				return `.${className} { ${property}: ${colorValue} }`;
			}
		} else if (parts.length === 2) {
			// Color with shade like "bg-blue-500"
			const [colorName, shade] = parts;
			const colorValue = colors[colorName]?.[shade];
			if (colorValue) {
				return `.${className} { ${property}: ${colorValue} }`;
			}
		}

		return null;
	}

	private generateSpacingCSS(
		className: string,
		type: "padding" | "margin",
	): string | null {
		const spacing =
			(this.config.theme?.spacing as Record<string, string>) || {};
		const prefix = type === "padding" ? "p" : "m";

		// Extract direction and value
		// e.g., "pt-4" -> direction="t", value="4"
		const match = className.match(new RegExp(`^${prefix}([trblxy])?-(.+)$`));
		if (!match) return null;

		const [, direction, value] = match;
		const spacingValue = spacing[value];
		if (!spacingValue) return null;

		const properties: string[] = [];
		if (!direction) {
			properties.push(`${type}: ${spacingValue}`);
		} else if (direction === "x") {
			properties.push(
				`${type}-left: ${spacingValue}`,
				`${type}-right: ${spacingValue}`,
			);
		} else if (direction === "y") {
			properties.push(
				`${type}-top: ${spacingValue}`,
				`${type}-bottom: ${spacingValue}`,
			);
		} else {
			const dirMap: Record<string, string> = {
				t: "top",
				r: "right",
				b: "bottom",
				l: "left",
			};
			properties.push(`${type}-${dirMap[direction]}: ${spacingValue}`);
		}

		return `.${className} { ${properties.join("; ")} }`;
	}

	private generateSizeCSS(
		className: string,
		property: "width" | "height",
	): string | null {
		const spacing =
			(this.config.theme?.spacing as Record<string, string>) || {};
		const prefix = property === "width" ? "w-" : "h-";
		const value = className.slice(prefix.length);

		// Handle special values
		if (value === "full") return `.${className} { ${property}: 100% }`;
		if (value === "screen")
			return `.${className} { ${property}: 100v${property[0]} }`;
		if (value === "auto") return `.${className} { ${property}: auto }`;
		if (value === "min") return `.${className} { ${property}: min-content }`;
		if (value === "max") return `.${className} { ${property}: max-content }`;
		if (value === "fit") return `.${className} { ${property}: fit-content }`;

		// Use spacing scale
		const sizeValue = spacing[value];
		if (sizeValue) {
			return `.${className} { ${property}: ${sizeValue} }`;
		}

		return null;
	}

	private generateFontSizeCSS(className: string): string | null {
		const fontSize = (this.config.theme?.fontSize as Record<string, any>) || {};
		const size = className.slice("text-".length);
		const fontSizeValue = fontSize[size];

		if (Array.isArray(fontSizeValue)) {
			const [fSize, { lineHeight }] = fontSizeValue;
			return `.${className} { font-size: ${fSize}; line-height: ${lineHeight} }`;
		}
		if (typeof fontSizeValue === "string") {
			return `.${className} { font-size: ${fontSizeValue} }`;
		}

		return null;
	}

	private generateFontWeightCSS(className: string): string | null {
		const fontWeight =
			(this.config.theme?.fontWeight as Record<string, string>) || {};
		const weight = className.slice("font-".length);
		const weightValue = fontWeight[weight];

		if (weightValue) {
			return `.${className} { font-weight: ${weightValue} }`;
		}

		return null;
	}

	private generateBorderRadiusCSS(className: string): string | null {
		const borderRadius =
			(this.config.theme?.borderRadius as Record<string, string>) || {};

		// Handle "rounded" (no suffix)
		if (className === "rounded") {
			const value = borderRadius.DEFAULT || borderRadius[""];
			if (value) return `.rounded { border-radius: ${value} }`;
		}

		// Handle "rounded-{size}"
		const size = className.slice("rounded-".length);
		const radiusValue = borderRadius[size];
		if (radiusValue) {
			return `.${className} { border-radius: ${radiusValue} }`;
		}

		return null;
	}

	private generateBorderWidthCSS(className: string): string | null {
		const borderWidth =
			(this.config.theme?.borderWidth as Record<string, string>) || {};

		// Handle "border" (default width)
		if (className === "border") {
			const value = borderWidth.DEFAULT || "1px";
			return `.border { border-width: ${value} }`;
		}

		// Handle directional borders: border-t, border-r, border-b, border-l
		const dirMatch = className.match(/^border-([trbl])$/);
		if (dirMatch) {
			const dirMap: Record<string, string> = {
				t: "top",
				r: "right",
				b: "bottom",
				l: "left",
			};
			const value = borderWidth.DEFAULT || "1px";
			return `.${className} { border-${dirMap[dirMatch[1]]}-width: ${value} }`;
		}

		// Handle border-{width}
		const widthMatch = className.match(/^border-(\d+)$/);
		if (widthMatch) {
			const value = borderWidth[widthMatch[1]];
			if (value) {
				return `.${className} { border-width: ${value} }`;
			}
		}

		return null;
	}

	private generateGapCSS(className: string): string | null {
		const spacing =
			(this.config.theme?.spacing as Record<string, string>) || {};

		// Handle gap-x-{size}
		if (className.startsWith("gap-x-")) {
			const value = className.slice("gap-x-".length);
			const gapValue = spacing[value];
			if (gapValue) {
				return `.${className} { column-gap: ${gapValue} }`;
			}
		}

		// Handle gap-y-{size}
		if (className.startsWith("gap-y-")) {
			const value = className.slice("gap-y-".length);
			const gapValue = spacing[value];
			if (gapValue) {
				return `.${className} { row-gap: ${gapValue} }`;
			}
		}

		// Handle gap-{size}
		const value = className.slice("gap-".length);
		const gapValue = spacing[value];
		if (gapValue) {
			return `.${className} { gap: ${gapValue} }`;
		}

		return null;
	}

	/**
	 * Generate CSS for space-between utilities (space-x, space-y)
	 * These use margin and the child combinator selector
	 */
	private generateSpaceBetweenCSS(className: string): string | null {
		const spacing =
			(this.config.theme?.spacing as Record<string, string>) || {};

		// Handle space-x-{size}
		if (className.startsWith("space-x-")) {
			const value = className.slice("space-x-".length);
			const spaceValue = spacing[value];
			if (spaceValue) {
				// space-x uses margin-left on all children except first
				return `.${className} > :not([hidden]) ~ :not([hidden]) { --tw-space-x-reverse: 0; margin-right: calc(${spaceValue} * var(--tw-space-x-reverse)); margin-left: calc(${spaceValue} * calc(1 - var(--tw-space-x-reverse))) }`;
			}
		}

		// Handle space-y-{size}
		if (className.startsWith("space-y-")) {
			const value = className.slice("space-y-".length);
			const spaceValue = spacing[value];
			if (spaceValue) {
				// space-y uses margin-top on all children except first
				return `.${className} > :not([hidden]) ~ :not([hidden]) { --tw-space-y-reverse: 0; margin-top: calc(${spaceValue} * calc(1 - var(--tw-space-y-reverse))); margin-bottom: calc(${spaceValue} * var(--tw-space-y-reverse)) }`;
			}
		}

		// Handle space-x-reverse and space-y-reverse
		if (className === "space-x-reverse") {
			return `.${className} > :not([hidden]) ~ :not([hidden]) { --tw-space-x-reverse: 1 }`;
		}
		if (className === "space-y-reverse") {
			return `.${className} > :not([hidden]) ~ :not([hidden]) { --tw-space-y-reverse: 1 }`;
		}

		return null;
	}

	private generateLineHeightCSS(className: string): string | null {
		const lineHeight =
			(this.config.theme?.lineHeight as Record<string, string>) || {};
		const value = className.slice("leading-".length);
		const lineHeightValue = lineHeight[value];

		if (lineHeightValue) {
			return `.${className} { line-height: ${lineHeightValue} }`;
		}

		return null;
	}

	private generateLetterSpacingCSS(className: string): string | null {
		const letterSpacing =
			(this.config.theme?.letterSpacing as Record<string, string>) || {};
		const value = className.slice("tracking-".length);
		const letterSpacingValue = letterSpacing[value];

		if (letterSpacingValue) {
			return `.${className} { letter-spacing: ${letterSpacingValue} }`;
		}

		return null;
	}

	private generateGridColumnsCSS(className: string): string | null {
		const value = className.slice("grid-cols-".length);

		if (value === "none") {
			return `.${className} { grid-template-columns: none }`;
		}
		if (value === "subgrid") {
			return `.${className} { grid-template-columns: subgrid }`;
		}

		const numCols = Number.parseInt(value, 10);
		if (!Number.isNaN(numCols) && numCols >= 1 && numCols <= 12) {
			return `.${className} { grid-template-columns: repeat(${numCols}, minmax(0, 1fr)) }`;
		}

		return null;
	}

	private generateGridRowsCSS(className: string): string | null {
		const value = className.slice("grid-rows-".length);

		if (value === "none") {
			return `.${className} { grid-template-rows: none }`;
		}
		if (value === "subgrid") {
			return `.${className} { grid-template-rows: subgrid }`;
		}

		const numRows = Number.parseInt(value, 10);
		if (!Number.isNaN(numRows) && numRows >= 1 && numRows <= 6) {
			return `.${className} { grid-template-rows: repeat(${numRows}, minmax(0, 1fr)) }`;
		}

		return null;
	}

	private generateOpacityCSS(className: string): string | null {
		const value = className.slice("opacity-".length);
		const numValue = Number.parseInt(value, 10);

		if (!Number.isNaN(numValue) && numValue >= 0 && numValue <= 100) {
			return `.${className} { opacity: ${numValue / 100} }`;
		}

		return null;
	}

	private generateShadowCSS(className: string): string | null {
		const shadows =
			(this.config.theme?.boxShadow as Record<string, string>) || {};

		// Handle "shadow" (default)
		if (className === "shadow") {
			const value = shadows.DEFAULT || shadows[""];
			if (value) return `.shadow { box-shadow: ${value} }`;
		}

		// Handle "shadow-{size}"
		const size = className.slice("shadow-".length);
		const shadowValue = shadows[size];
		if (shadowValue) {
			return `.${className} { box-shadow: ${shadowValue} }`;
		}

		return null;
	}

	/**
	 * Append generated CSS to the style element
	 */
	private appendCSS(css: string) {
		if (this.styleElement) {
			this.styleElement.textContent += `\n${css}`;
		}
	}

	/**
	 * Clear all generated styles
	 */
	public clear() {
		this.generatedStyles.clear();
		if (this.styleElement) {
			this.styleElement.textContent = "";
		}
	}
}

// Singleton instance
let generator: TailwindCSSGenerator | null = null;

export function getTailwindGenerator(): TailwindCSSGenerator {
	if (!generator) {
		generator = new TailwindCSSGenerator();
	}
	return generator;
}
