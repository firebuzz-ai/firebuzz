"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import {
	BarChart,
	Gauge,
	Globe,
	Search,
	Tags,
} from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import * as React from "react";
import type { PreviewTab } from "@/components/chat-v2/providers/preview-tabs-provider";
import { usePreviewTabs } from "@/hooks/agent/use-preview-tabs";

const tabs = [
	{ id: "preview" as PreviewTab, label: "Preview", icon: Globe },
	{ id: "analytics" as PreviewTab, label: "Analytics", icon: BarChart },
	{ id: "page-speed" as PreviewTab, label: "Page Speed", icon: Gauge },
	{ id: "seo" as PreviewTab, label: "SEO", icon: Search },
	{ id: "tags" as PreviewTab, label: "Tags", icon: Tags },
];

export const PreviewTabButtons = () => {
	const { activeTab, setActiveTab } = usePreviewTabs();
	const tabsRef = React.useRef<(HTMLButtonElement | null)[]>([]);
	const containerRef = React.useRef<HTMLDivElement | null>(null);
	const [indicatorStyle, setIndicatorStyle] =
		React.useState<React.CSSProperties>({
			width: 0,
			left: 0,
			opacity: 0,
		});

	const setTabRef = (index: number) => (el: HTMLButtonElement | null) => {
		tabsRef.current[index] = el;
	};

	React.useLayoutEffect(() => {
		const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTab);
		if (
			activeTabIndex >= 0 &&
			tabsRef.current[activeTabIndex] &&
			containerRef.current
		) {
			const activeTabElement = tabsRef.current[activeTabIndex];
			const containerRect = containerRef.current.getBoundingClientRect();
			const tabRect = activeTabElement?.getBoundingClientRect();

			if (tabRect && tabRect.width > 0 && containerRect.width > 0) {
				setIndicatorStyle({
					width: tabRect.width,
					left: tabRect.left - containerRect.left,
					opacity: 1,
				});
			}
		}
	}, [activeTab]);

	return (
		<div
			ref={containerRef}
			className="flex relative gap-2 items-center py-2 pl-1"
		>
			{/* Active tab indicator background */}
			<div
				className="absolute top-2 z-0 h-8 rounded-md border transition-all duration-300 ease-in-out pointer-events-none bg-muted"
				style={indicatorStyle}
			/>

			{tabs.map((tab, index) => {
				const Icon = tab.icon;
				const isActive = activeTab === tab.id;

				return (
					<Tooltip key={tab.id} open={isActive ? false : undefined}>
						<TooltipTrigger asChild>
							<button
								type="button"
								ref={setTabRef(index)}
								onClick={() => setActiveTab(tab.id)}
								className={cn(
									"flex relative z-10 gap-1 justify-center items-center h-8 text-sm font-medium rounded-md transition-colors duration-200",
									isActive
										? "px-3 text-brand"
										: "gap-0 w-8 rounded-md border text-muted-foreground hover:text-foreground",
								)}
							>
								<Icon className="flex-shrink-0 size-4" />
								{isActive && (
									<span className="whitespace-nowrap">{tab.label}</span>
								)}
							</button>
						</TooltipTrigger>
						<TooltipContent>
							<p>{tab.label}</p>
						</TooltipContent>
					</Tooltip>
				);
			})}
		</div>
	);
};
