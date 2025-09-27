import { ConvexError, v } from "convex/values";
import Stripe from "stripe";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { action, internalAction } from "../_generated/server";
import { ERRORS } from "../utils/errors";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) throw new Error(ERRORS.ENVS_NOT_INITIALIZED);

export const stripe = new Stripe(stripeSecretKey, {
  typescript: true,
});

// Helper functions for credit allocation
const getCreditAmountForPlan = (product: Doc<"products">): number => {
  // Get fixed credit amount from product metadata
  if (product.metadata?.type === "subscription") {
    return Number(product.metadata?.credits || 0);
  }

  return 0;
};

// Create or get billing portal configuration for billing management
const getBillingPortalConfiguration = async (): Promise<string> => {
  try {
    // Try to list existing configurations and find one for billing
    const configurations = await stripe.billingPortal.configurations.list({
      limit: 10, // Get more to find our billing-specific one
    });

    // Look for existing billing configuration
    const billingConfig = configurations.data.find((config) =>
      config.business_profile?.headline?.includes("billing information")
    );

    if (billingConfig) {
      return billingConfig.id;
    }

    // Create a new billing-focused configuration
    const portalConfig = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: "Add Payment Method and Billing Information",
      },
      features: {
        invoice_history: {
          enabled: false,
        },
        subscription_cancel: {
          enabled: false,
        },
        payment_method_update: {
          enabled: true,
        },
        customer_update: {
          allowed_updates: ["address", "tax_id", "name", "phone"],
          enabled: true,
        },
      },
    });

    return portalConfig.id;
  } catch (error) {
    console.error("Failed to create billing portal configuration:", error);
    throw error;
  }
};

const createShadowSubscriptionForYearly = async (
  customer: string,
  price: string,
  parentSubscriptionId: string
): Promise<Stripe.Subscription | null> => {
  try {
    // Create a shadow subscription that triggers monthly for yearly plans
    // This handles monthly credit allocation for yearly subscriptions
    // Quantity is always 1 since we get actual seat count from parent subscription

    const metadata: Doc<"subscriptions">["metadata"] = {
      isShadow: "true",
      parentSubscription: parentSubscriptionId,
      createdAt: new Date().toISOString(),
    };

    const shadowSubscription = await stripe.subscriptions.create({
      customer: customer,
      items: [
        {
          price,
          quantity: 1, // Always 1 - actual quantity comes from parent subscription
        },
      ],
      metadata,
      proration_behavior: "none", // Don't prorate
    });

    console.log(
      `Created shadow subscription ${shadowSubscription.id} for customer ${customer}`
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
      }
    );

    const workspace = await ctx.runQuery(
      internal.collections.workspaces.queries.getByIdInternal,
      {
        id: workspaceId,
      }
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
          })
        ),
      })
    ), // This should be Stripe price ID, not our internal ID
    successUrl: v.string(),
    cancelUrl: v.string(),
    isTrialActive: v.boolean(),
  },
  handler: async (
    _ctx,
    { stripeCustomerId, stripeLineItems, successUrl, cancelUrl, isTrialActive }
  ) => {
    const metadata: Doc<"subscriptions">["metadata"] = {
      isShadow: "false",
    };

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: stripeLineItems,
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: isTrialActive ? 14 : undefined, // 14-day free trial
        metadata,
      },
    });

    return session.url;
  },
});

export const createCustomerPortalSession = action({
  handler: async (ctx) => {
    const user = await ctx.runQuery(
      internal.collections.users.queries.getCurrentUserInternal
    );

    if (!user || user.currentRole !== "org:admin" || !user.currentWorkspaceId)
      throw new ConvexError(ERRORS.UNAUTHORIZED);

    // Get Workspace
    const workspace = await ctx.runQuery(
      internal.collections.workspaces.queries.getByIdInternal,
      {
        id: user.currentWorkspaceId,
      }
    );

    if (!workspace) throw new ConvexError(ERRORS.NOT_FOUND);

    const stripeCustomerId = workspace.customerId;

    if (!stripeCustomerId) throw new ConvexError(ERRORS.NOT_FOUND);

    const returnUrl = `${process.env.PUBLIC_APP_URL}/settings/subscription/billing`;

    // Get or create billing portal configuration
    const configurationId = await getBillingPortalConfiguration();

    const sessionConfig = {
      customer: stripeCustomerId,
      return_url: returnUrl,
      configuration: configurationId,
      flow_data: {
        type: "subscription_update" as const,
        after_completion: {
          type: "redirect" as const,
          redirect: {
            return_url: returnUrl,
          },
        },
      },
    };

    const session = await stripe.billingPortal.sessions.create(sessionConfig);

    return session.url;
  },
});

export const createPaymentMethodPortalSession = action({
  handler: async (ctx) => {
    const user = await ctx.runQuery(
      internal.collections.users.queries.getCurrentUserInternal
    );

    if (!user || user.currentRole !== "org:admin" || !user.currentWorkspaceId)
      throw new ConvexError(ERRORS.UNAUTHORIZED);

    // Get Workspace
    const workspace = await ctx.runQuery(
      internal.collections.workspaces.queries.getByIdInternal,
      {
        id: user.currentWorkspaceId,
      }
    );

    if (!workspace) throw new ConvexError(ERRORS.NOT_FOUND);

    const stripeCustomerId = workspace.customerId;

    if (!stripeCustomerId) throw new ConvexError(ERRORS.NOT_FOUND);

    const returnUrl = `${process.env.PUBLIC_APP_URL}/settings/subscription/billing`;

    // Get or create billing portal configuration
    const configurationId = await getBillingPortalConfiguration();

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
      configuration: configurationId,
    });

    return session.url;
  },
});

export const changePlan = action({
  args: {
    targetProductId: v.id("products"),
    targetPriceId: v.id("prices"),
    prorationBehavior: v.optional(
      v.union(
        v.literal("create_prorations"), // Prorate immediately (no invoice)
        v.literal("none"), // No proration, apply at next billing cycle
        v.literal("always_invoice") // Default - always create invoice immediately
      )
    ),
  },
  handler: async (
    ctx,
    { targetProductId, targetPriceId, prorationBehavior = "always_invoice" }
  ) => {
    const user = await ctx.runQuery(
      internal.collections.users.queries.getCurrentUserInternal
    );

    if (!user || user.currentRole !== "org:admin" || !user.currentWorkspaceId)
      throw new ConvexError(ERRORS.UNAUTHORIZED);

    // Get Workspace
    const workspace = await ctx.runQuery(
      internal.collections.workspaces.queries.getByIdInternal,
      {
        id: user.currentWorkspaceId,
      }
    );

    if (!workspace) throw new ConvexError(ERRORS.NOT_FOUND);

    const stripeCustomerId = workspace.customerId;

    if (!stripeCustomerId) throw new ConvexError(ERRORS.NOT_FOUND);

    // Get current subscription
    const subscription = await ctx.runQuery(
      internal.collections.stripe.subscriptions.queries
        .getCurrentByWorkspaceIdInternal,
      {
        workspaceId: user.currentWorkspaceId,
      }
    );

    if (!subscription) {
      throw new ConvexError("No active subscription found");
    }

    // Get subscription items
    const subscriptionItems = await ctx.runQuery(
      internal.collections.stripe.subscriptionItems.queries
        .getBySubscriptionIdInternal,
      {
        subscriptionId: subscription._id,
      }
    );

    // Find the current plan subscription item
    const currentPlanItem = subscriptionItems.find(
      (item) =>
        item.metadata?.type === "subscription" &&
        item.metadata?.isShadow !== "true"
    );

    if (!currentPlanItem) {
      throw new ConvexError("No current plan subscription item found");
    }

    // Get target product and price
    const targetProduct = await ctx.runQuery(
      internal.collections.stripe.products.queries.getByIdInternal,
      {
        id: targetProductId,
      }
    );

    const targetPrice = await ctx.runQuery(
      internal.collections.stripe.prices.queries.getByIdInternal,
      {
        id: targetPriceId,
      }
    );

    if (!targetProduct || !targetPrice) {
      throw new ConvexError("Target product or price not found");
    }

    if (!targetProduct.active || !targetPrice.active) {
      throw new ConvexError("Target product or price is not active");
    }

    // Validate target price belongs to target product
    if (targetPrice.productId !== targetProductId) {
      throw new ConvexError("Price does not belong to the specified product");
    }

    // Get current product for comparison
    const currentProduct = await ctx.runQuery(
      internal.collections.stripe.products.queries.getByIdInternal,
      {
        id: currentPlanItem.productId,
      }
    );

    if (!currentProduct) {
      throw new ConvexError("Current product not found");
    }

    // Get current price for interval comparison
    const currentPrice = await ctx.runQuery(
      internal.collections.stripe.prices.queries.getByIdInternal,
      { id: currentPlanItem.priceId }
    );

    // Prevent changing to the same product
    if (currentProduct._id === targetProductId) {
      throw new ConvexError("Cannot change to the same plan");
    }

    // Prevent interval changes - only allow same interval
    if (currentPrice?.interval !== targetPrice.interval) {
      throw new ConvexError(
        "Changing billing intervals is not supported. Please contact support for assistance."
      );
    }

    try {
      // Simple subscription item update (no interval changes allowed)
      await stripe.subscriptionItems.update(
        currentPlanItem.stripeSubscriptionItemId,
        {
          price: targetPrice.stripePriceId,
          quantity: 1, // Always 1 for all plans with new pricing
          proration_behavior: prorationBehavior,
        }
      );

      return { success: true };
    } catch (error) {
      console.error("Failed to change plan:", error);
      throw new ConvexError("Failed to change plan. Please try again.");
    }
  },
});

export const cancelSubscription = action({
  handler: async (ctx) => {
    const user = await ctx.runQuery(
      internal.collections.users.queries.getCurrentUserInternal
    );

    if (!user || !user.currentWorkspaceId) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    // Get Workspace
    const workspace = await ctx.runQuery(
      internal.collections.workspaces.queries.getByIdInternal,
      {
        id: user.currentWorkspaceId,
      }
    );

    if (!workspace) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // Check if user is the workspace owner
    if (workspace.ownerId !== user._id) {
      throw new ConvexError("Only workspace owners can cancel subscriptions");
    }

    const stripeCustomerId = workspace.customerId;

    if (!stripeCustomerId) {
      throw new ConvexError("No customer ID found");
    }

    // Get current subscription
    const subscription = await ctx.runQuery(
      internal.collections.stripe.subscriptions.queries
        .getCurrentByWorkspaceIdInternal,
      {
        workspaceId: user.currentWorkspaceId,
      }
    );

    if (!subscription) {
      throw new ConvexError("No active subscription found");
    }

    // Check if subscription is already cancelled or set to cancel
    if (subscription.status === "canceled") {
      throw new ConvexError("Subscription is already cancelled");
    }

    if (subscription.cancelAtPeriodEnd) {
      const isTrialing = subscription.status === "trialing";
      throw new ConvexError(
        isTrialing
          ? "Trial is already set to cancel at period end"
          : "Subscription is already set to cancel at period end"
      );
    }

    try {
      // For both trials and active subscriptions, cancel at period end
      // - Trials: User keeps free access until trial ends, then doesn't get charged
      // - Paid: User keeps paid access until billing period ends, then subscription stops
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      throw new ConvexError("Failed to cancel subscription. Please try again.");
    }
  },
});

export const finishTrialImmediately = action({
  handler: async (ctx) => {
    const user = await ctx.runQuery(
      internal.collections.users.queries.getCurrentUserInternal
    );

    if (!user || !user.currentWorkspaceId) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    // Get Workspace
    const workspace = await ctx.runQuery(
      internal.collections.workspaces.queries.getByIdInternal,
      {
        id: user.currentWorkspaceId,
      }
    );

    if (!workspace) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // Check if user is the workspace owner
    if (workspace.ownerId !== user._id) {
      throw new ConvexError("Only workspace owners can manage subscriptions");
    }

    const stripeCustomerId = workspace.customerId;

    if (!stripeCustomerId) {
      throw new ConvexError("No customer ID found");
    }

    // Get current subscription
    const subscription = await ctx.runQuery(
      internal.collections.stripe.subscriptions.queries
        .getCurrentByWorkspaceIdInternal,
      {
        workspaceId: user.currentWorkspaceId,
      }
    );

    if (!subscription) {
      throw new ConvexError("No active subscription found");
    }

    // Check if subscription is currently in trial
    if (subscription.status !== "trialing") {
      throw new ConvexError("Subscription is not in trial period");
    }

    // Check if trial is already set to cancel
    if (subscription.cancelAtPeriodEnd) {
      throw new ConvexError(
        "Trial is set to cancel - cannot finish trial early"
      );
    }

    try {
      // End trial immediately by setting trial_end to now
      // This will trigger invoice.payment_succeeded webhook which handles credit allocation
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        trial_end: "now",
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to finish trial immediately:", error);
      throw new ConvexError("Failed to finish trial. Please try again.");
    }
  },
});

export const reactivateSubscription = action({
  handler: async (ctx) => {
    const user = await ctx.runQuery(
      internal.collections.users.queries.getCurrentUserInternal
    );

    if (!user || !user.currentWorkspaceId) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    // Get Workspace
    const workspace = await ctx.runQuery(
      internal.collections.workspaces.queries.getByIdInternal,
      {
        id: user.currentWorkspaceId,
      }
    );

    if (!workspace) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // Check if user is the workspace owner
    if (workspace.ownerId !== user._id) {
      throw new ConvexError(
        "Only workspace owners can reactivate subscriptions"
      );
    }

    const stripeCustomerId = workspace.customerId;

    if (!stripeCustomerId) {
      throw new ConvexError("No customer ID found");
    }

    // Get current subscription
    const subscription = await ctx.runQuery(
      internal.collections.stripe.subscriptions.queries
        .getCurrentByWorkspaceIdInternal,
      {
        workspaceId: user.currentWorkspaceId,
      }
    );

    if (!subscription) {
      throw new ConvexError("No subscription found");
    }

    // Check if subscription is set to cancel at period end
    if (!subscription.cancelAtPeriodEnd) {
      throw new ConvexError("Subscription is not scheduled for cancellation");
    }

    // Check if subscription is still active (not past period end)
    if (subscription.status === "canceled") {
      throw new ConvexError(
        "Subscription has already ended and cannot be reactivated"
      );
    }

    try {
      // Remove the cancellation by setting cancel_at_period_end to false
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to reactivate subscription:", error);
      throw new ConvexError(
        "Failed to reactivate subscription. Please try again."
      );
    }
  },
});

export const resubscribe = action({
  handler: async (ctx) => {
    const user = await ctx.runQuery(
      internal.collections.users.queries.getCurrentUserInternal
    );

    if (!user || !user.currentWorkspaceId) {
      throw new ConvexError(ERRORS.UNAUTHORIZED);
    }

    // Get Workspace
    const workspace = await ctx.runQuery(
      internal.collections.workspaces.queries.getByIdInternal,
      {
        id: user.currentWorkspaceId,
      }
    );

    if (!workspace) {
      throw new ConvexError(ERRORS.NOT_FOUND);
    }

    // Check if user is the workspace owner
    if (workspace.ownerId !== user._id) {
      throw new ConvexError("Only workspace owners can resubscribe");
    }

    const stripeCustomerId = workspace.customerId;

    if (!stripeCustomerId) {
      throw new ConvexError("No customer ID found");
    }

    // Get the most recent subscription to restore the same plan
    const lastSubscription = await ctx.runQuery(
      internal.collections.stripe.subscriptions.queries
        .getLastByWorkspaceIdInternal,
      {
        workspaceId: user.currentWorkspaceId,
      }
    );

    if (!lastSubscription) {
      throw new ConvexError("No previous subscription found to restore");
    }

    // Check if there's already an active subscription
    const currentSubscription = await ctx.runQuery(
      internal.collections.stripe.subscriptions.queries
        .getCurrentByWorkspaceIdInternal,
      {
        workspaceId: user.currentWorkspaceId,
      }
    );

    if (currentSubscription && currentSubscription.status !== "canceled") {
      throw new ConvexError("Active subscription already exists");
    }

    // Get the main subscription item from the last subscription
    const lastSubscriptionItems = await ctx.runQuery(
      internal.collections.stripe.subscriptionItems.queries
        .getBySubscriptionIdInternal,
      {
        subscriptionId: lastSubscription._id,
      }
    );

    const lastMainItem = lastSubscriptionItems.find(
      (item) =>
        item.metadata?.type === "subscription" &&
        item.metadata?.isShadow !== "true"
    );

    if (!lastMainItem) {
      throw new ConvexError("Previous subscription plan not found");
    }

    // Get the current price for the same product (latest pricing)
    const lastProduct = await ctx.runQuery(
      internal.collections.stripe.products.queries.getByIdInternal,
      {
        id: lastMainItem.productId,
      }
    );

    if (!lastProduct || !lastProduct.active) {
      throw new ConvexError("Previous plan is no longer available");
    }

    // Find current active price for the same product and interval
    const productPrices = await ctx.runQuery(
      internal.collections.stripe.prices.queries.getByProductIdInternal,
      {
        productId: lastProduct._id,
      }
    );

    const currentPrice = productPrices.find(
      (price) => price.interval === lastSubscription.interval && price.active
    );

    if (!currentPrice) {
      throw new ConvexError(
        `No active pricing found for ${lastSubscription.interval}ly billing`
      );
    }

    try {
      const metadata: Doc<"subscriptions">["metadata"] = {
        isShadow: "false",
      };

      // Create new subscription with current pricing
      // Stripe will automatically charge the customer's default payment method
      const newSubscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [
          {
            price: currentPrice.stripePriceId,
            quantity: 1, // Always 1 for all plans with new pricing
          },
        ],
        metadata,
        // No trial for resubscriptions
        trial_period_days: undefined,
        // Charge immediately
        proration_behavior: "none",
      });

      return {
        success: true,
        subscriptionId: newSubscription.id,
      };
    } catch (error) {
      console.error("Failed to resubscribe:", error);

      // Let Stripe errors bubble up with their specific messages
      if (error instanceof Error) {
        throw new ConvexError(`Failed to resubscribe: ${error.message}`);
      }

      throw new ConvexError("Failed to resubscribe. Please try again.");
    }
  },
});

export const updateExtraSeats = action({
  args: {
    newExtraSeatCount: v.number(),
    prorationBehavior: v.optional(
      v.union(
        v.literal("create_prorations"), // Prorate immediately (no invoice)
        v.literal("none"), // No proration, apply at next billing cycle
        v.literal("always_invoice") // Default - always create invoice immediately
      )
    ),
  },
  handler: async (
    ctx,
    { newExtraSeatCount, prorationBehavior = "always_invoice" }
  ) => {
    const user = await ctx.runQuery(
      internal.collections.users.queries.getCurrentUserInternal
    );

    if (!user || user.currentRole !== "org:admin" || !user.currentWorkspaceId)
      throw new ConvexError(ERRORS.UNAUTHORIZED);

    // Get Workspace
    const workspace = await ctx.runQuery(
      internal.collections.workspaces.queries.getByIdInternal,
      {
        id: user.currentWorkspaceId,
      }
    );

    if (!workspace) throw new ConvexError(ERRORS.NOT_FOUND);

    const stripeCustomerId = workspace.customerId;

    if (!stripeCustomerId) throw new ConvexError(ERRORS.NOT_FOUND);

    // Get current subscription
    const subscription = await ctx.runQuery(
      internal.collections.stripe.subscriptions.queries
        .getCurrentByWorkspaceIdInternal,
      {
        workspaceId: user.currentWorkspaceId,
      }
    );

    if (!subscription) {
      throw new ConvexError("No active subscription found");
    }

    // Get subscription items
    const subscriptionItems = await ctx.runQuery(
      internal.collections.stripe.subscriptionItems.queries
        .getBySubscriptionIdInternal,
      {
        subscriptionId: subscription._id,
      }
    );

    // Find current seat add-on items
    const currentSeatAddOnItems = subscriptionItems.filter(
      (item) =>
        item.metadata?.type === "add-on" &&
        item.metadata?.addonType === "extra-seat"
    );

    // Calculate current extra seat count
    const currentExtraSeatCount = currentSeatAddOnItems.reduce(
      (total, item) => total + item.quantity,
      0
    );

    // Validate new count
    if (newExtraSeatCount < 0) {
      throw new ConvexError("Extra seat count cannot be negative");
    }

    if (newExtraSeatCount === currentExtraSeatCount) {
      throw new ConvexError("No changes made to seat count");
    }

    // Get seat add-on product and price
    const seatAddOnProducts = await ctx.runQuery(
      internal.collections.stripe.products.queries.getAddOnProductsInternal,
      {}
    );

    const seatAddOnProduct = seatAddOnProducts.find(
      (product) =>
        product.metadata?.type === "add-on" &&
        product.metadata?.addonType === "extra-seat"
    );

    if (!seatAddOnProduct) {
      throw new ConvexError("Seat add-on product not found");
    }

    // Select price based on current subscription interval
    const seatAddOnPrice = seatAddOnProduct.prices.find(
      (price) => price.interval === subscription.interval && price.active
    );

    if (!seatAddOnPrice) {
      throw new ConvexError(
        `Seat add-on price not found for ${subscription.interval} interval`
      );
    }

    try {
      if (newExtraSeatCount === 0) {
        // Remove all seat add-on subscription items
        for (const item of currentSeatAddOnItems) {
          await stripe.subscriptionItems.del(item.stripeSubscriptionItemId, {
            proration_behavior: prorationBehavior,
          });
        }
      } else if (currentSeatAddOnItems.length === 0) {
        // Add new seat add-on subscription item
        await stripe.subscriptionItems.create({
          subscription: subscription.stripeSubscriptionId,
          price: seatAddOnPrice.stripePriceId,
          quantity: newExtraSeatCount,
          proration_behavior: prorationBehavior,
        });
      } else {
        // Update existing seat add-on subscription item
        const firstItem = currentSeatAddOnItems[0];
        await stripe.subscriptionItems.update(
          firstItem.stripeSubscriptionItemId,
          {
            quantity: newExtraSeatCount,
            proration_behavior: prorationBehavior,
          }
        );

        // Remove any additional items (consolidate into one)
        for (let i = 1; i < currentSeatAddOnItems.length; i++) {
          await stripe.subscriptionItems.del(
            currentSeatAddOnItems[i].stripeSubscriptionItemId,
            {
              proration_behavior: prorationBehavior,
            }
          );
        }
      }

      // Update Clerk organization max allowed memberships
      if (workspace.externalId) {
        // Get base seat count from main subscription product
        const mainSubscriptionItem = subscriptionItems.find(
          (item) =>
            item.metadata?.type === "subscription" &&
            item.metadata?.isShadow !== "true"
        );

        let baseSeatCount = 1;
        if (mainSubscriptionItem) {
          const mainProduct = await ctx.runQuery(
            internal.collections.stripe.products.queries.getByIdInternal,
            { id: mainSubscriptionItem.productId }
          );
          baseSeatCount = Number(
            mainProduct?.metadata?.type === "subscription"
              ? mainProduct?.metadata?.seats || 1
              : 1
          );
        }

        const totalSeats = baseSeatCount + newExtraSeatCount;

        await ctx.scheduler.runAfter(
          0,
          internal.lib.clerk.updateOrganizationInternal,
          {
            organizationId: workspace.externalId,
            maxAllowedMemberships: totalSeats,
          }
        );
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to update seat add-ons:", error);
      throw new ConvexError("Failed to update seats. Please try again.");
    }
  },
});

export const updateProjectAddOns = action({
  args: {
    newExtraProjectCount: v.number(),
    prorationBehavior: v.optional(
      v.union(
        v.literal("create_prorations"), // Prorate immediately (no invoice)
        v.literal("none"), // No proration, apply at next billing cycle
        v.literal("always_invoice") // Default - always create invoice immediately
      )
    ),
  },
  handler: async (
    ctx,
    { newExtraProjectCount, prorationBehavior = "always_invoice" }
  ) => {
    const user = await ctx.runQuery(
      internal.collections.users.queries.getCurrentUserInternal
    );

    if (!user || user.currentRole !== "org:admin" || !user.currentWorkspaceId)
      throw new ConvexError(ERRORS.UNAUTHORIZED);

    // Get Workspace
    const workspace = await ctx.runQuery(
      internal.collections.workspaces.queries.getByIdInternal,
      {
        id: user.currentWorkspaceId,
      }
    );

    if (!workspace) throw new ConvexError(ERRORS.NOT_FOUND);

    const stripeCustomerId = workspace.customerId;

    if (!stripeCustomerId) throw new ConvexError(ERRORS.NOT_FOUND);

    // Get current subscription
    const subscription = await ctx.runQuery(
      internal.collections.stripe.subscriptions.queries
        .getCurrentByWorkspaceIdInternal,
      {
        workspaceId: user.currentWorkspaceId,
      }
    );

    if (!subscription) {
      throw new ConvexError("No active subscription found");
    }

    // Get subscription items
    const subscriptionItems = await ctx.runQuery(
      internal.collections.stripe.subscriptionItems.queries
        .getBySubscriptionIdInternal,
      {
        subscriptionId: subscription._id,
      }
    );

    // Find current project add-on items
    const currentProjectAddOnItems = subscriptionItems.filter(
      (item) =>
        item.metadata?.type === "add-on" &&
        item.metadata?.addonType === "extra-project"
    );

    // Calculate current extra project count
    const currentExtraProjectCount = currentProjectAddOnItems.reduce(
      (total, item) => total + item.quantity,
      0
    );

    // Validate new count
    if (newExtraProjectCount < 0) {
      throw new ConvexError("Extra project count cannot be negative");
    }

    if (newExtraProjectCount === currentExtraProjectCount) {
      throw new ConvexError("No changes made to project count");
    }

    // Get project add-on product and price
    const projectAddOnProducts = await ctx.runQuery(
      internal.collections.stripe.products.queries.getAddOnProductsInternal,
      {}
    );

    const projectAddOnProduct = projectAddOnProducts.find(
      (product) =>
        product.metadata?.type === "add-on" &&
        product.metadata?.addonType === "extra-project"
    );

    if (!projectAddOnProduct) {
      throw new ConvexError("Project add-on product not found");
    }

    // Select price based on current subscription interval
    const projectAddOnPrice = projectAddOnProduct.prices.find(
      (price) => price.interval === subscription.interval && price.active
    );

    if (!projectAddOnPrice) {
      throw new ConvexError(
        `Project add-on price not found for ${subscription.interval} interval`
      );
    }

    try {
      if (newExtraProjectCount === 0) {
        // Remove all project add-on subscription items
        for (const item of currentProjectAddOnItems) {
          await stripe.subscriptionItems.del(item.stripeSubscriptionItemId, {
            proration_behavior: prorationBehavior,
          });
        }
      } else if (currentProjectAddOnItems.length === 0) {
        // Add new project add-on subscription item
        await stripe.subscriptionItems.create({
          subscription: subscription.stripeSubscriptionId,
          price: projectAddOnPrice.stripePriceId,
          quantity: newExtraProjectCount,
          proration_behavior: prorationBehavior,
        });
      } else {
        // Update existing project add-on subscription item
        const firstItem = currentProjectAddOnItems[0];
        await stripe.subscriptionItems.update(
          firstItem.stripeSubscriptionItemId,
          {
            quantity: newExtraProjectCount,
            proration_behavior: prorationBehavior,
          }
        );

        // Remove any additional items (consolidate into one)
        for (let i = 1; i < currentProjectAddOnItems.length; i++) {
          await stripe.subscriptionItems.del(
            currentProjectAddOnItems[i].stripeSubscriptionItemId,
            {
              proration_behavior: prorationBehavior,
            }
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to update project add-ons:", error);
      throw new ConvexError("Failed to update projects. Please try again.");
    }
  },
});

export const updateExtraCredits = action({
  args: {
    quantity: v.number(),
  },
  handler: async (ctx, { quantity }) => {
    // For extra credits, we need different logic as it's a one-time purchase
    const user = await ctx.runQuery(
      internal.collections.users.queries.getCurrentUserInternal
    );

    if (!user || !user.currentWorkspaceId)
      throw new ConvexError(ERRORS.UNAUTHORIZED);

    const workspace = await ctx.runQuery(
      internal.collections.workspaces.queries.getByIdInternal,
      { id: user.currentWorkspaceId }
    );

    if (!workspace || !workspace.customerId)
      throw new ConvexError(ERRORS.NOT_FOUND);

    // Get extra credit product
    const creditProducts = await ctx.runQuery(
      internal.collections.stripe.products.queries.getAddOnProductsInternal,
      {}
    );

    const creditProduct = creditProducts.find(
      (product) =>
        product.metadata?.type === "top-up" &&
        product.metadata?.topupType === "extra-credit"
    );

    if (!creditProduct) {
      throw new ConvexError("Credit add-on product not found");
    }

    // Extra credits are one-time purchases, find the one-time price
    const creditPrice = creditProduct.prices.find(
      (price) => price.type === "one_time" && price.active
    );

    if (!creditPrice) {
      throw new ConvexError("Credit add-on price not found");
    }

    try {
      // Create an invoice item for immediate charge
      await stripe.invoiceItems.create({
        customer: workspace.customerId,
        price_data: {
          currency: creditPrice.currency,
          product: creditProduct.stripeProductId,
          unit_amount: creditPrice.unitAmount || 0,
        },
        quantity,
      });

      // Create and pay invoice immediately
      const invoice = await stripe.invoices.create({
        customer: workspace.customerId,
        auto_advance: true, // Auto-finalize and attempt payment
      });

      if (invoice.id) {
        await stripe.invoices.pay(invoice.id);
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to purchase extra credits:", error);
      throw new ConvexError("Failed to purchase credits. Please try again.");
    }
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
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      switch (event.type) {
        // ✅ CUSTOMER EVENTS
        case "customer.created": {
          const customerData = event.data.object as Stripe.Customer;

          // Get Workspace ID from metadata
          const workspaceId = customerData.metadata?.workspaceId;

          if (!workspaceId) {
            console.warn(
              "Skipping customer creation - no workspaceId provided"
            );
            break;
          }

          // Update Workspace with Stripe Customer ID
          await ctx.runMutation(
            internal.collections.workspaces.mutations.updateCustomerId,
            {
              id: workspaceId as Id<"workspaces">,
              customerId: customerData.id,
            }
          );

          // Create Customer
          await ctx.runMutation(
            internal.collections.stripe.customers.mutations.createInternal,
            {
              stripeCustomerId: customerData.id,
              workspaceId: workspaceId as Id<"workspaces">,
              email: customerData.email || "",
              name: customerData.name || "",
              phone: customerData.phone || undefined,
              address: customerData.address
                ? {
                    city: customerData.address?.city || undefined,
                    country: customerData.address?.country || undefined,
                    line1: customerData.address?.line1 || undefined,
                    line2: customerData.address?.line2 || undefined,
                    postal_code: customerData.address?.postal_code || undefined,
                    state: customerData.address?.state || undefined,
                  }
                : undefined,
              metadata: customerData.metadata || {},
              updatedAt: new Date().toISOString(),
              shipping: customerData.shipping
                ? {
                    address: {
                      city: customerData.shipping?.address?.city || undefined,
                      country:
                        customerData.shipping?.address?.country || undefined,
                      line1: customerData.shipping?.address?.line1 || undefined,
                      line2: customerData.shipping?.address?.line2 || undefined,
                      postal_code:
                        customerData.shipping?.address?.postal_code ||
                        undefined,
                      state: customerData.shipping?.address?.state || undefined,
                    },
                    name: customerData.shipping?.name || undefined,
                    phone: customerData.shipping?.phone || undefined,
                  }
                : undefined,
            }
          );

          break;
        }

        case "customer.updated": {
          const customerData = event.data.object as Stripe.Customer;

          // Find existing customer by Stripe ID
          const existingCustomer = await ctx.runQuery(
            internal.collections.stripe.customers.queries.getByStripeId,
            { stripeCustomerId: customerData.id }
          );

          if (existingCustomer) {
            await ctx.runMutation(
              internal.collections.stripe.customers.mutations.updateInternal,
              {
                customerId: existingCustomer._id,
                email: customerData.email || undefined,
                name: customerData.name || undefined,
                phone: customerData.phone || undefined,
                address: customerData.address
                  ? {
                      city: customerData.address?.city || undefined,
                      country: customerData.address?.country || undefined,
                      line1: customerData.address?.line1 || undefined,
                      line2: customerData.address?.line2 || undefined,
                      postal_code:
                        customerData.address?.postal_code || undefined,
                      state: customerData.address?.state || undefined,
                    }
                  : undefined,
                metadata: customerData.metadata || undefined,
                updatedAt: new Date().toISOString(),
                shipping: customerData.shipping
                  ? {
                      address: {
                        city: customerData.shipping?.address?.city || undefined,
                        country:
                          customerData.shipping?.address?.country || undefined,
                        line1:
                          customerData.shipping?.address?.line1 || undefined,
                        line2:
                          customerData.shipping?.address?.line2 || undefined,
                        postal_code:
                          customerData.shipping?.address?.postal_code ||
                          undefined,
                        state:
                          customerData.shipping?.address?.state || undefined,
                      },
                      name: customerData.shipping?.name || undefined,
                      phone: customerData.shipping?.phone || undefined,
                    }
                  : undefined,
              }
            );
          } else {
            // Get Workspace ID from metadata
            const workspaceId = customerData.metadata?.workspaceId;

            if (!workspaceId) {
              console.warn(
                "Skipping customer creation - no workspaceId provided"
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
                phone: customerData.phone || undefined,
                address: customerData.address
                  ? {
                      city: customerData.address?.city || undefined,
                      country: customerData.address?.country || undefined,
                      line1: customerData.address?.line1 || undefined,
                      line2: customerData.address?.line2 || undefined,
                      postal_code:
                        customerData.address?.postal_code || undefined,
                      state: customerData.address?.state || undefined,
                    }
                  : undefined,
                metadata: customerData.metadata || {},
                updatedAt: new Date().toISOString(),
              }
            );
          }
          break;
        }

        case "customer.deleted": {
          const customerData = event.data.object as Stripe.Customer;

          // Find existing customer by Stripe ID
          const existingCustomer = await ctx.runQuery(
            internal.collections.stripe.customers.queries.getByStripeId,
            { stripeCustomerId: customerData.id }
          );

          if (existingCustomer) {
            await ctx.runMutation(
              internal.collections.stripe.customers.mutations
                .deletePermanentInternal,
              {
                customerId: existingCustomer._id,
              }
            );
          } else {
            console.warn("Customer not found for deletion:", customerData.id);
          }
          break;
        }

        // ✅ TAX ID EVENTS
        case "customer.tax_id.created": {
          const taxIdData = event.data.object as Stripe.TaxId;

          // Find the customer in our database
          const customer = await ctx.runQuery(
            internal.collections.stripe.customers.queries.getByStripeId,
            { stripeCustomerId: taxIdData.customer as string }
          );

          if (!customer) {
            console.warn(
              "Customer not found for tax ID creation:",
              taxIdData.customer
            );
            break;
          }

          // Create tax ID
          await ctx.runMutation(
            internal.collections.stripe.taxIds.mutations.createInternal,
            {
              customerId: customer._id,
              taxId: taxIdData.id,
              country: taxIdData.country || undefined,
              type: taxIdData.type || undefined,
              value: taxIdData.value,
              verification: taxIdData.verification
                ? {
                    status:
                      taxIdData.verification.status ?? ("unavailable" as const),
                    verifiedAddress:
                      taxIdData.verification.verified_address || undefined,
                    verifiedName:
                      taxIdData.verification.verified_name || undefined,
                  }
                : undefined,
            }
          );

          break;
        }

        case "customer.tax_id.updated": {
          const taxIdData = event.data.object as Stripe.TaxId;

          // Find the tax ID in our database
          const taxId = await ctx.runQuery(
            internal.collections.stripe.taxIds.queries.getByStripeIdInternal,
            { stripeTaxId: taxIdData.id }
          );

          if (!taxId) {
            console.warn("Tax ID not found for update:", taxIdData.id);
            break;
          }

          // Update tax ID
          await ctx.runMutation(
            internal.collections.stripe.taxIds.mutations.updateInternal,
            {
              id: taxId._id,
              verification: taxIdData.verification
                ? {
                    status:
                      taxIdData.verification.status ?? ("unavailable" as const),
                    verifiedAddress:
                      taxIdData.verification.verified_address || undefined,
                    verifiedName:
                      taxIdData.verification.verified_name || undefined,
                  }
                : undefined,
              country: taxIdData.country || undefined,
              type: taxIdData.type || undefined,
              value: taxIdData.value,
            }
          );

          break;
        }

        case "customer.tax_id.deleted": {
          const taxIdData = event.data.object as Stripe.TaxId;

          // Find the tax ID in our database
          const taxId = await ctx.runQuery(
            internal.collections.stripe.taxIds.queries.getByStripeIdInternal,
            { stripeTaxId: taxIdData.id }
          );

          if (!taxId) {
            console.warn("Tax ID not found for deletion:", taxIdData.id);
            break;
          }

          // Delete tax ID
          await ctx.runMutation(
            internal.collections.stripe.taxIds.mutations.deleteInternal,
            {
              id: taxId._id,
            }
          );

          break;
        }

        // ✅ SUBSCRIPTION EVENTS
        case "customer.subscription.created": {
          const subscriptionData = event.data.object as Stripe.Subscription;

          // Find the customer in our database
          const customer = await ctx.runQuery(
            internal.collections.stripe.customers.queries.getByStripeId,
            { stripeCustomerId: subscriptionData.customer as string }
          );

          if (!customer) {
            console.warn(
              "Customer not found for subscription:",
              subscriptionData.customer
            );
            break;
          }

          // Find the workspace in our database
          const workspace = await ctx.runQuery(
            internal.collections.workspaces.queries.getByIdInternal,
            { id: customer?.workspaceId }
          );

          if (!workspace) {
            console.warn(
              "Workspace not found for subscription:",
              customer?.workspaceId
            );
            break;
          }

          // Get Product Data
          const productData = await ctx.runQuery(
            internal.collections.stripe.products.queries.getByStripeId,
            {
              stripeProductId: subscriptionData.items?.data?.[0]?.price
                ?.product as string,
            }
          );

          if (!productData) {
            console.warn(
              "Product not found for subscription:",
              subscriptionData.id
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
          const metadata = subscriptionData.metadata as
            | Doc<"subscriptions">["metadata"]
            | undefined; // We created this metadata in the createCheckoutSession function and createShadowSubscriptionForYearly function);

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
              interval:
                firstItem?.price.recurring?.interval ?? ("month" as const),
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
              metadata,
              updatedAt: new Date().toISOString(),
            }
          );

          // Create subscription items
          if (subscriptionData.items?.data) {
            for (const item of subscriptionData.items.data) {
              // Find the price in our database
              const price = await ctx.runQuery(
                internal.collections.stripe.prices.queries.getByStripeId,
                { stripePriceId: item.price.id }
              );

              if (price) {
                await ctx.runMutation(
                  internal.collections.stripe.subscriptionItems.mutations
                    .createInternal,
                  {
                    stripeSubscriptionItemId: item.id,
                    subscriptionId,
                    priceId: price._id,
                    productId: price.productId,
                    quantity: item.quantity || 1,
                    metadata: price?.metadata || undefined,
                    updatedAt: new Date().toISOString(),
                  }
                );
              } else {
                console.warn(
                  "Price not found for subscription item:",
                  item.price.id
                );
              }
            }
          }
          // Update Clerk Organization with seat count from product metadata
          const seatCount = Number(
            productData?.metadata?.type === "subscription"
              ? productData?.metadata?.seats || 1
              : 1
          );
          const organizationId = workspace?.externalId;

          if (organizationId) {
            await ctx.runAction(internal.lib.clerk.updateOrganizationInternal, {
              organizationId,
              maxAllowedMemberships: seatCount,
            });
          }

          // Complete onboarding if it's not already completed
          await ctx.runMutation(
            internal.collections.onboarding.mutations.completeOnboarding,
            { workspaceId: customer.workspaceId }
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
            { stripeSubscriptionId: subscriptionData.id }
          );

          // Find the workspace
          const workspace = await ctx.runQuery(
            internal.collections.workspaces.queries.getByIdInternal,
            { id: existingSubscription?.workspaceId! }
          );

          if (existingSubscription && workspace) {
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

            const metadata = subscriptionData.metadata as
              | Doc<"subscriptions">["metadata"]
              | undefined; // We created this metadata in the createCheckoutSession function and createShadowSubscriptionForYearly function);

            await ctx.runMutation(
              internal.collections.stripe.subscriptions.mutations
                .updateInternal,
              {
                subscriptionId: existingSubscription._id,
                status: subscriptionData.status,
                currentPeriodStart,
                currentPeriodEnd,
                cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
                interval:
                  firstItem?.price.recurring?.interval ?? ("month" as const),
                canceledAt: subscriptionData.canceled_at
                  ? new Date(subscriptionData.canceled_at * 1000).toISOString()
                  : undefined,
                trialStart: subscriptionData.trial_start
                  ? new Date(subscriptionData.trial_start * 1000).toISOString()
                  : undefined,
                trialEnd: subscriptionData.trial_end
                  ? new Date(subscriptionData.trial_end * 1000).toISOString()
                  : undefined,
                metadata,
                updatedAt: new Date().toISOString(),
              }
            );

            // Expire trial credits when first invoice is paid (end of trial)
            if (isEndOfTrial) {
              await ctx.runMutation(
                internal.collections.stripe.transactions.mutations
                  .expireTrialCredits,
                { workspaceId: workspace._id }
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
                `Trial cancelled for workspace ${workspace._id} - credits will expire at trial end`
              );
              // No action needed - trial credits will expire naturally at currentPeriodEnd
            }

            // Check for plan changes before updating subscription items
            const oldSubscriptionItems = await ctx.runQuery(
              internal.collections.stripe.subscriptionItems.queries
                .getBySubscriptionIdInternal,
              { subscriptionId: existingSubscription._id }
            );
            const oldMainPlanItem = oldSubscriptionItems.find(
              (item) =>
                item.metadata?.type === "subscription" &&
                item.metadata?.isShadow !== "true"
            );
            const newMainPlanItem = subscriptionData.items.data.find(
              (item) => item.metadata?.isShadow !== "true"
            );

            if (
              oldMainPlanItem &&
              newMainPlanItem &&
              oldMainPlanItem.stripeSubscriptionItemId === newMainPlanItem.id && // It's an update, not a new item
              oldMainPlanItem.priceId !==
                (
                  await ctx.runQuery(
                    internal.collections.stripe.prices.queries.getByStripeId,
                    { stripePriceId: newMainPlanItem.price.id }
                  )
                )?._id
            ) {
              // This indicates a plan change (price has changed on the main item)
              // If the old plan was a yearly plan, we need to cancel its shadow subscription.
              const oldPrice = await ctx.runQuery(
                internal.collections.stripe.prices.queries.getByIdInternal,
                { id: oldMainPlanItem.priceId }
              );

              if (oldPrice?.interval === "year") {
                try {
                  // Get all active subscriptions for this customer
                  const shadowSubscriptions = await stripe.subscriptions.list({
                    customer: subscriptionData.customer as string,
                    status: "active",
                  });

                  // Filter for shadow subscriptions related to this parent subscription
                  for (const shadow of shadowSubscriptions.data) {
                    if (
                      shadow.metadata?.isShadow === "true" &&
                      shadow.metadata?.parentSubscription ===
                        subscriptionData.id
                    ) {
                      console.log(
                        `Canceling shadow subscription ${shadow.id} due to plan change from yearly plan.`
                      );
                      await stripe.subscriptions.cancel(shadow.id);
                    }
                  }
                } catch (error) {
                  console.error(
                    "Failed to cancel shadow subscription during plan change:",
                    error
                  );
                  // Non-critical, don't block webhook processing
                }
              }
            }

            // Check for plan changes
            const currentSubscriptionItems = await ctx.runQuery(
              internal.collections.stripe.subscriptionItems.queries
                .getBySubscriptionIdInternal,
              { subscriptionId: existingSubscription._id }
            );

            // Get current main plan product
            let currentPlanProduct = null;
            for (const currentItem of currentSubscriptionItems) {
              if (
                currentItem.metadata?.type === "subscription" &&
                currentItem.metadata?.isShadow !== "true"
              ) {
                currentPlanProduct = await ctx.runQuery(
                  internal.collections.stripe.products.queries.getByIdInternal,
                  { id: currentItem.productId }
                );
                break;
              }
            }

            // Get new main plan product
            let newPlanProduct = null;
            if (subscriptionData.items?.data) {
              for (const item of subscriptionData.items.data) {
                // Find the price in our database
                const price = await ctx.runQuery(
                  internal.collections.stripe.prices.queries.getByStripeId,
                  { stripePriceId: item.price.id }
                );

                if (price) {
                  // Get the product
                  const product = await ctx.runQuery(
                    internal.collections.stripe.products.queries
                      .getByIdInternal,
                    { id: price.productId }
                  );

                  if (product?.metadata?.type === "subscription") {
                    newPlanProduct = product;
                    break;
                  }
                }
              }
            }

            // Detect plan changes
            const planChanged = currentPlanProduct?._id !== newPlanProduct?._id;
            if (planChanged) {
              console.log(
                `Plan changed for workspace ${existingSubscription.workspaceId}: ${currentPlanProduct?.name} -> ${newPlanProduct?.name}`
              );
            }

            // Update subscription items
            if (subscriptionData.items?.data) {
              for (const item of subscriptionData.items.data) {
                // Check if subscription item already exists
                const existingItem = await ctx.runQuery(
                  internal.collections.stripe.subscriptionItems.queries
                    .getByStripeId,
                  { stripeSubscriptionItemId: item.id }
                );

                // Find the price in our database
                const price = await ctx.runQuery(
                  internal.collections.stripe.prices.queries.getByStripeId,
                  { stripePriceId: item.price.id }
                );

                if (!price) {
                  console.warn(
                    "Price not found for subscription item:",
                    item.price.id
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
                      productId: price.productId,
                      quantity: item.quantity || 1,
                      metadata: price?.metadata || undefined,
                      updatedAt: new Date().toISOString(),
                    }
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
                      productId: price.productId,
                      quantity: item.quantity || 1,
                      metadata: price?.metadata || undefined,
                      updatedAt: new Date().toISOString(),
                    }
                  );
                }
              }
            }

            // Update workspace with new plan seat count if plan changed
            if (planChanged && newPlanProduct) {
              try {
                const newSeatCount = Number(
                  newPlanProduct.metadata?.type === "subscription"
                    ? newPlanProduct.metadata?.seats || 1
                    : 1
                );
                const workspaceType = newSeatCount > 1 ? "team" : "personal";

                await ctx.runMutation(
                  internal.collections.workspaces.mutations.updateSeatsAndPlan,
                  {
                    workspaceId: existingSubscription.workspaceId,
                    type: workspaceType,
                    seats: newSeatCount,
                  }
                );

                // If downgrading to a single-seat plan, remove extra members
                if (newSeatCount === 1) {
                  await ctx.runMutation(
                    internal.collections.members.utils.batchDeleteByWorkspaceId,
                    {
                      workspaceId: workspace._id,
                      ownerId: workspace.ownerId,
                      numItems: 25,
                    }
                  );
                }
              } catch (error) {
                console.error(
                  `Failed to update workspace for plan change in workspace ${existingSubscription.workspaceId}:`,
                  error
                );
                // Don't throw error to avoid webhook failure
              }
            }
          } else {
            console.warn(
              "Subscription not found in database:",
              subscriptionData.id
            );
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscriptionData = event.data.object as Stripe.Subscription;

          // Find existing subscription
          const existingSubscription = await ctx.runQuery(
            internal.collections.stripe.subscriptions.queries.getByStripeId,
            { stripeSubscriptionId: subscriptionData.id }
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
                      `Canceling shadow subscription ${shadow.id} for canceled main subscription ${subscriptionData.id}`
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
              }
            );

            // Clean up subscription items
            await ctx.runMutation(
              internal.collections.stripe.subscriptionItems.mutations
                .deleteBySubscriptionIdInternal,
              {
                subscriptionId: existingSubscription._id,
              }
            );
          } else {
            console.warn(
              "Subscription not found for deletion:",
              subscriptionData.id
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
            { stripeProductId: productData.id }
          );

          if (existingProduct) {
            const metadata = productData.metadata as
              | Doc<"products">["metadata"]
              | undefined; // We trust Stripe, also it's still validated run-time

            // Update existing product
            await ctx.runMutation(
              internal.collections.stripe.products.mutations.updateInternal,
              {
                productId: existingProduct._id,
                name: productData.name,
                description: productData.description || undefined,
                active: productData.active,
                metadata,
                updatedAt: new Date().toISOString(),
              }
            );
          } else {
            const metadata = productData.metadata as
              | Doc<"products">["metadata"]
              | undefined; // We trust Stripe, also it's still validated run-time

            // Create new product
            await ctx.runMutation(
              internal.collections.stripe.products.mutations.createInternal,
              {
                stripeProductId: productData.id,
                name: productData.name,
                description: productData.description || undefined,
                active: productData.active,
                metadata,
                updatedAt: new Date().toISOString(),
              }
            );
          }
          break;
        }

        case "product.deleted": {
          const productData = event.data.object as Stripe.Product;

          // Find existing product
          const existingProduct = await ctx.runQuery(
            internal.collections.stripe.products.queries.getByStripeId,
            { stripeProductId: productData.id }
          );

          if (existingProduct) {
            // Soft delete: mark as inactive instead of hard deletion
            await ctx.runMutation(
              internal.collections.stripe.products.mutations.updateInternal,
              {
                productId: existingProduct._id,
                active: false,
                updatedAt: new Date().toISOString(),
              }
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
            { stripePriceId: priceData.id }
          );

          // Find the product in our database
          const product = await ctx.runQuery(
            internal.collections.stripe.products.queries.getByStripeId,
            { stripeProductId: priceData.product as string }
          );

          if (!product) {
            console.warn("Product not found for price:", priceData.product);
            break;
          }

          if (existingPrice) {
            const metadata = priceData.metadata as
              | Doc<"prices">["metadata"]
              | undefined; // We trust Stripe, also it's still validated run-time

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
                metadata,
                updatedAt: new Date().toISOString(),
              }
            );
          } else {
            const metadata = priceData.metadata as
              | Doc<"prices">["metadata"]
              | undefined; // We trust Stripe, also it's still validated run-time
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
                metadata,
                updatedAt: new Date().toISOString(),
              }
            );
          }
          break;
        }

        case "price.deleted": {
          const priceData = event.data.object as Stripe.Price;

          // Find existing price
          const existingPrice = await ctx.runQuery(
            internal.collections.stripe.prices.queries.getByStripeId,
            { stripePriceId: priceData.id }
          );

          if (existingPrice) {
            // Soft delete: mark as inactive instead of hard deletion
            await ctx.runMutation(
              internal.collections.stripe.prices.mutations.updateInternal,
              {
                priceId: existingPrice._id,
                active: false,
                updatedAt: new Date().toISOString(),
              }
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
            { stripeCustomerId: invoiceData.customer as string }
          );

          if (!customer) {
            console.warn(
              "Customer not found for invoice:",
              invoiceData.customer
            );
            break;
          }

          // Find subscription if it exists
          const subscriptionId = invoiceData.lines?.data?.[0]?.subscription;
          let subscription = null;
          if (subscriptionId) {
            subscription = await ctx.runQuery(
              internal.collections.stripe.subscriptions.queries.getByStripeId,
              { stripeSubscriptionId: subscriptionId as string }
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
                      invoiceData.status_transitions.paid_at * 1000
                    ).toISOString()
                  : undefined,
                updatedAt: new Date().toISOString(),
              }
            );
          } else {
            // Update existing invoice
            const existingInvoice = await ctx.runQuery(
              internal.collections.stripe.invoices.queries.getByStripeId,
              { stripeInvoiceId: invoiceData.id as string }
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
                        invoiceData.status_transitions.paid_at * 1000
                      ).toISOString()
                    : undefined,
                  updatedAt: new Date().toISOString(),
                }
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
            { stripeCustomerId: invoiceData.customer as string }
          );

          if (!customer) {
            console.warn(
              "Customer not found for invoice:",
              invoiceData.customer
            );
            break;
          }

          // Check if this is an upgrade/downgrade scenario (different products involved)
          const prorationLines = lines.filter(
            (line) =>
              line.parent?.subscription_item_details?.proration &&
              invoiceData.amount_paid > 0
          );

          // True upgrade/downgrade involves different products
          const uniqueProducts = new Set(
            prorationLines.map((line) => line.pricing?.price_details?.product)
          );
          const hasUpgradeDowngrade = uniqueProducts.size > 1;

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
              { stripeSubscriptionId: subscriptionId }
            );

            const subscriptionItem = await ctx.runQuery(
              internal.collections.stripe.subscriptionItems.queries
                .getByStripeId,
              { stripeSubscriptionItemId: subscriptionItemId }
            );

            const price = await ctx.runQuery(
              internal.collections.stripe.prices.queries.getByStripeId,
              { stripePriceId: priceId as string }
            );

            // Get product, price, subscription items
            const product = await ctx.runQuery(
              internal.collections.stripe.products.queries.getByStripeId,
              {
                stripeProductId: line.pricing?.price_details?.product as string,
              }
            );

            if (!subscription || !subscriptionItem || !price || !product) {
              console.warn(
                "Missing required fields for line:",
                `${line}missing: ${subscriptionId ? "subscriptionId" : ""}${subscriptionItemId ? "subscriptionItemId" : ""}${priceId ? "priceId" : ""}${productId ? "productId" : ""}`
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
                }
              );
              break;
            }

            // SHADOW SUBSCRIPTION
            if (
              subscription.metadata?.isShadow === "true" &&
              invoiceData.amount_paid === 0
            ) {
              const parentSubscriptionStripeId =
                subscription.metadata?.parentSubscription;
              const parentSubscription = await ctx.runQuery(
                internal.collections.stripe.subscriptions.queries.getByStripeId,
                {
                  stripeSubscriptionId: parentSubscriptionStripeId,
                }
              );

              if (!parentSubscription) {
                console.warn(
                  "Parent subscription not found for shadow subscription:",
                  parentSubscriptionStripeId
                );
                break;
              }

              const monthlyCredits = await getCreditAmountForPlan(product);

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
                  reason:
                    "Shadow subscription - monthly credits allocation from parent yearly subscription",
                  idempotencyKey: `credits-${customer.workspaceId}-${product.stripeProductId}-${subscription.currentPeriodStart}-${subscription.currentPeriodEnd}`,
                  updatedAt: new Date().toISOString(),
                }
              );

              break;
            }

            // TOP-UP CREDITS
            if (
              product.metadata?.type === "top-up" &&
              product.metadata?.topupType === "extra-credit"
            ) {
              const quantity = line.quantity || 1;

              // Add credits to the customer (1 credit per quantity)
              await ctx.runMutation(
                internal.collections.stripe.transactions.mutations
                  .createIdempotent,
                {
                  workspaceId: customer.workspaceId,
                  customerId: customer._id,
                  subscriptionId: subscription?._id,
                  amount: quantity, // 1 credit per unit
                  type: "topup",
                  periodStart: subscription.currentPeriodStart,
                  expiresAt: subscription.currentPeriodEnd,
                  reason: "Top-up credits allocation",
                  idempotencyKey: `credits-${customer.workspaceId}-${product.stripeProductId}-${subscription.currentPeriodStart}-${subscription.currentPeriodEnd}-q:${quantity}`,
                  updatedAt: new Date().toISOString(),
                }
              );

              break;
            }

            // PAID CREDITS (Regular Monthly Subscriptions - excluding prorations)
            if (
              invoiceData.amount_paid > 0 &&
              price.interval === "month" &&
              !proration
            ) {
              const monthlyCredits = await getCreditAmountForPlan(product);

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
                  idempotencyKey: `credits-${customer.workspaceId}-${product.stripeProductId}-${subscription.currentPeriodStart}-${subscription.currentPeriodEnd}`,
                  updatedAt: new Date().toISOString(),
                }
              );

              break;
            }

            // PAID CREDITS (Upgrade/Downgrade during period)
            if (
              invoiceData.amount_paid > 0 &&
              proration &&
              hasUpgradeDowngrade &&
              price.interval === "month" &&
              line.amount > 0 // Only process positive line items (new plan charges)
            ) {
              // Handle upgrade/downgrade scenario
              // Only process positive line items (the new plan)
              if (line.amount > 0) {
                // Calculate prorated credits for the new plan
                const lineStart = line.period?.start
                  ? new Date(line.period.start * 1000)
                  : new Date(subscription.currentPeriodStart);
                const lineEnd = line.period?.end
                  ? new Date(line.period.end * 1000)
                  : new Date(subscription.currentPeriodEnd);

                // Get the full monthly credit amount for this product
                const monthlyCredits = await getCreditAmountForPlan(product);

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
                  monthlyCredits * prorationRatio
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
                    idempotencyKey: `${changeType}-${customer.workspaceId}-${product.stripeProductId}-${lineStart.toISOString()}-${lineEnd.toISOString()}`,
                    updatedAt: new Date().toISOString(),
                  }
                );
              }

              // For downgrades, we don't create negative credits - let excess credits expire naturally
              // This provides better UX as users don't lose credits immediately
              break;
            }

            // Mid-cycle seat additions are no longer supported with fixed pricing plans
            // Plans have fixed seat counts and pricing

            // PAID CREDITS (Yearly Upgrade/Downgrade during period)
            if (
              invoiceData.amount_paid > 0 &&
              proration &&
              hasUpgradeDowngrade &&
              price.interval === "year" &&
              line.amount > 0 // Only process positive line items (new plan charges)
            ) {
              // Handle yearly plan upgrade/downgrade
              // Only process positive line items (the new plan)
              if (line.amount > 0) {
                // For yearly plans, give prorated credits for current month only
                const lineStart = line.period?.start
                  ? new Date(line.period.start * 1000)
                  : new Date(subscription.currentPeriodStart);

                // Get the monthly credit amount (not yearly)
                const monthlyCredits = await getCreditAmountForPlan(product);

                // Calculate prorated credits for the current month only
                const now = new Date();
                const currentMonthStart = new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  1
                );
                const nextMonthStart = new Date(
                  now.getFullYear(),
                  now.getMonth() + 1,
                  1
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
                      currentMonthStart.getTime()
                    )) /
                    (1000 * 60 * 60 * 24)
                );
                const monthlyProrationRatio =
                  remainingDaysInMonth / totalDaysInMonth;
                const proratedCredits = Math.floor(
                  monthlyCredits * monthlyProrationRatio
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
                      reason: `Yearly plan ${changeType} - prorated credits for current month (${Math.round(monthlyProrationRatio * 100)}% of month)`,
                      idempotencyKey: `yearly-${changeType}-${customer.workspaceId}-${product.stripeProductId}-${currentMonthStart.toISOString()}-${nextMonthStart.toISOString()}`,
                      updatedAt: new Date().toISOString(),
                    }
                  );
                }

                // The shadow subscription will be updated automatically to handle future months
              }
              break;
            }

            // Yearly mid-cycle seat additions are no longer supported with fixed pricing plans
            // Plans have fixed seat counts and pricing

            // PAID CREDITS (Yearly Subscriptions - Managing Shadow Subscription)
            if (
              invoiceData.amount_paid > 0 &&
              price.interval === "year" &&
              !proration &&
              product.metadata?.type === "subscription"
            ) {
              // Check if shadow subscription already exists for this customer
              const shadowPrice = await ctx.runQuery(
                internal.collections.stripe.prices.queries.getByStripeId,
                { stripePriceId: product.metadata?.shadowPriceId }
              );

              if (!shadowPrice) {
                console.warn(
                  "Shadow price not found for product:",
                  product.stripeProductId
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
                  `Shadow subscription already exists for customer ${customer.stripeCustomerId} - using parent subscription for seat count`
                );
              } else {
                // No shadow subscription exists, create a new one
                console.log(
                  `Creating new shadow subscription for customer ${customer.stripeCustomerId}`
                );

                const shadowSubscription =
                  await createShadowSubscriptionForYearly(
                    customer.stripeCustomerId,
                    shadowPrice.stripePriceId,
                    subscription.stripeSubscriptionId
                  );

                if (!shadowSubscription) {
                  console.warn(
                    "Shadow subscription not created for product:",
                    product.stripeProductId
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
            { stripeCustomerId: paymentIntentData.customer as string }
          );

          if (!customer) {
            console.warn(
              "Customer not found for payment intent:",
              paymentIntentData.customer
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
              }
            );
          } else {
            // Update existing payment
            const existingPayment = await ctx.runQuery(
              internal.collections.stripe.payments.queries.getByStripeId,
              { stripePaymentIntentId: paymentIntentData.id }
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
                }
              );
            } else {
              console.warn(
                "Payment intent not found in database:",
                paymentIntentData.id
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
            { stripeCustomerId: paymentMethodData.customer as string }
          );

          if (!customer) {
            console.warn(
              "Customer not found for payment method:",
              paymentMethodData.customer
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
            }
          );
          break;
        }

        case "payment_method.updated": {
          const paymentMethodData = event.data.object as Stripe.PaymentMethod;

          // Find existing payment method
          const existingPaymentMethod = await ctx.runQuery(
            internal.collections.stripe.paymentMethods.queries.getByStripeId,
            { stripePaymentMethodId: paymentMethodData.id }
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
              }
            );
          } else {
            console.warn(
              "Payment method not found in database:",
              paymentMethodData.id
            );
          }
          break;
        }

        case "payment_method.detached": {
          const paymentMethodData = event.data.object as Stripe.PaymentMethod;

          // Find existing payment method
          const existingPaymentMethod = await ctx.runQuery(
            internal.collections.stripe.paymentMethods.queries.getByStripeId,
            { stripePaymentMethodId: paymentMethodData.id }
          );

          if (existingPaymentMethod) {
            // For detached payment methods, we could either delete the record
            // or mark it as inactive. Let's delete it since it's no longer usable
            await ctx.runMutation(
              internal.collections.stripe.paymentMethods.mutations
                .deleteInternal,
              {
                paymentMethodId: existingPaymentMethod._id,
              }
            );
          } else {
            console.warn(
              "Payment method not found for detachment:",
              paymentMethodData.id
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
        }
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
          }
        );
      }

      // Re-throw to ensure webhook returns error status
      throw error;
    }
  },
});
