// Re-export the generated Env type from worker-configuration.d.ts
// This provides a single source of truth while maintaining backward compatibility
// The Env interface is globally available from worker-configuration.d.ts

export type { env as Env } from 'cloudflare:workers';
