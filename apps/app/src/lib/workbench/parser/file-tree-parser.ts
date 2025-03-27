import type { ParsedFile } from "./current-files-parser";

interface TreeNode {
	name: string;
	children: Map<string, TreeNode>;
	isFile: boolean;
}

export const generateFileTreeString = (
	files: Map<string, ParsedFile>,
): string => {
	// Why: Build tree structure first for easier traversal
	const buildTreeStructure = (files: Map<string, ParsedFile>): TreeNode => {
		const root: TreeNode = { name: ".", children: new Map(), isFile: false };

		for (const [path] of files) {
			const parts = path.split("/");
			let currentNode = root;

			for (const [index, part] of parts.entries()) {
				const isFile = index === parts.length - 1;

				if (!currentNode.children.has(part)) {
					currentNode.children.set(part, {
						name: part,
						children: new Map(),
						isFile,
					});
				}

				currentNode = currentNode.children.get(part)!;
			}
		}

		return root;
	};

	const renderTreeNode = (
		node: TreeNode,
		prefix = "",
		isLast = true,
	): string => {
		let result = prefix;

		if (node.name !== ".") {
			result += isLast ? "└── " : "├── ";
			result += `${node.name}\n`;
		} else {
			result += ".\n";
		}

		// Why: Sort directories first, then files alphabetically
		const children = Array.from(node.children.values()).sort((a, b) => {
			if (a.isFile === b.isFile) return a.name.localeCompare(b.name);
			return a.isFile ? 1 : -1;
		});

		children.forEach((child, index) => {
			const newPrefix =
				prefix + (node.name === "." ? "" : isLast ? "    " : "│   ");
			const isLastChild = index === children.length - 1;
			result += renderTreeNode(child, newPrefix, isLastChild);
		});

		return result;
	};

	const treeStructure = buildTreeStructure(files);
	return renderTreeNode(treeStructure);
};
