export interface File {
	file: {
		contents: string;
	};
}

export interface Directory {
	directory: {
		[key: string]: FileSystemNode;
	};
}

export type FileSystemNode = File | Directory;

type RawFile = {
	file: {
		contents: string;
	};
};

type RawDirectory = {
	directory: RawDirectoryContent;
};

type RawNode = RawFile | RawDirectory;

type RawDirectoryContent = {
	[key: string]: RawNode;
};

export class FileSystem {
	private root: Directory["directory"];

	constructor(fsString: string) {
		const parsedData: unknown = JSON.parse(fsString);
		this.root = this.parseFileSystem(parsedData);
	}

	private parseFileSystem(data: unknown): Directory["directory"] {
		if (typeof data === "object" && data !== null) {
			if (
				"directory" in data &&
				typeof (data as RawDirectory).directory === "object"
			) {
				return this.parseDirectory((data as RawDirectory).directory);
			}
			if (!("directory" in data)) {
				return this.parseDirectory(data as RawDirectoryContent);
			}
		}
		throw new Error("Invalid file system string format.");
	}

	private parseDirectory(
		directoryData: RawDirectoryContent,
	): Directory["directory"] {
		const directory: Directory["directory"] = {};
		for (const key in directoryData) {
			if (Object.hasOwn(directoryData, key)) {
				const nodeData = directoryData[key];
				if (nodeData) {
					directory[key] = this.parseNode(nodeData);
				}
			}
		}
		return directory;
	}

	private parseNode(nodeData: RawNode): FileSystemNode {
		if (
			"file" in nodeData &&
			nodeData.file &&
			typeof nodeData.file.contents === "string"
		) {
			return {
				file: { contents: nodeData.file.contents },
			};
		}
		if (
			"directory" in nodeData &&
			nodeData.directory &&
			typeof nodeData.directory === "object"
		) {
			return {
				directory: this.parseDirectory(nodeData.directory),
			};
		}
		throw new Error("Invalid node structure.");
	}

	private findNode(path: string): {
		parent: Directory["directory"];
		node: FileSystemNode;
		name: string;
	} | null {
		const parts = path.split("/").filter((p) => p);
		if (parts.length === 0) return null;

		let current: Directory["directory"] = this.root;
		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i];
			if (!part) return null;
			const node = current[part];
			if (node && "directory" in node) {
				current = node.directory;
			} else {
				return null;
			}
		}

		const name = parts[parts.length - 1];
		if (!name) return null;
		const node = current[name];

		if (node) {
			return { parent: current, node, name };
		}

		return null;
	}

	private navigateTo(path: string): Directory["directory"] | null {
		if (path === "" || path === "/") return this.root;
		const parts = path.split("/").filter((p) => p);
		let current: Directory["directory"] = this.root;

		for (const part of parts) {
			const node = current[part];
			if (node && "directory" in node) {
				current = node.directory;
			} else {
				return null;
			}
		}
		return current;
	}

	createFile(path: string, contents: string): void {
		const parts = path.split("/").filter((p) => p);
		const fileName = parts.pop();
		if (!fileName) throw new Error("Invalid path: Must be a valid file name.");

		const dirPath = parts.join("/");
		const directory = this.navigateTo(dirPath);

		if (!directory) throw new Error(`Directory "${dirPath}" does not exist.`);
		if (directory[fileName])
			throw new Error(`File or directory at path "${path}" already exists.`);

		directory[fileName] = { file: { contents } };
	}

	createDirectory(path: string): void {
		const parts = path.split("/").filter((p) => p);
		const dirName = parts.pop();
		if (!dirName)
			throw new Error("Invalid path: Must be a valid directory name.");

		const parentPath = parts.join("/");
		const parentDir = this.navigateTo(parentPath);

		if (!parentDir)
			throw new Error(`Directory "${parentPath}" does not exist.`);
		if (parentDir[dirName])
			throw new Error(`File or directory at path "${path}" already exists.`);

		parentDir[dirName] = { directory: {} };
	}

	writeFile(path: string, newContents: string): void {
		const found = this.findNode(path);
		if (!found) throw new Error(`File "${path}" not found.`);

		const { node } = found;

		if ("file" in node) {
			node.file.contents = newContents;
		} else {
			throw new Error(`Path "${path}" is a directory, not a file.`);
		}
	}

	replaceInFile(path: string, search: string, replace: string): void {
		const found = this.findNode(path);
		if (!found) throw new Error(`File "${path}" not found.`);
		const { node } = found;

		if ("file" in node) {
			const searchRegExp = new RegExp(search, "g");
			node.file.contents = node.file.contents.replace(searchRegExp, replace);
		} else {
			throw new Error(`Path "${path}" is a directory, not a file.`);
		}
	}

	toString(): string {
		return JSON.stringify(this.root, null, 2);
	}
}
