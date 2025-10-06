import { useThreePanelsLayout } from "@/hooks/ui/use-three-panels-layout";
import { ResizablePanel } from "@firebuzz/ui/components/ui/resizable";

export const ChatLayout = ({ children }: { children: React.ReactNode }) => {
	const { id } = useThreePanelsLayout();

	return (
		<ResizablePanel id={`${id}-left-panel`} defaultSize={50} minSize={20}>
			{children}
		</ResizablePanel>
	);
};
