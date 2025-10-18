import { z } from "zod";

const errorSchema = z.object({
	message: z.string(),
});

// Tool result types (what tools return)
export const checkSandboxHealthResultSchema = z.object({
	healthy: z.boolean(),
	status: z.enum(["running", "pending", "failed", "stopped", "stopping"]),
	message: z.string(),
});

// DATA PARTS
export const dataPartSchema = z.object({
	"check-sandbox-health": z.object({
		health: z.enum(["healthy", "unhealthy"]).optional(),
		sandboxStatus: z
			.enum(["running", "pending", "failed", "stopped", "stopping"])
			.optional(),
		error: errorSchema.optional(),
	}),
	"read-file": z.object({
		success: z.boolean().optional(),
		content: z.string().optional(),
		error: errorSchema.optional(),
	}),
	grep: z.object({
		success: z.boolean().optional(),
		matches: z
			.array(
				z.object({
					file: z.string(),
					line: z.number(),
					content: z.string(),
				}),
			)
			.optional(),
		totalMatches: z.number().optional(),
		error: errorSchema.optional(),
	}),
	"write-files": z.object({
		success: z.boolean().optional(),
		filesWritten: z.number().optional(),
		error: errorSchema.optional(),
	}),
	"quick-edit": z.object({
		success: z.boolean().optional(),
		replacements: z.number().optional(),
		error: errorSchema.optional(),
	}),
	"run-command": z.object({
		success: z.boolean().optional(),
		exitCode: z.number().optional(),
		stdout: z.string().optional(),
		stderr: z.string().optional(),
		error: errorSchema.optional(),
	}),
	"save-landing-page-version": z.object({
		success: z.boolean().optional(),
		versionNumber: z.number().optional(),
		versionId: z.string().optional(),
		error: errorSchema.optional(),
	}),
	"list-landing-page-versions": z.object({
		success: z.boolean().optional(),
		versions: z
			.array(
				z.object({
					_id: z.string(),
					number: z.number(),
					commitMessage: z.string().optional(),
					_creationTime: z.number(),
				}),
			)
			.optional(),
		error: errorSchema.optional(),
	}),
	"preview-version-revert": z.object({
		success: z.boolean().optional(),
		filesChanged: z.number().optional(),
		filesAdded: z.number().optional(),
		filesDeleted: z.number().optional(),
		modified: z.array(z.string()).optional(),
		added: z.array(z.string()).optional(),
		deleted: z.array(z.string()).optional(),
		error: errorSchema.optional(),
	}),
	"revert-to-version": z.object({
		success: z.boolean().optional(),
		error: errorSchema.optional(),
	}),
	"create-todo-list": z.object({
		success: z.boolean().optional(),
		todos: z
			.array(
				z.object({
					id: z.string(),
					title: z.string(),
					description: z.string(),
					status: z.enum([
						"todo",
						"in-progress",
						"completed",
						"cancelled",
						"failed",
					]),
					createdAt: z.string(),
					order: z.number(),
				}),
			)
			.optional(),
		error: errorSchema.optional(),
	}),
	"update-todo-list": z.object({
		success: z.boolean().optional(),
		todos: z
			.array(
				z.object({
					id: z.string(),
					title: z.string(),
					description: z.string(),
					status: z.enum([
						"todo",
						"in-progress",
						"completed",
						"cancelled",
						"failed",
					]),
					createdAt: z.string(),
					order: z.number(),
				}),
			)
			.optional(),
		error: errorSchema.optional(),
	}),
	"upload-image-to-cdn": z.object({
		success: z.boolean().optional(),
		cdnUrl: z.string().optional(),
		key: z.string().optional(),
		mediaId: z.string().optional(),
		error: errorSchema.optional(),
	}),
	"generate-image": z.object({
		success: z.boolean(),
		cdnUrl: z.string().nullable(),
		key: z.string().nullable(),
		mediaId: z.string().nullable(),
		requestId: z.string().nullable(),
		model: z.string().nullable(),
		credits: z.number().nullable(),
		error: errorSchema.optional(),
	}),
	"edit-image": z.object({
		success: z.boolean(),
		cdnUrl: z.string().nullable(),
		key: z.string().nullable(),
		mediaId: z.string().nullable(),
		requestId: z.string().nullable(),
		model: z.string().nullable(),
		credits: z.number().nullable(),
		error: errorSchema.optional(),
	}),
	"take-website-snapshot": z.object({
		success: z.boolean().optional(),
		html: z.string().optional(),
		screenshotUrl: z.string().optional(),
		mediaId: z.string().optional(),
		url: z.string().optional(),
		analysis: z
			.object({
				sections: z.array(
					z.object({
						section: z.string(),
						content: z.string(),
						images: z.array(z.string()),
					}),
				),
				summary: z.string(),
				fonts: z.array(z.string()),
				colors: z.array(z.string()),
			})
			.optional(),
		error: errorSchema.optional(),
	}),
	"ask-to-website": z.object({
		success: z.boolean().optional(),
		answer: z.string().optional(),
		context: z.array(z.string()).optional(),
		error: errorSchema.optional(),
	}),
	"web-search": z.object({
		success: z.boolean().optional(),
		results: z
			.array(
				z.object({
					title: z.string(),
					url: z.string(),
					text: z.string(),
				}),
			)
			.optional(),
		error: errorSchema.optional(),
	}),
	"get-target-audiences": z.object({
		success: z.boolean().optional(),
		data: z
			.array(
				z.object({
					id: z.string(),
					name: z.string(),
					description: z.string(),
					gender: z.string(),
					age: z.string(),
					goals: z.string(),
					motivations: z.string(),
					frustrations: z.string(),
					terminologies: z.array(z.string()),
					avatar: z.string().optional(),
					updatedAt: z.string().optional(),
				}),
			)
			.optional(),
		pagination: z
			.object({
				hasMore: z.boolean(),
				cursor: z.string().nullable(),
				totalFetched: z.number(),
			})
			.optional(),
		error: errorSchema.optional(),
	}),
	"get-testimonials": z.object({
		success: z.boolean().optional(),
		data: z
			.array(
				z.object({
					id: z.string(),
					name: z.string(),
					avatar: z.string().optional(),
					title: z.string().optional(),
					content: z.string(),
					rating: z.number().optional(),
					updatedAt: z.string().optional(),
				}),
			)
			.optional(),
		pagination: z
			.object({
				hasMore: z.boolean(),
				cursor: z.string().nullable(),
				totalFetched: z.number(),
			})
			.optional(),
		error: errorSchema.optional(),
	}),
	"get-socials": z.object({
		success: z.boolean().optional(),
		data: z
			.array(
				z.object({
					id: z.string(),
					platform: z.string(),
					handle: z.string(),
					url: z.string(),
					updatedAt: z.string().optional(),
				}),
			)
			.optional(),
		pagination: z
			.object({
				hasMore: z.boolean(),
				cursor: z.string().nullable(),
				totalFetched: z.number(),
			})
			.optional(),
		error: errorSchema.optional(),
	}),
	"get-features-or-services": z.object({
		success: z.boolean().optional(),
		data: z
			.array(
				z.object({
					id: z.string(),
					name: z.string(),
					description: z.string(),
					benefits: z.string(),
					proof: z.string(),
					updatedAt: z.string().optional(),
				}),
			)
			.optional(),
		pagination: z
			.object({
				hasMore: z.boolean(),
				cursor: z.string().nullable(),
				totalFetched: z.number(),
			})
			.optional(),
		error: errorSchema.optional(),
	}),
	"get-form-schema": z.object({
		success: z.boolean().optional(),
		schema: z
			.array(
				z.object({
					id: z.string(),
					title: z.string(),
					placeholder: z.string().optional(),
					description: z.string().optional(),
					type: z.enum(["string", "number", "boolean"]),
					inputType: z.enum([
						"text",
						"number",
						"checkbox",
						"radio",
						"select",
						"textarea",
						"date",
						"time",
						"email",
						"url",
						"tel",
						"password",
					]),
					required: z.boolean(),
					unique: z.boolean(),
					visible: z.boolean(),
					default: z.union([z.string(), z.number(), z.boolean()]).optional(),
					options: z
						.array(
							z.object({
								label: z.string(),
								value: z.string(),
							}),
						)
						.optional(),
				}),
			)
			.optional(),
		submitButtonText: z.string().optional(),
		successMessage: z.string().optional(),
		successRedirectUrl: z.string().optional(),
		error: errorSchema.optional(),
	}),
	"image-attachment": z.object({
		cdnUrl: z.string(),
		mediaId: z.string(),
		mimeType: z.string(),
	}),
});
