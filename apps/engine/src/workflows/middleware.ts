import type { Context } from 'hono';
import { InngestMiddleware } from 'inngest';

export const bindings = new InngestMiddleware({
	name: 'Hono bindings',
	init() {
		return {
			onFunctionRun({ reqArgs }) {
				return {
					transformInput() {
						// reqArgs is the array of arguments passed to a Hono handler
						// We cast the argument to the correct Hono Context type with our
						// environment variable bindings
						const [honoCtx] = reqArgs as [Context<{ Bindings: Env }>];
						return {
							ctx: {
								// Return the context's env object to the function handler's input args
								env: honoCtx.env,
							},
						};
					},
				};
			},
		};
	},
});
