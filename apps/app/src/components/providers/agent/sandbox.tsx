"use client";
import { useAgentSession } from "@/hooks/agent/use-agent-session";
import {
	api,
	type Doc,
	type Id,
	useCachedRichQuery,
	useMutation,
} from "@firebuzz/convex";
import {
	createContext,
	type RefObject,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";

interface SanboxContextType {
	sandboxId: string | undefined;
	sandboxDbId: Id<"sandboxes"> | undefined;
	isLoading: boolean;
	sandboxStatus: "pending" | "running" | "stopping" | "stopped" | "failed";
	previewURL: string | undefined;
	installCmdId: string | undefined;
	devCmdId: string | undefined;
	devCommand: Doc<"sandboxCommands"> | null;
	isDevServerRunning: boolean;
	installCommand: Doc<"sandboxCommands"> | null;
	isDependenciesInstalled: boolean;
	ports: number[];
	cwd: string;
	vcpus: number;
	runtime: string;
	timeout: number;
	isBuilding: boolean;
	iframeRef: RefObject<HTMLIFrameElement | null>;
	staticIframeRef: RefObject<HTMLIFrameElement | null>;
	isPreviewIframeLoaded: boolean;
	isStaticPreviewIframeLoaded: boolean;
	setIsPreviewIframeLoaded: (loaded: boolean) => void;
	setIsStaticPreviewIframeLoaded: (loaded: boolean) => void;
	renewSandbox: () => Promise<void>;
}

export const SanboxContext = createContext<SanboxContextType>({
	sandboxId: undefined,
	sandboxDbId: undefined,
	sandboxStatus: "pending",
	isLoading: true,
	previewURL: undefined,
	installCmdId: undefined,
	devCmdId: undefined,
	isBuilding: false,
	devCommand: null,
	isDevServerRunning: false,
	isDependenciesInstalled: false,
	installCommand: null,
	ports: [5173],
	cwd: "/vercel/sandbox",
	vcpus: 2,
	runtime: "node22",
	timeout: 120000,
	iframeRef: { current: null },
	staticIframeRef: { current: null },
	isStaticPreviewIframeLoaded: false,
	setIsStaticPreviewIframeLoaded: () => {},
	isPreviewIframeLoaded: false,
	setIsPreviewIframeLoaded: () => {},
	renewSandbox: async () => {
		throw new Error("renewSandbox must be used within SanboxProvider");
	},
});

export const SanboxProvider = ({ children }: { children: React.ReactNode }) => {
	const session = useAgentSession();
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const staticIframeRef = useRef<HTMLIFrameElement>(null);
	const [isPreviewIframeLoaded, setIsPreviewIframeLoaded] = useState(false);
	const [isStaticPreviewIframeLoaded, setIsStaticPreviewIframeLoaded] =
		useState(false);
	const { data: sandbox, isPending } = useCachedRichQuery(
		api.collections.sandboxes.queries.getByIdWithCommands,
		session.session?.sandboxId ? { id: session.session.sandboxId } : "skip",
	);

	const renewSandboxMutation = useMutation(
		api.collections.sandboxes.mutations.renew,
	);

	const renewSandbox = useCallback(async () => {
		if (!session.session?._id) {
			throw new Error("No active session to renew sandbox for");
		}
		await renewSandboxMutation({ sessionId: session.session._id });
	}, [renewSandboxMutation, session.session?._id]);

	const exposedSandbox = useMemo(() => {
		if (!sandbox) {
			return {
				sandboxId: undefined,
				sandboxDbId: undefined,
				sandboxStatus: "pending" as const,
				isLoading: isPending,
				previewURL: undefined,
				installCmdId: undefined,
				devCmdId: undefined,
				devCommand: null,
				installCommand: null,
				ports: [5173],
				cwd: "/vercel/sandbox",
				vcpus: 2,
				runtime: "node22",
				timeout: 120000,
				isBuilding: false,
				isDevServerRunning: false,
				isDependenciesInstalled: false,
				iframeRef,
				staticIframeRef,
				isStaticPreviewIframeLoaded,
				setIsStaticPreviewIframeLoaded,
				isPreviewIframeLoaded,
				setIsPreviewIframeLoaded,
				renewSandbox,
			};
		}

		return {
			sandboxId: sandbox.sandboxExternalId,
			sandboxDbId: sandbox._id,
			sandboxStatus: sandbox.status,
			isLoading: isPending,
			previewURL: sandbox.previewUrl,
			installCmdId: sandbox.installCmdId,
			devCmdId: sandbox.devCmdId,
			devCommand: sandbox.devCommand,
			isDevServerRunning: sandbox.devCommand?.status === "running",
			isDependenciesInstalled: sandbox.installCommand?.status === "completed",
			installCommand: sandbox.installCommand,
			ports: sandbox.ports,
			cwd: sandbox.cwd,
			vcpus: sandbox.vcpus,
			runtime: sandbox.runtime,
			timeout: sandbox.timeout,
			isBuilding: sandbox.isBuilding || false,
			iframeRef,
			staticIframeRef,
			isStaticPreviewIframeLoaded,
			setIsStaticPreviewIframeLoaded,
			isPreviewIframeLoaded,
			setIsPreviewIframeLoaded,
			renewSandbox,
		};
	}, [
		sandbox,
		isPreviewIframeLoaded,
		isStaticPreviewIframeLoaded,
		isPending,
		renewSandbox,
	]);

	return (
		<SanboxContext.Provider value={exposedSandbox}>
			{children}
		</SanboxContext.Provider>
	);
};
