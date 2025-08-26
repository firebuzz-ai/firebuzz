import { useSetAtom } from "jotai";
import { errorsAtom, isBuildingAtom } from "../atoms";
import { getWebcontainerInstance } from "../webcontainer";

export const useWorkbenchHelpers = () => {
	const setErrors = useSetAtom(errorsAtom);
	const setIsBuilding = useSetAtom(isBuildingAtom);
	// Handlers
	const buildProject = async (id: string) => {
		const webcontainerInstance = await getWebcontainerInstance();

		try {
			setIsBuilding(true);
			// Temporarily enable analytics for build
			const originalContent = await webcontainerInstance.fs.readFile(
				`${id}/src/configuration/campaign.ts`,
				"utf-8",
			);

			// Enable analytics by replacing false with true
			let updatedContent = originalContent;
			if (originalContent.includes("analyticsEnabled: false")) {
				updatedContent = originalContent.replace(
					"analyticsEnabled: false",
					"analyticsEnabled: true",
				);
			} else if (originalContent.includes('"analyticsEnabled": false')) {
				updatedContent = originalContent.replace(
					'"analyticsEnabled": false',
					'"analyticsEnabled": true',
				);
			}

			await webcontainerInstance.fs.writeFile(
				`${id}/src/configuration/campaign.ts`,
				updatedContent,
			);

			// Start build process
			const buildProcess = await webcontainerInstance.spawn(
				"pnpm",
				["run", "build"],
				{
					cwd: `/${id}`,
				},
			);

			// Collect build output for error handling
			let buildOutput = "";
			buildProcess.output.pipeTo(
				new WritableStream({
					write(data) {
						// Remove ANSI escape codes for cleaner output
						// biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
						const cleanedData = data.replace(/\u001b\[[0-9;]*[mGKH]/g, "");
						buildOutput += cleanedData;
					},
				}),
			);

			const exitCode = await buildProcess.exit;

			// Always revert analytics to false after build (regardless of success/failure)
			const finalContent = await webcontainerInstance.fs.readFile(
				`${id}/src/configuration/campaign.ts`,
				"utf-8",
			);

			let revertedContent = finalContent;
			if (finalContent.includes("analyticsEnabled: true")) {
				revertedContent = finalContent.replace(
					"analyticsEnabled: true",
					"analyticsEnabled: false",
				);
			} else if (finalContent.includes('"analyticsEnabled": true')) {
				revertedContent = finalContent.replace(
					'"analyticsEnabled": true',
					'"analyticsEnabled": false',
				);
			}

			await webcontainerInstance.fs.writeFile(
				`${id}/src/configuration/campaign.ts`,
				revertedContent,
			);

			// Handle build failure
			if (exitCode !== 0) {
				setErrors((prev) => [
					...prev,
					{
						type: "build",
						message: buildOutput,
						rawError: null,
					},
				]);
				return false;
			}

			return true;
		} catch (error) {
			// Ensure analytics is reverted even if an error occurs
			try {
				const currentContent = await webcontainerInstance.fs.readFile(
					`${id}/src/configuration/campaign.ts`,
					"utf-8",
				);

				let revertedContent = currentContent;
				if (currentContent.includes("analyticsEnabled: true")) {
					revertedContent = currentContent.replace(
						"analyticsEnabled: true",
						"analyticsEnabled: false",
					);
				} else if (currentContent.includes('"analyticsEnabled": true')) {
					revertedContent = currentContent.replace(
						'"analyticsEnabled": true',
						'"analyticsEnabled": false',
					);
				}

				await webcontainerInstance.fs.writeFile(
					`${id}/src/configuration/campaign.ts`,
					revertedContent,
				);
			} catch {
				// Silently fail reversion attempt in error case
			}

			setErrors((prev) => [
				...prev,
				{
					type: "build",
					message:
						error instanceof Error ? error.message : "Unknown build error",
					rawError: error instanceof Error ? error.message : null,
				},
			]);
			return false;
		} finally {
			setIsBuilding(false);
		}
	};

	const getBuildFiles = async (id: string) => {
		const webcontainerInstance = await getWebcontainerInstance();

		const indexHTML = await webcontainerInstance.fs.readFile(
			`${id}/dist/index.html`,
			"utf-8",
		);

		const files = await webcontainerInstance.fs.readdir(`${id}/dist/assets`);

		const assets = await Promise.all(
			files.map(async (file) => ({
				name: file,
				content: await webcontainerInstance.fs.readFile(
					`${id}/dist/assets/${file}`,
					"utf-8",
				),
			})),
		);

		const indexJS = assets.find((asset) => asset.name.includes(".js"));
		const indexCSS = assets.find((asset) => asset.name.includes(".css"));

		const updatedHTML = indexHTML
			.replace(`/assets/${indexJS?.name}`, `/landing/${id}/assets/script`)
			.replace(`/assets/${indexCSS?.name}`, `/landing/${id}/assets/styles`);

		return {
			indexHTML: updatedHTML,
			indexJS: indexJS?.content ?? "",
			indexCSS: indexCSS?.content ?? "",
		};
	};

	return {
		buildProject,
		getBuildFiles,
	};
};
