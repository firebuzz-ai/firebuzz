import type { Doc } from "@firebuzz/convex";
import { FileSystem } from "@firebuzz/file-system";

export const applySeoToTemplate = (
	templateFiles: string,
	brand: Doc<"brands">,
) => {
	const fileSystem = new FileSystem(templateFiles);
	const seoConfigPath = "src/configuration/seo.ts";

	const r2PublicUrl = process.env.R2_PUBLIC_URL;

	const buildFullUrl = (key?: string) => {
		if (!key) return undefined;
		if (key.startsWith("http")) return key;
		return `${r2PublicUrl}/${key}`;
	};

	const seoConfig = {
		title: brand.seo?.metaTitle,
		description: brand.seo?.metaDescription,
		canonical: brand.website,
		indexable: !brand.seo?.noIndex,
		iconType: "image/png",
		icon: buildFullUrl(brand.seo?.favicon),
		openGraph: {
			title: brand.seo?.opengraph?.title,
			description: brand.seo?.opengraph?.description,
			image: buildFullUrl(brand.seo?.opengraph?.image),
			url: brand.website,
			type: brand.seo?.opengraph?.type,
		},
		twitter: {
			card: brand.seo?.twitterCard?.type,
			title: brand.seo?.twitterCard?.title,
			description: brand.seo?.twitterCard?.description,
			image: buildFullUrl(brand.seo?.twitterCard?.image),
			url: brand.website,
		},
	};

	const configString = `
// LLM Directives:
// - You are not allowed to change any key in the seoConfiguration object
// - You can change the values based on user requests e.g. "I want to change the meta title to 'My new title'"

export const seoConfiguration = ${JSON.stringify(seoConfig, null, 2)};
`.trim();

	fileSystem.writeFile(seoConfigPath, configString);

	return fileSystem.toString();
};
