import { useSetAtom } from "jotai";
import { errorsAtom } from "../atoms";
import { webcontainerInstance } from "../webcontainer";

export const useWorkbenchHelpers = () => {
	const setErrors = useSetAtom(errorsAtom);
	// Handlers
	const buildProject = async (id: string) => {
		// Start building process
		const buildProcess = await webcontainerInstance.spawn(
			"pnpm",
			["run", "build"],
			{
				cwd: `/${id}`,
			},
		);

		// Improved logging - collect all output in a readable format
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
	};

	const getBuildFiles = async (id: string, type: "preview" | "production") => {
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

		const slug = type === "preview" ? `preview-${id}` : id;

		const updatedHTML = indexHTML
			.replace(`/assets/${indexJS?.name}`, `/${slug}/assets/script`)
			.replace(`/assets/${indexCSS?.name}`, `/${slug}/assets/styles`);

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
