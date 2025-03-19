import type { KVNamespace } from '@cloudflare/workers-types';

export interface Env {
	ASSETS: KVNamespace;
	SERVICE_TOKEN: string;
}
