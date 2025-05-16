import { createFal } from "@ai-sdk/fal";
import { envFal } from "@firebuzz/env";
import "server-only";

export const fal = createFal({
	apiKey: envFal().FAL_API_KEY,
});
