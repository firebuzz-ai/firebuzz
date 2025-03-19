import { bearerAuth } from 'hono/bearer-auth';
import { createMiddleware } from 'hono/factory';
import type { Env } from './env';

export const apiAuth = createMiddleware<{ Bindings: Env }>((c, next) => {
	const auth = bearerAuth({
		token: c.env.SERVICE_TOKEN,
	});
	return auth(c, next);
});

export const cors = createMiddleware<{ Bindings: Env }>((c, next) => {
	c.res.headers.set('Access-Control-Allow-Origin', '*');
	c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	return next();
});
