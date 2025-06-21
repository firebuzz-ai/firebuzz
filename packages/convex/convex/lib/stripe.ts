import { ConvexError, v } from "convex/values";
import Stripe from "stripe";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";
import { ERRORS } from "../utils/errors";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) throw new Error(ERRORS.ENVS_NOT_INITIALIZED);

export const stripe = new Stripe(stripeSecretKey, {
	typescript: true,
});

// Helper functions for credit allocation
const getCreditAmountForProduct = async (
	product: Doc<"products">,
	quantity = 1,
): Promise<number> => {
	// Get credit allocation type and amount from product metadata
	const creditAllocation = product.metadata?.creditAllocation || "single";
	const creditAmount = Number(product.metadata?.creditAmount || 100);

	// Apply per-seat logic if needed
	if (creditAllocation === "per-seat") {
		return creditAmount * quantity;
	}

	return creditAmount;
};

const createShadowSubscriptionForYearly = async (
	customer: string,
	price: string,
	parentSubscriptionId: string,
): Promise<Stripe.Subscription | null> => {
	try {
		// Create a shadow subscription that triggers monthly for yearly plans
		// This handles monthly credit allocation for yearly subscriptions
		// Quantity is always 1 since we get actual seat count from parent subscription
		const shadowSubscription = await stripe.subscriptions.create({
			customer: customer,
			items: [
				{
					price,
					quantity: 1, // Always 1 - actual quantity comes from parent subscription
				},
			],
			metadata: {
				isShadowSubscription: "true",
				parentSubscription: parentSubscriptionId,
				createdAt: new Date().toISOString(),
			},
			proration_behavior: "none", // Don't prorate
		});

		console.log(
			`Created shadow subscription ${shadowSubscription.id} for customer ${customer}`,
		);

		return shadowSubscription;
	} catch (error) {
		console.error("Failed to create shadow subscription:", error);
		return null;
	}
};

// Actions
export const createStripeCustomer = internalAction({
	args: {
		workspaceId: v.id("workspaces"),
		userId: v.id("users"),
	},
	handler: async (ctx, { workspaceId, userId }): Promise<string> => {
		const user = await ctx.runQuery(
			internal.collections.users.queries.getByIdInternal,
			{
				id: userId,
			},
		);

		const workspace = await ctx.runQuery(
			internal.collections.workspaces.queries.getByIdInternal,
			{
				id: workspaceId,
			},
		);

		if (!user || !workspace)
			throw new ConvexError(ERRORS.STRIPE_CUSTOMER_NOT_CREATED);

		if (workspace.customerId)
			throw new ConvexError(ERRORS.STRIPE_CUSTOMER_ALREADY_EXISTS);

		const customer = await stripe.customers
			.create({
				email: user.email,
				name: user.fullName || user.firstName,
				metadata: {
					userId,
					workspaceId,
				},
			})
			.catch((err) => console.error(err));

		if (!customer) throw new ConvexError(ERRORS.STRIPE_CUSTOMER_NOT_CREATED);

		return customer.id;
	},
});

export const createCheckoutSession = internalAction({
	args: {
		stripeCustomerId: v.string(), // This should be Stripe customer ID, not our internal ID
		stripeLineItems: v.array(
			v.object({
				price: v.string(),
				quantity: v.number(),
				adjustable_quantity: v.optional(
					v.object({
						enabled: v.boolean(),
						minimum: v.number(),
						maximum: v.number(),
					}),
				),
			}),
		), // This should be Stripe price ID, not our internal ID
		successUrl: v.string(),
		cancelUrl: v.string(),
	},
	handler: async (
		_ctx,
		{ stripeCustomerId, stripeLineItems, successUrl, cancelUrl },
	) => {
		const session = await stripe.checkout.sessions.create({
			customer: stripeCustomerId,
			payment_method_types: ["card"],
			line_items: stripeLineItems,
			mode: "subscription",
			success_url: successUrl,
			cancel_url: cancelUrl,
			subscription_data: {
				trial_period_days: 7, // 7-day free trial
				metadata: {
					isShadowSubscription: "false",
				},
			},
		});

		return session.url;
	},
});

// Event Handler
export const handleStripeEvent = internalAction({
	args: {
		payload: v.string(),
		signature: v.string(),
	},
	handler: async (ctx, { payload, signature }) => {
		let event: Stripe.Event | null = null;

		try {
			// Validate the event
			event = await stripe.webhooks.constructEventAsync(
				payload,
				signature,
				process.env.STRIPE_WEBHOOK_SECRET!,
			);

			switch (event.type) {
				// ✅ CUSTOMER EVENTS
				case "customer.created": {
					const customerData = event.data.object as Stripe.Customer;

					// Get Workspace ID from metadata
					const workspaceId = customerData.metadata?.workspaceId;

					if (!workspaceId) {
						console.warn(
							"Skipping customer creation - no workspaceId provided",
						);
						break;
					}

					// Update Workspace with Stripe Customer ID
					await ctx.runMutation(
						internal.collections.workspaces.mutations.updateCustomerId,
						{
							id: workspaceId as Id<"workspaces">,
							customerId: customerData.id,
						},
					);

					// Create Customer
					await ctx.runMutation(
						internal.collections.stripe.customers.mutations.createInternal,
						{
							stripeCustomerId: customerData.id,
							workspaceId: workspaceId as Id<"workspaces">,
							email: customerData.email || "",
							name: customerData.name || "",
							metadata: customerData.metadata || {},
							updatedAt: new Date().toISOString(),
						},
					);

					break;
				}

				case "customer.updated": {
					const customerData = event.data.object as Stripe.Customer;

					// Find existing customer by Stripe ID
					const existingCustomer = await ctx.runQuery(
						internal.collections.stripe.customers.queries.getByStripeId,
						{ stripeCustomerId: customerData.id },
					);

					if (existingCustomer) {
						await ctx.runMutation(
							internal.collections.stripe.customers.mutations.updateInternal,
							{
								customerId: existingCustomer._id,
								email: customerData.email || undefined,
								name: customerData.name || undefined,
								metadata: customerData.metadata || undefined,
								updatedAt: new Date().toISOString(),
							},
						);
					} else {
						// Get Workspace ID from metadata
						const workspaceId = customerData.metadata?.workspaceId;

						if (!workspaceId) {
							console.warn(
								"Skipping customer creation - no workspaceId provided",
							);
							return;
						}

						// Create new customer
						await ctx.runMutation(
							internal.collections.stripe.customers.mutations.createInternal,
							{
								stripeCustomerId: customerData.id,
								workspaceId: workspaceId as Id<"workspaces">,
								email: customerData.email || "",
								name: customerData.name || "",
								metadata: customerData.metadata || {},
								updatedAt: new Date().toISOString(),
							},
						);
					}
					break;
				}

				case "customer.deleted": {
					const customerData = event.data.object as Stripe.Customer;

					// Find existing customer by Stripe ID
					const existingCustomer = await ctx.runQuery(
						internal.collections.stripe.customers.queries.getByStripeId,
						{ stripeCustomerId: customerData.id },
					);

					if (existingCustomer) {
						await ctx.runMutation(
							internal.collections.stripe.customers.mutations
								.deletePermanentInternal,
							{
								customerId: existingCustomer._id,
							},
						);
					} else {
						console.warn("Customer not found for deletion:", customerData.id);
					}
					break;
				}

				// ✅ SUBSCRIPTION EVENTS
				case "customer.subscription.created": {
					const subscriptionData = event.data.object as Stripe.Subscription;

					// Find the customer in our database
					const customer = await ctx.runQuery(
						internal.collections.stripe.customers.queries.getByStripeId,
						{ stripeCustomerId: subscriptionData.customer as string },
					);

					if (!customer) {
						console.warn(
							"Customer not found for subscription:",
							subscriptionData.customer,
						);
						break;
					}

					// Get period dates from the first subscription item (Stripe's new structure)
					const firstItem = subscriptionData.items?.data?.[0];
					const currentPeriodStart = firstItem?.current_period_start
						? new Date(firstItem.current_period_start * 1000).toISOString()
						: new Date().toISOString();
					const currentPeriodEnd = firstItem?.current_period_end
						? new Date(firstItem.current_period_end * 1000).toISOString()
						: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default to 30 days from now

					// Create subscription
					const subscriptionId = await ctx.runMutation(
						internal.collections.stripe.subscriptions.mutations.createInternal,
						{
							stripeSubscriptionId: subscriptionData.id,
							customerId: customer._id,
							workspaceId: customer.workspaceId,
							status: subscriptionData.status,
							currentPeriodStart,
							currentPeriodEnd,
							cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
							canceledAt: subscriptionData.canceled_at
								? new Date(subscriptionData.canceled_at * 1000).toISOString()
								: undefined,
							trialStart: subscriptionData.trial_start
								? new Date(subscriptionData.trial_start * 1000).toISOString()
								: undefined,
							trialEnd: subscriptionData.trial_end
								? new Date(subscriptionData.trial_end * 1000).toISOString()
								: undefined,
							metadata: subscriptionData.metadata || undefined,
							updatedAt: new Date().toISOString(),
						},
					);

					// Create subscription items
					if (subscriptionData.items?.data) {
						for (const item of subscriptionData.items.data) {
							// Find the price in our database
							const price = await ctx.runQuery(
								internal.collections.stripe.prices.queries.getByStripeId,
								{ stripePriceId: item.price.id },
							);

							if (price) {
								await ctx.runMutation(
									internal.collections.stripe.subscriptionItems.mutations
										.createInternal,
									{
										stripeSubscriptionItemId: item.id,
										subscriptionId,
										priceId: price._id,
										quantity: item.quantity || 1,
										metadata: price?.metadata || undefined,
										updatedAt: new Date().toISOString(),
									},
								);
							} else {
								console.warn(
									"Price not found for subscription item:",
									item.price.id,
								);
							}
						}
					}

					// Complete onboarding if it's not already completed
					await ctx.runMutation(
						internal.collections.onboarding.mutations.completeOnboarding,
						{ workspaceId: customer.workspaceId },
					);

					break;
				}

				case "customer.subscription.updated":
				case "customer.subscription.paused":
				case "customer.subscription.resumed": {
					const subscriptionData = event.data.object as Stripe.Subscription;

					// Find existing subscription
					const existingSubscription = await ctx.runQuery(
						internal.collections.stripe.subscriptions.queries.getByStripeId,
						{ stripeSubscriptionId: subscriptionData.id },
					);

					if (existingSubscription) {
						// Get period dates from the first subscription item (Stripe's new structure)
						const firstItem = subscriptionData.items?.data?.[0];
						const currentPeriodStart = firstItem?.current_period_start
							? new Date(firstItem.current_period_start * 1000).toISOString()
							: undefined;
						const currentPeriodEnd = firstItem?.current_period_end
							? new Date(firstItem.current_period_end * 1000).toISOString()
							: undefined;

						const isEndOfTrial =
							existingSubscription.status === "trialing" &&
							subscriptionData.status === "active";

						await ctx.runMutation(
							internal.collections.stripe.subscriptions.mutations
								.updateInternal,
							{
								subscriptionId: existingSubscription._id,
								status: subscriptionData.status,
								currentPeriodStart,
								currentPeriodEnd,
								cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
								canceledAt: subscriptionData.canceled_at
									? new Date(subscriptionData.canceled_at * 1000).toISOString()
									: undefined,
								trialStart: subscriptionData.trial_start
									? new Date(subscriptionData.trial_start * 1000).toISOString()
									: undefined,
								trialEnd: subscriptionData.trial_end
									? new Date(subscriptionData.trial_end * 1000).toISOString()
									: undefined,
								metadata: subscriptionData.metadata || undefined,
								updatedAt: new Date().toISOString(),
							},
						);

						// Expire trial credits when first invoice is paid (end of trial)
						if (isEndOfTrial) {
							await ctx.runMutation(
								internal.collections.stripe.transactions.mutations
									.expireTrialCredits,
								{ workspaceId: existingSubscription.workspaceId },
							);
						}

						// Handle trial cancellation - do NOT expire credits immediately
						// Let trial credits expire naturally at trial end for better UX
						const isTrialCancellation =
							existingSubscription.status === "trialing" &&
							subscriptionData.status === "trialing" &&
							subscriptionData.cancel_at_period_end &&
							!existingSubscription.cancelAtPeriodEnd;

						if (isTrialCancellation) {
							console.log(
								`Trial cancelled for workspace ${existingSubscription.workspaceId} - credits will expire at trial end`,
							);
							// No action needed - trial credits will expire naturally at currentPeriodEnd
						}

						// Update subscription items
						if (subscriptionData.items?.data) {
							for (const item of subscriptionData.items.data) {
								// Check if subscription item already exists
								const existingItem = await ctx.runQuery(
									internal.collections.stripe.subscriptionItems.queries
										.getByStripeId,
									{ stripeSubscriptionItemId: item.id },
								);

								// Find the price in our database
								const price = await ctx.runQuery(
									internal.collections.stripe.prices.queries.getByStripeId,
									{ stripePriceId: item.price.id },
								);

								if (!price) {
									console.warn(
										"Price not found for subscription item:",
										item.price.id,
									);
									continue;
								}

								if (existingItem) {
									// Update existing subscription item
									await ctx.runMutation(
										internal.collections.stripe.subscriptionItems.mutations
											.updateInternal,
										{
											subscriptionItemId: existingItem._id,
											priceId: price._id,
											quantity: item.quantity || 1,
											metadata: price?.metadata || undefined,
											updatedAt: new Date().toISOString(),
										},
									);
								} else {
									// Create new subscription item
									await ctx.runMutation(
										internal.collections.stripe.subscriptionItems.mutations
											.createInternal,
										{
											stripeSubscriptionItemId: item.id,
											subscriptionId: existingSubscription._id,
											priceId: price._id,
											quantity: item.quantity || 1,
											metadata: price?.metadata || undefined,
											updatedAt: new Date().toISOString(),
										},
									);
								}
							}
						}
					} else {
						console.warn(
							"Subscription not found in database:",
							subscriptionData.id,
						);
					}
					break;
				}

				case "customer.subscription.deleted": {
					const subscriptionData = event.data.object as Stripe.Subscription;

					// Find existing subscription
					const existingSubscription = await ctx.runQuery(
						internal.collections.stripe.subscriptions.queries.getByStripeId,
						{ stripeSubscriptionId: subscriptionData.id },
					);

					if (existingSubscription) {
						// If this is a main subscription with a shadow subscription, cancel the shadow
						if (
							subscriptionData.metadata?.yearly_plan !== "true" &&
							subscriptionData.metadata?.shadow_subscription !== "true"
						) {
							// This is a main subscription, find and cancel any related shadow subscriptions
							try {
								const shadowSubscriptions = await stripe.subscriptions.list({
									customer: subscriptionData.customer as string,
									status: "active",
								});

								for (const shadow of shadowSubscriptions.data) {
									if (
										shadow.metadata?.parent_subscription === subscriptionData.id
									) {
										console.log(
											`Canceling shadow subscription ${shadow.id} for canceled main subscription ${subscriptionData.id}`,
										);
										await stripe.subscriptions.cancel(shadow.id);
									}
								}
							} catch (error) {
								console.error("Failed to cancel shadow subscriptions:", error);
							}
						}

						// Update status to canceled instead of deleting the record
						// This preserves historical data for reporting/analytics
						await ctx.runMutation(
							internal.collections.stripe.subscriptions.mutations
								.updateInternal,
							{
								subscriptionId: existingSubscription._id,
								status: "canceled",
								canceledAt: new Date().toISOString(),
								updatedAt: new Date().toISOString(),
							},
						);

						// Clean up subscription items
						await ctx.runMutation(
							internal.collections.stripe.subscriptionItems.mutations
								.deleteBySubscriptionIdInternal,
							{
								subscriptionId: existingSubscription._id,
							},
						);
					} else {
						console.warn(
							"Subscription not found for deletion:",
							subscriptionData.id,
						);
					}
					break;
				}

				// ✅ PRODUCT EVENTS
				case "product.created":
				case "product.updated": {
					const productData = event.data.object as Stripe.Product;

					// Find existing product
					const existingProduct = await ctx.runQuery(
						internal.collections.stripe.products.queries.getByStripeId,
						{ stripeProductId: productData.id },
					);

					if (existingProduct) {
						// Update existing product
						await ctx.runMutation(
							internal.collections.stripe.products.mutations.updateInternal,
							{
								productId: existingProduct._id,
								name: productData.name,
								description: productData.description || undefined,
								active: productData.active,
								metadata: productData.metadata || undefined,
								updatedAt: new Date().toISOString(),
							},
						);
					} else {
						// Create new product
						await ctx.runMutation(
							internal.collections.stripe.products.mutations.createInternal,
							{
								stripeProductId: productData.id,
								name: productData.name,
								description: productData.description || undefined,
								active: productData.active,
								metadata: productData.metadata || undefined,
								updatedAt: new Date().toISOString(),
							},
						);
					}
					break;
				}

				case "product.deleted": {
					const productData = event.data.object as Stripe.Product;

					// Find existing product
					const existingProduct = await ctx.runQuery(
						internal.collections.stripe.products.queries.getByStripeId,
						{ stripeProductId: productData.id },
					);

					if (existingProduct) {
						// Soft delete: mark as inactive instead of hard deletion
						await ctx.runMutation(
							internal.collections.stripe.products.mutations.updateInternal,
							{
								productId: existingProduct._id,
								active: false,
								updatedAt: new Date().toISOString(),
							},
						);
					} else {
						console.warn("Product not found for deletion:", productData.id);
					}
					break;
				}

				// ✅ PRICE EVENTS
				case "price.created":
				case "price.updated": {
					const priceData = event.data.object as Stripe.Price;

					// Find existing price
					const existingPrice = await ctx.runQuery(
						internal.collections.stripe.prices.queries.getByStripeId,
						{ stripePriceId: priceData.id },
					);

					// Find the product in our database
					const product = await ctx.runQuery(
						internal.collections.stripe.products.queries.getByStripeId,
						{ stripeProductId: priceData.product as string },
					);

					if (!product) {
						console.warn("Product not found for price:", priceData.product);
						break;
					}

					if (existingPrice) {
						// Update existing price
						await ctx.runMutation(
							internal.collections.stripe.prices.mutations.updateInternal,
							{
								priceId: existingPrice._id,
								unitAmount: priceData.unit_amount || undefined,
								currency: priceData.currency,
								interval: priceData.recurring?.interval || undefined,
								intervalCount: priceData.recurring?.interval_count || undefined,
								type: priceData.type,
								active: priceData.active,
								metadata: priceData.metadata || undefined,
								updatedAt: new Date().toISOString(),
							},
						);
					} else {
						// Create new price
						await ctx.runMutation(
							internal.collections.stripe.prices.mutations.createInternal,
							{
								stripePriceId: priceData.id,
								productId: product._id,
								unitAmount: priceData.unit_amount || undefined,
								currency: priceData.currency,
								interval: priceData.recurring?.interval || undefined,
								intervalCount: priceData.recurring?.interval_count || undefined,
								type: priceData.type,
								active: priceData.active,
								metadata: priceData.metadata || undefined,
								updatedAt: new Date().toISOString(),
							},
						);
					}
					break;
				}

				case "price.deleted": {
					const priceData = event.data.object as Stripe.Price;

					// Find existing price
					const existingPrice = await ctx.runQuery(
						internal.collections.stripe.prices.queries.getByStripeId,
						{ stripePriceId: priceData.id },
					);

					if (existingPrice) {
						// Soft delete: mark as inactive instead of hard deletion
						await ctx.runMutation(
							internal.collections.stripe.prices.mutations.updateInternal,
							{
								priceId: existingPrice._id,
								active: false,
								updatedAt: new Date().toISOString(),
							},
						);
					} else {
						console.warn("Price not found for deletion:", priceData.id);
					}
					break;
				}

				// ✅ INVOICE EVENTS
				case "invoice.created":
				case "invoice.updated":
				case "invoice.payment_failed":
				case "invoice.payment_succeeded": {
					const invoiceData = event.data.object as Stripe.Invoice;

					// Find the customer in our database
					const customer = await ctx.runQuery(
						internal.collections.stripe.customers.queries.getByStripeId,
						{ stripeCustomerId: invoiceData.customer as string },
					);

					if (!customer) {
						console.warn(
							"Customer not found for invoice:",
							invoiceData.customer,
						);
						break;
					}

					// Find subscription if it exists
					const subscriptionId = invoiceData.lines?.data?.[0]?.subscription;
					let subscription = null;
					if (subscriptionId) {
						subscription = await ctx.runQuery(
							internal.collections.stripe.subscriptions.queries.getByStripeId,
							{ stripeSubscriptionId: subscriptionId as string },
						);
					}

					if (event.type === "invoice.created") {
						// Create new invoice
						await ctx.runMutation(
							internal.collections.stripe.invoices.mutations.createInternal,
							{
								stripeInvoiceId: invoiceData.id as string,
								customerId: customer._id,
								subscriptionId: subscription?._id,
								workspaceId: customer.workspaceId,
								status: invoiceData.status || "draft",
								amountPaid: invoiceData.amount_paid || 0,
								amountDue: invoiceData.amount_due || 0,
								currency: invoiceData.currency,
								hostedInvoiceUrl: invoiceData.hosted_invoice_url || undefined,
								invoicePdf: invoiceData.invoice_pdf || undefined,
								dueDate: invoiceData.due_date
									? new Date(invoiceData.due_date * 1000).toISOString()
									: undefined,
								paidAt: invoiceData.status_transitions?.paid_at
									? new Date(
											invoiceData.status_transitions.paid_at * 1000,
										).toISOString()
									: undefined,
								updatedAt: new Date().toISOString(),
							},
						);
					} else {
						// Update existing invoice
						const existingInvoice = await ctx.runQuery(
							internal.collections.stripe.invoices.queries.getByStripeId,
							{ stripeInvoiceId: invoiceData.id as string },
						);

						if (existingInvoice) {
							await ctx.runMutation(
								internal.collections.stripe.invoices.mutations.updateInternal,
								{
									invoiceId: existingInvoice._id,
									status: invoiceData.status || "draft",
									amountPaid: invoiceData.amount_paid || 0,
									amountDue: invoiceData.amount_due || 0,
									currency: invoiceData.currency,
									hostedInvoiceUrl: invoiceData.hosted_invoice_url || undefined,
									invoicePdf: invoiceData.invoice_pdf || undefined,
									dueDate: invoiceData.due_date
										? new Date(invoiceData.due_date * 1000).toISOString()
										: undefined,
									paidAt: invoiceData.status_transitions?.paid_at
										? new Date(
												invoiceData.status_transitions.paid_at * 1000,
											).toISOString()
										: undefined,
									updatedAt: new Date().toISOString(),
								},
							);
						} else {
							console.warn("Invoice not found in database:", invoiceData.id);
						}
					}

					break;
				}

				case "invoice.paid": {
					const invoiceData = event.data.object as Stripe.Invoice;
					const lines = invoiceData.lines?.data;

					// Find the customer in our database
					const customer = await ctx.runQuery(
						internal.collections.stripe.customers.queries.getByStripeId,
						{ stripeCustomerId: invoiceData.customer as string },
					);

					if (!customer) {
						console.warn(
							"Customer not found for invoice:",
							invoiceData.customer,
						);
						break;
					}

					// Check if this is an upgrade/downgrade scenario (multiple proration lines)
					const prorationLines = lines.filter(
						(line) =>
							line.parent?.subscription_item_details?.proration &&
							invoiceData.amount_paid > 0,
					);
					const hasUpgradeDowngrade = prorationLines.length >= 2;

					for (const line of lines) {
						// Find subscription if it exists
						const subscriptionId =
							line.parent?.subscription_item_details?.subscription;
						const subscriptionItemId =
							line.parent?.subscription_item_details?.subscription_item;
						const priceId = line.pricing?.price_details?.price;
						const productId = line.pricing?.price_details?.product;
						const proration = line.parent?.subscription_item_details?.proration;

						if (
							!subscriptionId ||
							!subscriptionItemId ||
							!priceId ||
							!productId
						) {
							console.warn("Missing required fields for line:", line);
							continue;
						}

						const subscription = await ctx.runQuery(
							internal.collections.stripe.subscriptions.queries.getByStripeId,
							{ stripeSubscriptionId: subscriptionId as string },
						);

						const subscriptionItem = await ctx.runQuery(
							internal.collections.stripe.subscriptionItems.queries
								.getByStripeId,
							{ stripeSubscriptionItemId: subscriptionItemId as string },
						);

						const price = await ctx.runQuery(
							internal.collections.stripe.prices.queries.getByStripeId,
							{ stripePriceId: priceId as string },
						);

						// Get product, price, subscription items
						const product = await ctx.runQuery(
							internal.collections.stripe.products.queries.getByStripeId,
							{
								stripeProductId: line.pricing?.price_details?.product as string,
							},
						);

						if (!subscription || !subscriptionItem || !price || !product) {
							console.warn(
								"Missing required fields for line:",
								`${line}missing: ${subscriptionId ? "subscriptionId" : ""}${subscriptionItemId ? "subscriptionItemId" : ""}${priceId ? "priceId" : ""}${productId ? "productId" : ""}`,
							);
							continue;
						}

						/* CREDIT ALLOCATIONS */
						// TRIAL CREDITS
						if (
							subscription.status === "trialing" &&
							invoiceData.amount_paid === 0
						) {
							await ctx.runMutation(
								internal.collections.stripe.transactions.mutations
									.createIdempotent,
								{
									workspaceId: customer.workspaceId,
									subscriptionId: subscription?._id,
									customerId: customer._id,
									amount: 100,
									type: "trial",
									periodStart: subscription.currentPeriodStart,
									expiresAt: subscription.currentPeriodEnd,
									reason: "Trial period credits (expires at end of trial)",
									idempotencyKey: `trial-${subscription.stripeSubscriptionId}`,
									updatedAt: new Date().toISOString(),
								},
							);
							break;
						}

						console.log({
							isShadowPrice: price.metadata?.isShadow,
							isShadowSubscription: subscription.metadata?.isShadowSubscription,
							amountPaid: invoiceData.amount_paid,
						});

						// SHADOW SUBSCRIPTION
						if (
							subscription.metadata?.isShadowSubscription === "true" &&
							invoiceData.amount_paid === 0
						) {
							const parentSubscriptionStripeId =
								subscription.metadata?.parentSubscription;
							const parentSubscription = await ctx.runQuery(
								internal.collections.stripe.subscriptions.queries.getByStripeId,
								{
									stripeSubscriptionId: parentSubscriptionStripeId,
								},
							);

							if (!parentSubscription) {
								console.warn(
									"Parent subscription not found for shadow subscription:",
									parentSubscriptionStripeId,
								);
								break;
							}

							const parentSubscriptionItem = await ctx.runQuery(
								internal.collections.stripe.subscriptionItems.queries
									.getBySubscriptionIdInternal,
								{
									subscriptionId: parentSubscription?._id,
								},
							);
							const quantity =
								parentSubscriptionItem
									?.map((item) => item.quantity)
									.sort((a, b) => a - b)
									.pop() ?? 1; // Get the highest quantity

							const monthlyCredits = await getCreditAmountForProduct(
								product,
								quantity,
							);

							await ctx.runMutation(
								internal.collections.stripe.transactions.mutations
									.createIdempotent,
								{
									workspaceId: customer.workspaceId,
									customerId: customer._id,
									amount: monthlyCredits,
									subscriptionId: parentSubscription?._id,
									type: "subscription",
									periodStart: subscription.currentPeriodStart,
									expiresAt: subscription.currentPeriodEnd,
									reason: `Shadow subscription - monthly credits allocation (${quantity} seats from parent yearly subscription)`,
									idempotencyKey: `credits-${customer.workspaceId}-${product.stripeProductId}-${subscription.currentPeriodStart}-${subscription.currentPeriodEnd}-q:${quantity}`,
									updatedAt: new Date().toISOString(),
								},
							);

							break;
						}

						// TOP-UP CREDITS
						if (
							product.metadata?.type === "add-on" &&
							product.metadata?.creditAmount > 0
						) {
							const quantity = line.quantity || 1;

							// Add credits to the customer
							await ctx.runMutation(
								internal.collections.stripe.transactions.mutations
									.createIdempotent,
								{
									workspaceId: customer.workspaceId,
									customerId: customer._id,
									subscriptionId: subscription?._id,
									amount: product.metadata?.creditAmount * quantity,
									type: "topup",
									periodStart: subscription.currentPeriodStart,
									expiresAt: subscription.currentPeriodEnd,
									reason: "Top-up credits allocation",
									idempotencyKey: `credits-${customer.workspaceId}-${product.stripeProductId}-${subscription.currentPeriodStart}-${subscription.currentPeriodEnd}-q:${quantity}`,
									updatedAt: new Date().toISOString(),
								},
							);

							break;
						}

						// PAID CREDITS (Regular Monthly Subscriptions - excluding prorations)
						if (
							invoiceData.amount_paid > 0 &&
							price.interval === "month" &&
							!proration
						) {
							const quantity = line.quantity || 1;
							const monthlyCredits = await getCreditAmountForProduct(
								product,
								quantity,
							);

							await ctx.runMutation(
								internal.collections.stripe.transactions.mutations
									.createIdempotent,
								{
									workspaceId: customer.workspaceId,
									customerId: customer._id,
									subscriptionId: subscription?._id,
									amount: monthlyCredits,
									type: "subscription",
									periodStart: subscription.currentPeriodStart,
									expiresAt: subscription.currentPeriodEnd,
									reason: "Paid credits allocation",
									idempotencyKey: `credits-${customer.workspaceId}-${product.stripeProductId}-${subscription.currentPeriodStart}-${subscription.currentPeriodEnd}-q:${quantity}`,
									updatedAt: new Date().toISOString(),
								},
							);

							break;
						}

						// PAID CREDITS (Upgrade/Downgrade during period)
						if (
							invoiceData.amount_paid > 0 &&
							proration &&
							hasUpgradeDowngrade &&
							price.interval === "month"
						) {
							// Handle upgrade/downgrade scenario
							// Only process positive line items (the new plan)
							if (line.amount > 0) {
								const quantity = line.quantity || 1;

								// Calculate prorated credits for the new plan
								const lineStart = line.period?.start
									? new Date(line.period.start * 1000)
									: new Date(subscription.currentPeriodStart);
								const lineEnd = line.period?.end
									? new Date(line.period.end * 1000)
									: new Date(subscription.currentPeriodEnd);

								// Get the full monthly credit amount for this product
								const monthlyCreditsPerSeat = await getCreditAmountForProduct(
									product,
									1,
								);

								// Calculate prorated credits for the new plan
								const totalDaysInPeriod =
									(new Date(subscription.currentPeriodEnd).getTime() -
										new Date(subscription.currentPeriodStart).getTime()) /
									(1000 * 60 * 60 * 24);
								const remainingDays =
									(lineEnd.getTime() - lineStart.getTime()) /
									(1000 * 60 * 60 * 24);
								const prorationRatio = remainingDays / totalDaysInPeriod;
								const proratedCredits = Math.floor(
									monthlyCreditsPerSeat * prorationRatio * quantity,
								);

								const isUpgrade = line.amount > 0; // Positive amount indicates upgrade
								const changeType = isUpgrade ? "upgrade" : "downgrade";

								await ctx.runMutation(
									internal.collections.stripe.transactions.mutations
										.createIdempotent,
									{
										workspaceId: customer.workspaceId,
										customerId: customer._id,
										subscriptionId: subscription?._id,
										amount: proratedCredits,
										type: "subscription",
										periodStart: lineStart.toISOString(),
										expiresAt: subscription.currentPeriodEnd,
										reason: `Plan ${changeType} - prorated credits for new plan (${Math.round(prorationRatio * 100)}% of period)`,
										idempotencyKey: `${changeType}-${customer.workspaceId}-${product.stripeProductId}-${lineStart.toISOString()}-${lineEnd.toISOString()}-q:${quantity}`,
										updatedAt: new Date().toISOString(),
									},
								);
							}

							// For downgrades, we don't create negative credits - let excess credits expire naturally
							// This provides better UX as users don't lose credits immediately
							break;
						}

						// PAID CREDITS (Mid-cycle seat additions with proration - not upgrade/downgrade)
						if (
							invoiceData.amount_paid > 0 &&
							proration &&
							!hasUpgradeDowngrade &&
							price.interval === "month"
						) {
							const quantity = line.quantity || 1;

							// Calculate prorated credits based on the line period
							const lineStart = line.period?.start
								? new Date(line.period.start * 1000)
								: new Date(subscription.currentPeriodStart);
							const lineEnd = line.period?.end
								? new Date(line.period.end * 1000)
								: new Date(subscription.currentPeriodEnd);

							// Get the full monthly credit amount for this product
							const monthlyCreditsPerSeat = await getCreditAmountForProduct(
								product,
								1,
							);

							// Calculate prorated credits: (remaining days / total days) * credits * quantity
							const totalDaysInPeriod =
								(new Date(subscription.currentPeriodEnd).getTime() -
									new Date(subscription.currentPeriodStart).getTime()) /
								(1000 * 60 * 60 * 24);
							const remainingDays =
								(lineEnd.getTime() - lineStart.getTime()) /
								(1000 * 60 * 60 * 24);
							const prorationRatio = remainingDays / totalDaysInPeriod;
							const proratedCredits = Math.floor(
								monthlyCreditsPerSeat * prorationRatio * quantity,
							);

							await ctx.runMutation(
								internal.collections.stripe.transactions.mutations
									.createIdempotent,
								{
									workspaceId: customer.workspaceId,
									customerId: customer._id,
									subscriptionId: subscription?._id,
									amount: proratedCredits,
									type: "subscription",
									periodStart: lineStart.toISOString(),
									expiresAt: subscription.currentPeriodEnd,
									reason: `Mid-cycle seat addition - prorated credits (${quantity} seats, ${Math.round(prorationRatio * 100)}% of period)`,
									idempotencyKey: `proration-${customer.workspaceId}-${product.stripeProductId}-${lineStart.toISOString()}-${lineEnd.toISOString()}-q:${quantity}`,
									updatedAt: new Date().toISOString(),
								},
							);

							break;
						}

						// PAID CREDITS (Yearly Upgrade/Downgrade during period)
						if (
							invoiceData.amount_paid > 0 &&
							proration &&
							hasUpgradeDowngrade &&
							price.interval === "year"
						) {
							// Handle yearly plan upgrade/downgrade
							// Only process positive line items (the new plan)
							if (line.amount > 0) {
								const quantity = line.quantity || 1;

								// For yearly plans, give prorated credits for current month only
								const lineStart = line.period?.start
									? new Date(line.period.start * 1000)
									: new Date(subscription.currentPeriodStart);

								// Get the monthly credit amount per seat (not yearly)
								const monthlyCreditsPerSeat = await getCreditAmountForProduct(
									product,
									1,
								);

								// Calculate prorated credits for the current month only
								const now = new Date();
								const currentMonthStart = new Date(
									now.getFullYear(),
									now.getMonth(),
									1,
								);
								const nextMonthStart = new Date(
									now.getFullYear(),
									now.getMonth() + 1,
									1,
								);

								// Calculate how much of the current month remains
								const totalDaysInMonth =
									(nextMonthStart.getTime() - currentMonthStart.getTime()) /
									(1000 * 60 * 60 * 24);
								const remainingDaysInMonth = Math.max(
									0,
									(nextMonthStart.getTime() -
										Math.max(
											lineStart.getTime(),
											currentMonthStart.getTime(),
										)) /
										(1000 * 60 * 60 * 24),
								);
								const monthlyProrationRatio =
									remainingDaysInMonth / totalDaysInMonth;
								const proratedCredits = Math.floor(
									monthlyCreditsPerSeat * monthlyProrationRatio * quantity,
								);

								if (proratedCredits > 0) {
									const changeType = "upgrade"; // Only processing positive amounts

									await ctx.runMutation(
										internal.collections.stripe.transactions.mutations
											.createIdempotent,
										{
											workspaceId: customer.workspaceId,
											customerId: customer._id,
											subscriptionId: subscription?._id,
											amount: proratedCredits,
											type: "subscription",
											periodStart: lineStart.toISOString(),
											expiresAt: nextMonthStart.toISOString(),
											reason: `Yearly plan ${changeType} - prorated credits for current month (${quantity} seats, ${Math.round(monthlyProrationRatio * 100)}% of month)`,
											idempotencyKey: `yearly-${changeType}-${customer.workspaceId}-${product.stripeProductId}-${currentMonthStart.toISOString()}-${nextMonthStart.toISOString()}-q:${quantity}`,
											updatedAt: new Date().toISOString(),
										},
									);
								}

								// The shadow subscription will be updated automatically to handle future months
							}
							break;
						}

						// PAID CREDITS (Yearly Mid-cycle seat additions with proration - not upgrade/downgrade)
						if (
							invoiceData.amount_paid > 0 &&
							proration &&
							!hasUpgradeDowngrade &&
							price.interval === "year"
						) {
							const quantity = line.quantity || 1;

							// For yearly plans, we need to give prorated credits for the current month
							// The shadow subscription will handle ongoing monthly credits
							const lineStart = line.period?.start
								? new Date(line.period.start * 1000)
								: new Date(subscription.currentPeriodStart);

							// Get the monthly credit amount per seat (not yearly)
							const monthlyCreditsPerSeat = await getCreditAmountForProduct(
								product,
								1,
							);

							// Calculate prorated credits for the current month only
							// Find the current month boundary within the yearly subscription
							const now = new Date();
							const currentMonthStart = new Date(
								now.getFullYear(),
								now.getMonth(),
								1,
							);
							const nextMonthStart = new Date(
								now.getFullYear(),
								now.getMonth() + 1,
								1,
							);

							// Calculate how much of the current month remains
							const totalDaysInMonth =
								(nextMonthStart.getTime() - currentMonthStart.getTime()) /
								(1000 * 60 * 60 * 24);
							const remainingDaysInMonth = Math.max(
								0,
								(nextMonthStart.getTime() -
									Math.max(lineStart.getTime(), currentMonthStart.getTime())) /
									(1000 * 60 * 60 * 24),
							);
							const monthlyProrationRatio =
								remainingDaysInMonth / totalDaysInMonth;
							const proratedCredits = Math.floor(
								monthlyCreditsPerSeat * monthlyProrationRatio * quantity,
							);

							if (proratedCredits > 0) {
								await ctx.runMutation(
									internal.collections.stripe.transactions.mutations
										.createIdempotent,
									{
										workspaceId: customer.workspaceId,
										customerId: customer._id,
										subscriptionId: subscription?._id,
										amount: proratedCredits,
										type: "subscription",
										periodStart: lineStart.toISOString(),
										expiresAt: nextMonthStart.toISOString(),
										reason: `Yearly plan mid-cycle seat addition - prorated credits for current month (${quantity} seats, ${Math.round(monthlyProrationRatio * 100)}% of month)`,
										idempotencyKey: `yearly-proration-${customer.workspaceId}-${product.stripeProductId}-${currentMonthStart.toISOString()}-${nextMonthStart.toISOString()}-q:${quantity}`,
										updatedAt: new Date().toISOString(),
									},
								);
							}

							// The shadow subscription will be updated automatically via subscription.updated webhook
							// to handle ongoing monthly credits for the new seats
							break;
						}

						// PAID CREDITS (Yearly Subscriptions - Managing Shadow Subscription)
						if (
							invoiceData.amount_paid > 0 &&
							price.interval === "year" &&
							!proration
						) {
							// Check if shadow subscription already exists for this customer
							const shadowPrice = await ctx.runQuery(
								internal.collections.stripe.prices.queries.getByStripeId,
								{ stripePriceId: product.metadata?.shadowPriceId as string },
							);

							if (!shadowPrice) {
								console.warn(
									"Shadow price not found for product:",
									product.stripeProductId,
								);
								break;
							}

							// Look for existing shadow subscriptions for this customer
							const existingShadowSubscriptions =
								await stripe.subscriptions.list({
									customer: customer.stripeCustomerId,
									price: shadowPrice.stripePriceId,
									status: "active",
									limit: 1,
								});

							if (existingShadowSubscriptions.data.length > 0) {
								// Shadow subscription already exists - no need to update since we get quantity from parent
								console.log(
									`Shadow subscription already exists for customer ${customer.stripeCustomerId} - using parent subscription for seat count`,
								);
							} else {
								// No shadow subscription exists, create a new one
								console.log(
									`Creating new shadow subscription for customer ${customer.stripeCustomerId}`,
								);

								const shadowSubscription =
									await createShadowSubscriptionForYearly(
										customer.stripeCustomerId,
										shadowPrice.stripePriceId,
										subscription.stripeSubscriptionId,
									);

								if (!shadowSubscription) {
									console.warn(
										"Shadow subscription not created for product:",
										product.stripeProductId,
									);
									break;
								}
							}
						}
					}

					break;
				}

				// ✅ PAYMENT INTENT EVENTS
				case "payment_intent.created":
				case "payment_intent.succeeded":
				case "payment_intent.payment_failed":
				case "payment_intent.canceled": {
					const paymentIntentData = event.data.object;

					// Find the customer in our database
					const customer = await ctx.runQuery(
						internal.collections.stripe.customers.queries.getByStripeId,
						{ stripeCustomerId: paymentIntentData.customer as string },
					);

					if (!customer) {
						console.warn(
							"Customer not found for payment intent:",
							paymentIntentData.customer,
						);
						break;
					}

					if (event.type === "payment_intent.created") {
						// Create new payment record
						await ctx.runMutation(
							internal.collections.stripe.payments.mutations.createInternal,
							{
								stripePaymentIntentId: paymentIntentData.id,
								customerId: customer._id,
								workspaceId: customer.workspaceId,
								amount: paymentIntentData.amount,
								currency: paymentIntentData.currency,
								status: paymentIntentData.status,
								paymentMethod:
									paymentIntentData.payment_method_types?.[0] || undefined,
								metadata: paymentIntentData.metadata || undefined,
								updatedAt: new Date().toISOString(),
							},
						);
					} else {
						// Update existing payment
						const existingPayment = await ctx.runQuery(
							internal.collections.stripe.payments.queries.getByStripeId,
							{ stripePaymentIntentId: paymentIntentData.id },
						);

						if (existingPayment) {
							await ctx.runMutation(
								internal.collections.stripe.payments.mutations.updateInternal,
								{
									paymentId: existingPayment._id,
									status: paymentIntentData.status,
									amount: paymentIntentData.amount,
									currency: paymentIntentData.currency,
									paymentMethod:
										paymentIntentData.payment_method_types?.[0] || undefined,
									metadata: paymentIntentData.metadata || undefined,
									updatedAt: new Date().toISOString(),
								},
							);
						} else {
							console.warn(
								"Payment intent not found in database:",
								paymentIntentData.id,
							);
						}
					}
					break;
				}

				// ✅ PAYMENT METHOD EVENTS
				case "payment_method.attached": {
					const paymentMethodData = event.data.object as Stripe.PaymentMethod;

					// Find the customer in our database
					const customer = await ctx.runQuery(
						internal.collections.stripe.customers.queries.getByStripeId,
						{ stripeCustomerId: paymentMethodData.customer as string },
					);

					if (!customer) {
						console.warn(
							"Customer not found for payment method:",
							paymentMethodData.customer,
						);
						break;
					}

					// Extract card details if it's a card payment method
					let cardDetails = undefined;
					if (paymentMethodData.type === "card" && paymentMethodData.card) {
						cardDetails = {
							brand: paymentMethodData.card.brand,
							last4: paymentMethodData.card.last4,
							expMonth: paymentMethodData.card.exp_month,
							expYear: paymentMethodData.card.exp_year,
						};
					}

					// Create payment method record
					await ctx.runMutation(
						internal.collections.stripe.paymentMethods.mutations.createInternal,
						{
							stripePaymentMethodId: paymentMethodData.id,
							customerId: customer._id,
							workspaceId: customer.workspaceId,
							type: paymentMethodData.type as
								| "card"
								| "bank_account"
								| "sepa_debit"
								| "ideal"
								| "fpx"
								| "us_bank_account",
							card: cardDetails,
							isDefault: false, // New payment methods are not default by default
							updatedAt: new Date().toISOString(),
						},
					);
					break;
				}

				case "payment_method.updated": {
					const paymentMethodData = event.data.object as Stripe.PaymentMethod;

					// Find existing payment method
					const existingPaymentMethod = await ctx.runQuery(
						internal.collections.stripe.paymentMethods.queries.getByStripeId,
						{ stripePaymentMethodId: paymentMethodData.id },
					);

					if (existingPaymentMethod) {
						// Extract card details if it's a card payment method
						let cardDetails = undefined;
						if (paymentMethodData.type === "card" && paymentMethodData.card) {
							cardDetails = {
								brand: paymentMethodData.card.brand,
								last4: paymentMethodData.card.last4,
								expMonth: paymentMethodData.card.exp_month,
								expYear: paymentMethodData.card.exp_year,
							};
						}

						await ctx.runMutation(
							internal.collections.stripe.paymentMethods.mutations
								.updateInternal,
							{
								paymentMethodId: existingPaymentMethod._id,
								type: paymentMethodData.type as
									| "card"
									| "bank_account"
									| "sepa_debit"
									| "ideal"
									| "fpx"
									| "us_bank_account",
								card: cardDetails,
								updatedAt: new Date().toISOString(),
							},
						);
					} else {
						console.warn(
							"Payment method not found in database:",
							paymentMethodData.id,
						);
					}
					break;
				}

				case "payment_method.detached": {
					const paymentMethodData = event.data.object as Stripe.PaymentMethod;

					// Find existing payment method
					const existingPaymentMethod = await ctx.runQuery(
						internal.collections.stripe.paymentMethods.queries.getByStripeId,
						{ stripePaymentMethodId: paymentMethodData.id },
					);

					if (existingPaymentMethod) {
						// For detached payment methods, we could either delete the record
						// or mark it as inactive. Let's delete it since it's no longer usable
						await ctx.runMutation(
							internal.collections.stripe.paymentMethods.mutations
								.deleteInternal,
							{
								paymentMethodId: existingPaymentMethod._id,
							},
						);
					} else {
						console.warn(
							"Payment method not found for detachment:",
							paymentMethodData.id,
						);
					}
					break;
				}

				default:
					console.log(`⚠️ Unhandled event type: ${event.type}`);
					break;
			}

			// Log successful processing
			await ctx.runMutation(
				internal.collections.stripe.webhookEvents.mutations.createInternal,
				{
					stripeEventId: event.id,
					eventType: event.type,
					processed: true,
					data: event.data,
					attempts: 1,
				},
			);
		} catch (error) {
			// Log failed processing
			if (event) {
				await ctx.runMutation(
					internal.collections.stripe.webhookEvents.mutations.createInternal,
					{
						stripeEventId: event.id,
						eventType: event.type,
						processed: false,
						data: event.data,
						attempts: 1,
						lastError: error instanceof Error ? error.message : "Unknown error",
					},
				);
			}

			// Re-throw to ensure webhook returns error status
			throw error;
		}
	},
});
