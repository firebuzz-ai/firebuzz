// LLM Directives:
// - You are not allowed to change any key in the seoConfiguration object
// - You can change the values based on user requests e.g. "I want to change the meta title to 'My new title'"

export const seoConfiguration = {
	title: "Firebuzz",
	description:
		"Firebuzz is an AI-powered landing page builder and marketing platform.",
	canonical: "https://getfirebuzz.com",
	indexable: true,
	iconType: "image/png",
	icon: "https://cdn.getfirebuzz.com/firebuzz-favicon.png",
	openGraph: {
		title: "Firebuzz",
		description:
			"Firebuzz is an AI-powered landing page builder and marketing platform.",
		image: "https://cdn.getfirebuzz.com/firebuzz-og-image.png",
		url: "https://firebuzz.com",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Firebuzz",
		description:
			"Firebuzz is an AI-powered landing page builder and marketing platform.",
		image: "https://cdn.getfirebuzz.com/firebuzz-og-image.png",
		url: "https://getfirebuzz.com",
	},
};
