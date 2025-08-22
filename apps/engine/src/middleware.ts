import { bearerAuth } from 'hono/bearer-auth';
import { createMiddleware } from 'hono/factory';
import type { Env } from './env';
import { previewApp } from './preview';
import { productionCustomDomainApp } from './production/custom-domain';
import { productionProjectDomainApp } from './production/firebuzz-subdomain';

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

export const domainRouting = createMiddleware<{ Bindings: Env }>(async (c, next) => {
	// Avoid production/preview routing for utility endpoints so they can be served by the root app
	const { pathname } = new URL(c.req.url);
	if (pathname.startsWith('/utility') || pathname.startsWith('/test')) {
		await next();
		return;
	}

	const campaign = c.req.header('X-Firebuzz-Campaign') || '';
	const domainType = c.req.header('X-Firebuzz-Domain-Type') || '';
	const preview = c.req.header('X-Firebuzz-Preview') || '';

	// Production Routing (Campaign - Custom and Project Domains)
	if (campaign) {
		// Support both short and verbose identifiers set by the edge router
		const isCustomDomain = domainType === 'c' || domainType === 'custom';
		// Custom Domain Routing
		if (isCustomDomain) {
			return productionCustomDomainApp.fetch(c.req.raw, c.env, c.executionCtx);
		}

		// Project Domain Routing (Firebuzz Subdomain)
		return productionProjectDomainApp.fetch(c.req.raw, c.env, c.executionCtx);
	}

	// Preview Routing (Campaign & Landing Page Previews)
	if (preview) {
		return previewApp.fetch(c.req.raw, c.env, c.executionCtx);
	}

	// Continue with normal routing for other domains
	await next();
});
