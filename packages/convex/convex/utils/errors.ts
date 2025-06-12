export const ERRORS = {
  // Authentication.
  UNAUTHORIZED: "Unauthorized.",
  // Workspaces.
  PERSONAL_WORKSPACE_LIMIT_REACHED:
    "You already have 2 personal workspaces. Please upgrade to a team workspace to create more.",
  // Stripe.
  STRIPE_MISSING_SIGNATURE: "Unable to verify webhook signature.",
  STRIPE_MISSING_ENDPOINT_SECRET: "Unable to verify webhook endpoint.",
  STRIPE_CUSTOMER_ALREADY_EXISTS: "Customer already exists.",
  STRIPE_CUSTOMER_NOT_CREATED: "Unable to create customer.",
  STRIPE_SOMETHING_WENT_WRONG:
    "Something went wrong while trying to handle Stripe API.",
  // Firecrawl.
  FIRECRAWL_MAP_URL_ERROR: "Something went wrong while trying to map URL.",
  FIRECRAWL_SCRAPE_URLS_ERROR:
    "Something went wrong while trying to scrape URLs.",
  // Misc.
  UNKNOWN: "Unknown error.",
  NOT_FOUND: "Not found.",
  INVALID_ARGUMENTS: "Invalid arguments.",
  ENVS_NOT_INITIALIZED: "Environment variables not initialized.",
  SOMETHING_WENT_WRONG: "Something went wrong.",
} as const;
