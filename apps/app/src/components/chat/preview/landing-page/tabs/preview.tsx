import { DesignModeActionMenu } from "@/components/chat/design-mode/action-menu";
import { useAgentSession } from "@/hooks/agent/use-agent-session";
import { TextShimmer } from "@firebuzz/ui/components/reusable/text-shimmer";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { AlertCircle, EyeOff } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
// import { ElementInspector } from "@/components/chat-v2/design-mode/element-inspector";
import { useLandingPageContext } from "@/hooks/agent/use-landing-page";
import { usePreviewSize } from "@/hooks/agent/use-preview-size";
import { useSandbox } from "@/hooks/agent/use-sandbox";

const sizeClasses = {
	mobile: "w-[375px]",
	tablet: "w-[768px]",
	desktop: "w-full",
};

export const Preview = () => {
	const { session, renewSession } = useAgentSession();
	const sandbox = useSandbox();
	const {
		previewURL,
		sandboxStatus,
		iframeRef,
		isLoading: isSandboxLoading,
		isPreviewIframeLoaded,
		setIsPreviewIframeLoaded,
		devCommand,
		installCommand,
		staticIframeRef,
		setIsStaticPreviewIframeLoaded,
		isStaticPreviewIframeLoaded,
		renewSandbox,
	} = sandbox;
	const { currentSize } = usePreviewSize();
	const { landingPage } = useLandingPageContext();

	const handleIframeLoad = () => {
		setIsPreviewIframeLoaded(true);
	};

	const handleStaticIframeLoad = () => {
		setIsStaticPreviewIframeLoaded(true);
	};

	const staticPreviewURL = landingPage?.previewUrl; // Static preview URL from landing page
	const isInitializing = useMemo(() => {
		let isInitializing = true;
		if (previewURL && isPreviewIframeLoaded) isInitializing = false;
		if (staticPreviewURL && isStaticPreviewIframeLoaded) isInitializing = false;

		return isInitializing;
	}, [
		previewURL,
		isPreviewIframeLoaded,
		staticPreviewURL,
		isStaticPreviewIframeLoaded,
	]);

	const shouldShowMessage = useMemo(() => {
		if (isInitializing) return false;
		if (session?.status !== "active") return true;
		if (sandboxStatus !== "running") return true;
		if (installCommand?.status !== "completed") return true;
		if (devCommand?.status !== "running") return true;
		if (!isPreviewIframeLoaded) return true;

		return false;
	}, [
		session?.status,
		sandboxStatus,
		devCommand?.status,
		isPreviewIframeLoaded,
		installCommand?.status,
		isInitializing,
	]);

	const currentPreviewType = useMemo(() => {
		if (
			previewURL &&
			isPreviewIframeLoaded &&
			sandboxStatus === "running" &&
			devCommand?.status === "running"
		)
			return "live";
		if (staticPreviewURL && isStaticPreviewIframeLoaded) return "static";
		// If static preview URL exists but iframe hasn't loaded yet, show loading state
		if (staticPreviewURL && !isStaticPreviewIframeLoaded)
			return "static-loading";
		return "no-preview";
	}, [
		previewURL,
		isPreviewIframeLoaded,
		sandboxStatus,
		devCommand?.status,
		staticPreviewURL,
		isStaticPreviewIframeLoaded,
	]);


	const message = useMemo(() => {
		if (session && session.status !== "active")
			return {
				type: "session-not-active",
				message: "Session is expired",
			} as const;
		if (
			sandbox &&
			!isSandboxLoading &&
			(sandboxStatus === "failed" || sandboxStatus === "stopped")
		)
			return {
				type: "sandbox-not-running",
				message: "Sandbox is not running",
			} as const;
		if (installCommand && installCommand?.status === "failed")
			return {
				type: "install-command-not-completed",
				message: "Install command is not completed",
			} as const;
		if (devCommand && devCommand?.status !== "running")
			return {
				type: "dev-command-not-running",
				message: "Dev command is not running",
			} as const;

		return {
			type: "loading-live-preview",
			message: "Loading live preview...",
		} as const;
	}, [
		session,
		sandboxStatus,
		installCommand,
		devCommand,
		isSandboxLoading,
		sandbox,
	]);

	return (
		<div className="flex relative flex-col w-full h-full">
			{/* Design Mode Action Menu */}
			<DesignModeActionMenu />

			{/* Message Component */}
			<AnimatePresence>
				{shouldShowMessage && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 10 }}
						transition={{ duration: 0.2 }}
					>
						<div
							className={cn(
								"flex absolute bottom-10 left-1/2 z-20 gap-2 justify-center items-center pl-3 pr-3 py-1 text-sm rounded-lg border -translate-x-1/2 text-muted-foreground bg-muted",
								(message.type === "sandbox-not-running" ||
									message.type === "session-not-active") &&
									"py-0 pr-0 border-transparent border-none",
							)}
						>
							{/* Icon */}
							<div>
								{message.type === "loading-live-preview" ? (
									<Spinner size="xs" />
								) : (
									<AlertCircle className="text-amber-500 size-3" />
								)}
							</div>
							{/* Message */}
							<div> {message.message}</div>
							{/* Action */}
							<div>
								{(message.type === "sandbox-not-running" ||
									message.type === "session-not-active") && (
									<Button
										onClick={async () => {
											if (message.type === "sandbox-not-running") {
												await renewSandbox();
											} else {
												await renewSession();
											}
										}}
										variant="brand"
										className="py-1 h-8 rounded-l-none border-transparent border-none"
										size="sm"
									>
										{message.type === "sandbox-not-running"
											? "Restart Sandbox"
											: "Renew Session"}
									</Button>
								)}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
			<div className="overflow-hidden flex-1 w-full rounded-lg border bg-muted">
				<div className="flex overflow-auto justify-center items-start w-full h-full bg-muted">
					<div
						className={cn(
							"relative h-full transition-all duration-200 ease-out bg-background",
							sizeClasses[currentSize],
						)}
					>
						{/* Initializing */}
						{isInitializing && (
							<div className="flex absolute inset-0 z-0 justify-center items-center w-full h-full bg-background">
								<TextShimmer
									as="span"
									duration={1.5}
									className="text-sm italic font-medium"
									active={true}
								>
									Initializing...
								</TextShimmer>
							</div>
						)}

						{/* No Preview */}
						{currentPreviewType === "no-preview" && !isInitializing && (
							<div className="flex absolute inset-0 z-20 gap-2 justify-center items-center w-full h-full bg-background">
								<div className="flex justify-center items-center p-2 rounded-lg border bg-muted">
									<EyeOff className="size-5" />
								</div>
								<div className="">
									<h3 className="text-lg font-medium leading-tight">
										No preview available
									</h3>
									<p className="text-sm text-muted-foreground">
										Renew the session to refresh the preview.
									</p>
								</div>
							</div>
						)}

						{/* No Preview */}

						{/* Static Preview Iframe */}
						<iframe
							ref={staticIframeRef}
							title="Static Preview"
							src={staticPreviewURL?.concat("?disableFirebuzzBadge=true")}
							className={cn(
								"absolute inset-0 z-10 w-full h-full",
								currentPreviewType !== "static" &&
									currentPreviewType !== "static-loading"
									? "hidden"
									: "",
							)}
							onLoad={handleStaticIframeLoad}
						/>

						{/* Live Preview Iframe */}
						<iframe
							ref={iframeRef}
							title="Live Preview"
							src={previewURL}
							className="w-full h-full"
							onLoad={handleIframeLoad}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
