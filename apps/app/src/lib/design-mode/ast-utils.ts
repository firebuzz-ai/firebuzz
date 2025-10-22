/**
 * AST Utilities for Design Mode
 *
 * Uses Babel to parse, traverse, and modify JSX/TSX code.
 * Based on Lovable's approach for robust visual editing.
 */

import generate from "@babel/generator";
import { type ParseResult, parse } from "@babel/parser";
import traverse, { type NodePath } from "@babel/traverse";
import * as t from "@babel/types";

/**
 * Parse source code to AST
 */
export function parseSourceFile(code: string): ParseResult<t.File> {
	return parse(code, {
		sourceType: "module",
		plugins: ["jsx", "typescript", "decorators-legacy"],
	});
}

/**
 * Find JSX element node by line and column location
 * Uses fuzzy matching - looks for JSX elements on the same line first,
 * then expands search to nearby lines if exact match not found
 *
 * @param ast - Parsed AST
 * @param line - Line number (1-indexed)
 * @param column - Column number (0-indexed)
 * @returns NodePath to the JSX element, or null if not found
 */
export function findNodeByLocation(
	ast: ParseResult<t.File>,
	line: number,
	column: number,
): NodePath<t.JSXElement> | null {
	let exactMatch: NodePath<t.JSXElement> | null = null;
	const closeMatches: Array<{
		path: NodePath<t.JSXElement>;
		distance: number;
	}> = [];

	traverse(ast, {
		JSXElement(path) {
			const loc = path.node.loc;
			if (!loc) return;

			// Check for exact match (line and column)
			if (loc.start.line === line && loc.start.column === column) {
				exactMatch = path;
				path.stop();
				return;
			}

			// Collect close matches (same line, different column)
			if (loc.start.line === line) {
				const distance = Math.abs(loc.start.column - column);
				closeMatches.push({ path, distance });
			}

			// Also collect elements on nearby lines (within 2 lines)
			const lineDiff = Math.abs(loc.start.line - line);
			if (lineDiff > 0 && lineDiff <= 2) {
				const distance = lineDiff * 100 + Math.abs(loc.start.column - column);
				closeMatches.push({ path, distance });
			}
		},
	});

	// Return exact match if found
	if (exactMatch) {
		return exactMatch;
	}

	// Otherwise return closest match
	if (closeMatches.length > 0) {
		closeMatches.sort((a, b) => a.distance - b.distance);
		console.log(
			`[AST] No exact match at ${line}:${column}, using closest match at ${closeMatches[0].path.node.loc?.start.line}:${closeMatches[0].path.node.loc?.start.column}`,
		);
		return closeMatches[0].path;
	}

	return null;
}

/**
 * Update className attribute of a JSX element
 */
export function updateNodeClassName(
	nodePath: NodePath<t.JSXElement>,
	newClassName: string,
): void {
	const attributes = nodePath.node.openingElement.attributes;

	// Find existing className attribute
	const classNameAttrIndex = attributes.findIndex(
		(attr) =>
			t.isJSXAttribute(attr) &&
			t.isJSXIdentifier(attr.name) &&
			attr.name.name === "className",
	);

	const newAttribute = t.jsxAttribute(
		t.jsxIdentifier("className"),
		t.stringLiteral(newClassName),
	);

	if (classNameAttrIndex >= 0) {
		// Update existing className
		attributes[classNameAttrIndex] = newAttribute;
	} else {
		// Add new className attribute
		attributes.push(newAttribute);
	}
}

/**
 * Update text content of a JSX element
 * Only updates the first direct text node, preserving child elements
 * Example: <h1>Old Text<span>Keep Me</span>More Text</h1>
 * Becomes: <h1>New Text<span>Keep Me</span>More Text</h1>
 */
export function updateNodeTextContent(
	nodePath: NodePath<t.JSXElement>,
	newText: string,
): void {
	const children = nodePath.node.children;

	// Find first direct text node
	const firstTextIndex = children.findIndex((child) => t.isJSXText(child));

	if (firstTextIndex >= 0) {
		// Replace only the first text node, keep other children
		children[firstTextIndex] = t.jsxText(newText);
	} else {
		// No text nodes found, add at beginning
		children.unshift(t.jsxText(newText));
	}
}

/**
 * Update any attribute of a JSX element
 * @param nodePath - Path to JSX element
 * @param attrName - Attribute name (e.g., "src", "alt", "href")
 * @param value - New value
 */
export function updateNodeAttribute(
	nodePath: NodePath<t.JSXElement>,
	attrName: string,
	value: string,
): void {
	const attributes = nodePath.node.openingElement.attributes;

	// Find existing attribute
	const attrIndex = attributes.findIndex(
		(attr) =>
			t.isJSXAttribute(attr) &&
			t.isJSXIdentifier(attr.name) &&
			attr.name.name === attrName,
	);

	const newAttribute = t.jsxAttribute(
		t.jsxIdentifier(attrName),
		t.stringLiteral(value),
	);

	if (attrIndex >= 0) {
		// Update existing attribute
		attributes[attrIndex] = newAttribute;
	} else {
		// Add new attribute
		attributes.push(newAttribute);
	}
}

/**
 * Generate code from AST
 * @param ast - Parsed AST
 * @returns Generated code string
 */
export function generateCodeFromAST(ast: ParseResult<t.File>): string {
	const output = generate(
		ast,
		{
			retainLines: false, // Don't try to preserve line numbers (causes formatting issues)
			compact: false, // Use readable formatting
			comments: true, // Preserve comments
		},
		"",
	);

	return output.code;
}

/**
 * Parse elementId to extract file path, line, and column
 * @param elementId - Format: "/src/components/hero.tsx:40:12"
 * @returns Tuple of [filePath, line, column]
 */
export function parseElementId(elementId: string): [string, number, number] {
	const parts = elementId.split(":");
	const filePath = parts[0];
	const line = Number.parseInt(parts[1], 10);
	const column = Number.parseInt(parts[2], 10);

	return [filePath, line, column];
}
