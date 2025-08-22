import type { DurableObjectNamespace, KVNamespace, Queue } from '@cloudflare/workers-types';
import type ABTestDurableObject from './durable-objects/ab-test';

export interface Env {
	// KV Namespaces
	ASSETS: KVNamespace;
	CACHE: KVNamespace;
	CAMPAIGN: KVNamespace;
	DOMAIN_CONFIG: KVNamespace;

	// Environment Configuration
	ENVIRONMENT: 'development' | 'preview' | 'production';

	// Service Tokens & API Keys
	SERVICE_TOKEN: string;
	CONVEX_HTTP_URL: string;
	CLOUDFLARE_EMAIL: string;
	CLOUDFLARE_API_KEY: string;
	CLOUDFLARE_ZONE_ID: string;
	INNGEST_SIGNING_KEY: string;
	INNGEST_EVENT_KEY: string;
	INNGEST_BASE_URL: string;
	TINYBIRD_TOKEN: string;
	TINYBIRD_BASE_URL: string;
	CLERK_PUBLISHABLE_KEY: string;
	CLERK_SECRET_KEY: string;

	// Durable Objects
	AB_TEST: DurableObjectNamespace<ABTestDurableObject>;

	// Queues
	SESSION_QUEUE: Queue;
}
