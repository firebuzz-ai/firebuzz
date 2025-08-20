// Utility function to get content type
export function getContentType(ext?: string): string {
	const types: Record<string, string> = {
		css: "text/css",
		js: "application/javascript",
		png: "image/png",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		gif: "image/gif",
		svg: "image/svg+xml",
		ico: "image/x-icon",
		woff: "font/woff",
		woff2: "font/woff2",
		ttf: "font/ttf",
		eot: "application/vnd.ms-fontobject",
	};

	return types[ext || ""] || "application/octet-stream";
}
