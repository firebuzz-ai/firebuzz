import { snapshot } from "@webcontainer/snapshot";
import type { NextRequest } from "next/server";
import * as fs from "node:fs/promises";
import path from "node:path";

// Define a type for our file system structure
interface FileContent {
	contents: string;
}

interface FileEntry {
	file: FileContent;
}

interface DirectoryEntry {
	directory: {
		[name: string]: FileSystemEntry;
	};
}

type FileSystemEntry = FileEntry | DirectoryEntry;

interface FileSystem {
	[path: string]: FileSystemEntry;
}

export async function GET(req: NextRequest) {
	const searchParams = req.nextUrl.searchParams;
	const slug = searchParams.get("slug");

	try {
		const targetPath = path.resolve(`../../templates/${slug}`);
		// We'll use the snapshot result for verification purposes
		await snapshot(targetPath);

		// Initialize root of file system structure
		const fileSystem: FileSystem = {};

		// Read the directory recursively
		async function readDirectory(dirPath: string, currentDir: FileSystem) {
			const entries = await fs.readdir(dirPath, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dirPath, entry.name);

				// Skip node_modules and other common directories to exclude
				if (
					entry.name === "node_modules" ||
					entry.name === "dist" ||
					entry.name === ".git" ||
					entry.name === ".gitignore" ||
					entry.name === ".DS_Store" ||
					entry.name === ".vscode" ||
					entry.name === "README.md"
				) {
					continue;
				}

				if (entry.isDirectory()) {
					// Create a new directory entry
					currentDir[entry.name] = {
						directory: {},
					};

					// Recursively process the directory
					await readDirectory(
						fullPath,
						(currentDir[entry.name] as DirectoryEntry).directory,
					);
				} else {
					try {
						const contents = await fs.readFile(fullPath, "utf-8");
						// Add file entry
						currentDir[entry.name] = {
							file: {
								contents,
							},
						};
					} catch (error) {
						console.error(`Error reading file ${fullPath}:`, error);
					}
				}
			}
		}

		await readDirectory(targetPath, fileSystem);

		return new Response(JSON.stringify(fileSystem), {
			headers: {
				"content-type": "application/json",
			},
		});
	} catch (error: unknown) {
		console.error("Snapshot error:", error);
		return new Response(
			JSON.stringify({
				success: false,
				error: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: {
					"content-type": "application/json",
				},
			},
		);
	}
}
