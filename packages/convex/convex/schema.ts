import { defineSchema } from "convex/server";
import { campaignSchema } from "./collections/campaigns/schema";
import { landingPageMessagesSchema } from "./collections/landingPages/messages/schema";
import { landingPagesSchema } from "./collections/landingPages/schema";
import { landingPageTemplatesSchema } from "./collections/landingPages/templates/schema";
import { landingPageVersionsSchema } from "./collections/landingPages/versions/schema";
import { projectSchema } from "./collections/projects/schema";
import { documentChunksSchema } from "./collections/storage/documents/chunks/schema";
import { documentsSchema } from "./collections/storage/documents/schema";

import { audienceSchema } from "./collections/brands/audiences/schema";
import { featureSchema } from "./collections/brands/features/schema";
import { brandSchema } from "./collections/brands/schema";
import { socialSchema } from "./collections/brands/socials/schema";
import { testimonialSchema } from "./collections/brands/testimonials/schema";
import { themeSchema } from "./collections/brands/themes/schema";
import { customDomainSchema } from "./collections/domains/custom/schema";
import { projectDomainsSchema } from "./collections/domains/project/schema";
import { formSchema } from "./collections/forms/schema";
import { formSubmissionSchema } from "./collections/forms/submissions/schema";
import { invitationSchema } from "./collections/invitations/schema";
import { memberSchema } from "./collections/members/schema";
import { onboardingSchema } from "./collections/onboarding/schema";
import { memoizedDocumentsSchema } from "./collections/storage/documents/memoized/schema";
import { documentVectorsSchema } from "./collections/storage/documents/vectors/schema";
import { knowledgeBaseSchema } from "./collections/storage/knowledgeBases/schema";
import { mediaSchema } from "./collections/storage/media/schema";
import { mediaVectorsSchema } from "./collections/storage/media/vectors/schema";
import { customerSchema } from "./collections/stripe/customers/schema";
import { invoiceSchema } from "./collections/stripe/invoices/schema";
import { paymentMethodSchema } from "./collections/stripe/paymentMethods/schema";
import { paymentSchema } from "./collections/stripe/payments/schema";
import { priceSchema } from "./collections/stripe/prices/schema";
import { productSchema } from "./collections/stripe/products/schema";
import { subscriptionItemSchema } from "./collections/stripe/subscriptionItems/schema";
import { subscriptionSchema } from "./collections/stripe/subscriptions/schema";
import { taxIdSchema } from "./collections/stripe/taxIds/schema";
import { transactionSchema } from "./collections/stripe/transactions/schema";
import { webhookEventSchema } from "./collections/stripe/webhookEvents/schema";
import { userSchema } from "./collections/users/schema";
import { workspaceSchema } from "./collections/workspaces/schema";

export default defineSchema({
	users: userSchema,
	workspaces: workspaceSchema,
	projects: projectSchema,
	onboarding: onboardingSchema,
	campaigns: campaignSchema,
	forms: formSchema,
	formSubmissions: formSubmissionSchema,
	landingPageTemplates: landingPageTemplatesSchema,
	landingPages: landingPagesSchema,
	landingPageVersions: landingPageVersionsSchema,
	landingPageMessages: landingPageMessagesSchema,
	media: mediaSchema,
	mediaVectors: mediaVectorsSchema,
	customDomains: customDomainSchema,
	projectDomains: projectDomainsSchema,
	documents: documentsSchema,
	documentChunks: documentChunksSchema,
	documentVectors: documentVectorsSchema,
	knowledgeBases: knowledgeBaseSchema,
	brands: brandSchema,
	themes: themeSchema,
	audiences: audienceSchema,
	features: featureSchema,
	testimonials: testimonialSchema,
	socials: socialSchema,

	// Stripe Tables
	transactions: transactionSchema,
	customers: customerSchema,
	subscriptions: subscriptionSchema,
	subscriptionItems: subscriptionItemSchema,
	invoices: invoiceSchema,
	paymentMethods: paymentMethodSchema,
	payments: paymentSchema,
	products: productSchema,
	prices: priceSchema,
	webhookEvents: webhookEventSchema,
	invitations: invitationSchema,
	members: memberSchema,
	taxIds: taxIdSchema,

	// Helper Tables
	memoizedDocuments: memoizedDocumentsSchema,
});
