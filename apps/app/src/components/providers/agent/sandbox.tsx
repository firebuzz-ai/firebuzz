"use client";
import { api, type Doc, useCachedRichQuery } from "@firebuzz/convex";
import {
	createContext,
	type RefObject,
	useMemo,
	useRef,
	useState,
} from "react";
import { useAgentSession } from "@/hooks/agent/use-agent-session";

interface SanboxContextType {
	sandboxId: string | undefined;
	sandboxDbId: string | undefined;
	sandboxStatus: "pending" | "running" | "stopping" | "stopped" | "failed";
	previewURL: string | undefined;
	installCmdId: string | undefined;
	devCmdId: string | undefined;
	devCommand: Doc<"sandboxCommands"> | null;
	installCommand: Doc<"sandboxCommands"> | null;
	ports: number[];
	cwd: string;
	vcpus: number;
	runtime: string;
	timeout: number;
	isBuilding: boolean;
	iframeRef: RefObject<HTMLIFrameElement | null>;
	isPreviewIframeLoaded: boolean;
	setIsPreviewIframeLoaded: (loaded: boolean) => void;
}

export const SanboxContext = createContext<SanboxContextType>({
	sandboxId: undefined,
	sandboxDbId: undefined,
	sandboxStatus: "pending",
	previewURL: undefined,
	installCmdId: undefined,
	devCmdId: undefined,
	isBuilding: false,
	devCommand: null,
	installCommand: null,
	ports: [5173],
	cwd: "/vercel/sandbox",
	vcpus: 2,
	runtime: "node22",
	timeout: 120000,
	iframeRef: { current: null },
	isPreviewIframeLoaded: false,
	setIsPreviewIframeLoaded: () => {},
});

export const SanboxProvider = ({ children }: { children: React.ReactNode }) => {
	const session = useAgentSession();
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [isPreviewIframeLoaded, setIsPreviewIframeLoaded] = useState(false);

	const { data: sandbox } = useCachedRichQuery(
		api.collections.sandboxes.queries.getByIdWithCommands,
		session.session?.sandboxId ? { id: session.session.sandboxId } : "skip",
	);

	const exposedSandbox = useMemo(() => {
		if (!sandbox) {
			return {
				sandboxId: undefined,
				sandboxDbId: undefined,
				sandboxStatus: "pending" as const,
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
				iframeRef,
				isPreviewIframeLoaded,
				setIsPreviewIframeLoaded,
			};
		}

		return {
			sandboxId: sandbox.sandboxExternalId,
			sandboxDbId: sandbox._id,
			sandboxStatus: sandbox.status,
			previewURL: sandbox.previewUrl,
			installCmdId: sandbox.installCmdId,
			devCmdId: sandbox.devCmdId,
			devCommand: sandbox.devCommand,
			installCommand: sandbox.installCommand,
			ports: sandbox.ports,
			cwd: sandbox.cwd,
			vcpus: sandbox.vcpus,
			runtime: sandbox.runtime,
			timeout: sandbox.timeout,
			isBuilding: sandbox.isBuilding || false,
			iframeRef,
			isPreviewIframeLoaded,
			setIsPreviewIframeLoaded,
		};
	}, [sandbox, isPreviewIframeLoaded]);

	return (
		<SanboxContext.Provider value={exposedSandbox}>
			{children}
		</SanboxContext.Provider>
	);
};
