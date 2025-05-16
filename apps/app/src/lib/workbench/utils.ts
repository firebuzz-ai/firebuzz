import type { FileSystemTree } from "@webcontainer/api";
import { webcontainerInstance } from "./webcontainer";

export const checkProjectMounted = async (id: string) => {
	const projectMounted = await webcontainerInstance.fs
		.readdir(id)
		.then((files) => files.length > 0)
		.catch(() => false);
	return projectMounted;
};

export const mountProjectFiles = async (
	id: string,
	initialFiles: FileSystemTree,
) => {
	try {
		await webcontainerInstance.fs.mkdir(id);
		await webcontainerInstance.mount(initialFiles, { mountPoint: id });
		return true;
	} catch (error) {
		console.log("Failed to mount initial files:", error);
		return false;
	}
};

export const configurePnpmStore = async (id: string) => {
	await webcontainerInstance.spawn(
		"pnpm",
		["config", "set", "store-dir", "false/v3"],
		{ cwd: `/${id}` },
	);
};

export const checkDependenciesInstalled = async (id: string) => {
	const isDependenciesInstalled = await webcontainerInstance.fs
		.readdir(`${id}/node_modules`)
		.then((files) => files.length > 0)
		.catch(() => false);

	if (isDependenciesInstalled) {
		// Set pnpm store config
		await configurePnpmStore(id);
	}

	return isDependenciesInstalled;
};

export const installDependencies = async (id: string) => {
	try {
		const installProcess = await webcontainerInstance.spawn(
			"pnpm",
			["install", "--store-dir", "false/v3"],
			{
				cwd: `/${id}`,
			},
		);

		const exitCode = await installProcess.exit;
		if (exitCode !== 0) {
			console.log("Failed to install dependencies", exitCode);
			return false;
		}

		// Set pnpm store config
		await configurePnpmStore(id);

		return true;
	} catch (error) {
		console.error("Failed to install dependencies:", error);
		return false;
	}
};

export const startDevServer = async (id: string) => {
	try {
		const devProcess = await webcontainerInstance.spawn(
			"pnpm",
			["run", "dev"],
			{
				cwd: `/${id}`,
			},
		);
		return devProcess;
	} catch (error) {
		console.error("Failed to start dev server:", error);
		return null;
	}
};
