import hash from "hash-it";

import {
	differenceInHours,
	differenceInMinutes,
	differenceInSeconds,
	format,
	formatDistance,
	isToday,
} from "date-fns";
import { countriesAndLanguages } from "./constants";
export { AVATARS, countriesAndLanguages, TIMEZONES } from "./constants";

export const camelCase = (str: string) => {
	return str
		.toLowerCase()
		.replace(/(?:^\w|[A-Z\s]\w)/g, (word, index) => {
			return index === 0 ? word.toLowerCase() : word.toUpperCase();
		})
		.replace(/\s+/g, "");
};

export const capitalizeFirstLetter = (str: string) => {
	if (!str) return "";
	return str.charAt(0).toUpperCase() + str.slice(1);
};

export const capitalizeFirstLetterOfEachWord = (str: string) => {
	return str.split(" ").map(capitalizeFirstLetter).join(" ");
};

export const slugify = (str: string) => {
	return str
		.toLowerCase()
		.trim()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^a-z0-9\s_-]/g, "") // Already allows hyphens in input
		.replace(/([a-z])([0-9])/g, "$1-$2")
		.replace(/([0-9])([a-z])/g, "$1-$2")
		.replace(/([a-z])([A-Z])/g, "$1-$2")
		.replace(/[\s_]+/g, "-")
		.replace(/-{2,}/g, "-") // Only collapse multiple consecutive hyphens
		.replace(/^-+|-+$/g, "");
};

export const stripIndents = (
	arg0: string | TemplateStringsArray,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	...values: any[]
) => {
	function _stripIndents(value: string) {
		return value
			.split("\n")
			.map((line) => line.trim())
			.join("\n")
			.trimStart()
			.replace(/[\r\n]$/, "");
	}

	if (typeof arg0 !== "string") {
		const processedString = arg0
			.map((curr, i) => curr + (values[i] ?? ""))
			.join("");
		return _stripIndents(processedString);
	}

	return _stripIndents(arg0);
};

// Date Operations
export const formatToCalendarDate = (date: Date | string | number) => {
	return format(date, "yyyy-MM-dd");
};

export const formatToCalendarDateTime = (date: Date | string | number) => {
	return format(date, "yyyy-MM-dd HH:mm");
};

export const formatToCalendarDateTimeWithSeconds = (
	date: Date | string | number,
) => {
	return format(date, "yyyy-MM-dd HH:mm:ss");
};

export const formatToDateTime64 = (
	date: Date | string | number = new Date(),
) => {
	// Format for DateTime64(3, 'UTC') - ISO 8601 format with milliseconds
	const dateObj = new Date(date);
	return dateObj.toISOString(); // Returns: 2025-07-08T14:32:45.123Z
};

export const formatToInboxTime = (date: Date | string | number) => {
	// Check if the date is today
	if (isToday(date)) {
		return format(date, "h:mm a");
	}

	// Otherwise, format the date to "Mar 15"
	return format(date, "MMM d");
};

export const formatRelativeTimeShort = (date: Date | string | number) => {
	return formatDistance(date, new Date(), { includeSeconds: true });
};

export const calculateDurationInMinutes = (start: Date, end: Date) => {
	return differenceInMinutes(end, start);
};

export const calculateDurationInHours = (start: Date, end: Date) => {
	return differenceInHours(end, start);
};

export const calculateDurationInSeconds = (start: Date, end: Date) => {
	return differenceInSeconds(end, start);
};

// Number Operations
export const formatNumber = (num: number) => {
	return Intl.NumberFormat("en-US").format(num);
};

// File Operations
export const isMediaFile = (file: File) => {
	return (
		file.type.startsWith("image/") ||
		file.type.startsWith("video/") ||
		file.type.startsWith("audio/")
	);
};

export const isDocumentFile = (file: File) => {
	return !isMediaFile(file);
};

export const parseMediaFile = (
	file: File,
): {
	type: "image" | "video" | "audio";
	extension: string;
	size: number;
	contentType: string;
} => {
	return {
		type: file.type.startsWith("image/")
			? "image"
			: file.type.startsWith("video/")
				? "video"
				: "audio",
		extension: file.name.split(".").pop() ?? "unknown",
		size: file.size,
		contentType: file.type,
	};
};

interface ParsedDocumentFileResult {
	type: "pdf" | "docx" | "csv" | "md" | "html" | "txt" | "json" | "unknown";
	extension: string;
	size: number;
	contentType: string;
}

export const parseDocumentFile = (file: File): ParsedDocumentFileResult => {
	let type: ParsedDocumentFileResult["type"] = "unknown";

	switch (file.type) {
		case "application/pdf":
			type = "pdf";
			break;
		case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
			type = "docx";
			break;
		case "text/csv":
		case "application/csv":
			type = "csv";
			break;
		case "text/markdown":
			type = "md";
			break;
		case "text/html":
			type = "html";
			break;
		case "text/plain":
			type = "txt";
			break;
		case "application/json":
			type = "json";
			break;
	}
	return {
		type,
		extension: file.name.split(".").pop() ?? "unknown",
		size: file.size,
		contentType: file.type,
	};
};

export const getAttachmentType = (contentType: string) => {
	switch (contentType) {
		case "image/png":
		case "image/jpeg":
		case "image/jpg":
		case "image/gif":
		case "image/webp":
			return "image";
		case "video/mp4":
		case "video/webm":
		case "video/ogg":
			return "video";
		case "audio/mpeg":
		case "audio/mp3":
		case "audio/mpga":
		case "audio/m4a":
		case "audio/wav":
		case "audio/webm":
			return "audio";
		case "application/pdf":
			return "pdf";
		case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
			return "docx";
		case "application/json":
			return "json";
		case "text/html":
			return "html";
		case "text/csv":
		case "application/csv":
			return "csv";
		case "text/markdown":
			return "md";
		case "text/plain":
			return "txt";
		default:
			return "unknown";
	}
};

export const formatFileSize = (
	bytes: number,
	unit: "B" | "KB" | "MB" | "GB" = "MB",
	fixed = 2,
): string => {
	const unitMap = { B: 0, KB: 1, MB: 2, GB: 3 };
	const targetUnitIndex = unitMap[unit];
	let size = bytes;

	// Convert bytes to target unit
	for (let i = 0; i < targetUnitIndex; i++) {
		size /= 1024;
	}

	return size.toFixed(fixed);
};

// Convex
export const getConvexHttpUrl = (convexUrl: string) => {
	return convexUrl.replace(".convex.cloud", ".convex.site");
};

export const isValidUrlFormat = (url: string): boolean => {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
};

export const formatUrlWithProtocol = (url: string): string | null => {
	const urlWithProtocol = url.includes("://") ? url : `https://${url}`;

	if (isValidUrlFormat(urlWithProtocol)) return urlWithProtocol;

	return null;
};

export const sleep = (ms: number) => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Create a hash from a string for KV store keys
 * Uses a simple but effective djb2 hash algorithm
 * @param str - String to hash
 * @returns Hash as a number
 */
export const hashString = (str: string): number => {
	if (!str || typeof str !== "string") {
		throw new Error("String is required");
	}
	return hash(str);
};

/* Language Operations */
export const getAllLocales = () =>
	countriesAndLanguages
		.sort((a, b) => a.country.localeCompare(b.country))
		.flatMap((c) =>
			c.languages.map((l) => ({
				value: `${l.code}-${c.code}`,
				label1: `${c.country} - ${l.name}`,
				label2: `${l.code}-${c.code}`,
				keywords: [l.name, c.country],
			})),
		);

/* Color Operations */

/**
 * Convert hex color to HSL format expected by the server
 * @param hex - Hex color string (e.g., "#ff0000")
 * @returns HSL string in the format "0 100% 50%"
 */
export function hexToHsl(hex: string): string {
	// Remove # if present
	const cleanHex = hex.replace("#", "");

	// Parse hex to RGB
	const r = Number.parseInt(cleanHex.substring(0, 2), 16) / 255;
	const g = Number.parseInt(cleanHex.substring(2, 4), 16) / 255;
	const b = Number.parseInt(cleanHex.substring(4, 6), 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h: number;
	let s: number;
	const l = (max + min) / 2;

	if (max === min) {
		h = s = 0; // achromatic
	} else {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
			default:
				h = 0;
				break;
		}
		h /= 6;
	}

	// Convert to the format expected by the server: "h s% l%"
	const hue = Math.round(h * 360);
	const saturation = Math.round(s * 100);
	const lightness = Math.round(l * 100);

	return `${hue} ${saturation}% ${lightness}%`;
}

/**
 * Convert HSL format from server to hex color
 * @param hsl - HSL string in the format "0 100% 50%" or "0, 100%, 50%"
 * @returns Hex color string (e.g., "#ff0000")
 */
export function hslToHex(hsl: string): string {
	// Parse the HSL string - handle both "h s% l%" and "h, s%, l%" formats
	const values = hsl
		.replace(/%/g, "")
		.split(/[,\s]+/)
		.filter(Boolean);

	if (values.length !== 3) {
		console.warn("Invalid HSL format:", hsl);
		return "#000000";
	}

	const h = Number.parseInt(values[0] ?? "0") / 360;
	const s = Number.parseInt(values[1] ?? "0") / 100;
	const l = Number.parseInt(values[2] ?? "0") / 100;

	const hue2rgb = (p: number, q: number, t: number) => {
		let normalizedT = t;
		if (normalizedT < 0) normalizedT += 1;
		if (normalizedT > 1) normalizedT -= 1;
		if (normalizedT < 1 / 6) return p + (q - p) * 6 * normalizedT;
		if (normalizedT < 1 / 2) return q;
		if (normalizedT < 2 / 3) return p + (q - p) * (2 / 3 - normalizedT) * 6;
		return p;
	};

	let r: number;
	let g: number;
	let b: number;

	if (s === 0) {
		r = g = b = l; // achromatic
	} else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	const toHex = (c: number) => {
		const hex = Math.round(c * 255).toString(16);
		return hex.length === 1 ? `0${hex}` : hex;
	};

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Validate if a string is a valid hex color
 * @param hex - Hex color string
 * @returns Boolean indicating if hex is valid
 */
export function isValidHex(hex: string): boolean {
	return /^#([A-Fa-f0-9]{3}){1,2}$/.test(hex);
}

/**
 * Normalize hex color to 6-digit format
 * @param hex - Hex color string (3 or 6 digits)
 * @returns 6-digit hex color string
 */
export function normalizeHex(hex: string): string {
	const cleanHex = hex.replace("#", "");

	if (cleanHex.length === 3) {
		return `#${cleanHex
			.split("")
			.map((char) => `${char}${char}`)
			.join("")}`;
	}

	return `#${cleanHex}`;
}
