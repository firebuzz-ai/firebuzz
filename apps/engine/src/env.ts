import type { KVNamespace } from "@cloudflare/workers-types";

export interface Env {
	ASSETS: KVNamespace;
	CACHE: KVNamespace;
	CONFIG: KVNamespace;
	SERVICE_TOKEN: string;
	// Cloudflare API credentials for custom hostname operations
	CLOUDFLARE_API_KEY: string;
	CLOUDFLARE_EMAIL: string;
	CLOUDFLARE_ZONE_ID: string;
}
