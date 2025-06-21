import type { WebhookEvent } from "@clerk/backend";
import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

async function validateClerkRequest(
	req: Request,
): Promise<WebhookEvent | null> {
	const payloadString = await req.text();
	const svixHeaders = {
		"svix-id": req.headers.get("svix-id")!,
		"svix-timestamp": req.headers.get("svix-timestamp")!,
		"svix-signature": req.headers.get("svix-signature")!,
	};
	const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
	try {
		return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
	} catch (error) {
		console.error("Error verifying webhook event", error);
		return null;
	}
}

// Clerk Webhooks
http.route({
	path: "/webhooks/clerk",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const event = await validateClerkRequest(request);
		if (!event) {
			return new Response("Error occured", { status: 400 });
		}
		switch (event.type) {
			case "user.created": // intentional fallthrough
			case "user.updated":
				await ctx.runMutation(
					internal.collections.users.mutations.upsertFromClerk,
					{
						data: event.data,
					},
				);
				break;
			case "user.deleted":
				if (event.data.id) {
					await ctx.runMutation(
						internal.collections.users.mutations
							.deleteUserWithAllDataByExternalId,
						{
							externalId: event.data.id,
						},
					);
				}
				break;
			default:
				console.log("Ignored Clerk webhook event", event.type);
		}

		return new Response(null, { status: 200 });
	}),
});

// Stripe Webhooks
http.route({
	path: "/webhooks/stripe",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const signature: string = request.headers.get("stripe-signature") as string;
		const payload = await request.text();
		try {
			// Handle the event
			await ctx.runAction(internal.lib.stripe.handleStripeEvent, {
				payload,
				signature,
			});

			return new Response(null, { status: 200 });
		} catch (error) {
			console.error("Error processing Stripe webhook", error);
			return new Response("Error occurred", { status: 400 });
		}
	}),
});

export default http;
