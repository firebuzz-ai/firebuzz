import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { Env } from "../../env";
import type { CampaignConfig, Segment, SegmentRule } from "./types";

const app = new Hono<{ Bindings: Env }>();

// Helper function to generate a random session ID
function generateSessionId(): string {
	const timestamp = Date.now().toString(36);
	const randomPart = Math.random().toString(36).substring(2, 15);
	return `${timestamp}-${randomPart}`;
}

// Visitor context interface
interface VisitorContext {
	source: string;
	medium: string;
	campaign: string;
	[key: string]: string | number | boolean | string[] | number[];
}

// Helper function to evaluate a single rule
function evaluateRule(rule: SegmentRule, context: VisitorContext): boolean {
	const { ruleType, operator, value } = rule;

	// Handle UTM source/medium rules (map utmSource -> source, utmMedium -> medium)
	if (
		ruleType === "source" ||
		ruleType === "medium" ||
		ruleType === "utmSource" ||
		ruleType === "utmMedium"
	) {
		// Map utmSource to source and utmMedium to medium for context lookup
		let contextKey = ruleType;
		if (ruleType === "utmSource") {
			contextKey = "source";
		} else if (ruleType === "utmMedium") {
			contextKey = "medium";
		}

		const contextValue = context[contextKey];

		console.log("[Rule Evaluation] Checking rule:", {
			ruleType,
			operator,
			value,
			contextValue,
			ruleLabel: rule.label,
		});

		// contextValue is string based on our VisitorContext interface
		// Handle missing context value
		if (!contextValue || contextValue === "") {
			// If no source/medium in context, rule doesn't match for positive operators
			const result =
				operator === "notEquals" ||
				operator === "notContains" ||
				operator === "notIn";
			console.log("[Rule Evaluation] No context value, returning:", result);
			return result;
		}

		// Type guard to ensure we're working with strings for string operations
		if (typeof contextValue !== "string") {
			console.log(
				"[Rule Evaluation] Context value is not a string, returning false",
			);
			return false;
		}

		let result = false;
		switch (operator) {
			case "equals":
				result = contextValue === value;
				break;
			case "notEquals":
				result = contextValue !== value;
				break;
			case "contains":
				// Ensure value is a string for contains operation
				if (typeof value !== "string") {
					console.log(
						"[Rule Evaluation] Value is not a string for contains operator",
					);
					return false;
				}
				result = contextValue.includes(value);
				break;
			case "notContains":
				// Ensure value is a string for contains operation
				if (typeof value !== "string") {
					console.log(
						"[Rule Evaluation] Value is not a string for notContains operator",
					);
					return false;
				}
				result = !contextValue.includes(value);
				break;
			case "in":
				// Check if value is an array and contains the context value
				if (!Array.isArray(value)) {
					console.log(
						"[Rule Evaluation] Value is not an array for in operator",
					);
					return false;
				}
				// Check each item in the array
				result = value.some((item) => item === contextValue);
				break;
			case "notIn":
				// Check if value is an array and doesn't contain the context value
				if (!Array.isArray(value)) {
					console.log(
						"[Rule Evaluation] Value is not an array for notIn operator",
					);
					return false;
				}
				result = !value.some((item) => item === contextValue);
				break;
			default:
				console.log("[Rule Evaluation] Unknown operator:", operator);
				return false;
		}

		console.log("[Rule Evaluation] Rule result:", result);
		return result;
	}

	// Handle visitorType rule - for now, treat "all" as always matching
	if (ruleType === "visitorType") {
		console.log("[Rule Evaluation] Checking visitorType rule:", {
			ruleType,
			operator,
			value,
			ruleLabel: rule.label,
		});

		// If value is "all", always return true
		if (value === "all") {
			console.log('[Rule Evaluation] Visitor type is "all", returning true');
			return true;
		}

		// For other visitor types, we'd need to implement proper detection
		// (e.g., "new" vs "returning" based on cookies/session)
		console.log(
			"[Rule Evaluation] Visitor type rule not fully implemented, returning true",
		);
		return true;
	}

	// For other rule types, return true for now (pass through)
	console.log(
		`[Rule Evaluation] Rule type ${ruleType} not handled, returning true`,
	);
	return true;
}

// Helper function to evaluate all rules in a segment
function evaluateSegment(segment: Segment, context: VisitorContext): boolean {
	console.log(
		`\n[Segment Evaluation] Checking segment: "${segment.title}" (ID: ${segment.id})`,
	);
	console.log(`[Segment Evaluation] Segment priority: ${segment.priority}`);
	console.log(`[Segment Evaluation] Number of rules: ${segment.rules.length}`);

	// All rules must pass (AND logic)
	const result = segment.rules.every((rule) => evaluateRule(rule, context));

	console.log(
		`[Segment Evaluation] Segment "${segment.title}" result: ${result}\n`,
	);
	return result;
}

// Helper function to find matching segment and get variant
function getVariantForVisitor(
	config: CampaignConfig,
	context: VisitorContext,
): string | undefined {
	console.log("\n========== VARIANT SELECTION START ==========");
	console.log("[Variant Selection] Visitor context:", context);
	console.log(`[Variant Selection] Total segments: ${config.segments.length}`);
	console.log(
		`[Variant Selection] Default variant ID: ${config.defaultVariantId}`,
	);

	// Segments are already sorted by priority (highest first)
	for (const segment of config.segments) {
		if (evaluateSegment(segment, context)) {
			// Segment matches! Return the appropriate variant
			console.log(`[Variant Selection] ✅ Segment matched: "${segment.title}"`);

			// If segment has a primary landing page, use it
			if (segment.primaryLandingPageId) {
				console.log(
					`[Variant Selection] Using primary landing page: ${segment.primaryLandingPageId}`,
				);
				console.log("========== VARIANT SELECTION END ==========\n");
				return segment.primaryLandingPageId;
			}

			// If segment has variants, pick the first one for now
			// (In production, you'd implement traffic splitting logic here)
			if (segment.variants && segment.variants.length > 0) {
				const variantId = segment.variants[0].landingPageId;
				console.log(`[Variant Selection] Using first variant: ${variantId}`);
				console.log("========== VARIANT SELECTION END ==========\n");
				return variantId;
			}

			// If segment has A/B tests, pick the first variant for now
			// (In production, you'd implement A/B test allocation logic here)
			if (segment.abTests && segment.abTests.length > 0) {
				const abTest = segment.abTests[0];
				if (abTest.variants.length > 0) {
					const variantId = abTest.variants[0].landingPageId;
					console.log(
						`[Variant Selection] Using first A/B test variant: ${variantId}`,
					);
					console.log("========== VARIANT SELECTION END ==========\n");
					return variantId;
				}
			}

			console.log("[Variant Selection] ⚠️ Segment matched but no variant found");
		}
	}

	// No matching segment found, use default variant
	console.log(
		`[Variant Selection] No matching segment found, using default variant: ${config.defaultVariantId}`,
	);
	console.log("========== VARIANT SELECTION END ==========\n");
	return config.defaultVariantId;
}

// Preview [Campaign]

// Config Route
app.get("/:id", async (c) => {
	const campaignId = c.req.param("id");

	const config = await c.env.CONFIG.get<CampaignConfig>(
		`campaign:preview:${campaignId}`,
		{
			type: "json",
		},
	);

	if (!config) {
		return c.text("Not found", 404);
	}

	// Log the entire config for debugging
	console.log("\n========== CAMPAIGN CONFIG ==========");
	console.log(JSON.stringify(config, null, 2));
	console.log("========== END CONFIG ==========\n");

	// Extract query parameters for source/medium tracking
	const url = new URL(c.req.url);
	const queryParams: Record<string, string> = {};
	url.searchParams.forEach((value, key) => {
		queryParams[key] = value;
	});

	// Build context for rule evaluation
	const visitorContext: VisitorContext = {
		// UTM parameters
		source: queryParams.utm_source || queryParams.source || "",
		medium: queryParams.utm_medium || queryParams.medium || "",
		campaign: queryParams.utm_campaign || queryParams.campaign || "",

		// Additional context can be added here
		// For example: device type, location, referrer, etc.
	};

	// Get the appropriate variant based on visitor context
	const selectedVariantId = getVariantForVisitor(config, visitorContext);

	if (!selectedVariantId) {
		return c.text("No variant found", 404);
	}

	// Fetch the HTML for the selected variant
	const getVariantHTML = async (variantId: string) => {
		const html = await c.env.ASSETS.get(`landing:preview:${variantId}`);
		return html;
	};

	const variantHTML = await getVariantHTML(selectedVariantId);

	if (!variantHTML) {
		return c.text("Variant not found", 404);
	}

	// Check for existing session ID in cookies
	let sessionId = getCookie(c, "firebuzz_session_id");

	// If no session ID exists, generate a new one
	if (!sessionId) {
		sessionId = generateSessionId();
	}

	// Set cookies with proper security settings
	// Session ID cookie - accessible on client but secure
	setCookie(c, "firebuzz_session_id", sessionId, {
		httpOnly: false, // Allow client-side access
		secure: true, // Only send over HTTPS in production
		sameSite: "Lax", // CSRF protection while allowing navigation
		maxAge: 60 * 60 * 24 * 30, // 30 days
		path: "/",
	});

	// Campaign ID cookie - also accessible on client
	setCookie(c, "firebuzz_campaign_id", campaignId, {
		httpOnly: false, // Allow client-side access
		secure: true, // Only send over HTTPS in production
		sameSite: "Lax", // CSRF protection
		maxAge: 60 * 60 * 24 * 7, // 7 days
		path: "/",
	});

	// Variant ID cookie - track which variant was served
	setCookie(c, "firebuzz_variant_id", selectedVariantId, {
		httpOnly: false, // Allow client-side access
		secure: true, // Only send over HTTPS in production
		sameSite: "Lax", // CSRF protection
		maxAge: 60 * 60 * 24 * 7, // 7 days
		path: "/",
	});

	// Store source/medium if present for attribution tracking
	if (visitorContext.source) {
		setCookie(c, "firebuzz_source", visitorContext.source, {
			httpOnly: false,
			secure: true,
			sameSite: "Lax",
			maxAge: 60 * 60 * 24 * 7, // 7 days
			path: "/",
		});
	}

	if (visitorContext.medium) {
		setCookie(c, "firebuzz_medium", visitorContext.medium, {
			httpOnly: false,
			secure: true,
			sameSite: "Lax",
			maxAge: 60 * 60 * 24 * 7, // 7 days
			path: "/",
		});
	}

	return c.html(variantHTML);
});

export { app as previewCampaignApp };
