import { Readable } from "node:stream";
import { extract, type Headers, pack } from "tar-stream";
import type { FileSystemEntry } from "./types";

/**
 * Extract tar buffer into a Map of file paths to entries
 */
export async function extractTar(
	tarBuffer: Buffer,
): Promise<Map<string, FileSystemEntry>> {
	const files = new Map<string, FileSystemEntry>();
	const extractor = extract();

	return new Promise((resolve, reject) => {
		extractor.on("entry", (header: Headers, stream, next) => {
			const chunks: Buffer[] = [];

			stream.on("data", (chunk: Buffer) => {
				chunks.push(chunk);
			});

			stream.on("end", () => {
				const content = Buffer.concat(chunks);

				if (header.type === "file") {
					files.set(header.name, {
						type: "file",
						content,
					});
				} else if (header.type === "directory") {
					files.set(header.name, {
						type: "directory",
					});
				}

				next();
			});

			stream.resume();
		});

		extractor.on("finish", () => {
			resolve(files);
		});

		extractor.on("error", (err) => {
			reject(err);
		});

		// Pipe the buffer to the extractor
		Readable.from(tarBuffer).pipe(extractor);
	});
}

/**
 * Pack a Map of files into a tar buffer
 */
export async function packTar(
	files: Map<string, FileSystemEntry>,
): Promise<Buffer> {
	const packer = pack();
	const chunks: Buffer[] = [];

	packer.on("data", (chunk: Buffer) => {
		chunks.push(chunk);
	});

	return new Promise((resolve, reject) => {
		packer.on("end", () => {
			resolve(Buffer.concat(chunks));
		});

		packer.on("error", (err) => {
			reject(err);
		});

		// Add all files to the tar
		for (const [path, entry] of files) {
			if (entry.type === "file") {
				packer.entry(
					{
						name: path,
						type: "file",
						size: entry.content.length,
					},
					entry.content,
				);
			} else if (entry.type === "directory") {
				packer.entry({
					name: path,
					type: "directory",
				});
			}
		}

		packer.finalize();
	});
}
