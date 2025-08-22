import type { z } from "zod";

import type { syncABTestBodySchema } from "./do/ab-test";
// Type-only imports for our schemas
import type {
	deleteKvBodySchema,
	getKvQuerySchema,
	insertKvBodySchema,
	listKvQuerySchema,
} from "./kv";

// Client type definitions that match hc() client expectations with full type safety
// Supports optional RequestInit parameter for headers and other fetch options

export type KVClientRoutes = {
	$post: (
		input: {
			json: z.infer<typeof insertKvBodySchema>;
		},
		init?: RequestInit,
	) => Promise<Response>;

	$get: (
		input: {
			query: z.infer<typeof getKvQuerySchema>;
		},
		init?: RequestInit,
	) => Promise<Response>;

	$delete: (
		input: {
			json: z.infer<typeof deleteKvBodySchema>;
		},
		init?: RequestInit,
	) => Promise<Response>;

	list: {
		$get: (
			input: {
				query: z.infer<typeof listKvQuerySchema>;
			},
			init?: RequestInit,
		) => Promise<Response>;
	};
};

export type ABTestClientRoutes = {
	sync: {
		":campaignId": {
			$post: (
				input: {
					json: z.infer<typeof syncABTestBodySchema>;
					param: { campaignId: string };
				},
				init?: RequestInit,
			) => Promise<Response>;
		};
	};
};

// Main client type that matches how hc() client structures the API
export type App = {
	kv: {
		assets: KVClientRoutes;
		cache: KVClientRoutes;
		domain: KVClientRoutes;
		campaign: KVClientRoutes;
	};
	do: {
		abtest: ABTestClientRoutes;
	};
};
