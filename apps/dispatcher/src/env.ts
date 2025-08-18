import type { KVNamespace } from "@cloudflare/workers-types";

export interface Env {
	DOMAIN_CONFIG: KVNamespace;
}
