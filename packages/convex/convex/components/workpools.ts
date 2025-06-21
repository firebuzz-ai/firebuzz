import { Workpool } from "@convex-dev/workpool";
import { components } from "../_generated/api";

export const cascadePool = new Workpool(components.cascadeOperations, {
	maxParallelism: 25,
});

export const batchDeleteStoragePool = new Workpool(
	components.batchDeleteStorage,
	{
		maxParallelism: 50,
	},
);

export const vectorizationPool = new Workpool(components.vectorization, {
	maxParallelism: 25,
	retryActionsByDefault: true,
	defaultRetryBehavior: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
});

export const summarizationPool = new Workpool(components.summarization, {
	maxParallelism: 25,
	retryActionsByDefault: true,
	defaultRetryBehavior: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
});
