import { ResizablePanel } from "@firebuzz/ui/components/ui/resizable";
import { useThreePanelsLayout } from "@/hooks/ui/use-three-panels-layout";

export const PreviewLayout = ({ children }: { children: React.ReactNode }) => {
	const { id } = useThreePanelsLayout();

	return (
		<ResizablePanel id={`${id}-top-right-panel`} defaultSize={70} minSize={20}>
			{children}
		</ResizablePanel>
	);
};
