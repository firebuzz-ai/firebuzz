import type {
	ABTestNodeData,
	SegmentNodeData,
	TrafficNodeData,
	ValidationItem,
	ValidationResult,
	VariantNodeData,
} from "@firebuzz/shared-types/campaign";
import { ConvexError, v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { internalQuery, query } from "../../_generated/server";
import { getCurrentUserWithWorkspace } from "../users/utils";

interface ValidationContext {
	nodes: Doc<"campaigns">["nodes"];
	edges: Doc<"campaigns">["edges"];
	campaign: Doc<"campaigns">;
	landingPages: Doc<"landingPages">[];
	hasValidFormSchema?: boolean;
}

// Traffic Node Validation Rules
const validateTrafficNode = (
	node: Doc<"campaigns">["nodes"][number],
	context: ValidationContext,
): ValidationItem[] => {
	const validations: ValidationItem[] = [];
	const data = node.data as TrafficNodeData;

	// Always require default landing page if landing pages exist
	if (!data.defaultLandingPageId) {
		if (context.landingPages.length > 0) {
			validations.push({
				id: "traffic-default-landing-page",
				isValid: false,
				message: "Default landing page must be selected",
				severity: "error",
				field: "defaultLandingPageId",
			});
		} else {
			// Check if it's a lead-generation campaign without form schema first
			const message =
				context.campaign.type === "lead-generation" &&
				!context.hasValidFormSchema
					? "Campaign must have a valid form schema"
					: "Create a landing page first";
			validations.push({
				id: "traffic-no-landing-pages",
				isValid: false,
				message,
				severity: "error",
				field: "defaultLandingPageId",
			});
		}
	} else {
		// Check if selected landing page exists and is published
		const selectedLandingPage = context.landingPages.find(
			(lp) => lp._id === data.defaultLandingPageId,
		);
		if (!selectedLandingPage) {
			// Landing page was deleted
			validations.push({
				id: "traffic-landing-page-deleted",
				isValid: false,
				message: "Selected landing page has been deleted",
				severity: "error",
				field: "defaultLandingPageId",
			});
		} else if (selectedLandingPage.status !== "published") {
			// Landing page exists but is not published
			validations.push({
				id: "traffic-landing-page-not-published",
				isValid: false,
				message: "Selected landing page must be published",
				severity: "error",
				field: "defaultLandingPageId",
			});
		}
	}

	return validations;
};

// Segment Node Validation Rules
const validateSegmentNode = (
	node: Doc<"campaigns">["nodes"][number],
	context: ValidationContext,
): ValidationItem[] => {
	const validations: ValidationItem[] = [];
	const data = node.data as SegmentNodeData;

	// Always require landing page for segment nodes
	if (!data.primaryLandingPageId) {
		if (context.landingPages.length > 0) {
			validations.push({
				id: "segment-landing-page",
				isValid: false,
				message: "Landing page must be selected for this segment",
				severity: "error",
				field: "primaryLandingPageId",
			});
		} else {
			// Check if it's a lead-generation campaign without form schema first
			const message =
				context.campaign.type === "lead-generation" &&
				!context.hasValidFormSchema
					? "Campaign must have a valid form schema"
					: "Create a landing page first";
			validations.push({
				id: "segment-no-landing-pages",
				isValid: false,
				message,
				severity: "error",
				field: "primaryLandingPageId",
			});
		}
	} else {
		// Check if selected landing page exists and is published
		const selectedLandingPage = context.landingPages.find(
			(lp) => lp._id === data.primaryLandingPageId,
		);
		if (!selectedLandingPage) {
			// Landing page was deleted
			validations.push({
				id: "segment-landing-page-deleted",
				isValid: false,
				message: "Selected landing page has been deleted",
				severity: "error",
				field: "primaryLandingPageId",
			});
		} else if (selectedLandingPage.status !== "published") {
			// Landing page exists but is not published
			validations.push({
				id: "segment-landing-page-not-published",
				isValid: false,
				message: "Selected landing page must be published",
				severity: "error",
				field: "primaryLandingPageId",
			});
		}
	}

	// Info validation for rules
	if (!data.rules || data.rules.length === 0) {
		validations.push({
			id: "segment-has-rules",
			isValid: false,
			message: "Consider adding targeting rules to this segment",
			severity: "info",
			field: "rules",
		});
	}

	return validations;
};

// A/B Test Node Validation Rules
const validateABTestNode = (
	node: Doc<"campaigns">["nodes"][number],
	context: ValidationContext,
): ValidationItem[] => {
	const validations: ValidationItem[] = [];
	const data = node.data as ABTestNodeData;

	// Count variant nodes connected to this A/B test
	const variantCount = context.nodes.filter(
		(n) => n.type === "variant" && n.parentId === node.id,
	).length;

	if (variantCount < 2) {
		validations.push({
			id: "abtest-min-variants",
			isValid: false,
			message: "A/B test requires at least 2 variants",
			severity: "error",
			field: "variants",
		});
	}

	// Hypothesis validation
	if (!data.hypothesis || data.hypothesis.trim().length <= 10) {
		validations.push({
			id: "abtest-hypothesis",
			isValid: false,
			message: "Hypothesis should be clearly defined",
			severity: "warning",
			field: "hypothesis",
		});
	}

	// Primary metric validation
	if (!data.primaryMetric) {
		validations.push({
			id: "abtest-primary-metric",
			isValid: false,
			message: "Primary metric must be selected",
			severity: "error",
			field: "primaryMetric",
		});
	}

	// Traffic distribution validation
	const variantNodes = context.nodes.filter(
		(n) => n.type === "variant" && n.parentId === node.id,
	);

	if (variantNodes.length > 0) {
		const totalPercentage = variantNodes.reduce((sum, variant) => {
			const variantData = variant.data as VariantNodeData;
			return sum + (variantData.trafficPercentage || 0);
		}, 0);

		// Allow small rounding errors (99.9 - 100.1)
		if (Math.abs(totalPercentage - 100) >= 0.2) {
			validations.push({
				id: "abtest-traffic-distribution",
				isValid: false,
				message: "Variant traffic distribution must total 100%",
				severity: "error",
				field: "trafficDistribution",
			});
		}
	}

	// Completion criteria validation
	if (
		!data.completionCriteria?.sampleSizePerVariant &&
		!data.completionCriteria?.testDuration
	) {
		validations.push({
			id: "abtest-completion-criteria",
			isValid: false,
			message: "Define completion criteria for the test",
			severity: "warning",
			field: "completionCriteria",
		});
	}

	return validations;
};

// Variant Node Validation Rules
const validateVariantNode = (
	node: Doc<"campaigns">["nodes"][number],
	context: ValidationContext,
): ValidationItem[] => {
	const validations: ValidationItem[] = [];
	const data = node.data as VariantNodeData;

	// Always require landing page for variant nodes
	if (!data.variantId) {
		if (context.landingPages.length > 0) {
			validations.push({
				id: "variant-landing-page",
				isValid: false,
				message: "Landing page must be selected for this variant",
				severity: "error",
				field: "variantId",
			});
		} else {
			// Check if it's a lead-generation campaign without form schema first
			const message =
				context.campaign.type === "lead-generation" &&
				!context.hasValidFormSchema
					? "Campaign must have a valid form schema"
					: "Create a landing page first";
			validations.push({
				id: "variant-no-landing-pages",
				isValid: false,
				message,
				severity: "error",
				field: "variantId",
			});
		}
	} else {
		// Check if selected landing page exists and is published
		const selectedLandingPage = context.landingPages.find(
			(lp) => lp._id === data.variantId,
		);
		if (!selectedLandingPage) {
			// Landing page was deleted
			validations.push({
				id: "variant-landing-page-deleted",
				isValid: false,
				message: "Selected landing page has been deleted",
				severity: "error",
				field: "variantId",
			});
		} else if (selectedLandingPage.status !== "published") {
			// Landing page exists but is not published
			validations.push({
				id: "variant-landing-page-not-published",
				isValid: false,
				message: "Selected landing page must be published",
				severity: "error",
				field: "variantId",
			});
		}
	}

	// Traffic percentage validation
	if (
		data.trafficPercentage === undefined ||
		data.trafficPercentage < 0 ||
		data.trafficPercentage > 100
	) {
		validations.push({
			id: "variant-traffic-percentage",
			isValid: false,
			message: "Traffic percentage must be between 0 and 100",
			severity: "error",
			field: "trafficPercentage",
		});
	}

	return validations;
};

// Main validation function for a single node
const validateNode = (
	node: Doc<"campaigns">["nodes"][number],
	context: ValidationContext,
): ValidationItem[] => {
	switch (node.type) {
		case "traffic":
			return validateTrafficNode(node, context);
		case "segment":
			return validateSegmentNode(node, context);
		case "ab-test":
			return validateABTestNode(node, context);
		case "variant":
			return validateVariantNode(node, context);
		default:
			return [];
	}
};

// Validate all nodes in a campaign
export const validateCampaignNodes = (
	context: ValidationContext,
): ValidationResult[] => {
	const results: ValidationResult[] = [];

	for (const node of context.nodes) {
		// Skip placeholder nodes
		if (node.id.includes("placeholder")) continue;
		// Skip note nodes as they don't need validation
		if (node.type === "note") continue;

		const validations = validateNode(node, context);

		// Only include nodes with validation issues
		if (validations.length > 0) {
			// Type-safe access to node data title
			let nodeTitle = "Untitled";
			if (node.type === "traffic") {
				nodeTitle = (node.data as TrafficNodeData).title;
			} else if (node.type === "segment") {
				nodeTitle = (node.data as SegmentNodeData).title;
			} else if (node.type === "ab-test") {
				nodeTitle = (node.data as ABTestNodeData).title;
			} else if (node.type === "variant") {
				nodeTitle = (node.data as VariantNodeData).title;
			}

			results.push({
				nodeId: node.id,
				nodeType: node.type || "unknown",
				nodeTitle,
				validations,
			});
		}
	}

	return results;
};

// Helper function to check if campaign is valid for publishing
export const canPublishCampaign = (
	context: ValidationContext,
): { canPublish: boolean; errors: ValidationResult[] } => {
	const results = validateCampaignNodes(context);

	// Filter only error-level validations
	const errors = results
		.map((result) => ({
			...result,
			validations: result.validations.filter(
				(v) => !v.isValid && v.severity === "error",
			),
		}))
		.filter((result) => result.validations.length > 0);

	return {
		canPublish: errors.length === 0,
		errors,
	};
};

export const getCampaignValidation = query({
	args: {
		campaignId: v.id("campaigns"),
	},
	handler: async (ctx, args) => {
		const user = await getCurrentUserWithWorkspace(ctx);

		const campaign = await ctx.db.get(args.campaignId);
		if (!campaign) {
			return null;
		}

		if (campaign.workspaceId !== user.currentWorkspaceId) {
			throw new ConvexError("Unauthorized");
		}

		// Get landing pages for the campaign (excluding deleted ones)
		const landingPages = await ctx.db
			.query("landingPages")
			.withIndex("by_campaign_id", (q) => q.eq("campaignId", args.campaignId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.collect();

		// Initialize critical errors array
		const criticalErrors: ValidationItem[] = [];

		// Check form schema status for lead-generation campaigns
		let hasValidFormSchema = true; // Default to true for non-lead-generation campaigns

		// Critical Error 1: For lead-generation campaigns, check form requirements (Priority 1)
		if (campaign.type === "lead-generation") {
			// Get the form for this campaign
			const form = await ctx.db
				.query("forms")
				.withIndex("by_campaign_id", (q) => q.eq("campaignId", args.campaignId))
				.first();

			if (!form) {
				hasValidFormSchema = false;
				criticalErrors.push({
					id: "campaign-no-form",
					isValid: false,
					message: "Campaign must have a valid form schema",
					severity: "error",
					field: "form",
					priority: 1,
				});
			} else {
				// Check if form has at least one field in canvas nodes
				const formNode = form.nodes?.find(
					(node) => node.type === "form" && node.data,
				);
				const hasFields =
					formNode?.data.schema?.length && formNode.data.schema.length > 0;

				if (!hasFields) {
					hasValidFormSchema = false;
					criticalErrors.push({
						id: "campaign-form-no-fields",
						isValid: false,
						message: "Campaign must have a valid form schema",
						severity: "error",
						field: "formSchema",
						priority: 1,
					});
				}
			}
		}

		// Critical Error 2: Check if campaign has at least one landing page (Priority 2)
		// Only show this error if form schema is valid (or not required)
		if (landingPages.length === 0 && hasValidFormSchema) {
			criticalErrors.push({
				id: "campaign-no-landing-pages",
				isValid: false,
				message: "Create a landing page first",
				severity: "error",
				field: "landingPages",
				priority: 2,
			});
		}

		// Create validation context
		const context: ValidationContext = {
			nodes: campaign.nodes,
			edges: campaign.edges,
			campaign,
			landingPages,
			hasValidFormSchema,
		};

		// Get all validation results
		const allResults = validateCampaignNodes(context);

		// Check if campaign can be published
		const { canPublish, errors } = canPublishCampaign(context);

		// Calculate summary
		let totalErrors = 0;
		let totalWarnings = 0;
		let totalInfo = 0;

		for (const result of allResults) {
			for (const validation of result.validations) {
				if (!validation.isValid) {
					switch (validation.severity) {
						case "error":
							totalErrors++;
							break;
						case "warning":
							totalWarnings++;
							break;
						case "info":
							totalInfo++;
							break;
					}
				}
			}
		}

		// Group issues by severity
		const errors_ = allResults
			.map((result) => ({
				...result,
				validations: result.validations.filter(
					(v) => !v.isValid && v.severity === "error",
				),
			}))
			.filter((result) => result.validations.length > 0);

		const warnings = allResults
			.map((result) => ({
				...result,
				validations: result.validations.filter(
					(v) => !v.isValid && v.severity === "warning",
				),
			}))
			.filter((result) => result.validations.length > 0);

		const info = allResults
			.map((result) => ({
				...result,
				validations: result.validations.filter(
					(v) => !v.isValid && v.severity === "info",
				),
			}))
			.filter((result) => result.validations.length > 0);

		// Sort critical errors by priority (lower number = higher priority)
		const sortedCriticalErrors = criticalErrors.sort(
			(a, b) => (a.priority || 999) - (b.priority || 999),
		);

		// Include critical errors in totals and publish check
		const totalCriticalErrors = sortedCriticalErrors.length;
		const canPublishWithCritical = canPublish && totalCriticalErrors === 0;

		return {
			validationResults: allResults,
			criticalErrors: sortedCriticalErrors, // Campaign-level critical errors sorted by priority
			canPublish: canPublishWithCritical,
			publishErrors: errors,
			summary: {
				totalErrors: totalErrors + totalCriticalErrors,
				totalWarnings,
				totalInfo,
				totalCriticalErrors,
				hasErrors: totalErrors > 0 || totalCriticalErrors > 0,
				hasIssues:
					totalErrors > 0 || totalWarnings > 0 || totalCriticalErrors > 0,
				hasCriticalErrors: totalCriticalErrors > 0,
			},
			issuesBySeverity: {
				critical: criticalErrors, // Add critical errors as separate category
				errors: errors_,
				warnings,
				info,
			},
		};
	},
});

export const getCampaignValidationInternal = internalQuery({
	args: {
		campaignId: v.id("campaigns"),
	},
	handler: async (ctx, args) => {
		const campaign = await ctx.db.get(args.campaignId);
		if (!campaign) {
			return null;
		}

		// Get landing pages for the campaign (excluding deleted ones)
		const landingPages = await ctx.db
			.query("landingPages")
			.withIndex("by_campaign_id", (q) => q.eq("campaignId", args.campaignId))
			.filter((q) => q.eq(q.field("deletedAt"), undefined))
			.collect();

		// Initialize critical errors array
		const criticalErrors: ValidationItem[] = [];

		// Check form schema status for lead-generation campaigns
		let hasValidFormSchema = true; // Default to true for non-lead-generation campaigns

		// Critical Error 1: For lead-generation campaigns, check form requirements (Priority 1)
		if (campaign.type === "lead-generation") {
			// Get the form for this campaign
			const form = await ctx.db
				.query("forms")
				.withIndex("by_campaign_id", (q) => q.eq("campaignId", args.campaignId))
				.first();

			if (!form) {
				hasValidFormSchema = false;
				criticalErrors.push({
					id: "campaign-no-form",
					isValid: false,
					message: "Campaign must have a valid form schema",
					severity: "error",
					field: "form",
					priority: 1,
				});
			} else {
				// Check if form has at least one field in canvas nodes
				const formNode = form.nodes?.find(
					(node) => node.type === "form" && node.data,
				);
				const hasFields =
					formNode?.data.schema?.length && formNode.data.schema.length > 0;

				if (!hasFields) {
					hasValidFormSchema = false;
					criticalErrors.push({
						id: "campaign-form-no-fields",
						isValid: false,
						message: "Campaign must have a valid form schema",
						severity: "error",
						field: "formSchema",
						priority: 1,
					});
				}
			}
		}

		// Critical Error 2: Check if campaign has at least one landing page (Priority 2)
		// Only show this error if form schema is valid (or not required)
		if (landingPages.length === 0 && hasValidFormSchema) {
			criticalErrors.push({
				id: "campaign-no-landing-pages",
				isValid: false,
				message: "Create a landing page first",
				severity: "error",
				field: "landingPages",
				priority: 2,
			});
		}

		// Create validation context
		const context: ValidationContext = {
			nodes: campaign.nodes,
			edges: campaign.edges,
			campaign,
			landingPages,
			hasValidFormSchema,
		};

		// Get all validation results
		const allResults = validateCampaignNodes(context);

		// Check if campaign can be published
		const { canPublish, errors } = canPublishCampaign(context);

		// Calculate summary
		let totalErrors = 0;
		let totalWarnings = 0;
		let totalInfo = 0;

		for (const result of allResults) {
			for (const validation of result.validations) {
				if (!validation.isValid) {
					switch (validation.severity) {
						case "error":
							totalErrors++;
							break;
						case "warning":
							totalWarnings++;
							break;
						case "info":
							totalInfo++;
							break;
					}
				}
			}
		}

		// Group issues by severity
		const errors_ = allResults
			.map((result) => ({
				...result,
				validations: result.validations.filter(
					(v) => !v.isValid && v.severity === "error",
				),
			}))
			.filter((result) => result.validations.length > 0);

		const warnings = allResults
			.map((result) => ({
				...result,
				validations: result.validations.filter(
					(v) => !v.isValid && v.severity === "warning",
				),
			}))
			.filter((result) => result.validations.length > 0);

		const info = allResults
			.map((result) => ({
				...result,
				validations: result.validations.filter(
					(v) => !v.isValid && v.severity === "info",
				),
			}))
			.filter((result) => result.validations.length > 0);

		// Sort critical errors by priority (lower number = higher priority)
		const sortedCriticalErrors = criticalErrors.sort(
			(a, b) => (a.priority || 999) - (b.priority || 999),
		);

		// Include critical errors in totals and publish check
		const totalCriticalErrors = sortedCriticalErrors.length;
		const canPublishWithCritical = canPublish && totalCriticalErrors === 0;

		return {
			validationResults: allResults,
			criticalErrors: sortedCriticalErrors, // Campaign-level critical errors sorted by priority
			canPublish: canPublishWithCritical,
			publishErrors: errors,
			summary: {
				totalErrors: totalErrors + totalCriticalErrors,
				totalWarnings,
				totalInfo,
				totalCriticalErrors,
				hasErrors: totalErrors > 0 || totalCriticalErrors > 0,
				hasIssues:
					totalErrors > 0 || totalWarnings > 0 || totalCriticalErrors > 0,
				hasCriticalErrors: totalCriticalErrors > 0,
			},
			issuesBySeverity: {
				critical: criticalErrors, // Add critical errors as separate category
				errors: errors_,
				warnings,
				info,
			},
		};
	},
});
