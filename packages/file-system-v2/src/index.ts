import { extractTar, packTar } from "./tar-utils";
import type { FileSystemEntry, FileTreeNode } from "./types";

export class TarFileSystem {
	private files: Map<string, FileSystemEntry>;

	private constructor(files: Map<string, FileSystemEntry>) {
		this.files = files;
	}

	/**
	 * Load tar from buffer
	 */
	static async fromTar(tarBuffer: Buffer): Promise<TarFileSystem> {
		const files = await extractTar(tarBuffer);
		return new TarFileSystem(files);
	}

	/**
	 * Load tar from URL
	 */
	static async fromUrl(url: string): Promise<TarFileSystem> {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(
				`Failed to fetch tar from ${url}: ${response.statusText}`,
			);
		}
		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		return TarFileSystem.fromTar(buffer);
	}

	/**
	 * Normalize path (remove leading/trailing slashes)
	 */
	private normalizePath(path: string): string {
		return path.replace(/^\/+|\/+$/g, "");
	}

	/**
	 * Check if path exists
	 */
	exists(path: string): boolean {
		const normalized = this.normalizePath(path);
		return this.files.has(normalized);
	}

	/**
	 * Check if path is a file
	 */
	isFile(path: string): boolean {
		const normalized = this.normalizePath(path);
		const entry = this.files.get(normalized);
		return entry?.type === "file";
	}

	/**
	 * Check if path is a directory
	 */
	isDirectory(path: string): boolean {
		const normalized = this.normalizePath(path);
		const entry = this.files.get(normalized);
		return entry?.type === "directory";
	}

	/**
	 * Read file content as string
	 */
	readFile(path: string): string {
		const normalized = this.normalizePath(path);
		const entry = this.files.get(normalized);

		if (!entry) {
			throw new Error(`File not found: ${path}`);
		}

		if (entry.type !== "file") {
			throw new Error(`Path is not a file: ${path}`);
		}

		return entry.content.toString("utf-8");
	}

	/**
	 * Write to file (create or update)
	 */
	writeFile(path: string, content: string): void {
		const normalized = this.normalizePath(path);

		// Ensure parent directories exist
		this.ensureParentDirectories(normalized);

		this.files.set(normalized, {
			type: "file",
			content: Buffer.from(content, "utf-8"),
		});
	}

	/**
	 * Create new file (throws if exists)
	 */
	createFile(path: string, content: string): void {
		const normalized = this.normalizePath(path);

		if (this.files.has(normalized)) {
			throw new Error(`File already exists: ${path}`);
		}

		// Ensure parent directories exist
		this.ensureParentDirectories(normalized);

		this.files.set(normalized, {
			type: "file",
			content: Buffer.from(content, "utf-8"),
		});
	}

	/**
	 * Replace text in file (supports regex)
	 */
	replaceInFile(path: string, search: string, replace: string): void {
		const content = this.readFile(path);
		const regex = new RegExp(search, "g");
		const newContent = content.replace(regex, replace);
		this.writeFile(path, newContent);
	}

	/**
	 * Delete file
	 */
	deleteFile(path: string): void {
		const normalized = this.normalizePath(path);

		if (!this.isFile(normalized)) {
			throw new Error(`Not a file: ${path}`);
		}

		this.files.delete(normalized);
	}

	/**
	 * Create directory
	 */
	createDirectory(path: string): void {
		const normalized = this.normalizePath(path);

		if (this.files.has(normalized)) {
			throw new Error(`Path already exists: ${path}`);
		}

		// Ensure parent directories exist
		this.ensureParentDirectories(normalized);

		this.files.set(normalized, {
			type: "directory",
		});
	}

	/**
	 * Delete directory (recursive)
	 */
	deleteDirectory(path: string): void {
		const normalized = this.normalizePath(path);

		if (!this.isDirectory(normalized)) {
			throw new Error(`Not a directory: ${path}`);
		}

		// Delete the directory itself
		this.files.delete(normalized);

		// Delete all children (files and subdirectories)
		const prefix = `${normalized}/`;
		for (const [filePath] of this.files) {
			if (filePath.startsWith(prefix)) {
				this.files.delete(filePath);
			}
		}
	}

	/**
	 * Ensure parent directories exist
	 */
	private ensureParentDirectories(path: string): void {
		const parts = path.split("/");
		parts.pop(); // Remove file name

		let currentPath = "";
		for (const part of parts) {
			if (!part) continue;
			currentPath = currentPath ? `${currentPath}/${part}` : part;

			if (!this.files.has(currentPath)) {
				this.files.set(currentPath, {
					type: "directory",
				});
			}
		}
	}

	/**
	 * List all files (full paths)
	 */
	listFiles(): string[] {
		const files: string[] = [];
		for (const [path, entry] of this.files) {
			if (entry.type === "file") {
				files.push(path);
			}
		}
		return files.sort();
	}

	/**
	 * List files in directory (names only, not full paths)
	 */
	listDirectory(path: string): string[] {
		const normalized = this.normalizePath(path);

		if (normalized && !this.isDirectory(normalized)) {
			throw new Error(`Not a directory: ${path}`);
		}

		const prefix = normalized ? `${normalized}/` : "";
		const items = new Set<string>();

		for (const [filePath] of this.files) {
			// Skip if not in this directory
			if (!filePath.startsWith(prefix)) continue;

			// Get relative path
			const relativePath = filePath.slice(prefix.length);

			// Skip if empty or if it's a nested path
			if (!relativePath || relativePath.includes("/")) continue;

			items.add(relativePath);
		}

		return Array.from(items).sort();
	}

	/**
	 * Export to tar buffer
	 */
	async toTar(): Promise<Buffer> {
		return packTar(this.files);
	}

	/**
	 * Get file tree structure for debugging
	 */
	getTree(): FileTreeNode {
		const root: FileTreeNode = {
			name: "/",
			type: "directory",
			children: [],
		};

		// Build tree structure
		const dirMap = new Map<string, FileTreeNode>();
		dirMap.set("", root);

		// Sort paths to ensure parents come before children
		const sortedPaths = Array.from(this.files.keys()).sort();

		for (const path of sortedPaths) {
			const entry = this.files.get(path);
			if (!entry) continue;

			const parts = path.split("/");
			const name = parts[parts.length - 1];
			if (!name) continue; // Skip if no name

			const parentPath = parts.slice(0, -1).join("/");

			const node: FileTreeNode = {
				name,
				type: entry.type,
			};

			if (entry.type === "file") {
				node.size = entry.content.length;
			} else {
				node.children = [];
			}

			// Add to parent
			const parent = dirMap.get(parentPath);
			if (parent?.children) {
				parent.children.push(node);
			}

			// If directory, add to map for children
			if (entry.type === "directory") {
				dirMap.set(path, node);
			}
		}

		return root;
	}
}

export type { FileTreeNode } from "./types";
