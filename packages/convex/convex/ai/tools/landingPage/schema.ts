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
});
