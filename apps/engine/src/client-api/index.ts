import { OpenAPIHono } from '@hono/zod-openapi';
import { hc } from 'hono/client';
import { cors } from '../middleware';
import { formSubmitRoute } from './v1/form/submit';

const clientApiRoutes = new OpenAPIHono<{ Bindings: Env }>().use(cors).route('/form/submit', formSubmitRoute);

// Export the client API routes and the type
type ClientApiType = typeof clientApiRoutes;
const createClientApiClient = ({ baseUrl = 'http://localhost:8787' }: { baseUrl?: string } = {}) => {
	return hc<ClientApiType>(`${baseUrl}/client-api/v1`);
};

export { clientApiRoutes, createClientApiClient, type ClientApiType };
