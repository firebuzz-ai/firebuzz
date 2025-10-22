import type { Doc } from "@firebuzz/convex";
import type { TarFileSystem } from "@firebuzz/file-system-v2";
import { ConvexError } from "convex/values";

// ===========================
// TEMPLATE PREPARATION
// ===========================

/**
 * Helper: Apply theme customizations to tar file system
 */
export function applyThemeToTar(fs: TarFileSystem, theme: Doc<"themes">): void {
	// NOTE: We no longer modify tailwind.config.js for fonts
	// The template already uses CSS variables: fontFamily: { sans: ["var(--font-sans)", ...] }

	// Update index.html to import Google fonts
	const indexPath = "./index.html";
	const googleFonts = theme.fonts?.filter((font) => font.type === "google");
	const fontLinks =
		googleFonts
			?.map(
				(font) =>
					`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${font.name.replace(/ /g, "+")}:wght@400;700&display=swap">`,
			)
			.join("\n") ?? "";

	if (fontLinks) {
		const currentIndex = fs.readFile(indexPath);
		const updatedIndex = currentIndex.replace(
			"</head>",
			`${fontLinks}\n</head>`,
		);
		fs.writeFile(indexPath, updatedIndex);
	}

	// Update src/index.css with theme colors AND fonts
	const cssPath = "./src/index.css";

	// Build font CSS variables from theme.fonts array
	const fontVars: string[] = [];
	if (theme.fonts) {
		for (const font of theme.fonts) {
			if (
				font.family === "sans" ||
				font.family === "serif" ||
				font.family === "mono"
			) {
				fontVars.push(`\t\t--font-${font.family}: "${font.name}";`);
			}
		}
	}

	// Build light theme CSS (fonts + colors + radius)
	const lightThemeVars = Object.entries(theme.lightTheme).map(
		([key, value]) => {
			// Convert camelCase to kebab-case
			const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
			return `\t\t--${kebabKey}: ${value};`;
		},
	);

	// Combine fonts (first) + light theme vars
	const lightThemeCss = [...fontVars, ...lightThemeVars].join("\n");

	// Build dark theme CSS (only colors, NO fonts or radius)
	const darkThemeCss = Object.entries(theme.darkTheme)
		.map(([key, value]) => {
			// Convert camelCase to kebab-case
			const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
			return `\t\t--${kebabKey}: ${value};`;
		})
		.join("\n");

	const newLayerBase = `@layer base {
	:root {
${lightThemeCss}
	}
	.dark {
${darkThemeCss}
	}
}`;

	const currentCss = fs.readFile(cssPath);
	// Replace @layer base block with theme variables
	const layerBaseRegex =
		/@layer base\s*{[\s\S]*?:root\s*{[\s\S]*?}[\s\S]*?\.dark\s*{[\s\S]*?}[\s\S]*?}/g;

	let updatedCss: string;
	if (layerBaseRegex.test(currentCss)) {
		updatedCss = currentCss.replace(layerBaseRegex, newLayerBase);
	} else {
		// Insert after @tailwind utilities
		const utilitiesRegex = /@tailwind utilities;/;
		if (utilitiesRegex.test(currentCss)) {
			updatedCss = currentCss.replace(
				utilitiesRegex,
				`@tailwind utilities;\n\n/* ... */\n\n${newLayerBase}`,
			);
		} else {
			updatedCss = `${currentCss}\n\n${newLayerBase}`;
		}
	}

	fs.writeFile(cssPath, updatedCss);
}

/**
 * Helper: Apply campaign configuration to tar file system
 */
export function applyCampaignToTar(
	fs: TarFileSystem,
	campaign: Doc<"campaigns">,
	form: Doc<"forms"> | null,
): void {
	if (campaign.type === "lead-generation" && !form) {
		throw new ConvexError("Form not found for lead-generation campaign");
	}

	const campaignConfigPath = "./src/configuration/campaign.ts";

	// Get schema from canvas nodes
	const formNode = form?.nodes?.find(
		(node) => node.type === "form" && node.data,
	);
	const schema = formNode?.data?.schema || [];

	const primaryGoal = {
		event_id: campaign.campaignSettings.primaryGoal.id,
		event_type: campaign.campaignSettings.primaryGoal.type,
		event_value: campaign.campaignSettings.primaryGoal.value,
		event_value_type: campaign.campaignSettings.primaryGoal.isCustom
			? "dynamic"
			: "static",
		event_value_currency: campaign.campaignSettings.primaryGoal.currency,
		isCustom: campaign.campaignSettings.primaryGoal.isCustom,
	};

	const customEvents = campaign.campaignSettings.customEvents?.map((event) => ({
		event_id: event.id,
		event_type: event.type,
		event_value: event.value,
		event_value_type: "dynamic",
		event_value_currency: event.currency,
		isCustom: event.isCustom,
	}));

	const campaignConfig = {
		primaryGoal,
		customEvents,
		campaignType: campaign.type,
		formId: form?._id,
		schema: schema,
		submitButtonText: formNode?.data?.submitButtonText,
		successMessage: formNode?.data?.successMessage,
		successRedirectUrl: formNode?.data?.successRedirectUrl,
	};

	const configString = `
// LLM Directives:
// - You are NOT ALLOWED to delete file or anything in this file.
// - You can get new schema or new primary goal or new custom events with your TOOLS and you can change them in this file. Don't change them manually, only trust server side data that you get from the tool calls.
// - You are NOT ALLOWED to change schema items any value rather than "title", "description" or "placeholder", "submitButtonText", "successMessage", "successRedirectUrl" (these only), if user requests to change it you should not do it because it will throw an error on server side. If users insist it let them know they need to change their campaign settings.
// - Beyond these instructions, you are allowed to change anything in this file.

export const campaignConfiguration = ${JSON.stringify(campaignConfig, null, 2)};`.trim();

	fs.writeFile(campaignConfigPath, configString);
}

/**
 * Helper: Apply SEO configuration to tar file system
 */
export function applySeoToTar(fs: TarFileSystem, brand: Doc<"brands">): void {
	const seoConfigPath = "./src/configuration/seo.ts";
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

	fs.writeFile(seoConfigPath, configString);
}

/**
 * Helper: Apply brand assets to tar file system
 */
export function applyBrandAssetsToTar(
	fs: TarFileSystem,
	brand: Doc<"brands">,
): void {
	const r2PublicUrl = process.env.R2_PUBLIC_URL;

	const buildFullUrl = (key?: string) => {
		if (!key)
			return "https://cdn-dev.getfirebuzz.com/template-assets/logo-light.svg"; // fallback
		if (key.startsWith("http")) return key;
		return `${r2PublicUrl}/${key}`;
	};

	// Update logo-light.tsx
	const logoLightPath = "./src/components/brand/logo-light.tsx";
	const logoLightSrc = buildFullUrl(brand.logo);
	const logoLightContent = `import { Image } from "@/components/ui/image";

interface LogoLightProps {
  width?: number;
  height?: number;
}

export function LogoLight({ height = 20, width = 70 }: LogoLightProps) {
  const src = "${logoLightSrc}";
  const alt = "Logo";

  return <Image src={src} alt={alt} width={width} height={height} />;
}
`;

	// Update logo-dark.tsx
	const logoDarkPath = "./src/components/brand/logo-dark.tsx";
	const logoDarkSrc = buildFullUrl(brand.logoDark || brand.logo);
	const logoDarkContent = `import { Image } from "@/components/ui/image";

interface LogoDarkProps {
  width?: number;
  height?: number;
}

export function LogoDark({ width = 70, height = 20 }: LogoDarkProps) {
  const src = "${logoDarkSrc}";
  const alt = "Logo";
  return <Image src={src} alt={alt} width={width} height={height} />;
}
`;

	// Update icon-light.tsx
	const iconLightPath = "./src/components/brand/icon-light.tsx";
	const iconLightSrc = buildFullUrl(brand.icon);
	const iconLightContent = `import { Image } from "@/components/ui/image";

interface IconLightProps {
  size?: number;
}

export function IconLight({ size = 32 }: IconLightProps) {
  const src = "${iconLightSrc}";
  const alt = "Icon";

  return <Image src={src} alt={alt} width={size} height={size} />;
}
`;

	// Update icon-dark.tsx
	const iconDarkPath = "./src/components/brand/icon-dark.tsx";
	const iconDarkSrc = buildFullUrl(brand.iconDark || brand.icon);
	const iconDarkContent = `import { Image } from "@/components/ui/image";

interface IconDarkProps {
  size?: number;
}

export function IconDark({ size = 32 }: IconDarkProps) {
  const src = "${iconDarkSrc}";
  const alt = "Icon";

  return <Image src={src} alt={alt} width={size} height={size} />;
}
`;

	// Write all the updated brand components
	fs.writeFile(logoLightPath, logoLightContent);
	fs.writeFile(logoDarkPath, logoDarkContent);
	fs.writeFile(iconLightPath, iconLightContent);
	fs.writeFile(iconDarkPath, iconDarkContent);
}
