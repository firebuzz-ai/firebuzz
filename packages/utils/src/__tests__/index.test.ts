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
	getConvexHttpUrl,
	isValidUrlFormat,
	slugify,
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

describe("file size operations", () => {
	describe("formatFileSize", () => {
		it("should format file size in bytes", () => {
			expect(formatFileSize(1024)).toBe("1.0 KB");
			expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
			expect(formatFileSize(1024 * 1024 * 1024)).toBe("1.0 GB");
			expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe("1.0 TB");
		});
	});
});
