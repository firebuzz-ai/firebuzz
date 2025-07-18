import type { Doc } from "@firebuzz/convex";
import { FileSystem } from "@firebuzz/file-system";

export const applyBrandAssetsToTemplate = (
	templateFiles: string,
	brand: Doc<"brands">,
) => {
	const fileSystem = new FileSystem(templateFiles);
	const r2PublicUrl = process.env.R2_PUBLIC_URL;

	const buildFullUrl = (key?: string) => {
		if (!key)
			return "https://cdn-dev.getfirebuzz.com/template-assets/logo-light.svg"; // fallback
		if (key.startsWith("http")) return key;
		return `${r2PublicUrl}/${key}`;
	};

	// Update logo-light.tsx
	const logoLightPath = "src/components/brand/logo-light.tsx";
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
	const logoDarkPath = "src/components/brand/logo-dark.tsx";
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
	const iconLightPath = "src/components/brand/icon-light.tsx";
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
	const iconDarkPath = "src/components/brand/icon-dark.tsx";
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
	fileSystem.writeFile(logoLightPath, logoLightContent);
	fileSystem.writeFile(logoDarkPath, logoDarkContent);
	fileSystem.writeFile(iconLightPath, iconLightContent);
	fileSystem.writeFile(iconDarkPath, iconDarkContent);

	return fileSystem.toString();
};
