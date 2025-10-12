import {
	ResizableHandle,
	ResizablePanel,
} from "@firebuzz/ui/components/ui/resizable";
import { cn } from "@firebuzz/ui/lib/utils";
import { useTwoPanelsAgentLayout } from "@/hooks/ui/use-two-panels-agent-layout";

export const ChatLayout = ({
	children,
	onCollapse,
	onExpand,
}: {
	children: React.ReactNode;
	onCollapse?: () => void;
	onExpand?: () => void;
}) => {
	const { leftPanelRef, id, setIsDragging, isDragging } =
		useTwoPanelsAgentLayout();

	return (
		<>
			<ResizablePanel
				ref={leftPanelRef}
				id={`${id}-left-panel`}
				collapsible
				defaultSize={30}
				maxSize={35}
				minSize={25}
				onCollapse={onCollapse}
				onExpand={onExpand}
			>
				{children}
			</ResizablePanel>
			<ResizableHandle
				onDragging={setIsDragging}
				className={cn(
					"w-1 border-none transition-all duration-200",
					isDragging && "opacity-100",
					!isDragging && "opacity-0 hover:opacity-100",
				)}
				style={{
					background:
						"radial-gradient(ellipse at center, hsl(var(--brand)) 0%, hsl(var(--brand) / 0.6) 30%, hsl(var(--brand) / 0.3) 50%, transparent 75%)",
				}}
			/>
		</>
	);
};
