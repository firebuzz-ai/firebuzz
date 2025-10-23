"use client";

import type { PreviewSize } from "@/components/chat/providers/preview-size-provider";
import { useLandingPageContext } from "@/hooks/agent/use-landing-page";
import { usePreviewSize } from "@/hooks/agent/use-preview-size";
import { usePreviewTabs } from "@/hooks/agent/use-preview-tabs";
import { useSandbox } from "@/hooks/agent/use-sandbox";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@firebuzz/ui/components/ui/input-group";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
    ExternalLink,
    Monitor,
    PlayCircle,
    RefreshCw,
    Smartphone,
    Tablet,
} from "@firebuzz/ui/icons/lucide";

const sizeIcons = {
	desktop: Monitor,
	tablet: Tablet,
	mobile: Smartphone,
};

const sizeOrder: PreviewSize[] = ["desktop", "tablet", "mobile"];

export const PreviewHeader = () => {
	const { activeTab } = usePreviewTabs();
	const { currentSize, setCurrentSize } = usePreviewSize();
	const { landingPage } = useLandingPageContext();
	const { previewURL, sandboxStatus, refreshAllPreviews } = useSandbox();

	const handleSizeToggle = () => {
		const currentIndex = sizeOrder.indexOf(currentSize);
		const nextIndex = (currentIndex + 1) % sizeOrder.length;
		setCurrentSize(sizeOrder[nextIndex]);
	};

	const handleOpenPreview = () => {
		if (landingPage?.previewUrl) {
			window.open(landingPage.previewUrl, "_blank");
		}
	};

	const handleOpenLivePreview = () => {
		if (previewURL) {
			window.open(previewURL, "_blank");
		}
	};

	// Show tab title if not on preview tab
	if (activeTab !== "preview") {
		const tabTitles = {
			analytics: "Analytics",
			"page-speed": "Page Speed",
			seo: "SEO",
			tags: "Tags",
		};

		return (
			<div className="flex justify-center items-center px-4 h-full">
				<div className="text-sm font-semibold">
					{tabTitles[activeTab as keyof typeof tabTitles]}
				</div>
			</div>
		);
	}

	// Show URL bar when on preview tab
	const CurrentSizeIcon = sizeIcons[currentSize];

	return (
		<div className="flex items-center px-4 h-full">
			<InputGroup className="overflow-hidden h-8 bg-muted">
				{/* Left: Size toggle */}
				<InputGroupAddon className="pr-1 border-r">
					<Tooltip>
						<TooltipTrigger asChild>
							<InputGroupButton
								type="button"
								size="icon-xs"
								onClick={handleSizeToggle}
							>
								<CurrentSizeIcon className="size-4" />
							</InputGroupButton>
						</TooltipTrigger>
						<TooltipContent>
							<p>
								{currentSize.charAt(0).toUpperCase() + currentSize.slice(1)}{" "}
								view
							</p>
						</TooltipContent>
					</Tooltip>
				</InputGroupAddon>

				{/* Center: URL input */}
				<InputGroupInput
					type="text"
					className="focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
					value={landingPage?.previewUrl || "No preview URL"}
					placeholder="Preview URL"
					readOnly
				/>

				{/* Right: Action buttons */}
				<InputGroupAddon align="inline-end" className="pl-1 border-l">
					<Tooltip>
						<TooltipTrigger asChild>
							<InputGroupButton
								type="button"
								size="icon-xs"
								onClick={handleOpenPreview}
								disabled={!landingPage?.previewUrl}
							>
								<ExternalLink className="size-4" />
							</InputGroupButton>
						</TooltipTrigger>
						<TooltipContent>
							<p>Open preview in new tab</p>
						</TooltipContent>
					</Tooltip>
				</InputGroupAddon>

				<InputGroupAddon align="inline-end" className="pl-1 border-l">
					<Tooltip>
						<TooltipTrigger asChild>
							<InputGroupButton
								type="button"
								size="icon-xs"
								onClick={handleOpenLivePreview}
								disabled={!previewURL || sandboxStatus !== "running"}
							>
								<PlayCircle className="size-4" />
							</InputGroupButton>
						</TooltipTrigger>
						<TooltipContent>
							<p>Open live preview in new tab</p>
						</TooltipContent>
					</Tooltip>
				</InputGroupAddon>

				<InputGroupAddon align="inline-end" className="pl-1 border-l">
					<Tooltip>
						<TooltipTrigger asChild>
							<InputGroupButton
								type="button"
								size="icon-xs"
								onClick={refreshAllPreviews}
								disabled={!previewURL}
							>
								<RefreshCw className="size-4" />
							</InputGroupButton>
						</TooltipTrigger>
						<TooltipContent>
							<p>Refresh preview</p>
						</TooltipContent>
					</Tooltip>
				</InputGroupAddon>
			</InputGroup>
		</div>
	);
};
