import { hc } from 'hono/client';
import type { AppType } from './index';

const createClient = (baseUrl = 'http://localhost:8787/api/v1') => {
	return hc<AppType>(`${baseUrl}/api/v1`);
};

export { createClient };
