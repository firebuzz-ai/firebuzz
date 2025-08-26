import { describe, expect, it } from "vitest";
import {
	detectCampaignEnvironment,
	detectEnvironment,
	isPreviewEnvironment,
} from "./environment";

describe("Environment Detection", () => {
	describe("detectCampaignEnvironment", () => {
		it("should detect preview environment for preview.frbzz.com", () => {
			expect(detectCampaignEnvironment("preview.frbzz.com")).toBe("preview");
			expect(detectCampaignEnvironment("PREVIEW.FRBZZ.COM")).toBe("preview");
		});

		it("should detect preview environment for preview-dev.frbzz.com", () => {
			expect(detectCampaignEnvironment("preview-dev.frbzz.com")).toBe(
				"preview",
			);
		});

		it("should detect preview environment for preview-preview.frbzz.com", () => {
			expect(detectCampaignEnvironment("preview-preview.frbzz.com")).toBe(
				"preview",
			);
		});

		it("should detect production environment for other domains", () => {
			expect(detectCampaignEnvironment("app.frbzz.com")).toBe("production");
			expect(detectCampaignEnvironment("custom-domain.com")).toBe("production");
			expect(detectCampaignEnvironment("localhost:3000")).toBe("production");
			expect(detectCampaignEnvironment("staging.frbzz.com")).toBe("production");
		});
	});

	describe("isPreviewEnvironment", () => {
		it("should return true for preview URLs", () => {
			expect(isPreviewEnvironment("preview.frbzz.com")).toBe(true);
			expect(isPreviewEnvironment("preview-dev.frbzz.com")).toBe(true);
			expect(isPreviewEnvironment("preview-preview.frbzz.com")).toBe(true);
		});

		it("should return false for production URLs", () => {
			expect(isPreviewEnvironment("app.frbzz.com")).toBe(false);
			expect(isPreviewEnvironment("custom-domain.com")).toBe(false);
		});
	});

	describe("detectEnvironment", () => {
		it("should use explicit environment variable when provided", () => {
			const mockEnv = { ENVIRONMENT: "dev" } as unknown as Env;
			const result = detectEnvironment("preview.frbzz.com", mockEnv);
			expect(result.environment).toBe("dev");
			expect(result.campaignEnvironment).toBe("preview");
		});

		it("should detect dev environment from hostname patterns", () => {
			const result = detectEnvironment("dev.frbzz.com");
			expect(result.environment).toBe("dev");
			expect(result.campaignEnvironment).toBe("production");
		});

		it("should detect preview environment from hostname patterns", () => {
			const result = detectEnvironment("preview.frbzz.com");
			expect(result.environment).toBe("preview");
			expect(result.campaignEnvironment).toBe("preview");
		});

		it("should default to production for unknown hostnames", () => {
			const result = detectEnvironment("unknown-domain.com");
			expect(result.environment).toBe("production");
			expect(result.campaignEnvironment).toBe("production");
		});

		it("should handle various environment variable formats", () => {
			expect(
				detectEnvironment("test.com", {
					ENVIRONMENT: "DEVELOPMENT",
				} as unknown as Env).environment,
			).toBe("dev");
			expect(
				detectEnvironment("test.com", {
					ENVIRONMENT: "preview",
				} as unknown as Env).environment,
			).toBe("preview");
			expect(
				detectEnvironment("test.com", {
					ENVIRONMENT: "PRODUCTION",
				} as unknown as Env).environment,
			).toBe("production");
			expect(
				detectEnvironment("test.com", {
					ENVIRONMENT: "staging",
				} as unknown as Env).environment,
			).toBe("preview");
		});
	});
});
