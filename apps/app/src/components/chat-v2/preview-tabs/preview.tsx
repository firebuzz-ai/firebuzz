import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import { cn } from "@firebuzz/ui/lib/utils";
import { usePreviewSize } from "@/hooks/agent/use-preview-size";
import { useSandbox } from "@/hooks/agent/use-sandbox";

const sizeClasses = {
	mobile: "w-[375px]",
	tablet: "w-[768px]",
	desktop: "w-full",
};

export const Preview = () => {
	const { previewURL, sandboxStatus, iframeRef, setIsPreviewIframeLoaded } =
		useSandbox();
	const { currentSize } = usePreviewSize();

	const handleIframeLoad = () => {
		setIsPreviewIframeLoaded(true);
	};

	if (sandboxStatus !== "running" || !previewURL) {
		return (
			<div className="flex justify-center items-center w-full h-full rounded-lg border bg-muted">
				<Spinner size="sm" />
			</div>
		);
	}

	return (
		<div className="w-full h-full">
			<div className="overflow-hidden w-full h-full rounded-lg border">
				<div className="flex overflow-auto justify-center items-start w-full h-full bg-muted">
					<div
						className={cn(
							"h-full transition-all duration-200 ease-out bg-background",
							sizeClasses[currentSize],
						)}
					>
						<iframe
							ref={iframeRef}
							title="Sandbox Preview"
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
