import { ResizablePanel } from "@firebuzz/ui/components/ui/resizable";
import { useTwoPanelsAgentLayout } from "@/hooks/ui/use-two-panels-agent-layout";

export const PreviewLayout = ({ children }: { children: React.ReactNode }) => {
	const { id } = useTwoPanelsAgentLayout();

	return (
		<ResizablePanel id={`${id}-right-panel`} defaultSize={70}>
			{children}
		</ResizablePanel>
	);
};
