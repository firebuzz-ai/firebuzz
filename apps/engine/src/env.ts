import type { DurableObjectNamespace, KVNamespace } from '@cloudflare/workers-types';
import type ABTestDurableObject from './durable-objects/ab-test';

export interface Env {
	ASSETS: KVNamespace;
	CACHE: KVNamespace;
	CAMPAIGN: KVNamespace;
	DOMAIN_CONFIG: KVNamespace;
	SERVICE_TOKEN: string;
	CONVEX_HTTP_URL: string;
	// Cloudflare API credentials for custom hostname operations
	CLOUDFLARE_API_KEY: string;
	CLOUDFLARE_EMAIL: string;
	CLOUDFLARE_ZONE_ID: string;
	INNGEST_SIGNING_KEY: string;
	INNGEST_EVENT_KEY: string;
	INNGEST_BASE_URL: string;
	CLERK_SECRET_KEY: string;
	CLERK_PUBLISHABLE_KEY: string;
	// Durable Objects
	AB_TEST: DurableObjectNamespace<ABTestDurableObject>;
}
