import { v } from "convex/values";
import { internalAction } from "../../_generated/server";

import { engineAPIClient } from "../../lib/engine";

export const storeInKV = internalAction({
	args: {
		key: v.string(),
		html: v.string(),
		js: v.string(),
		css: v.string(),
	},
	handler: async (_ctx, { key, html, js, css }) => {
		const htmlPromise = engineAPIClient.kv.assets.$post(
			{
				json: {
					key: key,
					value: html,
					options: {
						metadata: {},
					},
				},
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.ENGINE_SERVICE_TOKEN}`,
				},
			},
		);

		const jsPromise = engineAPIClient.kv.assets.$post(
			{
				json: {
					key: `${key}:assets:script`,
					value: js,
					options: {
						metadata: {},
					},
				},
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.ENGINE_SERVICE_TOKEN}`,
				},
			},
		);

		const cssPromise = engineAPIClient.kv.assets.$post(
			{
				json: {
					key: `${key}:assets:styles`,
					value: css,
					options: {
						metadata: {},
					},
				},
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.ENGINE_SERVICE_TOKEN}`,
				},
			},
		);

		await Promise.all([htmlPromise, jsPromise, cssPromise]);
	},
});
