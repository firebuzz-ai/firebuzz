import { bearerAuth } from 'hono/bearer-auth';
import { createMiddleware } from 'hono/factory';

export const apiAuth = createMiddleware<{ Bindings: Env }>((c, next) => {
	const auth = bearerAuth({
		token: c.env.SERVICE_TOKEN,
	});
	return auth(c, next);
});
