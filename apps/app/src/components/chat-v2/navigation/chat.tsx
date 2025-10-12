"use client";

import { Button } from "@firebuzz/ui/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "@firebuzz/ui/icons/lucide";
import { cn } from "@firebuzz/ui/lib/utils";
import { useEffect, useRef, useState } from "react";
import { useTwoPanelsAgentLayout } from "@/hooks/ui/use-two-panels-agent-layout";

export const ChatControls = () => {
	const { leftPanelRef, isLeftPanelCollapsed, setIsLeftPanelCollapsed } =
		useTwoPanelsAgentLayout();
	const [currentSize, setCurrentSize] = useState(30);
	const animationFrameRef = useRef<number>(0);

	useEffect(() => {
		const updateSize = () => {
			const panel = leftPanelRef.current;
			if (panel) {
				const size = panel.getSize();
				setCurrentSize(size);
			}
			animationFrameRef.current = requestAnimationFrame(updateSize);
		};

		animationFrameRef.current = requestAnimationFrame(updateSize);

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [leftPanelRef]);

	const togglePanel = () => {
		const panel = leftPanelRef.current;
		if (panel) {
			if (panel.isCollapsed()) {
				panel.expand();
				setIsLeftPanelCollapsed(false);
			} else {
				panel.collapse();
				setIsLeftPanelCollapsed(true);
			}
		}
	};

	return (
		<div
			className={cn(
				"flex items-center h-full flex-shrink-0 flex-grow-0 justify-between",
				isLeftPanelCollapsed && "w-auto",
			)}
			style={
				!isLeftPanelCollapsed
					? {
							flexBasis: `${currentSize}%`,
							width: `${currentSize}%`,
						}
					: undefined
			}
		>
			<span>Chat Controls</span>
			<Button variant="ghost" size="icon" onClick={togglePanel}>
				{isLeftPanelCollapsed ? (
					<PanelLeftClose className="size-3" />
				) : (
					<PanelLeftOpen className="size-3" />
				)}
			</Button>
		</div>
	);
};
