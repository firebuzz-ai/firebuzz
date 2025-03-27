// ... existing code ...

import type { FileSystemTree } from "@webcontainer/api";

export interface ParsedFile {
	path: string;
	content: string;
	extension: string;
}

export const parseFileSystemTree = (
	tree: FileSystemTree,
	basePath = "",
): Map<string, ParsedFile> => {
	const files = new Map<string, ParsedFile>();

	// Why: Recursively traverse the file system tree to extract all files
	const traverse = (node: FileSystemTree, currentPath: string) => {
		for (const [name, item] of Object.entries(node)) {
			const newPath = currentPath ? `${currentPath}/${name}` : name;

			if ("directory" in item) {
				traverse(item.directory, newPath);
			} else if ("file" in item && !("symlink" in item.file)) {
				const content = item.file.contents;
				// Why: Skip binary files as they can't be parsed as string
				if (content instanceof Uint8Array) continue;

				const extension = name.includes(".") ? name.split(".").pop() || "" : "";

				files.set(newPath, {
					path: newPath,
					content,
					extension,
				});
			}
		}
	};

	traverse(tree, basePath);
	return files;
};
