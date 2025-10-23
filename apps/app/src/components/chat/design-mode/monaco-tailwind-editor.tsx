"use client";

import { Editor, type OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useRef } from "react";

interface MonacoTailwindEditorProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

// Common Tailwind classes for autocomplete
const getTailwindCompletions = () => {
	const classes = [
		// Layout
		"block",
		"inline-block",
		"inline",
		"flex",
		"inline-flex",
		"grid",
		"inline-grid",
		"hidden",
		// Flexbox
		"flex-row",
		"flex-col",
		"flex-wrap",
		"flex-nowrap",
		"items-start",
		"items-center",
		"items-end",
		"items-stretch",
		"justify-start",
		"justify-center",
		"justify-end",
		"justify-between",
		"justify-around",
		"justify-evenly",
		// Grid
		...Array.from({ length: 12 }, (_, i) => `grid-cols-${i + 1}`),
		...Array.from({ length: 6 }, (_, i) => `grid-rows-${i + 1}`),
		"grid-cols-none",
		"grid-rows-none",
		// Spacing
		...Array.from({ length: 25 }, (_, i) => `m-${i}`),
		...Array.from({ length: 25 }, (_, i) => `mx-${i}`),
		...Array.from({ length: 25 }, (_, i) => `my-${i}`),
		...Array.from({ length: 25 }, (_, i) => `mt-${i}`),
		...Array.from({ length: 25 }, (_, i) => `mr-${i}`),
		...Array.from({ length: 25 }, (_, i) => `mb-${i}`),
		...Array.from({ length: 25 }, (_, i) => `ml-${i}`),
		...Array.from({ length: 25 }, (_, i) => `p-${i}`),
		...Array.from({ length: 25 }, (_, i) => `px-${i}`),
		...Array.from({ length: 25 }, (_, i) => `py-${i}`),
		...Array.from({ length: 25 }, (_, i) => `pt-${i}`),
		...Array.from({ length: 25 }, (_, i) => `pr-${i}`),
		...Array.from({ length: 25 }, (_, i) => `pb-${i}`),
		...Array.from({ length: 25 }, (_, i) => `pl-${i}`),
		...Array.from({ length: 25 }, (_, i) => `gap-${i}`),
		...Array.from({ length: 25 }, (_, i) => `space-x-${i}`),
		...Array.from({ length: 25 }, (_, i) => `space-y-${i}`),
		"mx-auto",
		"my-auto",
		// Typography
		"text-xs",
		"text-sm",
		"text-base",
		"text-lg",
		"text-xl",
		"text-2xl",
		"text-3xl",
		"text-4xl",
		"text-5xl",
		"text-6xl",
		"text-7xl",
		"text-8xl",
		"text-9xl",
		"font-thin",
		"font-extralight",
		"font-light",
		"font-normal",
		"font-medium",
		"font-semibold",
		"font-bold",
		"font-extrabold",
		"font-black",
		"font-sans",
		"font-serif",
		"font-mono",
		"text-left",
		"text-center",
		"text-right",
		"text-justify",
		"underline",
		"no-underline",
		"line-through",
		"italic",
		"not-italic",
		"leading-3",
		"leading-4",
		"leading-5",
		"leading-6",
		"leading-7",
		"leading-8",
		"leading-9",
		"leading-10",
		"tracking-tighter",
		"tracking-tight",
		"tracking-normal",
		"tracking-wide",
		"tracking-wider",
		"tracking-widest",
		// Colors
		"bg-background",
		"bg-foreground",
		"bg-primary",
		"bg-secondary",
		"bg-muted",
		"bg-accent",
		"bg-destructive",
		"text-foreground",
		"text-primary",
		"text-secondary",
		"text-muted-foreground",
		"text-accent-foreground",
		"text-destructive",
		"border-border",
		"border-input",
		...[
			"slate",
			"gray",
			"zinc",
			"neutral",
			"stone",
			"red",
			"orange",
			"amber",
			"yellow",
			"lime",
			"green",
			"emerald",
			"teal",
			"cyan",
			"sky",
			"blue",
			"indigo",
			"violet",
			"purple",
			"fuchsia",
			"pink",
			"rose",
		].flatMap((color) =>
			[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].flatMap(
				(shade) => [
					`bg-${color}-${shade}`,
					`text-${color}-${shade}`,
					`border-${color}-${shade}`,
				],
			),
		),
		// Border
		"border",
		"border-0",
		"border-2",
		"border-4",
		"border-8",
		"border-t",
		"border-r",
		"border-b",
		"border-l",
		"border-x",
		"border-y",
		"border-t-0",
		"border-t-2",
		"border-t-4",
		"border-t-8",
		"border-r-0",
		"border-r-2",
		"border-r-4",
		"border-r-8",
		"border-b-0",
		"border-b-2",
		"border-b-4",
		"border-b-8",
		"border-l-0",
		"border-l-2",
		"border-l-4",
		"border-l-8",
		"rounded",
		"rounded-none",
		"rounded-sm",
		"rounded-md",
		"rounded-lg",
		"rounded-xl",
		"rounded-2xl",
		"rounded-3xl",
		"rounded-full",
		"border-solid",
		"border-dashed",
		"border-dotted",
		"border-double",
		"border-none",
		// Opacity
		...Array.from({ length: 21 }, (_, i) => `opacity-${i * 5}`),
		// Shadow
		"shadow",
		"shadow-none",
		"shadow-xs",
		"shadow-sm",
		"shadow-md",
		"shadow-lg",
		"shadow-xl",
		"shadow-2xl",
		// Width/Height
		...Array.from({ length: 13 }, (_, i) => `w-${i}`),
		...Array.from({ length: 13 }, (_, i) => `h-${i}`),
		"w-auto",
		"w-full",
		"w-screen",
		"w-min",
		"w-max",
		"w-fit",
		"h-auto",
		"h-full",
		"h-screen",
		"h-min",
		"h-max",
		"h-fit",
		// Position
		"static",
		"fixed",
		"absolute",
		"relative",
		"sticky",
		// Z-index
		...Array.from({ length: 11 }, (_, i) => `z-${i * 10}`),
		// Overflow
		"overflow-auto",
		"overflow-hidden",
		"overflow-visible",
		"overflow-scroll",
		"overflow-x-auto",
		"overflow-y-auto",
		"overflow-x-hidden",
		"overflow-y-hidden",
		// Cursor
		"cursor-pointer",
		"cursor-default",
		"cursor-not-allowed",
		"cursor-wait",
		"cursor-text",
		"cursor-move",
		// Pointer events
		"pointer-events-none",
		"pointer-events-auto",
	];

	return classes;
};

export const MonacoTailwindEditor = ({
	value,
	onChange,
	placeholder = "Enter Tailwind classes...",
}: MonacoTailwindEditorProps) => {
	const { resolvedTheme } = useTheme();
	const overflowContainerRef = useRef<HTMLDivElement>(null);

	const handleEditorDidMount: OnMount = (editor, monaco) => {
		// Get CSS variable colors for the suggestion widget
		const styles = getComputedStyle(document.documentElement);
		const popoverBg = styles.getPropertyValue("--popover").trim();
		const popoverFg = styles.getPropertyValue("--popover-foreground").trim();
		const accentBg = styles.getPropertyValue("--accent").trim();

		// Helper to convert HSL to hex
		const hslToHex = (hsl: string): string => {
			const match = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
			if (!match) return "#000000";
			const h = Number.parseInt(match[1], 10);
			const s = Number.parseInt(match[2], 10) / 100;
			const l = Number.parseInt(match[3], 10) / 100;

			const c = (1 - Math.abs(2 * l - 1)) * s;
			const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
			const m = l - c / 2;
			let r = 0;
			let g = 0;
			let b = 0;

			if (h >= 0 && h < 60) {
				r = c;
				g = x;
				b = 0;
			} else if (h >= 60 && h < 120) {
				r = x;
				g = c;
				b = 0;
			} else if (h >= 120 && h < 180) {
				r = 0;
				g = c;
				b = x;
			} else if (h >= 180 && h < 240) {
				r = 0;
				g = x;
				b = c;
			} else if (h >= 240 && h < 300) {
				r = x;
				g = 0;
				b = c;
			} else if (h >= 300 && h < 360) {
				r = c;
				g = 0;
				b = x;
			}

			const rHex = Math.round((r + m) * 255)
				.toString(16)
				.padStart(2, "0");
			const gHex = Math.round((g + m) * 255)
				.toString(16)
				.padStart(2, "0");
			const bHex = Math.round((b + m) * 255)
				.toString(16)
				.padStart(2, "0");

			return `#${rHex}${gHex}${bHex}`;
		};

		// Define custom theme with transparent editor background and styled suggestions
		monaco.editor.defineTheme("tailwind-transparent", {
			base: resolvedTheme === "dark" ? "vs-dark" : "vs",
			inherit: true,
			rules: [],
			colors: {
				"editor.background": "#00000000", // Transparent background
				"editorSuggestWidget.background": hslToHex(popoverBg),
				"editorSuggestWidget.foreground": hslToHex(popoverFg),
				"editorSuggestWidget.selectedBackground": hslToHex(accentBg),
				"editorSuggestWidget.border": hslToHex(popoverBg),
			},
		});

		// Apply the custom theme
		monaco.editor.setTheme("tailwind-transparent");

		// Register Tailwind completions
		monaco.languages.registerCompletionItemProvider("plaintext", {
			provideCompletionItems: (model, position) => {
				const word = model.getWordUntilPosition(position);
				const range = {
					startLineNumber: position.lineNumber,
					endLineNumber: position.lineNumber,
					startColumn: word.startColumn,
					endColumn: word.endColumn,
				};

				const suggestions = getTailwindCompletions().map((className) => ({
					label: className,
					kind: monaco.languages.CompletionItemKind.Class,
					insertText: className,
					range: range,
					detail: "Tailwind CSS",
					documentation: `Tailwind class: ${className}`,
				}));

				return { suggestions };
			},
		});

		// Add placeholder behavior
		if (!value) {
			editor.setValue(placeholder);
			editor.setSelection({
				startLineNumber: 1,
				startColumn: 1,
				endLineNumber: 1,
				endColumn: placeholder.length + 1,
			});
		}

		// Clear placeholder on focus if empty
		editor.onDidFocusEditorText(() => {
			if (editor.getValue() === placeholder) {
				editor.setValue("");
			}
		});

		// Restore placeholder on blur if empty
		editor.onDidBlurEditorText(() => {
			if (!editor.getValue().trim()) {
				editor.setValue(placeholder);
				editor.setSelection({
					startLineNumber: 1,
					startColumn: 1,
					endLineNumber: 1,
					endColumn: placeholder.length + 1,
				});
			}
		});
	};

	const handleChange = (newValue: string | undefined) => {
		if (newValue !== undefined && newValue !== placeholder) {
			onChange(newValue);
		}
	};

	return (
		<>
			<style>
				{`
					.monaco-editor .suggest-widget {
						background: hsl(var(--popover)) !important;
						border: 1px solid hsl(var(--border)) !important;
						border-radius: 0.375rem !important;
						box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
						padding: 4px !important;
						max-height: 200px !important;
						max-width: 200px !important;
					}
					.monaco-editor .suggest-widget .monaco-list {
						max-height: 200px !important;
						max-width: 200px !important;
					}
					.monaco-editor .suggest-widget .monaco-list .monaco-list-row {
						color: hsl(var(--popover-foreground)) !important;
						padding: 2px 4px !important;
						border-radius: 0.25rem !important;
						margin: 1px 0 !important;
						height: auto !important;
						line-height: 1.5 !important;
					}
					.monaco-editor .suggest-widget .monaco-list .monaco-list-row .monaco-icon-label {
						display: flex !important;
						align-items: center !important;
						gap: 8px !important;
					}
					.monaco-editor .suggest-widget .monaco-list .monaco-list-row .codicon {
						flex-shrink: 0 !important;
					}
					.monaco-editor .suggest-widget .monaco-list .monaco-list-row.focused {
						background: hsl(var(--accent)) !important;
					}
					.monaco-editor .suggest-details {
						background: hsl(var(--popover)) !important;
						border: 1px solid hsl(var(--border)) !important;
						padding: 8px !important;
					}
				`}
			</style>
			<div className="relative">
				<div
					ref={overflowContainerRef}
					className="absolute inset-0 pointer-events-none z-50"
				/>
				<div className="relative rounded-md border bg-muted px-3 [&_.monaco-editor]:!bg-transparent [&_.monaco-editor_.margin]:!bg-transparent [&_.monaco-editor-background]:!bg-transparent [&_.monaco-editor]:rounded-md [&_.overflow-guard]:rounded-md">
					<Editor
						height="150px"
						defaultLanguage="plaintext"
						value={value}
						onChange={handleChange}
						onMount={handleEditorDidMount}
						options={{
							minimap: { enabled: false },
							scrollBeyondLastLine: false,
							lineNumbers: "off",
							glyphMargin: false,
							folding: false,
							lineDecorationsWidth: 0,
							lineNumbersMinChars: 0,
							renderLineHighlight: "none",
							wordWrap: "on",
							fontSize: 12,
							fontFamily: "ui-monospace, monospace",
							padding: { top: 8, bottom: 8 },
							scrollbar: {
								vertical: "hidden",
								horizontal: "hidden",
								verticalScrollbarSize: 0,
								horizontalScrollbarSize: 0,
							},
							overviewRulerLanes: 0,
							hideCursorInOverviewRuler: true,
							fixedOverflowWidgets: true,
							suggest: {
								showClasses: true,
								showKeywords: false,
								showSnippets: false,
							},
							quickSuggestions: {
								other: true,
								comments: false,
								strings: true,
							},
							acceptSuggestionOnEnter: "on",
							tabCompletion: "on",
							wordBasedSuggestions: "off",
						}}
					/>
				</div>
			</div>
		</>
	);
};
