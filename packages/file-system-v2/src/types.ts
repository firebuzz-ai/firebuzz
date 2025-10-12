export interface FileTreeNode {
	name: string;
	type: "file" | "directory";
	size?: number;
	children?: FileTreeNode[];
}

export interface FileEntry {
	type: "file";
	content: Buffer;
}

export interface DirectoryEntry {
	type: "directory";
}

export type FileSystemEntry = FileEntry | DirectoryEntry;
