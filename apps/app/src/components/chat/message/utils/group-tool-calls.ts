import type { LandingPageUIMessage } from "@firebuzz/convex";

export interface ToolGroup {
	type: "group";
	parts: LandingPageUIMessage["parts"][number][];
	startIndex: number;
}

export interface SinglePart {
	type: "single";
	part: LandingPageUIMessage["parts"][number];
	index: number;
}

export type GroupedPart = ToolGroup | SinglePart;

// Tools that should not be grouped (high-level actions)
const EXCLUDED_TOOLS = [
	"tool-saveLandingPageVersion",
	"tool-listLandingPageVersions",
	"tool-previewVersionRevert",
	"tool-revertToVersion",
	"tool-createTodoList",
	"tool-updateTodoList",
	"tool-buildLandingPage",
	"tool-publishToPreview",
];

/**
 * Groups all sequential tool calls together, regardless of their type.
 * Only reasoning and text parts break the grouping.
 * Excludes high-level tools like version management and todo lists.
 * @param parts - Array of message parts
 * @returns Array of grouped or single parts
 */
export function groupToolCalls(
	parts: LandingPageUIMessage["parts"],
): GroupedPart[] {
	const grouped: GroupedPart[] = [];
	let i = 0;

	while (i < parts.length) {
		const currentPart = parts[i];

		// Non-tool parts are always single (but skip step-start as it's just metadata)
		if (currentPart.type === "step-start") {
			i++;
			continue;
		}

		if (
			currentPart.type === "text" ||
			currentPart.type === "reasoning" ||
			!currentPart.type.startsWith("tool-")
		) {
			grouped.push({ type: "single", part: currentPart, index: i });
			i++;
			continue;
		}

		// Excluded tools are always single
		if (EXCLUDED_TOOLS.includes(currentPart.type)) {
			grouped.push({ type: "single", part: currentPart, index: i });
			i++;
			continue;
		}

		// Collect all consecutive tool calls (any type), skipping step-start
		const sequentialParts: LandingPageUIMessage["parts"][number][] = [
			currentPart,
		];
		let j = i + 1;

		// Group all consecutive tool calls together (skip step-start in between)
		while (j < parts.length) {
			// Skip step-start parts
			if (parts[j].type === "step-start") {
				j++;
				continue;
			}

			// Stop if we hit reasoning or text
			if (parts[j].type === "reasoning" || parts[j].type === "text") {
				break;
			}

			// Stop if we hit an excluded tool
			if (EXCLUDED_TOOLS.includes(parts[j].type)) {
				break;
			}

			// Add tool calls
			if (parts[j].type.startsWith("tool-")) {
				sequentialParts.push(parts[j]);
				j++;
			} else {
				break;
			}
		}

		// If we have 2 or more sequential tool calls, group them
		if (sequentialParts.length >= 2) {
			grouped.push({
				type: "group",
				parts: sequentialParts,
				startIndex: i,
			});
			i = j;
		} else {
			// Single tool call
			grouped.push({ type: "single", part: currentPart, index: i });
			i++;
		}
	}

	return grouped;
}

/**
 * Extracts a human-readable tool name from the tool type
 * @param toolType - Tool type like "tool-readFile"
 * @returns Human-readable name like "Read File"
 */
export function getToolName(toolType: string): string {
	// Remove "tool-" prefix
	const withoutPrefix = toolType.replace(/^tool-/, "");

	// Convert camelCase to Title Case
	const titleCase = withoutPrefix
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (str) => str.toUpperCase())
		.trim();

	return titleCase;
}
