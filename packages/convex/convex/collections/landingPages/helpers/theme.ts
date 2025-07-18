import type { Doc } from "@firebuzz/convex";
import { FileSystem } from "@firebuzz/file-system";

export const applyThemeToTemplate = (
	templateFiles: string,
	theme: Doc<"themes">,
) => {
	const fileSystem = new FileSystem(templateFiles);

	// Update tailwind.config.js with fonts
	const tailwindConfigPath = "tailwind.config.js";
	const googleFonts = theme.fonts?.filter((font) => font.type === "google");
	const fontFamilies = googleFonts?.map((font) => `"${font.name}"`).join(", ");
	if (fontFamilies) {
		const fontConfig = `
      fontFamily: {
        sans: [${fontFamilies}, "sans-serif"],
      },`;
		fileSystem.replaceInFile(
			tailwindConfigPath,
			"theme: {",
			`theme: {${fontConfig}`,
		);
	}

	// Update index.html to import fonts
	const indexPath = "index.html";
	const fontLinks =
		googleFonts
			?.map(
				(font) =>
					`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${font.name.replace(/ /g, "+")}:wght@400;700&display=swap">`,
			)
			.join("\n") ?? "";

	fileSystem.replaceInFile(indexPath, "</head>", `${fontLinks}\n</head>`);

	// Update src/index.css with theme colors - properly replace the entire @layer base block
	const cssPath = "src/index.css";

	// Build the light and dark theme CSS variables
	const lightThemeCss = Object.entries(theme.lightTheme)
		.map(([key, value]) => `\t\t--${key}: ${value};`)
		.join("\n");
	const darkThemeCss = Object.entries(theme.darkTheme)
		.map(([key, value]) => `\t\t--${key}: ${value};`)
		.join("\n");

	// Create the complete @layer base block
	const newLayerBase = `@layer base {
	:root {
${lightThemeCss}
	}
	.dark {
${darkThemeCss}
	}
}`;

	// Get the current CSS content
	const currentCssContent = getCssFileContent(fileSystem, cssPath);

	// Replace the entire @layer base block
	const updatedCssContent = replaceCssLayerBase(
		currentCssContent,
		newLayerBase,
	);

	// Write the updated CSS back
	fileSystem.writeFile(cssPath, updatedCssContent);

	return fileSystem.toString();
};

// Helper function to get CSS file content
const getCssFileContent = (fileSystem: FileSystem, path: string): string => {
	try {
		// This is a workaround since FileSystem doesn't have a readFile method
		// We'll need to access the internal structure or modify the original content
		const fsString = fileSystem.toString();
		const parsed = JSON.parse(fsString);
		const pathParts = path.split("/").filter((p) => p);
		let current = parsed;

		for (const part of pathParts.slice(0, -1)) {
			if (current[part]?.directory) {
				current = current[part].directory;
			} else {
				throw new Error(`Path ${path} not found`);
			}
		}

		const fileName = pathParts[pathParts.length - 1];
		if (current[fileName]?.file?.contents) {
			return current[fileName].file.contents;
		}

		throw new Error(`File ${path} not found`);
	} catch {
		// Fallback to default CSS structure if file can't be read
		return `@tailwind base;
@tailwind components;
@tailwind utilities;

/* ... */

@layer base {
	:root {
		--background: 0 0% 100%;
		--foreground: 0 0% 3.9%;
	}
	.dark {
		--background: 0 0% 3.9%;
		--foreground: 0 0% 98%;
	}
}

@layer base {
	* {
		@apply border-border;
	}
	body {
		@apply bg-background text-foreground;
	}
}`;
	}
};

// Helper function to replace the @layer base block containing theme variables
const replaceCssLayerBase = (
	cssContent: string,
	newLayerBase: string,
): string => {
	// First, try to find and replace the existing @layer base block that contains CSS variables
	// This regex looks for @layer base blocks that contain :root and .dark selectors
	const layerBaseRegex =
		/@layer base\s*{[\s\S]*?:root\s*{[\s\S]*?}[\s\S]*?\.dark\s*{[\s\S]*?}[\s\S]*?}/g;

	if (layerBaseRegex.test(cssContent)) {
		return cssContent.replace(layerBaseRegex, newLayerBase);
	}

	// If no existing @layer base block with theme variables is found, insert after the utilities import
	const utilitiesRegex = /@tailwind utilities;/;
	if (utilitiesRegex.test(cssContent)) {
		return cssContent.replace(
			utilitiesRegex,
			`@tailwind utilities;\n\n/* ... */\n\n${newLayerBase}`,
		);
	}

	// If nothing else works, append to the end
	return `${cssContent}\n\n${newLayerBase}`;
};
