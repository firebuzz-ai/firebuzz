import { describe, expect, it } from "vitest";
import {
	calculateDurationInHours,
	calculateDurationInMinutes,
	calculateDurationInSeconds,
	camelCase,
	capitalizeFirstLetter,
	capitalizeFirstLetterOfEachWord,
	formatFileSize,
	formatNumber,
	formatToCalendarDate,
	formatToCalendarDateTime,
	formatToCalendarDateTimeWithSeconds,
	formatUrlWithProtocol,
	getAllLocales,
	getAttachmentType,
	getConvexHttpUrl,
	hexToHsl,
	hslToHex,
	isDocumentFile,
	isMediaFile,
	isValidHex,
	isValidUrlFormat,
	normalizeHex,
	parseDocumentFile,
	parseMediaFile,
	slugify,
	stripIndents,
} from "../index";

describe("camelCase", () => {
	it("should convert space-separated words to camelCase", () => {
		const testCases = [
			{ input: "hello world", expected: "helloWorld" },
			{ input: "first name", expected: "firstName" },
			{ input: "this is a test", expected: "thisIsATest" },
			{ input: "UPPER CASE", expected: "upperCase" },
			{ input: "mixed CASE string", expected: "mixedCaseString" },
		];

		for (const { input, expected } of testCases) {
			expect(camelCase(input)).toBe(expected);
		}
	});
});

describe("capitalizeFirstLetter", () => {
	it("should capitalize the first letter of a string", () => {
		expect(capitalizeFirstLetter("hello")).toBe("Hello");
	});
});

describe("capitalizeFirstLetterOfEachWord", () => {
	it("should capitalize the first letter of each word in a string", () => {
		expect(capitalizeFirstLetterOfEachWord("hello world")).toBe("Hello World");
	});
});

describe("slugify", () => {
	it("should handle basic string conversion", () => {
		const testCases = [
			{ input: "hello world", expected: "hello-world" },
			{ input: "Hello World", expected: "hello-world" },
			{ input: "HELLO WORLD", expected: "hello-world" },
		];

		for (const { input, expected } of testCases) {
			expect(slugify(input)).toBe(expected);
		}
	});

	it("should handle special characters and diacritics", () => {
		const testCases = [
			{ input: "café & restaurant", expected: "cafe-restaurant" },
			{ input: "über öffnung", expected: "uber-offnung" },
			{ input: "piñata", expected: "pinata" },
			{ input: "garçon français", expected: "garcon-francais" },
			{ input: "!@#$%^&*()", expected: "" },
			{ input: "hello!!!world", expected: "helloworld" },
		];

		for (const { input, expected } of testCases) {
			expect(slugify(input)).toBe(expected);
		}
	});

	it("should handle whitespace and special formatting", () => {
		const testCases = [
			{ input: "   leading space", expected: "leading-space" },
			{ input: "trailing space   ", expected: "trailing-space" },
			{ input: "   both   sides   ", expected: "both-sides" },
			{ input: "multiple     spaces", expected: "multiple-spaces" },
			{ input: "under_score", expected: "under-score" },
			{ input: "multiple___underscores", expected: "multiple-underscores" },
		];

		for (const { input, expected } of testCases) {
			expect(slugify(input)).toBe(expected);
		}
	});

	it("should handle hyphens correctly", () => {
		const testCases = [
			{ input: "multiple---hyphens", expected: "multiple-hyphens" },
			{ input: "-leading-hyphen", expected: "leading-hyphen" },
			{ input: "trailing-hyphen-", expected: "trailing-hyphen" },
			{ input: "-both-sides-", expected: "both-sides" },
			{ input: "mixed---_--spaces", expected: "mixed-spaces" },
		];

		for (const { input, expected } of testCases) {
			expect(slugify(input)).toBe(expected);
		}
	});

	it("should handle numbers and mixed content", () => {
		const testCases = [
			{ input: "hello123world", expected: "hello-123-world" },
			{ input: "123 test", expected: "123-test" },
			{ input: "test 123", expected: "test-123" },
			{ input: "hello_123_world", expected: "hello-123-world" },
			{ input: "mix123-_&*#@!", expected: "mix-123" },
		];

		for (const { input, expected } of testCases) {
			expect(slugify(input)).toBe(expected);
		}
	});

	it("should handle edge cases", () => {
		const testCases = [
			{ input: "", expected: "" },
			{ input: " ", expected: "" },
			{ input: "-", expected: "" },
			{ input: "---", expected: "" },
			{ input: "___", expected: "" },
			{ input: "   ---___   ", expected: "" },
		];

		for (const { input, expected } of testCases) {
			expect(slugify(input)).toBe(expected);
		}
	});
});

describe("date operations", () => {
	const testDate = new Date("2024-03-15T14:30:45");

	describe("date formatting", () => {
		it("should format date to calendar date", () => {
			expect(formatToCalendarDate(testDate)).toBe("2024-03-15");
		});

		it("should format date to calendar date time", () => {
			expect(formatToCalendarDateTime(testDate)).toBe("2024-03-15 14:30");
		});

		it("should format date to calendar date time with seconds", () => {
			expect(formatToCalendarDateTimeWithSeconds(testDate)).toBe(
				"2024-03-15 14:30:45",
			);
		});
	});

	describe("duration calculations", () => {
		const startDate = new Date("2024-03-15T14:30:45");
		const endDate = new Date("2024-03-15T16:45:15");

		it("should calculate duration in minutes", () => {
			expect(calculateDurationInMinutes(startDate, endDate)).toBe(134);
		});

		it("should calculate duration in hours", () => {
			expect(calculateDurationInHours(startDate, endDate)).toBe(2);
		});

		it("should calculate duration in seconds", () => {
			expect(calculateDurationInSeconds(startDate, endDate)).toBe(8070);
		});

		it("should return negative duration when end date is before start date", () => {
			expect(calculateDurationInMinutes(endDate, startDate)).toBe(-134);
			expect(calculateDurationInHours(endDate, startDate)).toBe(-2);
			expect(calculateDurationInSeconds(endDate, startDate)).toBe(-8070);
		});
	});
});

describe("URL operations", () => {
	describe("getConvexHttpUrl", () => {
		it("should convert convex cloud URL to site URL", () => {
			expect(getConvexHttpUrl("https://happy-animal-123.convex.cloud")).toBe(
				"https://happy-animal-123.convex.site",
			);
			expect(getConvexHttpUrl("happy-animal-123.convex.cloud")).toBe(
				"happy-animal-123.convex.site",
			);
		});
	});

	describe("isValidUrlFormat", () => {
		it("should return true for valid URLs", () => {
			const validUrls = [
				"https://example.com",
				"http://localhost:3000",
				"https://sub.domain.com/path?query=123",
				"ftp://files.example.com",
			];

			for (const url of validUrls) {
				expect(isValidUrlFormat(url)).toBe(true);
			}
		});

		it("should return false for invalid URLs", () => {
			const invalidUrls = ["not-a-url", "https://", "", "example.com"];

			for (const url of invalidUrls) {
				expect(isValidUrlFormat(url)).toBe(false);
			}
		});
	});

	describe("formatUrlWithProtocol", () => {
		it("should return original URL if already valid", () => {
			const url = "https://example.com";
			expect(formatUrlWithProtocol(url)).toBe(url);
		});

		it("should add https protocol to valid domain names", () => {
			const testCases = [
				{ input: "example.com", expected: "https://example.com" },
				{ input: "sub.domain.com", expected: "https://sub.domain.com" },
			];

			for (const { input, expected } of testCases) {
				expect(formatUrlWithProtocol(input)).toBe(expected);
			}
		});

		it("should return null for invalid URLs", () => {
			const invalidUrls = ["not a url", "missing dot com", "", "http://"];

			for (const url of invalidUrls) {
				expect(formatUrlWithProtocol(url)).toBe(null);
			}
		});
	});
});
describe("number operations", () => {
	describe("numberWithCommas", () => {
		it("should format number with commas", () => {
			expect(formatNumber(123456789)).toBe("123,456,789");
		});
	});
});

describe("language operations", () => {
	describe("getAllLocales", () => {
		it("should return locales as an array of objects", () => {
			const locales = getAllLocales();
			expect(locales).toBeInstanceOf(Array);
			expect(locales[0]).toBeInstanceOf(Object);
			expect(locales[0]).toHaveProperty("value");
			expect(locales[0]).toHaveProperty("label1");
			expect(locales[0]).toHaveProperty("label2");
			expect(locales[0]).toHaveProperty("keywords");
		});
	});
});

describe("stripIndents", () => {
	it("should handle regular strings", () => {
		const input = `
		  Hello
			World
			  Test
		`;
		expect(stripIndents(input)).toBe("Hello\nWorld\nTest");
	});

	it("should handle template literals with interpolation", () => {
		const name = "World";
		const age = 42;
		const result = stripIndents`
		  Hello ${name}
			Your age is ${age}
			  Nice to meet you
		`;
		expect(result).toBe("Hello World\nYour age is 42\nNice to meet you");
	});

	it("should handle single line input", () => {
		const input = "    Hello World    ";
		expect(stripIndents(input)).toBe("Hello World");
	});

	it("should handle empty lines", () => {
		const input = `
		  First line

			Second line
			  
		  Last line
		`;
		expect(stripIndents(input)).toBe("First line\n\nSecond line\n\nLast line");
	});

	it("should handle input with only whitespace", () => {
		const input = "    \n    \n    ";
		expect(stripIndents(input)).toBe("");
	});

	it("should preserve inline spaces", () => {
		const input = `
		  Hello   World
			Multiple   Spaces   Here
		`;
		expect(stripIndents(input)).toBe("Hello   World\nMultiple   Spaces   Here");
	});
});

describe("formatFileSize", () => {
	it("should format bytes to MB (default)", () => {
		const testCases = [
			{ input: 1048576, expected: "1.00" }, // 1MB
			{ input: 2097152, expected: "2.00" }, // 2MB
			{ input: 5242880, expected: "5.00" }, // 5MB
			{ input: 1572864, expected: "1.50" }, // 1.5MB
		];

		for (const { input, expected } of testCases) {
			expect(formatFileSize(input)).toBe(expected);
		}
	});

	it("should format bytes to specified units", () => {
		const testCases = [
			{ input: 1024, unit: "KB" as const, expected: "1.00" },
			{ input: 1048576, unit: "MB" as const, expected: "1.00" },
			{ input: 1073741824, unit: "GB" as const, expected: "1.00" },
			{ input: 2048, unit: "B" as const, expected: "2048.00" },
		];

		for (const { input, unit, expected } of testCases) {
			expect(formatFileSize(input, unit)).toBe(expected);
		}
	});

	it("should respect fixed decimal places", () => {
		const testCases = [
			{ input: 1572864, fixed: 0, expected: "2" }, // 1.5MB rounded
			{ input: 1572864, fixed: 1, expected: "1.5" }, // 1.5MB
			{ input: 1572864, fixed: 3, expected: "1.500" }, // 1.5MB
		];

		for (const { input, fixed, expected } of testCases) {
			expect(formatFileSize(input, "MB", fixed)).toBe(expected);
		}
	});

	it("should handle small numbers", () => {
		const testCases = [
			{ input: 100, unit: "B" as const, expected: "100.00" },
			{ input: 10, unit: "KB" as const, expected: "0.01" },
			{ input: 51200, unit: "MB" as const, expected: "0.05" },
		];

		for (const { input, unit, expected } of testCases) {
			expect(formatFileSize(input, unit)).toBe(expected);
		}
	});
});

describe("file operations", () => {
	// Mock File class for testing since we're in Node environment
	class MockFile {
		name: string;
		type: string;
		size: number;

		constructor(name: string, type: string, size: number) {
			this.name = name;
			this.type = type;
			this.size = size;
		}
	}

	describe("isMediaFile", () => {
		it("should identify image files as media files", () => {
			const imageFile = new MockFile(
				"image.jpg",
				"image/jpeg",
				1024,
			) as unknown as File;
			expect(isMediaFile(imageFile)).toBe(true);
		});

		it("should identify video files as media files", () => {
			const videoFile = new MockFile(
				"video.mp4",
				"video/mp4",
				1024,
			) as unknown as File;
			expect(isMediaFile(videoFile)).toBe(true);
		});

		it("should identify audio files as media files", () => {
			const audioFile = new MockFile(
				"audio.mp3",
				"audio/mp3",
				1024,
			) as unknown as File;
			expect(isMediaFile(audioFile)).toBe(true);
		});

		it("should not identify document files as media files", () => {
			const docFile = new MockFile(
				"document.pdf",
				"application/pdf",
				1024,
			) as unknown as File;
			expect(isMediaFile(docFile)).toBe(false);
		});
	});

	describe("isDocumentFile", () => {
		it("should identify document files correctly", () => {
			const docFile = new MockFile(
				"document.pdf",
				"application/pdf",
				1024,
			) as unknown as File;
			expect(isDocumentFile(docFile)).toBe(true);
		});

		it("should not identify media files as document files", () => {
			const imageFile = new MockFile(
				"image.jpg",
				"image/jpeg",
				1024,
			) as unknown as File;
			expect(isDocumentFile(imageFile)).toBe(false);
		});
	});

	describe("parseMediaFile", () => {
		it("should parse image file correctly", () => {
			const imageFile = new MockFile(
				"test.jpg",
				"image/jpeg",
				1024,
			) as unknown as File;
			const result = parseMediaFile(imageFile);

			expect(result).toEqual({
				type: "image",
				extension: "jpg",
				size: 1024,
				contentType: "image/jpeg",
			});
		});

		it("should parse video file correctly", () => {
			const videoFile = new MockFile(
				"test.mp4",
				"video/mp4",
				2048,
			) as unknown as File;
			const result = parseMediaFile(videoFile);

			expect(result).toEqual({
				type: "video",
				extension: "mp4",
				size: 2048,
				contentType: "video/mp4",
			});
		});

		it("should parse audio file correctly", () => {
			const audioFile = new MockFile(
				"test.mp3",
				"audio/mp3",
				512,
			) as unknown as File;
			const result = parseMediaFile(audioFile);

			expect(result).toEqual({
				type: "audio",
				extension: "mp3",
				size: 512,
				contentType: "audio/mp3",
			});
		});

		it("should handle files without extension", () => {
			const audioFile = new MockFile(
				"audiofile",
				"audio/mp3",
				512,
			) as unknown as File;
			const result = parseMediaFile(audioFile);

			expect(result.extension).toBe("audiofile");
		});
	});

	describe("parseDocumentFile", () => {
		it("should parse PDF file correctly", () => {
			const pdfFile = new MockFile(
				"document.pdf",
				"application/pdf",
				1024,
			) as unknown as File;
			const result = parseDocumentFile(pdfFile);

			expect(result).toEqual({
				type: "pdf",
				extension: "pdf",
				size: 1024,
				contentType: "application/pdf",
			});
		});

		it("should parse DOC file correctly", () => {
			const docFile = new MockFile(
				"document.doc",
				"application/msword",
				2048,
			) as unknown as File;
			const result = parseDocumentFile(docFile);

			expect(result).toEqual({
				type: "doc",
				extension: "doc",
				size: 2048,
				contentType: "application/msword",
			});
		});

		it("should parse DOCX file correctly", () => {
			const docxFile = new MockFile(
				"document.docx",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				3072,
			) as unknown as File;
			const result = parseDocumentFile(docxFile);

			expect(result).toEqual({
				type: "docx",
				extension: "docx",
				size: 3072,
				contentType:
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			});
		});

		it("should parse XLS file correctly", () => {
			const xlsFile = new MockFile(
				"spreadsheet.xls",
				"application/vnd.ms-excel",
				4096,
			) as unknown as File;
			const result = parseDocumentFile(xlsFile);

			expect(result).toEqual({
				type: "xls",
				extension: "xls",
				size: 4096,
				contentType: "application/vnd.ms-excel",
			});
		});

		it("should parse XLSX file correctly", () => {
			const xlsxFile = new MockFile(
				"spreadsheet.xlsx",
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				5120,
			) as unknown as File;
			const result = parseDocumentFile(xlsxFile);

			expect(result).toEqual({
				type: "xlsx",
				extension: "xlsx",
				size: 5120,
				contentType:
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});
		});

		it("should parse PPT file correctly", () => {
			const pptFile = new MockFile(
				"presentation.ppt",
				"application/vnd.ms-powerpoint",
				6144,
			) as unknown as File;
			const result = parseDocumentFile(pptFile);

			expect(result).toEqual({
				type: "ppt",
				extension: "ppt",
				size: 6144,
				contentType: "application/vnd.ms-powerpoint",
			});
		});

		it("should parse CSV file correctly", () => {
			const csvFile = new MockFile(
				"data.csv",
				"application/csv",
				512,
			) as unknown as File;
			const result = parseDocumentFile(csvFile);

			expect(result).toEqual({
				type: "csv",
				extension: "csv",
				size: 512,
				contentType: "application/csv",
			});
		});

		it("should handle unknown file types", () => {
			const unknownFile = new MockFile(
				"unknown.xyz",
				"application/unknown",
				768,
			) as unknown as File;
			const result = parseDocumentFile(unknownFile);

			expect(result.type).toBe("unknown");
		});

		it("should handle files without extension", () => {
			const pdfFile = new MockFile(
				"document",
				"application/pdf",
				1024,
			) as unknown as File;
			const result = parseDocumentFile(pdfFile);

			expect(result.extension).toBe("document");
		});
	});

	describe("getAttachmentType", () => {
		it("should identify image content types", () => {
			const imageTypes = [
				"image/png",
				"image/jpeg",
				"image/jpg",
				"image/gif",
				"image/webp",
			];

			for (const type of imageTypes) {
				expect(getAttachmentType(type)).toBe("image");
			}
		});

		it("should identify video content types", () => {
			const videoTypes = ["video/mp4", "video/webm", "video/ogg"];

			for (const type of videoTypes) {
				expect(getAttachmentType(type)).toBe("video");
			}
		});

		it("should identify audio content types", () => {
			const audioTypes = [
				"audio/mpeg",
				"audio/mp3",
				"audio/mpga",
				"audio/m4a",
				"audio/wav",
				"audio/webm",
			];

			for (const type of audioTypes) {
				expect(getAttachmentType(type)).toBe("audio");
			}
		});

		it("should identify PDF content type", () => {
			expect(getAttachmentType("application/pdf")).toBe("pdf");
		});

		it("should return 'unknown' for unrecognized content types", () => {
			const unknownTypes = [
				"application/json",
				"custom/type",
				"application/octet-stream",
				"text/xml",
			];

			for (const type of unknownTypes) {
				expect(getAttachmentType(type)).toBe("unknown");
			}
		});
	});
});

describe("color operations", () => {
	describe("hexToHsl", () => {
		it("should convert red hex to HSL", () => {
			expect(hexToHsl("#ff0000")).toBe("0 100% 50%");
			expect(hexToHsl("ff0000")).toBe("0 100% 50%");
		});

		it("should convert green hex to HSL", () => {
			expect(hexToHsl("#00ff00")).toBe("120 100% 50%");
		});

		it("should convert blue hex to HSL", () => {
			expect(hexToHsl("#0000ff")).toBe("240 100% 50%");
		});

		it("should convert white hex to HSL", () => {
			expect(hexToHsl("#ffffff")).toBe("0 0% 100%");
		});

		it("should convert black hex to HSL", () => {
			expect(hexToHsl("#000000")).toBe("0 0% 0%");
		});

		it("should convert gray hex to HSL", () => {
			expect(hexToHsl("#808080")).toBe("0 0% 50%");
		});

		it("should handle various shades", () => {
			expect(hexToHsl("#ff8080")).toBe("0 100% 75%");
			expect(hexToHsl("#80ff80")).toBe("120 100% 75%");
			expect(hexToHsl("#8080ff")).toBe("240 100% 75%");
		});

		it("should handle dark colors", () => {
			expect(hexToHsl("#800000")).toBe("0 100% 25%");
			expect(hexToHsl("#008000")).toBe("120 100% 25%");
			expect(hexToHsl("#000080")).toBe("240 100% 25%");
		});
	});

	describe("hslToHex", () => {
		it("should convert red HSL to hex", () => {
			expect(hslToHex("0 100% 50%")).toBe("#ff0000");
		});

		it("should convert green HSL to hex", () => {
			expect(hslToHex("120 100% 50%")).toBe("#00ff00");
		});

		it("should convert blue HSL to hex", () => {
			expect(hslToHex("240 100% 50%")).toBe("#0000ff");
		});

		it("should convert white HSL to hex", () => {
			expect(hslToHex("0 0% 100%")).toBe("#ffffff");
		});

		it("should convert black HSL to hex", () => {
			expect(hslToHex("0 0% 0%")).toBe("#000000");
		});

		it("should convert gray HSL to hex", () => {
			expect(hslToHex("0 0% 50%")).toBe("#808080");
		});

		it("should handle comma-separated format", () => {
			expect(hslToHex("0, 100%, 50%")).toBe("#ff0000");
			expect(hslToHex("120, 100%, 50%")).toBe("#00ff00");
			expect(hslToHex("240, 100%, 50%")).toBe("#0000ff");
		});

		it("should handle invalid HSL format", () => {
			expect(hslToHex("invalid")).toBe("#000000");
			expect(hslToHex("")).toBe("#000000");
			expect(hslToHex("100")).toBe("#000000");
			expect(hslToHex("100 50%")).toBe("#000000");
		});

		it("should handle edge cases", () => {
			expect(hslToHex("360 100% 50%")).toBe("#ff0000"); // 360 degrees = 0 degrees
			expect(hslToHex("0 0% 50%")).toBe("#808080"); // No saturation = gray
		});
	});

	describe("isValidHex", () => {
		it("should validate correct 6-digit hex colors", () => {
			const validHexColors = [
				"#000000",
				"#ffffff",
				"#ff0000",
				"#00ff00",
				"#0000ff",
				"#123456",
				"#abcdef",
				"#ABCDEF",
				"#AbCdEf",
			];

			for (const hex of validHexColors) {
				expect(isValidHex(hex)).toBe(true);
			}
		});

		it("should validate correct 3-digit hex colors", () => {
			const validHexColors = [
				"#000",
				"#fff",
				"#f00",
				"#0f0",
				"#00f",
				"#123",
				"#abc",
				"#ABC",
				"#AbC",
			];

			for (const hex of validHexColors) {
				expect(isValidHex(hex)).toBe(true);
			}
		});

		it("should reject invalid hex colors", () => {
			const invalidHexColors = [
				"000000", // Missing #
				"#ff", // Too short
				"#ffff", // Invalid length
				"#fffff", // Invalid length
				"#fffffff", // Too long
				"#gggggg", // Invalid characters
				"#ff00zz", // Invalid characters
				"", // Empty string
				"#", // Just #
				"rgb(255, 0, 0)", // Not hex format
				"red", // Color name
			];

			for (const hex of invalidHexColors) {
				expect(isValidHex(hex)).toBe(false);
			}
		});
	});

	describe("normalizeHex", () => {
		it("should expand 3-digit hex to 6-digit", () => {
			expect(normalizeHex("#000")).toBe("#000000");
			expect(normalizeHex("#fff")).toBe("#ffffff");
			expect(normalizeHex("#f00")).toBe("#ff0000");
			expect(normalizeHex("#0f0")).toBe("#00ff00");
			expect(normalizeHex("#00f")).toBe("#0000ff");
			expect(normalizeHex("#123")).toBe("#112233");
			expect(normalizeHex("#abc")).toBe("#aabbcc");
		});

		it("should handle 3-digit hex without #", () => {
			expect(normalizeHex("000")).toBe("#000000");
			expect(normalizeHex("fff")).toBe("#ffffff");
			expect(normalizeHex("f00")).toBe("#ff0000");
		});

		it("should return 6-digit hex unchanged", () => {
			expect(normalizeHex("#000000")).toBe("#000000");
			expect(normalizeHex("#ffffff")).toBe("#ffffff");
			expect(normalizeHex("#ff0000")).toBe("#ff0000");
			expect(normalizeHex("#123456")).toBe("#123456");
		});

		it("should handle 6-digit hex without #", () => {
			expect(normalizeHex("000000")).toBe("#000000");
			expect(normalizeHex("ffffff")).toBe("#ffffff");
			expect(normalizeHex("ff0000")).toBe("#ff0000");
		});

		it("should handle mixed case", () => {
			expect(normalizeHex("#AbC")).toBe("#AAbbCC");
			expect(normalizeHex("#AbCdEf")).toBe("#AbCdEf");
		});
	});

	describe("hex to HSL to hex round trip", () => {
		it("should maintain color accuracy in round trip conversions", () => {
			const testColors = [
				"#ff0000", // Red
				"#00ff00", // Green
				"#0000ff", // Blue
				"#ffffff", // White
				"#000000", // Black
				"#808080", // Gray
				"#ffff00", // Yellow
				"#ff00ff", // Magenta
				"#00ffff", // Cyan
			];

			for (const originalHex of testColors) {
				const hsl = hexToHsl(originalHex);
				const convertedHex = hslToHex(hsl);
				expect(convertedHex.toLowerCase()).toBe(originalHex.toLowerCase());
			}
		});
	});

	describe("HSL to hex to HSL round trip", () => {
		it("should maintain color accuracy in round trip conversions", () => {
			const testHSLColors = [
				"0 100% 50%", // Red
				"120 100% 50%", // Green
				"240 100% 50%", // Blue
				"0 0% 100%", // White
				"0 0% 0%", // Black
				"0 0% 50%", // Gray
				"60 100% 50%", // Yellow
				"300 100% 50%", // Magenta
				"180 100% 50%", // Cyan
			];

			for (const originalHsl of testHSLColors) {
				const hex = hslToHex(originalHsl);
				const convertedHsl = hexToHsl(hex);
				expect(convertedHsl).toBe(originalHsl);
			}
		});
	});
});
