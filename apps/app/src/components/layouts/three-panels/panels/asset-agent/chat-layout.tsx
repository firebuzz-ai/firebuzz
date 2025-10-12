import { ResizablePanel } from "@firebuzz/ui/components/ui/resizable";
import { useThreePanelsLayout } from "@/hooks/ui/use-three-panels-layout";

export const ChatLayout = ({ children }: { children: React.ReactNode }) => {
	const { id } = useThreePanelsLayout();

	return (
		<ResizablePanel id={`${id}-left-panel`} defaultSize={50} minSize={20}>
			{children}
		</ResizablePanel>
	);
};
